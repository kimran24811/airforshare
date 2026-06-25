import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/config/firebase';
import { RootStackParamList } from './src/navigation/types';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import NewEntryScreen from './src/screens/NewEntryScreen';
import EntryDetailScreen from './src/screens/EntryDetailScreen';
import CustomerDetailScreen from './src/screens/CustomerDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  if (user === undefined) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Category" component={CategoryScreen} />
            <Stack.Screen name="NewEntry" component={NewEntryScreen} />
            <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
            <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
