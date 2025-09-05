import { initializeFirebase } from './firebase';

let firebase: any = null;

// Initialize Firebase instance
export const getFirebase = async () => {
  if (!firebase) {
    firebase = await initializeFirebase();
  }
  return firebase;
};

// User Data Operations
export const saveUserDecks = async (userId: string, decks: any[]) => {
  try {
    const fb = await getFirebase();
    if (!fb) throw new Error('Firebase not initialized');
    
    const userDocRef = fb.doc(fb.db, 'users', userId);
    await fb.setDoc(userDocRef, { decks }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving user decks:', error);
    return false;
  }
};

export const getUserDecks = async (userId: string): Promise<any[]> => {
  try {
    const fb = await getFirebase();
    if (!fb) throw new Error('Firebase not initialized');
    
    const userDocRef = fb.doc(fb.db, 'users', userId);
    const docSnap = await fb.getDoc(userDocRef);
    
    if (docSnap.exists()) {
      const decks = docSnap.data().decks || [];
      // Convert date strings back to Date objects
      return decks.map((deck: any) => ({
        ...deck,
        createdAt: deck.createdAt?.toDate ? deck.createdAt.toDate() : new Date(deck.createdAt),
        lastModified: deck.lastModified?.toDate ? deck.lastModified.toDate() : new Date(deck.lastModified)
      }));
    }
    return [];
  } catch (error) {
    console.error('Error getting user decks:', error);
    return [];
  }
};

// Match History Operations
export const saveMatchResult = async (userId: string, matchResult: any) => {
  try {
    const fb = await getFirebase();
    if (!fb) throw new Error('Firebase not initialized');
    
    const matchDocRef = fb.doc(fb.db, 'matches', matchResult.id);
    await fb.setDoc(matchDocRef, {
      ...matchResult,
      createdBy: userId,
      createdAt: fb.serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error saving match result:', error);
    return false;
  }
};

export const getUserMatches = async (userId: string): Promise<any[]> => {
  try {
    console.log('Getting matches for user:', userId);
    const fb = await getFirebase();
    if (!fb) throw new Error('Firebase not initialized');
    
    const matchesRef = fb.collection(fb.db, 'matches');
    console.log('Fetching all matches and filtering client-side to avoid index requirement');
    
    // Get all matches and filter client-side to avoid compound index requirement
    const allMatchesQuery = fb.query(matchesRef, fb.orderBy('startedAt', 'desc'));
    const querySnapshot = await fb.getDocs(allMatchesQuery);
    console.log('Total matches retrieved:', querySnapshot.size);
    
    const matches: any[] = [];
    
    querySnapshot.forEach((doc: any) => {
      const data = doc.data();
      // Check if user is in the players object
      if (data.players && data.players[userId]) {
        console.log('User match found:', {
          id: doc.id,
          gameCode: data.gameCode,
          players: Object.keys(data.players || {}),
          startedAt: data.startedAt
        });
        matches.push({
          ...data,
          startedAt: data.startedAt?.toDate() || new Date(data.startedAt),
          endedAt: data.endedAt?.toDate() || new Date(data.endedAt)
        });
      }
    });
    
    console.log('Filtered user matches:', matches.length);
    return matches;
  } catch (error) {
    console.error('Error getting user matches:', error);
    console.error('Error details:', error);
    return [];
  }
};

// Real-time Game State Operations
export const createGame = async (gameCode: string, gameState: any) => {
  try {
    const fb = await getFirebase();
    if (!fb) throw new Error('Firebase not initialized');
    
    const gameDocRef = fb.doc(fb.db, 'games', gameCode);
    await fb.setDoc(gameDocRef, {
      ...gameState,
      lastUpdated: fb.serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error creating game:', error);
    return false;
  }
};

export const updateGame = async (gameCode: string, gameState: any) => {
  try {
    const fb = await getFirebase();
    if (!fb) throw new Error('Firebase not initialized');
    
    const gameDocRef = fb.doc(fb.db, 'games', gameCode);
    await fb.updateDoc(gameDocRef, {
      ...gameState,
      lastUpdated: fb.serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating game:', error);
    return false;
  }
};

export const getGame = async (gameCode: string): Promise<any | null> => {
  try {
    console.log('Getting game with code:', gameCode);
    const fb = await getFirebase();
    if (!fb) {
      console.error('Firebase not initialized');
      throw new Error('Firebase not initialized');
    }
    
    console.log('Firebase initialized, getting document...');
    const gameDocRef = fb.doc(fb.db, 'games', gameCode);
    const docSnap = await fb.getDoc(gameDocRef);
    
    console.log('Document exists:', docSnap.exists());
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('Game data retrieved:', data);
      return {
        ...data,
        startedAt: data.startedAt?.toDate() || new Date(data.startedAt),
        lastUpdated: data.lastUpdated?.toDate() || new Date()
      };
    }
    console.log('No document found for game code:', gameCode);
    return null;
  } catch (error) {
    console.error('Error getting game:', error);
    console.error('Error details:', error.code, error.message);
    return null;
  }
};

export const subscribeToGame = async (gameCode: string, callback: (gameState: any) => void) => {
  try {
    const fb = await getFirebase();
    if (!fb) throw new Error('Firebase not initialized');
    
    const gameDocRef = fb.doc(fb.db, 'games', gameCode);
    
    const unsubscribe = fb.onSnapshot(gameDocRef, (doc: any) => {
      if (doc.exists()) {
        const data = doc.data();
        const gameState = {
          ...data,
          startedAt: data.startedAt?.toDate() || new Date(data.startedAt),
          lastUpdated: data.lastUpdated?.toDate() || new Date()
        };
        callback(gameState);
      } else {
        callback(null);
      }
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to game:', error);
    return null;
  }
};

export const deleteGame = async (gameCode: string) => {
  try {
    const fb = await getFirebase();
    if (!fb) throw new Error('Firebase not initialized');
    
    const gameDocRef = fb.doc(fb.db, 'games', gameCode);
    await fb.deleteDoc(gameDocRef);
    
    return true;
  } catch (error) {
    console.error('Error deleting game:', error);
    return false;
  }
};