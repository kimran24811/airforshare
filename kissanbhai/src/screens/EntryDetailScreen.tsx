import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, TextInput, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { RootStackParamList } from '../navigation/types';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { authenticate } from '../utils/biometric';
import { generateEntryPdf } from '../utils/pdf';
import PhotoPicker from '../components/PhotoPicker';
import VoiceRecorder from '../components/VoiceRecorder';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'EntryDetail'>;
  route: RouteProp<RootStackParamList, 'EntryDetail'>;
};

export default function EntryDetailScreen({ navigation, route }: Props) {
  const [txn, setTxn] = useState<Transaction | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, 'transactions', route.params.transactionId), d => {
      if (d.exists()) setTxn({ id: d.id, ...d.data() } as Transaction);
    });
  }, [route.params.transactionId]);

  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0 || !txn) { Alert.alert('Invalid', 'Enter a valid amount'); return; }
    setSaving(true);
    try {
      const newPaid = Math.min(txn.totalPaid + amount, txn.totalAmount);
      const history = txn.paymentHistory ?? [];
      await updateDoc(doc(db, 'transactions', txn.id), {
        totalPaid: newPaid,
        totalBalance: txn.totalAmount - newPaid,
        paymentHistory: [...history, { amount, note: paymentNote.trim(), date: Timestamp.now() }],
      });
      setPaymentAmount('');
      setPaymentNote('');
      setShowPayment(false);
      Alert.alert('Done', `Payment of ${formatCurrency(amount)} recorded`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!txn) return;
    const ok = await authenticate('Confirm delete entry');
    if (!ok) return;
    Alert.alert('Delete Entry', 'Move to Recycle Bin?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'transactions', txn.id), { deleted: true, deletedAt: Timestamp.now() });
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const updatePhotos = async (urls: string[]) => {
    if (!txn) return;
    try { await updateDoc(doc(db, 'transactions', txn.id), { photoUrls: urls }); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const updateVoice = async (url: string | undefined) => {
    if (!txn) return;
    try { await updateDoc(doc(db, 'transactions', txn.id), { voiceNoteUrl: url ?? null }); }
    catch (e: any) { Alert.alert('Error', e.message); }
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
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <TouchableOpacity onPress={() => navigation.navigate('NewEntry', { editId: txn.id })} style={{ padding: 6 }}>
            <Text style={{ fontSize: 20 }}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={{ padding: 6 }}>
            <Text style={{ fontSize: 20 }}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={s.card}>
          <Text style={{ fontSize: 20, fontWeight: 'bold' }}>{txn.customerName}</Text>
          <Text style={{ color: '#666', marginTop: 4, textTransform: 'capitalize' }}>
            {txn.category}  •  {dateStr}
          </Text>
          {txn.description ? (
            <Text style={{ color: '#888', fontStyle: 'italic', marginTop: 6 }}>{txn.description}</Text>
          ) : null}
        </View>

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

        <View style={s.card}>
          <Text style={{ fontWeight: 'bold', fontSize: 15 }}>Total: {formatCurrency(txn.totalAmount)}</Text>
          <Text style={{ color: '#2E7D32', fontSize: 14, marginTop: 4 }}>Paid: {formatCurrency(txn.totalPaid)}</Text>
          <Text style={{ color: settled ? '#2E7D32' : '#C62828', fontWeight: 'bold', fontSize: 16, marginTop: 6 }}>
            {settled ? '✓ Fully Settled' : `Remaining: ${formatCurrency(txn.totalBalance)}`}
          </Text>
        </View>

        {(txn.paymentHistory?.length ?? 0) > 0 && (
          <View style={s.card}>
            <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Payment History</Text>
            {txn.paymentHistory!.map((p, i) => {
              const pd = p.date?.toDate?.()?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' }) ?? '';
              return (
                <View key={i} style={[s.itemRow, i < txn.paymentHistory!.length - 1 && s.itemBorder]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#2E7D32', fontWeight: '600' }}>{formatCurrency(p.amount)}</Text>
                    <Text style={{ color: '#888', fontSize: 12 }}>{pd}</Text>
                  </View>
                  {p.note ? <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{p.note}</Text> : null}
                </View>
              );
            })}
          </View>
        )}

        {!settled && (
          showPayment ? (
            <View style={s.card}>
              <Text style={{ fontWeight: '600', marginBottom: 10 }}>💳 Record Payment</Text>
              <TextInput
                style={s.payInput}
                placeholder={`Amount (max ${formatCurrency(txn.totalBalance)})`}
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
              />
              <TextInput
                style={[s.payInput, { height: 52, textAlignVertical: 'top' }]}
                placeholder="Comment (optional)"
                placeholderTextColor="#999"
                value={paymentNote}
                onChangeText={setPaymentNote}
                multiline
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[s.payBtn, { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#C8E6C9' }]}
                  onPress={() => { setShowPayment(false); setPaymentAmount(''); setPaymentNote(''); }}
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
            <TouchableOpacity style={s.actionBtn} onPress={() => setShowPayment(true)}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>💳 Record Payment</Text>
            </TouchableOpacity>
          )
        )}

        <View style={s.card}>
          <PhotoPicker transactionId={txn.id} photoUrls={txn.photoUrls ?? []} onUpdate={updatePhotos} />
        </View>

        <View style={s.card}>
          <VoiceRecorder transactionId={txn.id} voiceNoteUrl={txn.voiceNoteUrl} onUpdate={updateVoice} />
        </View>

        <TouchableOpacity
          style={[s.actionBtn, { backgroundColor: '#1565C0' }]}
          onPress={async () => {
            setPdfLoading(true);
            try { await generateEntryPdf(txn); }
            catch (e: any) { Alert.alert('Error', e.message); }
            finally { setPdfLoading(false); }
          }}
          disabled={pdfLoading}
        >
          {pdfLoading
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>📄 Export PDF</Text>}
        </TouchableOpacity>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', flex: 1, textAlign: 'center' },
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
  actionBtn: {
    backgroundColor: '#2E7D32', borderRadius: 12, padding: 16,
    alignItems: 'center', marginBottom: 10,
  },
});
