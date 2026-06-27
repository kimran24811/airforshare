import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { formatCurrency } from '../utils/currency';
import { authenticate } from '../utils/biometric';
import { useData } from '../context/DataContext';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'RecycleBin'> };

export default function RecycleBinScreen({ navigation }: Props) {
  const { transactions, updateTransaction, permanentDeleteTransaction } = useData();
  const [search, setSearch] = useState('');

  const deleted = transactions.filter(t => t.deleted);
  const filtered = search.trim()
    ? deleted.filter(t =>
        t.customerName.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase()) ||
        t.items.some(i => i.name.toLowerCase().includes(search.toLowerCase()))
      )
    : deleted;

  const restore = async (id: string) => {
    try { await updateTransaction(id, { deleted: false, deletedAt: null } as any); }
    catch (e: any) { Alert.alert('Error', e.message); }
  };

  const permanentDelete = async (id: string) => {
    const ok = await authenticate('Confirm permanent delete');
    if (!ok) return;
    Alert.alert('Delete Forever', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever', style: 'destructive',
        onPress: async () => {
          try { await permanentDeleteTransaction(id); }
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

      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="🔍 Search deleted entries…"
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

      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#aaa', marginTop: 64 }}>
            {search.trim() ? 'No matching entries.' : 'Recycle bin is empty.'}
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
                onPress={() => restore(item.id)}
              >
                <Text style={{ color: '#fff', fontWeight: '600', textAlign: 'center' }}>↩ Restore</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, { backgroundColor: '#C62828', flex: 1 }]}
                onPress={() => permanentDelete(item.id)}
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
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#E8F5E9',
  },
  searchInput: {
    flex: 1, borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 10,
    padding: 10, fontSize: 14, backgroundColor: '#FAFAFA',
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  btn: { borderRadius: 8, padding: 10 },
});
