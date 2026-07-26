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

export interface PaymentRecord {
  amount: number;
  note: string;
  date: any;
}

export interface Transaction {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  category: string;
  items: TransactionItem[];
  description: string;
  totalAmount: number;
  totalPaid: number;
  totalBalance: number;
  date?: any;
  editedAt?: any;
  deleted?: boolean;
  deletedAt?: any;
  paymentHistory?: PaymentRecord[];
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  createdAt?: any;
}

export interface CustomerPayment {
  id: string;
  customerId: string;
  customerName: string;
  category: string;
  amount: number;
  note: string;
  date?: any;
}
