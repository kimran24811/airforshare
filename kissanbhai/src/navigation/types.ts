export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Category: { category: 'pesticide' | 'solar' };
  NewEntry: { category?: 'pesticide' | 'solar' };
  EntryDetail: { transactionId: string };
  CustomerDetail: { customerId: string };
};
