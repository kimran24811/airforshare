import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Transaction, Customer } from '../types';
import { formatCurrency } from './currency';

function dateStr(ts: any): string {
  return ts?.toDate?.()?.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) ?? '';
}

function makeFilename(customerName: string): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][now.getMonth()];
  const yyyy = now.getFullYear();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const safeName = customerName.replace(/[^\w\s]/g, '').trim().replace(/\s+/g, '_');
  return `${safeName}_${dd}-${mon}-${yyyy}_${hh}${mm}`;
}

export async function generateEntryPdf(txn: Transaction): Promise<void> {
  const itemRows = txn.items.map((item, i) => `
    <tr>
      <td style="padding:8px">${i + 1}. ${item.name}</td>
      <td style="padding:8px;text-align:right">${formatCurrency(item.price)}</td>
      <td style="padding:8px;text-align:right">${formatCurrency(item.paid)}</td>
      <td style="padding:8px;text-align:right;color:${item.balance > 0 ? '#C62828' : '#2E7D32'}">${formatCurrency(item.balance)}</td>
    </tr>
  `).join('');

  const payHistory = (txn.paymentHistory ?? []).map(p => `
    <tr>
      <td style="padding:6px">${dateStr(p.date)}</td>
      <td style="padding:6px;color:#2E7D32">${formatCurrency(p.amount)}</td>
      <td style="padding:6px;color:#666">${p.note || '—'}</td>
    </tr>
  `).join('');

  const html = `
    <html><body style="font-family:sans-serif;padding:24px;color:#222;max-width:600px;margin:auto">
      <div style="background:#2E7D32;color:#fff;padding:16px 20px;border-radius:8px;margin-bottom:20px">
        <h2 style="margin:0">KissanBhai — Entry Detail</h2>
      </div>
      <table style="width:100%;margin-bottom:16px">
        <tr><td><b>Customer</b></td><td>${txn.customerName}</td></tr>
        <tr><td><b>Category</b></td><td style="text-transform:capitalize">${txn.category}</td></tr>
        <tr><td><b>Date</b></td><td>${dateStr(txn.date)}</td></tr>
        ${txn.description ? `<tr><td><b>Note</b></td><td>${txn.description}</td></tr>` : ''}
      </table>
      <table width="100%" border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;border-color:#ddd">
        <tr style="background:#E8F5E9"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px;text-align:right">Price</th><th style="padding:8px;text-align:right">Paid</th><th style="padding:8px;text-align:right">Balance</th></tr>
        ${itemRows}
      </table>
      <div style="background:#f9f9f9;padding:14px;border-radius:6px;margin-bottom:16px">
        <p style="margin:4px 0"><b>Total: ${formatCurrency(txn.totalAmount)}</b></p>
        <p style="margin:4px 0;color:#2E7D32">Paid: ${formatCurrency(txn.totalPaid)}</p>
        <p style="margin:4px 0;color:${txn.totalBalance <= 0 ? '#2E7D32' : '#C62828'};font-weight:bold">
          ${txn.totalBalance <= 0 ? '✓ Fully Settled' : `Remaining: ${formatCurrency(txn.totalBalance)}`}
        </p>
      </div>
      ${payHistory ? `
        <h3>Payment History</h3>
        <table width="100%" border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-color:#ddd">
          <tr style="background:#E8F5E9"><th style="padding:6px;text-align:left">Date</th><th style="padding:6px;text-align:left">Amount</th><th style="padding:6px;text-align:left">Note</th></tr>
          ${payHistory}
        </table>
      ` : ''}
    </body></html>
  `;
  const { uri } = await Print.printToFileAsync({ html, base: makeFilename(txn.customerName) });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}

export async function generateCustomerPdf(customer: Customer, transactions: Transaction[]): Promise<void> {
  const active = transactions.filter(t => !t.deleted);
  const totalSales = active.reduce((s, t) => s + t.totalAmount, 0);
  const totalBalance = active.reduce((s, t) => s + t.totalBalance, 0);

  const rows = active.map(t => `
    <tr>
      <td style="padding:8px">${dateStr(t.date)}</td>
      <td style="padding:8px;text-transform:capitalize">${t.category}</td>
      <td style="padding:8px;text-align:right">${formatCurrency(t.totalAmount)}</td>
      <td style="padding:8px;text-align:right;color:#2E7D32">${formatCurrency(t.totalPaid)}</td>
      <td style="padding:8px;text-align:right;color:${t.totalBalance > 0 ? '#C62828' : '#2E7D32'}">
        ${t.totalBalance <= 0 ? '✓' : formatCurrency(t.totalBalance)}
      </td>
    </tr>
  `).join('');

  const html = `
    <html><body style="font-family:sans-serif;padding:24px;color:#222;max-width:600px;margin:auto">
      <div style="background:#2E7D32;color:#fff;padding:16px 20px;border-radius:8px;margin-bottom:20px">
        <h2 style="margin:0">KissanBhai — Customer Statement</h2>
      </div>
      <table style="width:100%;margin-bottom:16px">
        <tr><td><b>Customer</b></td><td>${customer.name}</td></tr>
        ${customer.phone ? `<tr><td><b>Phone</b></td><td>${customer.phone}</td></tr>` : ''}
        <tr><td><b>Total Sales</b></td><td style="color:#2E7D32">${formatCurrency(totalSales)}</td></tr>
        <tr><td><b>Outstanding</b></td><td style="color:${totalBalance > 0 ? '#C62828' : '#2E7D32'};font-weight:bold">${formatCurrency(totalBalance)}</td></tr>
      </table>
      <table width="100%" border="1" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border-color:#ddd">
        <tr style="background:#E8F5E9">
          <th style="padding:8px;text-align:left">Date</th>
          <th style="padding:8px;text-align:left">Category</th>
          <th style="padding:8px;text-align:right">Total</th>
          <th style="padding:8px;text-align:right">Paid</th>
          <th style="padding:8px;text-align:right">Balance</th>
        </tr>
        ${rows}
      </table>
    </body></html>
  `;
  const { uri } = await Print.printToFileAsync({ html, base: makeFilename(customer.name) });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}
