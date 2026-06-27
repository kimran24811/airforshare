import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, SafeAreaView,
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { formatCurrency } from '../utils/currency';
import { useData } from '../context/DataContext';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Category'>;
  route: RouteProp<RootStackParamList, 'Category'>;
};

type CustomerGroup = {
  customerId: string;
  customerName: string;
  entries: number;
  totalAmount: number;
  totalPaid: number;
  totalBalance: number;
  lastDate: any;
};

export default function CategoryScreen({ navigation, route }: Props) {
  const { category } = route.params;
  const { transactions, customers, addCustomer } = useData();

  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = transactions.filter(t => !t.deleted && t.category === category);

  const customerMap = new Map<string, CustomerGroup>();
  for (const t of filtered) {
    const ex = customerMap.get(t.customerId);
    if (ex) {
      ex.entries++;
      ex.totalAmount  += t.totalAmount;
      ex.totalPaid    += t.totalPaid;
      ex.totalBalance += t.totalBalance;
    } else {
      customerMap.set(t.customerId, {
        customerId: t.customerId, customerName: t.customerName,
        entries: 1, totalAmount: t.totalAmount, totalPaid: t.totalPaid,
        totalBalance: t.totalBalance, lastDate: t.date,
      });
    }
  }

  // Also include customers with no transactions yet (just added via modal)
  for (const c of customers) {
    if (!customerMap.has(c.id)) {
      // don't show them in this category list unless they have entries
    }
  }

  const allGroups = Array.from(customerMap.values());
  const groups = search.trim()
    ? allGroups.filter(g => g.customerName.toLowerCase().includes(search.toLowerCase()))
    : allGroups;

  const totalSales     = filtered.reduce((s, t) => s + t.totalAmount, 0);
  const totalReceived  = filtered.reduce((s, t) => s + t.totalPaid, 0);
  const totalRemaining = filtered.reduce((s, t) => s + t.totalBalance, 0);
  const label = category.charAt(0).toUpperCase() + category.slice(1);

  const handleAddCustomer = async () => {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    const customer = await addCustomer(name, '');
    setAdding(false);
    setModalVisible(false);
    setNewName('');
    navigation.navigate('CustomerDetail', { customerId: customer.id, category });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{label}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={s.searchRow}>
        <TextInput
          style={s.searchInput}
          placeholder="🔍 Search customers…"
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
          <StatBox label="Total Sales" value={formatCurrency(totalSales)} color="#2E7D32" />
          <StatBox label="Received"    value={formatCurrency(totalReceived)} color="#1565C0" />
          <StatBox label="Remaining"   value={formatCurrency(totalRemaining)} color="#C62828" />
        </View>
        <Text style={{ color: '#888', fontSize: 12, marginTop: 10 }}>
          {filtered.length} entries  •  {allGroups.length} customers
          {search.trim() ? `  •  ${groups.length} matching` : ''}
        </Text>
      </View>

      <FlatList
        data={groups}
        keyExtractor={g => g.customerId}
        contentContainerStyle={{ padding: 16, paddingBottom: 88 }}
        ListEmptyComponent={<Text style={s.empty}>No customers yet.{'\n'}Tap + to add one.</Text>}
        renderItem={({ item }) => {
          const settled = item.totalBalance <= 0;
          const dateStr = item.lastDate?.toDate?.()?.toLocaleDateString(
            'en-PK', { day: '2-digit', month: 'short', year: 'numeric' }
          ) ?? '';
          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: item.customerId, category })}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={s.customerName}>{item.customerName}</Text>
                <Text style={{ color: '#888', fontSize: 12 }}>{dateStr}</Text>
              </View>
              <Text style={{ color: '#666', fontSize: 13, marginTop: 3 }}>
                {item.entries} {item.entries === 1 ? 'entry' : 'entries'}  •  Total: {formatCurrency(item.totalAmount)}
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
                <Text style={{ color: '#2E7D32', fontSize: 13 }}>Paid: {formatCurrency(item.totalPaid)}</Text>
                <Text style={[s.balance, { color: settled ? '#2E7D32' : '#C62828' }]}>
                  {settled ? '✓ Settled' : `Rs ${Math.round(item.totalBalance).toLocaleString()} due`}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={s.fab} onPress={() => setModalVisible(true)}>
        <Text style={{ color: '#fff', fontSize: 28, lineHeight: 32 }}>+</Text>
      </TouchableOpacity>

      {/* Customer name modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setModalVisible(false); setNewName(''); }}
      >
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>New Customer</Text>
            <TextInput
              style={s.modalInput}
              placeholder="Customer name"
              placeholderTextColor="#999"
              value={newName}
              onChangeText={setNewName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddCustomer}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                style={[s.modalBtn, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#C8E6C9' }]}
                onPress={() => { setModalVisible(false); setNewName(''); }}
              >
                <Text style={{ color: '#333', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalBtn, { flex: 1.5, backgroundColor: '#2E7D32' }, adding && { opacity: 0.7 }]}
                onPress={handleAddCustomer}
                disabled={adding}
              >
                {adding
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  statsCard: {
    backgroundColor: '#fff', padding: 16, margin: 16, borderRadius: 14,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  customerName: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  balance: { fontWeight: 'bold', fontSize: 14 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#E8F5E9',
  },
  searchInput: {
    flex: 1, borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 10,
    padding: 10, fontSize: 14, backgroundColor: '#FAFAFA',
  },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 64, lineHeight: 26 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    backgroundColor: '#2E7D32', width: 58, height: 58, borderRadius: 29,
    justifyContent: 'center', alignItems: 'center', elevation: 6,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  modalCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%',
    elevation: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 16 },
  modalInput: {
    borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 10,
    padding: 12, fontSize: 15, marginBottom: 12,
  },
  modalBtn: {
    flex: 1, borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center',
  },
});
