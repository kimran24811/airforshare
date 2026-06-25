import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e: any) {
      Alert.alert('Login Failed', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={s.logo}>🌾 KissanBhai</Text>
      <Text style={s.subtitle}>Business Bookkeeping</Text>

      <TextInput
        style={s.input}
        placeholder="Email address"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        returnKeyType="next"
      />
      <TextInput
        style={s.input}
        placeholder="Password"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        returnKeyType="done"
        onSubmitEditing={handleLogin}
      />

      <TouchableOpacity style={[s.btn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnText}>Sign In</Text>}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: '#FAFAFA' },
  logo: { fontSize: 36, fontWeight: 'bold', textAlign: 'center', color: '#2E7D32', marginBottom: 4 },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#888', marginBottom: 48 },
  input: {
    borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 10,
    padding: 14, marginBottom: 16, fontSize: 15, backgroundColor: '#fff',
  },
  btn: { backgroundColor: '#2E7D32', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
