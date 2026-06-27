import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { formatCurrency } from '../utils/currency';
import { generateCustomerPdf } from '../utils/pdf';
import { useData } from '../context/DataContext';
import { Transaction } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CustomerDetail'>;
  route: RouteProp<RootStackParamList, 'CustomerDetail'>;
};

export default function CustomerDetailScreen({ navigation, route }: Props) {
  const { customerId, category } = route.params;
  const { transactions, customers } = useData();
  const [pdfLoading, setPdfLoading] = useState(false);

  const customer = customers.find(c => c.id === customerId) ?? null;
  const txns = transactions.filter(t => !t.deleted && t.customerId === customerId);

  const totalSales   = txns.reduce((s, t) => s + t.totalAmount, 0);
  const totalBalance = txns.reduce((s, t) => s + t.totalBalance, 0);
  const settled      = totalBalance <= 0;

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
            try { await generateCustomerPdf(customer, txns); }
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

      <View style={s.statsCard}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{customer?.name ?? ''}</Text>
        {customer?.phone ? <Text style={{ color: '#666', marginTop: 2 }}>📞 {customer.phone}</Text> : null}
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
        data={txns}
        keyExtractor={t => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 88 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#aaa', marginTop: 64 }}>
            No entries yet.{'\n'}Tap + to add one.
          </Text>
        }
        renderItem={({ item }) => <EntryCard txn={item} onPress={() => navigation.navigate('EntryDetail', { transactionId: item.id })} />}
      />

      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('NewEntry', {
          customerId,
          customerName: customer?.name,
          category,
          quickMode: true,
        })}
      >
        <Text style={{ color: '#fff', fontSize: 28, lineHeight: 32 }}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function EntryCard({ txn: t, onPress }: { txn: Transaction; onPress: () => void }) {
  const settled = t.totalBalance <= 0;
  const dateStr = t.date?.toDate?.()?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) ?? '';
  return (
    <TouchableOpacity style={s.entryCard} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={s.entryAmount}>{formatCurrency(t.totalAmount)}</Text>
        <Text style={{ color: '#888', fontSize: 12 }}>{dateStr}</Text>
      </View>
      <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
        {t.items.length} item{t.items.length !== 1 ? 's' : ''}
        {t.items.length > 0 && t.items[0].name ? `  •  ${t.items.map(i => i.name).join(', ')}` : ''}
      </Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
        <Text style={{ color: '#2E7D32', fontSize: 13 }}>Paid: {formatCurrency(t.totalPaid)}</Text>
        <Text style={{ fontWeight: 'bold', fontSize: 14, color: settled ? '#2E7D32' : '#C62828' }}>
          {settled ? '✓ Settled' : `${formatCurrency(t.totalBalance)} due`}
        </Text>
      </View>
    </TouchableOpacity>
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
  entryCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  entryAmount: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: '#2E7D32', width: 58, height: 58, borderRadius: 29,
    justifyContent: 'center', alignItems: 'center', elevation: 6,
  },
});
