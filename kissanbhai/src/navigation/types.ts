export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Category: { category: string };
  NewEntry: { category?: string; editId?: string; customerId?: string; customerName?: string; quickMode?: boolean };
  EntryDetail: { transactionId: string };
  CustomerDetail: { customerId: string; category?: string };
  RecycleBin: undefined;
  Categories: undefined;
};
