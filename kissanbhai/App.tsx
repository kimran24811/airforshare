import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from './src/config/firebase';
import { RootStackParamList } from './src/navigation/types';
import { authenticate } from './src/utils/biometric';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import NewEntryScreen from './src/screens/NewEntryScreen';
import EntryDetailScreen from './src/screens/EntryDetailScreen';
import CustomerDetailScreen from './src/screens/CustomerDetailScreen';
import RecycleBinScreen from './src/screens/RecycleBinScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [biometricPassed, setBiometricPassed] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (u) {
        const ok = await authenticate('Verify your identity to open KissanBhai');
        if (ok) {
          setUser(u);
          setBiometricPassed(true);
        } else {
          await signOut(auth);
          setUser(null);
          setBiometricPassed(false);
        }
      } else {
        setUser(null);
        setBiometricPassed(false);
      }
    });
  }, []);

  if (user === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAFA' }}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user && biometricPassed ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Category" component={CategoryScreen} />
            <Stack.Screen name="NewEntry" component={NewEntryScreen} />
            <Stack.Screen name="EntryDetail" component={EntryDetailScreen} />
            <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} />
            <Stack.Screen name="RecycleBin" component={RecycleBinScreen} />
            <Stack.Screen name="Categories" component={CategoriesScreen} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
