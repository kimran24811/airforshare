import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { RootStackParamList } from '../navigation/types';
import { formatCurrency } from '../utils/currency';
import { totalOutstanding } from '../utils/balance';
import { useData } from '../context/DataContext';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Home'> };

export default function HomeScreen({ navigation }: Props) {
  const { transactions, customers, categories, payments, isOnline, pendingCount } = useData();
  const [search, setSearch] = useState('');

  const active = transactions.filter(t => !t.deleted);

  const suggestions = search.trim().length > 0
    ? customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone?.includes(search)
      ).slice(0, 5)
    : [];

  const statsFor = (cat: string) => {
    const list = active.filter(t => t.category === cat);
    return {
      sales: list.reduce((s, t) => s + t.totalAmount, 0),
      recv:  totalOutstanding(list, payments.filter(p => p.category === cat)),
    };
  };

  const overall = {
    sales: active.reduce((s, t) => s + t.totalAmount, 0),
    recv:  totalOutstanding(active, payments),
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="🔍 Search customers…"
          placeholderTextColor="#999"
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('RecycleBin')}>
          <Text style={{ fontSize: 20 }}>🗑️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Categories')}>
          <Text style={{ fontSize: 20 }}>⚙️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.logoutBtn} onPress={() => signOut(auth)}>
          <Text style={{ color: '#888', fontSize: 12 }}>Logout</Text>
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={s.offlineBanner}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
            📴 Offline mode{pendingCount > 0 ? ` — ${pendingCount} pending` : ' — all changes saved locally'}
          </Text>
        </View>
      )}

      {suggestions.length > 0 && (
        <View style={s.dropdown}>
          {suggestions.map(c => (
            <TouchableOpacity
              key={c.id}
              style={s.dropItem}
              onPress={() => { setSearch(''); navigation.navigate('CustomerDetail', { customerId: c.id }); }}
            >
              <Text style={{ fontWeight: '600' }}>{c.name}</Text>
              {c.phone ? <Text style={{ color: '#888', fontSize: 12 }}>{c.phone}</Text> : null}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 88 }}>
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

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {categories.map(cat => {
            const { sales, recv } = statsFor(cat.name);
            return (
              <TouchableOpacity
                key={cat.id}
                style={[s.tile, { width: '47%' }]}
                onPress={() => navigation.navigate('Category', { category: cat.name })}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 30 }}>{cat.emoji}</Text>
                <Text style={s.tileTitle}>
                  {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                </Text>
                <Text style={s.tileLabel}>Sales</Text>
                <Text style={[s.tileVal, { color: '#2E7D32' }]}>{formatCurrency(sales)}</Text>
                <Text style={s.tileLabel}>Receivable</Text>
                <Text style={[s.tileVal, { color: '#C62828' }]}>{formatCurrency(recv)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

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
  iconBtn: { marginLeft: 8, padding: 6 },
  logoutBtn: { marginLeft: 8, padding: 8 },
  offlineBanner: {
    backgroundColor: '#E65100', paddingVertical: 6, paddingHorizontal: 16, alignItems: 'center',
  },
  dropdown: {
    backgroundColor: '#fff', borderBottomWidth: 1,
    borderBottomColor: '#E8F5E9', maxHeight: 220,
  },
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
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, marginBottom: 4,
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
