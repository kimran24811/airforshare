import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Transaction } from '../types';
import { formatCurrency } from '../utils/currency';

interface Props {
  transaction: Transaction;
  onPress: () => void;
}

export default function TransactionCard({ transaction: t, onPress }: Props) {
  const dateStr =
    t.date?.toDate?.()?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' }) ?? '';
  const settled = t.totalBalance <= 0;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.7}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 14 }}>{t.category === 'pesticide' ? '🌿' : '☀️'}</Text>
            <Text style={s.name}>{t.customerName}</Text>
          </View>
          {t.description ? (
            <Text style={s.desc} numberOfLines={1}>{t.description}</Text>
          ) : null}
          <Text style={s.itemCount}>
            {t.items.length} item{t.items.length !== 1 ? 's' : ''}
            {'  ·  Total: '}
            {formatCurrency(t.totalAmount)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={s.date}>{dateStr}</Text>
          <Text style={[s.balance, { color: settled ? '#2E7D32' : '#C62828' }]}>
            {settled ? '✓ Settled' : formatCurrency(t.totalBalance)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
  },
  name: { fontWeight: 'bold', fontSize: 14 },
  desc: { color: '#888', fontSize: 12, marginTop: 2 },
  itemCount: { color: '#aaa', fontSize: 11, marginTop: 4 },
  date: { fontSize: 11, color: '#999' },
  balance: { fontWeight: 'bold', fontSize: 13, marginTop: 4 },
});
