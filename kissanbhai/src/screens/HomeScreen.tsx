import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { RootStackParamList } from '../navigation/types';
import { Customer, Transaction } from '../types';
import { formatCurrency } from '../utils/currency';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Home'> };

export default function HomeScreen({ navigation }: Props) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [suggestions, setSuggestions] = useState<Customer[]>([]);

  useEffect(() => {
    const unsubC = onSnapshot(
      query(collection(db, 'customers'), orderBy('name')),
      snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer))),
    );
    const unsubT = onSnapshot(
      query(collection(db, 'transactions'), orderBy('date', 'desc')),
      snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))),
    );
    return () => { unsubC(); unsubT(); };
  }, []);

  useEffect(() => {
    if (search.trim().length < 1) { setSuggestions([]); return; }
    const q = search.toLowerCase();
    setSuggestions(
      customers.filter(c => c.name.toLowerCase().includes(q) || c.phone?.includes(search))
    );
  }, [search, customers]);

  const total = (cat?: 'pesticide' | 'solar') => {
    const list = cat ? transactions.filter(t => t.category === cat) : transactions;
    return {
      sales: list.reduce((s, t) => s + t.totalAmount, 0),
      recv: list.reduce((s, t) => s + t.totalBalance, 0),
    };
  };

  const overall = total();
  const pest = total('pesticide');
  const solar = total('solar');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      {/* Search bar */}
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="🔍 Search customers…"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={s.logoutBtn} onPress={() => signOut(auth)}>
          <Text style={{ color: '#888', fontSize: 12 }}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Autocomplete dropdown */}
      {suggestions.length > 0 && (
        <View style={s.dropdown}>
          {suggestions.slice(0, 5).map(c => (
            <TouchableOpacity
              key={c.id}
              style={s.dropItem}
              onPress={() => {
                setSearch('');
                setSuggestions([]);
                navigation.navigate('CustomerDetail', { customerId: c.id });
              }}
            >
              <Text style={{ fontWeight: '600' }}>{c.name}</Text>
              {c.phone ? <Text style={{ color: '#888', fontSize: 12 }}>{c.phone}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 88 }}>
        {/* Overall stats */}
        <View style={s.card}>
          <Text style={s.cardTitle}>📊 Overall Business</Text>
          <View style={{ flexDirection: 'row', marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={s.statLabel}>Total Sales</Text>
              <Text style={[s.statVal, { color: '#2E7D32' }]}>{formatCurrency(overall.sales)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.statLabel}>Receivable</Text>
              <Text style={[s.statVal, { color: '#C62828' }]}>{formatCurrency(overall.recv)}</Text>
            </View>
          </View>
        </View>

        {/* Category tiles */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[
            { cat: 'pesticide' as const, emoji: '🌿', label: 'Pesticide', ...pest },
            { cat: 'solar' as const, emoji: '☀️', label: 'Solar', ...solar },
          ].map(({ cat, emoji, label, sales, recv }) => (
            <TouchableOpacity
              key={cat}
              style={[s.tile, { flex: 1 }]}
              onPress={() => navigation.navigate('Category', { category: cat })}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 32 }}>{emoji}</Text>
              <Text style={s.tileTitle}>{label}</Text>
              <Text style={s.tileLabel}>Sales</Text>
              <Text style={[s.tileVal, { color: '#2E7D32' }]}>{formatCurrency(sales)}</Text>
              <Text style={s.tileLabel}>Receivable</Text>
              <Text style={[s.tileVal, { color: '#C62828' }]}>{formatCurrency(recv)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('NewEntry', {})}>
        <Text style={{ color: '#fff', fontSize: 28, lineHeight: 32 }}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  searchRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5E9',
  },
  searchInput: {
    flex: 1, borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 10,
    padding: 10, fontSize: 14, backgroundColor: '#FAFAFA',
  },
  logoutBtn: { marginLeft: 10, padding: 8 },
  dropdown: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5E9', maxHeight: 220 },
  dropItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F8E9' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  cardTitle: { fontWeight: 'bold', fontSize: 16 },
  statLabel: { fontSize: 11, color: '#888', marginTop: 4 },
  statVal: { fontSize: 18, fontWeight: 'bold' },
  tile: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  tileTitle: { fontWeight: 'bold', fontSize: 15, marginTop: 6 },
  tileLabel: { fontSize: 10, color: '#888', marginTop: 8 },
  tileVal: { fontSize: 14, fontWeight: 'bold' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: '#2E7D32', width: 58, height: 58, borderRadius: 29,
    justifyContent: 'center', alignItems: 'center', elevation: 6,
  },
});
