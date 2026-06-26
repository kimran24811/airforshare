import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  collection, onSnapshot, query, orderBy,
  addDoc, updateDoc, deleteDoc, doc, Timestamp,
} from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';
import { db } from '../config/firebase';
import { Transaction, Customer, Category } from '../types';
import { saveCache, loadCache, enqueue, flushPendingWrites } from '../utils/offlineSync';

interface Ctx {
  transactions: Transaction[];
  customers: Customer[];
  categories: Category[];
  isOnline: boolean;
  pendingCount: number;
  // write helpers
  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  permanentDeleteTransaction: (id: string) => Promise<void>;
  addCustomer: (name: string, phone: string) => Promise<Customer>;
  addCategory: (name: string, emoji: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers,    setCustomers]    = useState<Customer[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [isOnline,     setIsOnline]     = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const onlineRef = useRef(true);

  // 1. Boot from AsyncStorage immediately (works offline)
  useEffect(() => {
    loadCache<Transaction>('transactions').then(d => { if (d.length) setTransactions(d); });
    loadCache<Customer>('customers').then(d => { if (d.length) setCustomers(d); });
    loadCache<Category>('categories').then(d => { if (d.length) setCategories(d); });
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
    return () => { unsubT(); unsubC(); unsubCat(); };
  }, []);

  // 3. NetInfo — flush queue when internet comes back
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      onlineRef.current = online;
      setIsOnline(online);
      if (online) flushPendingWrites().then(() => setPendingCount(0));
    });
    return () => unsub();
  }, []);

  // ─── Write helpers ───────────────────────────────────────────────────────────

  const addTransaction = async (data: Omit<Transaction, 'id'>) => {
    if (onlineRef.current) {
      await addDoc(collection(db, 'transactions'), { ...data, date: Timestamp.now() });
    } else {
      await enqueue({ type: 'add', col: 'transactions', data: { ...data, date: Timestamp.now() } });
      const fake: Transaction = {
        ...data, id: `tmp_${Date.now()}`,
        date: { seconds: Date.now() / 1000, nanoseconds: 0, toDate: () => new Date() } as any,
      };
      setTransactions(prev => {
        const next = [fake, ...prev];
        saveCache('transactions', next);
        return next;
      });
      setPendingCount(p => p + 1);
    }
  };

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    if (onlineRef.current) {
      await updateDoc(doc(db, 'transactions', id), data as any);
    } else {
      await enqueue({ type: 'update', col: 'transactions', docId: id, data });
      setTransactions(prev => {
        const next = prev.map(t => t.id === id ? { ...t, ...data } : t);
        saveCache('transactions', next);
        return next;
      });
      setPendingCount(p => p + 1);
    }
  };

  const permanentDeleteTransaction = async (id: string) => {
    if (onlineRef.current) {
      await deleteDoc(doc(db, 'transactions', id));
    } else {
      await enqueue({ type: 'delete', col: 'transactions', docId: id });
      setTransactions(prev => {
        const next = prev.filter(t => t.id !== id);
        saveCache('transactions', next);
        return next;
      });
    }
  };

  const addCustomer = async (name: string, phone: string): Promise<Customer> => {
    if (onlineRef.current) {
      const ref = await addDoc(collection(db, 'customers'), { name, phone, createdAt: Timestamp.now() });
      return { id: ref.id, name, phone };
    } else {
      const tmpId = `tmp_${name.replace(/\s+/g, '_')}_${Date.now()}`;
      await enqueue({ type: 'add', col: 'customers', data: { name, phone, createdAt: Timestamp.now() } });
      const cust: Customer = { id: tmpId, name, phone };
      setCustomers(prev => {
        const next = [...prev, cust].sort((a, b) => a.name.localeCompare(b.name));
        saveCache('customers', next);
        return next;
      });
      setPendingCount(p => p + 1);
      return cust;
    }
  };

  const addCategory = async (name: string, emoji: string) => {
    if (onlineRef.current) {
      await addDoc(collection(db, 'categories'), { name, emoji, createdAt: Timestamp.now() });
    } else {
      await enqueue({ type: 'add', col: 'categories', data: { name, emoji, createdAt: Timestamp.now() } });
      const fake: Category = { id: `tmp_${Date.now()}`, name, emoji };
      setCategories(prev => [...prev, fake]);
      setPendingCount(p => p + 1);
    }
  };

  const deleteCategory = async (id: string) => {
    if (onlineRef.current) {
      await deleteDoc(doc(db, 'categories', id));
    } else {
      await enqueue({ type: 'delete', col: 'categories', docId: id });
      setCategories(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <DataContext.Provider value={{
      transactions, customers, categories, isOnline, pendingCount,
      addTransaction, updateTransaction, permanentDeleteTransaction,
      addCustomer, addCategory, deleteCategory,
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
