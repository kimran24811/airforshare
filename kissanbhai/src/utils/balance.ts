import { Transaction, CustomerPayment } from '../types';

// Outstanding = transaction balances minus direct customer payments,
// clamped at zero per customer (overpayment never goes negative).
export function totalOutstanding(txns: Transaction[], payments: CustomerPayment[]): number {
  const byCustomer = new Map<string, number>();
  for (const t of txns) {
    if (t.deleted) continue;
    byCustomer.set(t.customerId, (byCustomer.get(t.customerId) ?? 0) + t.totalBalance);
  }
  for (const p of payments) {
    if (byCustomer.has(p.customerId)) {
      byCustomer.set(p.customerId, byCustomer.get(p.customerId)! - p.amount);
    }
  }
  let sum = 0;
  for (const v of byCustomer.values()) sum += Math.max(0, v);
  return sum;
}
