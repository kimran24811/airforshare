import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { formatCurrency } from '../utils/currency';
import { generateCustomerPdf } from '../utils/pdf';
import { useData } from '../context/DataContext';
import { Transaction, CustomerPayment } from '../types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CustomerDetail'>;
  route: RouteProp<RootStackParamList, 'CustomerDetail'>;
};

type ListItem =
  | { type: 'sale'; data: Transaction }
  | { type: 'payment'; data: CustomerPayment };

function getTimestamp(item: ListItem): number {
  const raw = item.type === 'sale' ? item.data.date : item.data.date;
  return raw?.toDate?.()?.getTime?.() ?? raw?.seconds * 1000 ?? 0;
}

export default function CustomerDetailScreen({ navigation, route }: Props) {
  const { customerId, category } = route.params;
  const { transactions, customers, payments, addPayment } = useData();
  const [pdfLoading, setPdfLoading] = useState(false);

  const [payModal,    setPayModal]    = useState(false);
  const [payAmount,   setPayAmount]   = useState('');
  const [payNote,     setPayNote]     = useState('');
  const [payingSaving, setPayingSaving] = useState(false);
  const [search, setSearch] = useState('');

  const customer = customers.find(c => c.id === customerId) ?? null;
  const txns = transactions.filter(t => !t.deleted && t.customerId === customerId);
  const custPayments = payments.filter(p => p.customerId === customerId);

  const totalSales       = txns.reduce((s, t) => s + t.totalAmount, 0);
  const totalRawBalance  = txns.reduce((s, t) => s + t.totalBalance, 0);
  const totalPaidDirect  = custPayments.reduce((s, p) => s + p.amount, 0);
  const totalOutstanding = Math.max(0, totalRawBalance - totalPaidDirect);
  const fullySettled     = totalOutstanding <= 0;

  const allCombined: ListItem[] = [
    ...txns.map(t => ({ type: 'sale' as const, data: t })),
    ...custPayments.map(p => ({ type: 'payment' as const, data: p })),
  ].sort((a, b) => getTimestamp(b) - getTimestamp(a));

  const combined = search.trim()
    ? allCombined.filter(item => {
        const q = search.toLowerCase();
        if (item.type === 'sale') {
          const t = item.data;
          return (
            t.items.some(i => i.name.toLowerCase().includes(q)) ||
            String(t.totalAmount).includes(q) ||
            (t.description ?? '').toLowerCase().includes(q)
          );
        }
        return (
          item.data.note.toLowerCase().includes(q) ||
          String(item.data.amount).includes(q)
        );
      })
    : allCombined;

  const handlePayment = async () => {
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) { Alert.alert('Invalid', 'Enter a valid amount'); return; }
    setPayingSaving(true);
    try {
      await addPayment({
        customerId,
        customerName: customer?.name ?? '',
        category: category ?? '',
        amount,
        note: payNote.trim(),
      });
      setPayModal(false);
      setPayAmount('');
      setPayNote('');
      Alert.alert('Done', `Payment of ${formatCurrency(amount)} recorded`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setPayingSaving(false);
    }
  };

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
            try { await generateCustomerPdf(customer, txns, custPayments); }
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

      <FlatList
        data={combined}
        keyExtractor={item => item.type === 'sale' ? `s_${item.data.id}` : `p_${item.data.id}`}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <>
          <View style={s.searchRow}>
            <TextInput
              style={s.searchInput}
              placeholder="🔍 Search entries…"
              placeholderTextColor="#999"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={{ padding: 8 }}>
                <Text style={{ color: '#888', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={s.statsCard}>
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1 }}>
                <Text style={s.statLabel}>Total Sales</Text>
                <Text style={[s.statValue, { color: '#1a1a1a' }]}>{formatCurrency(totalSales)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.statLabel}>Paid</Text>
                <Text style={[s.statValue, { color: '#1565C0' }]}>{formatCurrency(totalPaidDirect + (txns.reduce((s, t) => s + t.totalPaid, 0)))}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.statLabel}>Outstanding</Text>
                <Text style={[s.statValue, { color: fullySettled ? '#2E7D32' : '#C62828' }]}>
                  {fullySettled ? '✓ Cleared' : formatCurrency(totalOutstanding)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={s.payBtn}
              onPress={() => setPayModal(true)}
              disabled={fullySettled}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>
                💳 Record Payment
              </Text>
            </TouchableOpacity>
          </View>
          </>
        }
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#aaa', marginTop: 40 }}>
            No entries yet.{'\n'}Tap + to add a sale.
          </Text>
        }
        renderItem={({ item }) =>
          item.type === 'sale'
            ? <SaleCard txn={item.data} onPress={() => navigation.navigate('EntryDetail', { transactionId: item.data.id })} />
            : <PaymentCard payment={item.data} />
        }
      />

      {/* Add entry FAB */}
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

      {/* Payment modal */}
      <Modal
        visible={payModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setPayModal(false); setPayAmount(''); setPayNote(''); }}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Record Payment</Text>
            <Text style={{ color: '#888', fontSize: 13, marginBottom: 14 }}>
              Outstanding: {formatCurrency(totalOutstanding)}
            </Text>
            <TextInput
              style={s.modalInput}
              placeholder="Amount (₨)"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              value={payAmount}
              onChangeText={setPayAmount}
              autoFocus
            />
            <TextInput
              style={[s.modalInput, { height: 60, textAlignVertical: 'top' }]}
              placeholder="Comment (optional)"
              placeholderTextColor="#999"
              value={payNote}
              onChangeText={setPayNote}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ccc' }]}
                onPress={() => { setPayModal(false); setPayAmount(''); setPayNote(''); }}
              >
                <Text style={{ color: '#333', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { flex: 1.5, backgroundColor: '#1565C0' }, payingSaving && { opacity: 0.7 }]}
                onPress={handlePayment}
                disabled={payingSaving}
              >
                {payingSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SaleCard({ txn: t, onPress }: { txn: Transaction; onPress: () => void }) {
  const settled = t.totalBalance <= 0;
  const dateStr = t.date?.toDate?.()?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) ?? '';
  return (
    <TouchableOpacity style={s.saleCard} onPress={onPress} activeOpacity={0.7}>
      <View style={s.saleAccent} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={s.saleAmount}>{formatCurrency(t.totalAmount)}</Text>
          <Text style={{ color: '#888', fontSize: 12 }}>{dateStr}</Text>
        </View>
        <Text style={{ color: '#888', fontSize: 12, marginTop: 3 }}>
          {t.items.length} item{t.items.length !== 1 ? 's' : ''}
          {t.items.length > 0 && t.items[0].name ? `  •  ${t.items.map(i => i.name).join(', ')}` : ''}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, alignItems: 'center' }}>
          <View style={s.saleTag}>
            <Text style={{ color: '#2E7D32', fontSize: 11, fontWeight: '600' }}>📦 Sale</Text>
          </View>
          <Text style={{ fontWeight: 'bold', fontSize: 13, color: settled ? '#2E7D32' : '#C62828' }}>
            {settled ? '✓ Settled' : `${formatCurrency(t.totalBalance)} due`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function PaymentCard({ payment: p }: { payment: CustomerPayment }) {
  const dateStr = p.date?.toDate?.()?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) ?? '';
  return (
    <View style={s.payCard}>
      <View style={s.payAccent} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={s.payAmount}>{formatCurrency(p.amount)}</Text>
          <Text style={{ color: '#888', fontSize: 12 }}>{dateStr}</Text>
        </View>
        {p.note ? <Text style={{ color: '#666', fontSize: 12, marginTop: 3 }}>{p.note}</Text> : null}
        <View style={{ marginTop: 6 }}>
          <View style={s.payTag}>
            <Text style={{ color: '#1565C0', fontSize: 11, fontWeight: '600' }}>💳 Payment</Text>
          </View>
        </View>
      </View>
    </View>
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
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#E8F5E9', marginBottom: 16,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1, borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 10,
    padding: 10, fontSize: 14, backgroundColor: '#FAFAFA',
  },
  statLabel: { fontSize: 11, color: '#888' },
  statValue: { fontWeight: 'bold', fontSize: 15, marginTop: 3 },
  payBtn: {
    backgroundColor: '#1565C0', borderRadius: 10, padding: 13,
    alignItems: 'center', marginTop: 14,
  },
  // Sale card
  saleCard: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12,
    marginBottom: 10, overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
    padding: 14,
  },
  saleAccent: { width: 4, backgroundColor: '#2E7D32', borderRadius: 2, marginRight: 12 },
  saleAmount: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a' },
  saleTag: { backgroundColor: '#E8F5E9', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  // Payment card
  payCard: {
    flexDirection: 'row', backgroundColor: '#EFF6FF', borderRadius: 12,
    marginBottom: 10, overflow: 'hidden',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2,
    padding: 14,
  },
  payAccent: { width: 4, backgroundColor: '#1565C0', borderRadius: 2, marginRight: 12 },
  payAmount: { fontSize: 17, fontWeight: 'bold', color: '#1565C0' },
  payTag: { backgroundColor: '#DBEAFE', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: '#2E7D32', width: 58, height: 58, borderRadius: 29,
    justifyContent: 'center', alignItems: 'center', elevation: 6,
  },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', elevation: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 4 },
  modalInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 12, fontSize: 15, marginBottom: 12, backgroundColor: '#fff',
  },
  modalBtn: {
    flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center',
  },
});
