import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  collection, onSnapshot, query, orderBy,
  updateDoc, deleteDoc, doc, Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { RootStackParamList } from '../navigation/types';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';
import { authenticate } from '../utils/biometric';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'RecycleBin'> };

export default function RecycleBinScreen({ navigation }: Props) {
  const [deleted, setDeleted] = useState<Transaction[]>([]);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'transactions'), orderBy('date', 'desc')),
      snap => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction));
        setDeleted(all.filter(t => t.deleted));
      },
    );
  }, []);

  const restore = async (t: Transaction) => {
    try {
      await updateDoc(doc(db, 'transactions', t.id), { deleted: false, deletedAt: null });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const permanentDelete = async (t: Transaction) => {
    const ok = await authenticate('Confirm permanent delete');
    if (!ok) return;
    Alert.alert('Delete Forever', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever', style: 'destructive',
        onPress: async () => {
          try { await deleteDoc(doc(db, 'transactions', t.id)); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const dateStr = (ts: any) =>
    ts?.toDate?.()?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) ?? '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>🗑️ Recycle Bin</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={deleted}
        keyExtractor={t => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#aaa', marginTop: 64 }}>
            Recycle bin is empty.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: 'bold', fontSize: 15 }}>{item.customerName}</Text>
              <Text style={{ color: '#888', fontSize: 12 }}>{dateStr(item.date)}</Text>
            </View>
            <Text style={{ color: '#666', fontSize: 13, marginTop: 2, textTransform: 'capitalize' }}>
              {item.category}
            </Text>
            <Text style={{ color: '#C62828', fontWeight: '600', marginTop: 4 }}>
              {formatCurrency(item.totalBalance)} remaining
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: '#2E7D32', flex: 1 }]}
                onPress={() => restore(item)}
              >
                <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>↩ Restore</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: '#C62828', flex: 1 }]}
                onPress={() => permanentDelete(item)}
              >
                <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>🗑 Delete Forever</Text>
              </TouchableOpacity>
            </View>
          </View>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  btn: { borderRadius: 8, padding: 10 },
});
