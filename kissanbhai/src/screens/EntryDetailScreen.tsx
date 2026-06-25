import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, TextInput, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { RootStackParamList } from '../navigation/types';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EntryDetail'>;
  route: RouteProp<RootStackParamList, 'EntryDetail'>;
};

export default function EntryDetailScreen({ navigation, route }: Props) {
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'transactions', route.params.transactionId)).then(d => {
      if (d.exists()) setTxn({ id: d.id, ...d.data() } as Transaction);
    });
  }, []);

  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0 || !txn) { Alert.alert('Invalid', 'Enter a valid amount'); return; }
    setSaving(true);
    try {
      const newPaid = Math.min(txn.totalPaid + amount, txn.totalAmount);
      await updateDoc(doc(db, 'transactions', txn.id), {
        totalPaid: newPaid,
        totalBalance: txn.totalAmount - newPaid,
      });
      Alert.alert('Done', `Payment of ${formatCurrency(amount)} recorded`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!txn) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  const dateStr =
    txn.date?.toDate?.()?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) ?? '';
  const settled = txn.totalBalance <= 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Entry Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Customer & meta */}
        <View style={s.card}>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{txn.customerName}</Text>
          <Text style={{ color: '#666', marginTop: 4 }}>
            {txn.category === 'pesticide' ? '🌿 Pesticide' : '☀️ Solar'}  •  {dateStr}
          </Text>
          {txn.description ? (
            <Text style={{ color: '#888', fontStyle: 'italic', marginTop: 6 }}>{txn.description}</Text>
          ) : null}
        </View>

        {/* Items */}
        <View style={s.card}>
          <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Items</Text>
          {txn.items.map((item, i) => (
            <View key={i} style={[s.itemRow, i < txn.items.length - 1 && s.itemBorder]}>
              <Text style={{ fontWeight: '600' }}>{i + 1}. {item.name}</Text>
              <View style={{ flexDirection: 'row', marginTop: 3 }}>
                <Text style={[s.itemStat, { flex: 1 }]}>Price: {formatCurrency(item.price)}</Text>
                <Text style={[s.itemStat, { flex: 1, color: '#2E7D32' }]}>Paid: {formatCurrency(item.paid)}</Text>
                <Text style={[s.itemStat, { flex: 1, color: item.balance > 0 ? '#C62828' : '#2E7D32' }]}>
                  Bal: {formatCurrency(item.balance)}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={s.card}>
          <Text style={{ fontWeight: 'bold', fontSize: 15 }}>Total: {formatCurrency(txn.totalAmount)}</Text>
          <Text style={{ color: '#2E7D32', fontSize: 14, marginTop: 4 }}>Paid: {formatCurrency(txn.totalPaid)}</Text>
          <Text style={{ color: settled ? '#2E7D32' : '#C62828', fontWeight: 'bold', fontSize: 16, marginTop: 6 }}>
            {settled ? '✓ Fully Settled' : `Remaining: ${formatCurrency(txn.totalBalance)}`}
          </Text>
        </View>

        {/* Payment section */}
        {!settled && (
          showPayment ? (
            <View style={s.card}>
              <Text style={{ fontWeight: '600', marginBottom: 10 }}>💳 Record Payment</Text>
              <TextInput
                style={s.payInput}
                placeholder={`Amount received ₨ (max ${formatCurrency(txn.totalBalance)})`}
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[s.payBtn, { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#C8E6C9' }]}
                  onPress={() => setShowPayment(false)}
                >
                  <Text style={{ color: '#2E7D32', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.payBtn, { flex: 2 }, saving && { opacity: 0.7 }]}
                  onPress={handlePayment}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Save Payment</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={s.paymentBtn} onPress={() => setShowPayment(true)}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>💳 Record Payment</Text>
            </TouchableOpacity>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E8F5E9',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  itemRow: { paddingVertical: 8 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemStat: { fontSize: 12, color: '#555' },
  payInput: {
    borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 10,
    padding: 12, marginBottom: 12, fontSize: 15,
  },
  payBtn: { backgroundColor: '#2E7D32', borderRadius: 10, padding: 12, alignItems: 'center' },
  paymentBtn: { backgroundColor: '#2E7D32', borderRadius: 12, padding: 16, alignItems: 'center' },
});
