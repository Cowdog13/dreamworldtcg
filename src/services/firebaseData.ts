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
    console.log('createGame called with gameCode:', gameCode);
    const fb = await getFirebase();
    if (!fb) {
      console.error('Firebase not initialized in createGame');
      throw new Error('Firebase not initialized');
    }

    console.log('Creating game document with gameCode:', gameCode);
    const gameDocRef = fb.doc(fb.db, 'games', gameCode);

    // Ensure startedAt is serialized properly
    const gameData = {
      ...gameState,
      startedAt: gameState.startedAt instanceof Date ? gameState.startedAt.toISOString() : gameState.startedAt,
      lastUpdated: fb.serverTimestamp()
    };

    console.log('Writing game data to Firestore:', gameData);
    await fb.setDoc(gameDocRef, gameData);
    console.log('Game created successfully');

    return true;
  } catch (error) {
    console.error('Error creating game:', error);
    console.error('Error details:', error);
    return false;
  }
};

export const updateGame = async (gameCode: string, gameState: any) => {
  try {
    console.log('updateGame called with gameCode:', gameCode);
    const fb = await getFirebase();
    if (!fb) {
      console.error('Firebase not initialized in updateGame');
      throw new Error('Firebase not initialized');
    }

    const gameDocRef = fb.doc(fb.db, 'games', gameCode);

    // Ensure dates are serialized properly and remove undefined values
    const gameData: any = {
      ...gameState,
      startedAt: gameState.startedAt instanceof Date ? gameState.startedAt.toISOString() : gameState.startedAt,
      lastUpdated: fb.serverTimestamp()
    };

    // Only include endedAt if it's defined
    if (gameState.endedAt) {
      gameData.endedAt = gameState.endedAt instanceof Date ? gameState.endedAt.toISOString() : gameState.endedAt;
    }

    // Remove any undefined values from the data
    Object.keys(gameData).forEach(key => {
      if (gameData[key] === undefined) {
        delete gameData[key];
      }
    });

    console.log('Updating game data in Firestore');
    await fb.setDoc(gameDocRef, gameData, { merge: true });
    console.log('Game updated successfully');

    return true;
  } catch (error) {
    console.error('Error updating game:', error);
    console.error('Error details:', error);
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

      // Handle different date formats (Firestore Timestamp or ISO string)
      const parseDate = (dateField: any) => {
        if (!dateField) return new Date();
        if (typeof dateField === 'string') return new Date(dateField);
        if (dateField.toDate && typeof dateField.toDate === 'function') return dateField.toDate();
        return new Date();
      };

      return {
        ...data,
        startedAt: parseDate(data.startedAt),
        lastUpdated: parseDate(data.lastUpdated)
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

    // Helper to parse dates
    const parseDate = (dateField: any) => {
      if (!dateField) return new Date();
      if (typeof dateField === 'string') return new Date(dateField);
      if (dateField.toDate && typeof dateField.toDate === 'function') return dateField.toDate();
      return new Date();
    };

    const gameDocRef = fb.doc(fb.db, 'games', gameCode);

    const unsubscribe = fb.onSnapshot(gameDocRef, (doc: any) => {
      if (doc.exists()) {
        const data = doc.data();
        const gameState = {
          ...data,
          startedAt: parseDate(data.startedAt),
          lastUpdated: parseDate(data.lastUpdated)
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