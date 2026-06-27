import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth } from './src/config/firebase';
import { RootStackParamList } from './src/navigation/types';
import { authenticate } from './src/utils/biometric';
import { DataProvider } from './src/context/DataContext';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import NewEntryScreen from './src/screens/NewEntryScreen';
import EntryDetailScreen from './src/screens/EntryDetailScreen';
import CustomerDetailScreen from './src/screens/CustomerDetailScreen';
import RecycleBinScreen from './src/screens/RecycleBinScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

// ── Error boundary catches JS crashes and shows a readable message ────────────
interface EBState { error: Error | null }
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#C62828', marginBottom: 12 }}>
            Something went wrong
          </Text>
          <Text style={{ color: '#555', fontSize: 13, textAlign: 'center', marginBottom: 24 }}>
            {this.state.error.message}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ error: null })}
            style={{ backgroundColor: '#2E7D32', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ── Main app ──────────────────────────────────────────────────────────────────
function Main() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [biometricPassed, setBiometricPassed] = useState(false);
  const authHandled = React.useRef(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async u => {
      if (u) {
        if (authHandled.current) {
          setUser(u);
          setBiometricPassed(true);
          return;
        }
        authHandled.current = true;
        const ok = await authenticate('Verify your identity to open KissanBhai');
        if (ok) {
          setUser(u);
          setBiometricPassed(true);
        } else {
          authHandled.current = false;
          setUser(null);
          setBiometricPassed(false);
          signOut(auth).catch(() => {});
        }
      } else {
        authHandled.current = false;
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
    <DataProvider>
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
    </DataProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Main />
    </ErrorBoundary>
  );
}
