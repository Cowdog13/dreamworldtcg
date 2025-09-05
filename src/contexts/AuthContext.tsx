import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: any) => {
      if (firebaseUser) {
        const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
        const userData = userDoc.data();
        
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: userData?.displayName || firebaseUser.displayName || 'Unknown User'
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await auth.signInWithEmailAndPassword(email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user?.updateProfile({ displayName });
    
    await db.collection('users').doc(userCredential.user!.uid).set({
      email,
      displayName,
      createdAt: new Date()
    });
  };

  const signOut = async () => {
    await auth.signOut();
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};