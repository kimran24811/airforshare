import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { collection, doc, getDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { RootStackParamList } from '../navigation/types';
import { Customer, Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { generateCustomerPdf } from '../utils/pdf';
import TransactionCard from '../components/TransactionCard';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CustomerDetail'>;
  route: RouteProp<RootStackParamList, 'CustomerDetail'>;
};

export default function CustomerDetailScreen({ navigation, route }: Props) {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'customers', customerId)).then(d => {
      if (d.exists()) setCustomer({ id: d.id, ...d.data() } as Customer);
    });
    return onSnapshot(
      query(collection(db, 'transactions'), where('customerId', '==', customerId), orderBy('date', 'desc')),
      snap => setAllTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction))),
    );
  }, [customerId]);

  const transactions = allTransactions.filter(t => !t.deleted);

  const totalSales = transactions.reduce((s, t) => s + t.totalAmount, 0);
  const totalBalance = transactions.reduce((s, t) => s + t.totalBalance, 0);
  const settled = totalBalance <= 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>{customer?.name ?? '…'}</Text>
        <TouchableOpacity
          onPress={async () => {
            if (!customer) return;
            setPdfLoading(true);
            try { await generateCustomerPdf(customer, transactions); }
            catch (e: any) { Alert.alert('Error', e.message); }
            finally { setPdfLoading(false); }
          }}
          style={{ padding: 6 }}
          disabled={pdfLoading}
        >
          {pdfLoading
            ? <ActivityIndicator size="small" color="#1565C0" />
            : <Text style={{ fontSize: 18 }}>📄</Text>}
        </TouchableOpacity>
      </View>

      {/* Customer stats */}
      <View style={s.statsCard}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{customer?.name ?? ''}</Text>
        {customer?.phone ? (
          <Text style={{ color: '#666', marginTop: 2 }}>📞 {customer.phone}</Text>
        ) : null}
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: '#888' }}>Total Sales</Text>
            <Text style={{ fontWeight: 'bold', color: '#2E7D32', fontSize: 16, marginTop: 2 }}>
              {formatCurrency(totalSales)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: '#888' }}>Outstanding</Text>
            <Text style={{ fontWeight: 'bold', color: settled ? '#2E7D32' : '#C62828', fontSize: 16, marginTop: 2 }}>
              {settled ? '✓ Cleared' : formatCurrency(totalBalance)}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={t => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#aaa', marginTop: 64 }}>No transactions yet.</Text>
        }
        renderItem={({ item }) => (
          <TransactionCard
            transaction={item}
            onPress={() => navigation.navigate('EntryDetail', { transactionId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5E9',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
  statsCard: {
    backgroundColor: '#fff', padding: 16, margin: 16, borderRadius: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
});
