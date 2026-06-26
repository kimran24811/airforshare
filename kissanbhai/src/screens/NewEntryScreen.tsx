import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView,
  Platform, SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import {
  collection, addDoc, onSnapshot, query, orderBy,
  Timestamp, getDoc, doc, updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { RootStackParamList } from '../navigation/types';
import { Customer, TransactionItem, Category } from '../types';
import { formatCurrency } from '../utils/currency';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'NewEntry'>;
  route: RouteProp<RootStackParamList, 'NewEntry'>;
};

const emptyItem = (): TransactionItem => ({ name: '', price: 0, paid: 0, balance: 0 });

export default function NewEntryScreen({ navigation, route }: Props) {
  const presetCategory = route.params?.category;
  const editId = route.params?.editId;
  const presetCustomerId = route.params?.customerId;
  const presetCustomerName = route.params?.customerName;
  const isEdit = !!editId;

  const presetCustomer = presetCustomerId && presetCustomerName
    ? { id: presetCustomerId, name: presetCustomerName, phone: '' }
    : null;

  const [category, setCategory] = useState<string>(presetCategory ?? '');
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState(presetCustomerName ?? '');
  const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(presetCustomer);
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<TransactionItem[]>([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    const unsubCust = onSnapshot(
      query(collection(db, 'customers'), orderBy('name')),
      snap => setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer))),
    );
    const unsubCat = onSnapshot(
      query(collection(db, 'categories'), orderBy('createdAt')),
      snap => setCategories(snap.docs.map(d => ({ id: d.id, ...d.data() } as Category))),
    );
    return () => { unsubCust(); unsubCat(); };
  }, []);

  // Pre-fill for edit mode
  useEffect(() => {
    if (!editId) return;
    getDoc(doc(db, 'transactions', editId)).then(d => {
      if (!d.exists()) return;
      const data = d.data();
      setCategory(data.category ?? '');
      setCustomerSearch(data.customerName ?? '');
      setSelectedCustomer({ id: data.customerId, name: data.customerName, phone: data.customerPhone ?? '' });
      setDescription(data.description ?? '');
      setItems(data.items?.length ? data.items : [emptyItem()]);
      setLoading(false);
    });
  }, [editId]);

  useEffect(() => {
    if (!customerSearch.trim() || selectedCustomer) { setCustomerSuggestions([]); return; }
    const lower = customerSearch.toLowerCase();
    setCustomerSuggestions(customers.filter(c => c.name.toLowerCase().includes(lower)));
  }, [customerSearch, customers, selectedCustomer]);

  const updateItem = (idx: number, field: 'name' | 'price' | 'paid', raw: string) => {
    setItems(prev => {
      const next = [...prev];
      const item = { ...next[idx] };
      if (field === 'name') {
        item.name = raw;
      } else {
        const val = parseFloat(raw) || 0;
        item[field] = val;
        item.balance = (field === 'price' ? val : item.price) - (field === 'paid' ? val : item.paid);
      }
      next[idx] = item;
      return next;
    });
  };

  const totalAmount = items.reduce((s, i) => s + i.price, 0);
  const totalPaid = items.reduce((s, i) => s + i.paid, 0);
  const totalBalance = totalAmount - totalPaid;

  const resolveCustomer = async (): Promise<Customer | null> => {
    if (selectedCustomer) return selectedCustomer;
    const name = customerSearch.trim();
    if (!name) return null;
    const existing = customers.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const ref = await addDoc(collection(db, 'customers'), { name, phone: '', createdAt: Timestamp.now() });
    return { id: ref.id, name, phone: '' };
  };

  const handleSave = async () => {
    if (!category) { Alert.alert('Missing', 'Select a category'); return; }
    const validItems = items.filter(i => i.name.trim()).map(i => ({ ...i, balance: i.price - i.paid }));
    if (!validItems.length) { Alert.alert('Missing', 'Add at least one item with a name'); return; }
    const customer = await resolveCustomer();
    if (!customer) { Alert.alert('Missing', 'Enter a customer name'); return; }

    setSaving(true);
    try {
      const payload = {
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        category,
        items: validItems,
        description,
        totalAmount,
        totalPaid,
        totalBalance,
      };

      if (isEdit && editId) {
        await updateDoc(doc(db, 'transactions', editId), { ...payload, editedAt: Timestamp.now() });
        Alert.alert('Saved', 'Entry updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await addDoc(collection(db, 'transactions'), { ...payload, date: Timestamp.now() });
        Alert.alert('Saved', 'Entry saved successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>{isEdit ? 'Edit Entry' : 'New Entry'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Customer */}
          <Text style={s.label}>Customer</Text>
          {selectedCustomer ? (
            <View style={s.selectedBox}>
              <Text style={{ fontWeight: '600', flex: 1 }}>{selectedCustomer.name}</Text>
              <TouchableOpacity onPress={() => { setSelectedCustomer(null); setCustomerSearch(''); }}>
                <Text style={{ color: '#C62828', fontSize: 16 }}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={s.input}
                placeholder="Type name to search or add…"
                placeholderTextColor="#999"
                value={customerSearch}
                onChangeText={setCustomerSearch}
              />
              {customerSuggestions.length > 0 && (
                <View style={s.dropdown}>
                  {customerSuggestions.slice(0, 5).map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={s.dropItem}
                      onPress={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setCustomerSuggestions([]); }}
                    >
                      <Text>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {customerSearch.trim() &&
                    !customers.find(c => c.name.toLowerCase() === customerSearch.toLowerCase()) && (
                      <TouchableOpacity
                        style={[s.dropItem, { backgroundColor: '#F1F8E9' }]}
                        onPress={() => setCustomerSuggestions([])}
                      >
                        <Text style={{ color: '#2E7D32' }}>➕ Add "{customerSearch.trim()}" as new customer</Text>
                      </TouchableOpacity>
                    )}
                </View>
              )}
            </>
          )}

          {/* Category — hidden if preset */}
          {!presetCategory && (
            <>
              <Text style={s.label}>Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[s.catBtn, category === cat.name && s.catSelected]}
                    onPress={() => setCategory(cat.name)}
                  >
                    <Text style={[{ fontWeight: '600' }, category === cat.name && { color: '#fff' }]}>
                      {cat.emoji} {cat.name.charAt(0).toUpperCase() + cat.name.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Description */}
          <Text style={s.label}>Description (optional)</Text>
          <TextInput
            style={[s.input, { height: 56, textAlignVertical: 'top' }]}
            placeholder="e.g. wheat season spray…"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
          />

          {/* Items table header */}
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            <Text style={[s.colHead, { flex: 3 }]}>Item Name</Text>
            <Text style={[s.colHead, { flex: 2 }]}>Price ₨</Text>
            <Text style={[s.colHead, { flex: 2 }]}>Paid ₨</Text>
            <Text style={[s.colHead, { flex: 2 }]}>Bal ₨</Text>
          </View>

          {items.map((item, idx) => (
            <View key={idx} style={{ flexDirection: 'row', gap: 4, marginBottom: 8, alignItems: 'center' }}>
              <TextInput
                style={[s.cell, { flex: 3 }]}
                placeholder="Item"
                placeholderTextColor="#bbb"
                value={item.name}
                onChangeText={v => updateItem(idx, 'name', v)}
              />
              <TextInput
                style={[s.cell, { flex: 2 }]}
                placeholder="0"
                placeholderTextColor="#bbb"
                keyboardType="decimal-pad"
                value={item.price > 0 ? String(item.price) : ''}
                onChangeText={v => updateItem(idx, 'price', v)}
              />
              <TextInput
                style={[s.cell, { flex: 2 }]}
                placeholder="0"
                placeholderTextColor="#bbb"
                keyboardType="decimal-pad"
                value={item.paid > 0 ? String(item.paid) : ''}
                onChangeText={v => updateItem(idx, 'paid', v)}
              />
              <View style={[s.balCell, { flex: 2 }]}>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: item.balance > 0 ? '#C62828' : '#2E7D32' }}>
                  {item.balance <= 0 ? '✓' : String(Math.round(item.balance))}
                </Text>
              </View>
              {items.length > 1 && (
                <TouchableOpacity onPress={() => setItems(p => p.filter((_, i) => i !== idx))}>
                  <Text style={{ color: '#C62828', fontSize: 16, paddingHorizontal: 4 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          <TouchableOpacity onPress={() => setItems(p => [...p, emptyItem()])}>
            <Text style={{ color: '#2E7D32', fontWeight: '600', marginBottom: 20 }}>+ Add Item</Text>
          </TouchableOpacity>

          <View style={s.totalsCard}>
            <Text style={{ fontWeight: 'bold', fontSize: 15 }}>Total: {formatCurrency(totalAmount)}</Text>
            <Text style={{ color: '#2E7D32', fontSize: 14, marginTop: 4 }}>Paid: {formatCurrency(totalPaid)}</Text>
            <Text style={{ color: totalBalance > 0 ? '#C62828' : '#2E7D32', fontWeight: 'bold', fontSize: 16, marginTop: 4 }}>
              Remaining: {formatCurrency(totalBalance)}
            </Text>
          </View>

          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveBtnText}>{isEdit ? 'Update Entry' : 'Save Entry'}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  label: { fontWeight: '600', marginBottom: 6, color: '#333' },
  input: {
    borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 10,
    padding: 11, marginBottom: 16, fontSize: 14, backgroundColor: '#fff',
  },
  dropdown: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#C8E6C9',
    borderRadius: 10, marginTop: -12, marginBottom: 16,
  },
  dropItem: { padding: 11, borderBottomWidth: 1, borderBottomColor: '#F1F8E9' },
  selectedBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 16,
  },
  catBtn: {
    padding: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: '#C8E6C9',
    borderRadius: 10, alignItems: 'center', backgroundColor: '#fff',
  },
  catSelected: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  colHead: { fontSize: 10, color: '#888', textAlign: 'center' },
  cell: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 7,
    padding: 7, fontSize: 12, backgroundColor: '#fff', textAlign: 'center',
  },
  balCell: { justifyContent: 'center', alignItems: 'center' },
  totalsCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: '#C8E6C9',
  },
  saveBtn: { backgroundColor: '#2E7D32', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
