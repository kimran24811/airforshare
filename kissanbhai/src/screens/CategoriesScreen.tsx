import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { authenticate } from '../utils/biometric';
import { useData } from '../context/DataContext';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Categories'> };

const EMOJIS = ['🌿', '☀️', '🌾', '🐄', '🔧', '💊', '🌱', '🏗️', '💧', '🌻', '🍅', '🐓'];

export default function CategoriesScreen({ navigation }: Props) {
  const { categories, addCategory, deleteCategory } = useData();
  const [newName,  setNewName]  = useState('');
  const [newEmoji, setNewEmoji] = useState('🌿');
  const [saving,   setSaving]   = useState(false);

  const handleAdd = async () => {
    if (!newName.trim()) { Alert.alert('Enter a name'); return; }
    const ok = await authenticate('Confirm add category');
    if (!ok) return;
    setSaving(true);
    try {
      await addCategory(newName.trim().toLowerCase(), newEmoji);
      setNewName('');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await authenticate(`Confirm delete "${name}"`);
    if (!ok) return;
    Alert.alert('Delete Category', `Delete "${name}"? Existing entries won't be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deleteCategory(id); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <Text style={{ fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Business Categories</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={categories}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={s.card}>
            <Text style={{ fontWeight: '600', marginBottom: 10 }}>Add New Category</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
              {EMOJIS.map(e => (
                <TouchableOpacity key={e} onPress={() => setNewEmoji(e)}
                  style={[s.emojiBtn, newEmoji === e && s.emojiSelected]}>
                  <Text style={{ fontSize: 20 }}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[s.input, { flex: 1 }]}
                placeholder="e.g. fertilizer, seeds…"
                placeholderTextColor="#999"
                value={newName}
                onChangeText={setNewName}
              />
              <TouchableOpacity style={s.addBtn} onPress={handleAdd} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.catRow}>
            <Text style={{ fontSize: 26, marginRight: 12 }}>{item.emoji}</Text>
            <Text style={{ fontSize: 16, fontWeight: '600', flex: 1, textTransform: 'capitalize' }}>
              {item.name}
            </Text>
            <TouchableOpacity onPress={() => handleDelete(item.id, item.name)} style={s.delBtn}>
              <Text style={{ color: '#C62828', fontSize: 13, fontWeight: '600' }}>Delete</Text>
            </TouchableOpacity>
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
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2,
  },
  emojiBtn: { padding: 6, borderRadius: 8, margin: 3 },
  emojiSelected: { backgroundColor: '#C8E6C9' },
  input: {
    borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 10,
    padding: 10, fontSize: 14, backgroundColor: '#fff',
  },
  addBtn: {
    backgroundColor: '#2E7D32', borderRadius: 10,
    padding: 10, paddingHorizontal: 16, justifyContent: 'center',
  },
  delBtn: { padding: 8 },
});
