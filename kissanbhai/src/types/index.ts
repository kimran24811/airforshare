export interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt?: any;
}

export interface TransactionItem {
  name: string;
  price: number;
  paid: number;
  balance: number;
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  category: 'pesticide' | 'solar';
  items: TransactionItem[];
  description: string;
  totalAmount: number;
  totalPaid: number;
  totalBalance: number;
  date?: any;
}
