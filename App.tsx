import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Dimensions, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import GameTracker from './src/components/GameTracker';
import { initializeFirebase } from './src/services/firebase';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(true);
  const [firebase, setFirebase] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      console.log('Initializing Firebase...');
      try {
        const fb = await initializeFirebase();
        console.log('Firebase initialized:', fb ? 'Success' : 'Failed');
        
        if (fb) {
          setFirebase(fb);
          console.log('Setting up auth state listener...');
          
          // Set up auth state listener
          fb.onAuthStateChanged(fb.auth, (user: any) => {
            console.log('Auth state changed:', user);
            if (user) {
              setUser({
                email: user.email,
                displayName: user.displayName || user.email,
                uid: user.uid
              });
            } else {
              setUser(null);
            }
            setLoading(false);
          });
        } else {
          console.error('Failed to initialize Firebase');
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing Firebase:', error);
        setLoading(false);
      }
    };
    
    init();
  }, []);

  const handleLogin = async () => {
    console.log('Login attempt:', { email, hasPassword: !!password, hasFirebase: !!firebase });
    if (!email || !password || !firebase) {
      console.log('Missing required fields for login');
      return;
    }
    setLoading(true);
    
    try {
      console.log('Attempting Firebase login...');
      await firebase.signInWithEmailAndPassword(firebase.auth, email, password);
      console.log('Login successful');
    } catch (error: any) {
      console.error('Login error:', error);
      setLoading(false);
      Alert.alert('Login Error', error.message);
    }
  };

  const handleRegister = async () => {
    console.log('Registration attempt:', { email, hasPassword: !!password, displayName, hasFirebase: !!firebase });
    if (!email || !password || !displayName || !firebase) {
      console.log('Missing required fields for registration');
      return;
    }
    setLoading(true);
    
    try {
      console.log('Attempting Firebase registration...');
      const userCredential = await firebase.createUserWithEmailAndPassword(firebase.auth, email, password);
      console.log('Registration successful, updating profile...');
      
      // Update profile with display name
      await firebase.updateProfile(userCredential.user, {
        displayName: displayName
      });
      console.log('Profile updated successfully');
    } catch (error: any) {
      console.error('Registration error:', error);
      setLoading(false);
      Alert.alert('Registration Error', error.message);
    }
  };

  const handleSignOut = async () => {
    if (firebase) {
      await firebase.signOut(firebase.auth);
    }
    setUser(null);
    setEmail('');
    setPassword('');
    setDisplayName('');
  };

  if (user) {
    return <GameTracker user={user} onSignOut={handleSignOut} />;
  }

  // Show loading state while Firebase is initializing
  if (loading && !firebase) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Dreamworld TCG</Text>
        <Text style={styles.subtitle}>Initializing...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Dreamworld TCG</Text>
        <Text style={styles.subtitle}>{isLogin ? 'Login' : 'Create Account'}</Text>
        
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
          />
        )}
        
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={isLogin ? handleLogin : handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Create Account')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={styles.linkText}>
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
      <StatusBar style="auto" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingHorizontal: Math.max(20, (Dimensions.get('window').width - 350) / 2),
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: '#666',
  },
  input: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 48,
  },
  button: {
    width: '100%',
    maxWidth: 350,
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    minHeight: 48,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
  },
  linkText: {
    color: '#007AFF',
    fontSize: 16,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
});