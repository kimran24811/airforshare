import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  collection, onSnapshot, query, orderBy,
  addDoc, updateDoc, deleteDoc, doc, Timestamp,
} from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { db } from '../config/firebase';
import { Transaction, Customer, Category, CustomerPayment } from '../types';
import { saveCache, loadCache, enqueue, flushPendingWrites, getPendingCount } from '../utils/offlineSync';

interface Ctx {
  transactions: Transaction[];
  customers: Customer[];
  categories: Category[];
  payments: CustomerPayment[];
  isOnline: boolean;
  pendingCount: number;
  // write helpers
  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  permanentDeleteTransaction: (id: string) => Promise<void>;
  addCustomer: (name: string, phone: string) => Promise<Customer>;
  addCategory: (name: string, emoji: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addPayment: (data: Omit<CustomerPayment, 'id'>) => Promise<void>;
  updatePayment: (id: string, data: Partial<CustomerPayment>) => Promise<void>;
  deletePayment: (id: string) => Promise<void>;
}

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers,    setCustomers]    = useState<Customer[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [payments,     setPayments]     = useState<CustomerPayment[]>([]);
  const [isOnline,     setIsOnline]     = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const onlineRef = useRef(true);

  // 1. Boot from AsyncStorage immediately (works offline)
  useEffect(() => {
    loadCache<Transaction>('transactions').then(d => { if (d.length) setTransactions(d); });
    loadCache<Customer>('customers').then(d => { if (d.length) setCustomers(d); });
    loadCache<Category>('categories').then(d => { if (d.length) setCategories(d); });
    loadCache<CustomerPayment>('payments').then(d => { if (d.length) setPayments(d); });
    getPendingCount().then(setPendingCount);
  }, []);

  // 2. Firestore subscriptions — update cache whenever server data arrives
  useEffect(() => {
    const unsubT = onSnapshot(
      query(collection(db, 'transactions'), orderBy('date', 'desc')),
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
        if (!snap.metadata.fromCache) {
          setTransactions(data);
          saveCache('transactions', data);
        } else if (data.length > 0) {
          setTransactions(data);
        }
        // fromCache + empty → Firestore has no disk cache, keep AsyncStorage data intact
      },
      () => {},
    );
    const unsubC = onSnapshot(
      query(collection(db, 'customers'), orderBy('name')),
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
        if (!snap.metadata.fromCache) {
          setCustomers(data);
          saveCache('customers', data);
        } else if (data.length > 0) {
          setCustomers(data);
        }
      },
      () => {},
    );
    const unsubCat = onSnapshot(
      query(collection(db, 'categories'), orderBy('createdAt')),
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
        if (!snap.metadata.fromCache) {
          setCategories(data);
          saveCache('categories', data);
        } else if (data.length > 0) {
          setCategories(data);
        }
      },
      () => {},
    );
    const unsubP = onSnapshot(
      query(collection(db, 'customerPayments'), orderBy('date', 'desc')),
      snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerPayment));
        if (!snap.metadata.fromCache) {
          setPayments(data);
          saveCache('payments', data);
        } else if (data.length > 0) {
          setPayments(data);
        }
      },
      () => {},
    );
    return () => { unsubT(); unsubC(); unsubCat(); unsubP(); };
  }, []);

  // 3. NetInfo — flush queue when internet comes back
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      onlineRef.current = online;
      setIsOnline(online);
      if (online) flushPendingWrites().then(remaining => setPendingCount(remaining));
    });
    return () => unsub();
  }, []);

  // ─── Write helpers ───────────────────────────────────────────────────────────

  const addTransaction = async (data: Omit<Transaction, 'id'>) => {
    if (onlineRef.current) {
      await addDoc(collection(db, 'transactions'), { ...data, date: Timestamp.now() });
    } else {
      const tmpId = `tmp_${Date.now()}`;
      const count = await enqueue({ type: 'add', col: 'transactions', tmpId, data: { ...data, date: Timestamp.now() } });
      const fake: Transaction = {
        ...data, id: tmpId,
        date: { seconds: Date.now() / 1000, nanoseconds: 0, toDate: () => new Date() } as any,
      };
      setTransactions(prev => {
        const next = [fake, ...prev];
        saveCache('transactions', next);
        return next;
      });
      setPendingCount(count);
    }
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    if (onlineRef.current) {
      await updateDoc(doc(db, 'transactions', id), data as any);
    } else {
      const count = await enqueue({ type: 'update', col: 'transactions', docId: id, data });
      setTransactions(prev => {
        const next = prev.map(t => t.id === id ? { ...t, ...data } : t);
        saveCache('transactions', next);
        return next;
      });
      setPendingCount(count);
    }
  };

  const permanentDeleteTransaction = async (id: string) => {
    if (onlineRef.current) {
      await deleteDoc(doc(db, 'transactions', id));
    } else {
      const count = await enqueue({ type: 'delete', col: 'transactions', docId: id });
      setTransactions(prev => {
        const next = prev.filter(t => t.id !== id);
        saveCache('transactions', next);
        return next;
      });
      setPendingCount(count);
    }
  };

  const addCustomer = async (name: string, phone: string): Promise<Customer> => {
    if (onlineRef.current) {
      const ref = await addDoc(collection(db, 'customers'), { name, phone, createdAt: Timestamp.now() });
      return { id: ref.id, name, phone };
    } else {
      const tmpId = `tmp_${name.replace(/\s+/g, '_')}_${Date.now()}`;
      const count = await enqueue({ type: 'add', col: 'customers', tmpId, data: { name, phone, createdAt: Timestamp.now() } });
      const cust: Customer = { id: tmpId, name, phone };
      setCustomers(prev => {
        const next = [...prev, cust].sort((a, b) => a.name.localeCompare(b.name));
        saveCache('customers', next);
        return next;
      });
      setPendingCount(count);
      return cust;
    }
  };

  const addCategory = async (name: string, emoji: string) => {
    if (onlineRef.current) {
      await addDoc(collection(db, 'categories'), { name, emoji, createdAt: Timestamp.now() });
    } else {
      const tmpId = `tmp_${Date.now()}`;
      const count = await enqueue({ type: 'add', col: 'categories', tmpId, data: { name, emoji, createdAt: Timestamp.now() } });
      const fake: Category = { id: tmpId, name, emoji };
      setCategories(prev => [...prev, fake]);
      setPendingCount(count);
    }
  };

  const deleteCategory = async (id: string) => {
    if (onlineRef.current) {
      await deleteDoc(doc(db, 'categories', id));
    } else {
      const count = await enqueue({ type: 'delete', col: 'categories', docId: id });
      setCategories(prev => prev.filter(c => c.id !== id));
      setPendingCount(count);
    }
  };

  const addPayment = async (data: Omit<CustomerPayment, 'id'>) => {
    if (onlineRef.current) {
      await addDoc(collection(db, 'customerPayments'), { ...data, date: Timestamp.now() });
    } else {
      const tmpId = `tmp_${Date.now()}`;
      const count = await enqueue({ type: 'add', col: 'customerPayments', tmpId, data: { ...data, date: Timestamp.now() } });
      const fake: CustomerPayment = {
        ...data, id: tmpId,
        date: { seconds: Date.now() / 1000, nanoseconds: 0, toDate: () => new Date() } as any,
      };
      setPayments(prev => {
        const next = [fake, ...prev];
        saveCache('payments', next);
        return next;
      });
      setPendingCount(count);
    }
  };

  const updatePayment = async (id: string, data: Partial<CustomerPayment>) => {
    if (onlineRef.current) {
      await updateDoc(doc(db, 'customerPayments', id), data as any);
    } else {
      const count = await enqueue({ type: 'update', col: 'customerPayments', docId: id, data });
      setPayments(prev => {
        const next = prev.map(p => p.id === id ? { ...p, ...data } : p);
        saveCache('payments', next);
        return next;
      });
      setPendingCount(count);
    }
  };

  const deletePayment = async (id: string) => {
    if (onlineRef.current) {
      await deleteDoc(doc(db, 'customerPayments', id));
    } else {
      const count = await enqueue({ type: 'delete', col: 'customerPayments', docId: id });
      setPayments(prev => {
        const next = prev.filter(p => p.id !== id);
        saveCache('payments', next);
        return next;
      });
      setPendingCount(count);
    }
  };

  return (
    <DataContext.Provider value={{
      transactions, customers, categories, payments, isOnline, pendingCount,
      addTransaction, updateTransaction, permanentDeleteTransaction,
      addCustomer, addCategory, deleteCategory, addPayment, updatePayment, deletePayment,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): Ctx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
