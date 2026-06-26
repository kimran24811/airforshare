export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Category: { category: string };
  NewEntry: { category?: string; editId?: string };
  EntryDetail: { transactionId: string };
  CustomerDetail: { customerId: string };
  RecycleBin: undefined;
  Categories: undefined;
};
