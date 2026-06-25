import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { RootStackParamList } from '../navigation/types';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import TransactionCard from '../components/TransactionCard';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Category'>;
  route: RouteProp<RootStackParamList, 'Category'>;
};

export default function CategoryScreen({ navigation, route }: Props) {
  const { category } = route.params;
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'transactions'), where('category', '==', category), orderBy('date', 'desc')),
      snap => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))),
    );
  }, [category]);

  const totalSales = transactions.reduce((s, t) => s + t.totalAmount, 0);
  const totalReceived = transactions.reduce((s, t) => s + t.totalPaid, 0);
  const totalRemaining = transactions.reduce((s, t) => s + t.totalBalance, 0);
  const uniqueCustomers = new Set(transactions.map(t => t.customerId)).size;
  const label = category === 'pesticide' ? '🌿 Pesticide' : '☀️ Solar';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={{ fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{label}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats */}
      <View style={s.statsCard}>
        <View style={{ flexDirection: 'row' }}>
          <StatBox label="Total Sales" value={formatCurrency(totalSales)} color="#2E7D32" />
          <StatBox label="Received" value={formatCurrency(totalReceived)} color="#1565C0" />
          <StatBox label="Remaining" value={formatCurrency(totalRemaining)} color="#C62828" />
        </View>
        <Text style={{ color: '#888', fontSize: 12, marginTop: 10 }}>
          {transactions.length} entries  •  {uniqueCustomers} customers
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={transactions}
        keyExtractor={t => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 88 }}
        ListEmptyComponent={
          <Text style={s.empty}>No entries yet.{'\n'}Tap + to add one.</Text>
        }
        renderItem={({ item }) => (
          <TransactionCard
            transaction={item}
            onPress={() => navigation.navigate('EntryDetail', { transactionId: item.id })}
          />
        )}
      />

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('NewEntry', { category })}>
        <Text style={{ color: '#fff', fontSize: 28, lineHeight: 32 }}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 10, color: '#888' }}>{label}</Text>
      <Text style={{ fontWeight: 'bold', fontSize: 13, color, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5E9',
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  statsCard: {
    backgroundColor: '#fff', padding: 16, margin: 16, borderRadius: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 64, lineHeight: 26 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: '#2E7D32', width: 58, height: 58, borderRadius: 29,
    justifyContent: 'center', alignItems: 'center', elevation: 6,
  },
});
