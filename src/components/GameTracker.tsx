import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import HistoryScreen from '../screens/HistoryScreen';
import CardBrowser from './CardBrowser';
import DeckBuilder from './DeckBuilder';
import DeckLibrary from './DeckLibrary';
import { initializeCardDatabase } from '../services/cardDatabase';
import { loadDreamseekerMatches } from '../services/dreamseekerMatching';
import { 
  getUserDecks,
  saveMatchResult as saveFirebaseMatchResult,
  createGame as createFirebaseGame,
  updateGame as updateFirebaseGame,
  getGame as getFirebaseGame,
  subscribeToGame
} from '../services/firebaseData';

interface GameTrackerProps {
  user: any;
  onSignOut: () => void;
}

interface PlayerState {
  id: string;
  name: string;
  morale: number;
  energy: number;
  maxEnergyThisTurn: number;
  isHost: boolean;
  deckUsed?: string;
}

interface RoundResult {
  roundNumber: number;
  endTurn: number;
  playerMorale: { [playerId: string]: number };
  winner?: string;
  endReason: 'morale_0_or_below' | 'morale_100_or_above' | 'surrender';
}

interface MatchResult {
  id: string;
  gameCode: string;
  players: { [playerId: string]: { name: string; deckUsed?: string } };
  rounds: RoundResult[];
  winner: string;
  winType: 'normal' | 'surrender';
  startedAt: Date;
  endedAt: Date;
}

interface GameState {
  players: { [key: string]: PlayerState };
  currentTurn: number;
  currentRound: number;
  priorityPlayerId: string;
  gameStatus: 'setup' | 'active' | 'ended';
  winner?: string;
  gameCode?: string;
  rounds: RoundResult[];
  startedAt?: Date;
}

const GameTracker: React.FC<GameTrackerProps> = ({ user, onSignOut }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showCreateGame, setShowCreateGame] = useState(false);
  const [showJoinGame, setShowJoinGame] = useState(false);
  const [gameCode, setGameCode] = useState('');
  const [showSurrenderModal, setShowSurrenderModal] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [showCardBrowser, setShowCardBrowser] = useState(false);
  const [showDeckBuilder, setShowDeckBuilder] = useState(false);
  const [showDeckLibrary, setShowDeckLibrary] = useState(false);
  const [editingDeck, setEditingDeck] = useState<any>(null);
  const [selectedDeck, setSelectedDeck] = useState<any>(null);
  const [availableDecks, setAvailableDecks] = useState<any[]>([]);
  const [gameSubscription, setGameSubscription] = useState<any>(null);

  const userId = user.uid || user.email;

  useEffect(() => {
    loadAvailableDecks();
    
    // Cleanup subscription on unmount
    return () => {
      if (gameSubscription) {
        gameSubscription();
      }
    };
  }, [gameSubscription]);

  // Load available decks from Firebase
  const loadAvailableDecks = async () => {
    try {
      const savedDecks = await getUserDecks(user.uid || user.email);
      setAvailableDecks(savedDecks);
    } catch (error) {
      console.error('Failed to load decks:', error);
      setAvailableDecks([]);
    }
  };

  // Helper functions for Firebase
  const saveMatchResult = async (match: MatchResult) => {
    try {
      console.log('Saving match result:', match);
      console.log('User ID for save:', user.uid || user.email);
      const result = await saveFirebaseMatchResult(user.uid || user.email, match);
      console.log('Save result:', result);
      if (result) {
        console.log('Match saved successfully!');
      } else {
        console.error('Match save failed - no result returned');
      }
    } catch (error) {
      console.error('Failed to save match:', error);
      console.error('Error details:', error);
    }
  };

  // Real-time updates using Firebase subscriptions
  React.useEffect(() => {
    if (!gameState?.gameCode) return;

    const setupSubscription = async () => {
      // Clean up existing subscription
      if (gameSubscription) {
        gameSubscription();
      }

      // Set up new subscription
      const unsubscribe = await subscribeToGame(gameState.gameCode!, (updatedGameState) => {
        if (updatedGameState && JSON.stringify(updatedGameState) !== JSON.stringify(gameState)) {
          setGameState(updatedGameState);
        }
      });
      
      if (unsubscribe) {
        setGameSubscription(() => unsubscribe);
      }
    };

    setupSubscription();
  }, [gameState?.gameCode]);

  const generateGameCode = () => {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  };

  const createGame = async () => {
    const code = generateGameCode();
    const hostPlayer: PlayerState = {
      id: userId,
      name: user.displayName || user.email,
      morale: 50, // Always start at 50
      energy: 0,
      maxEnergyThisTurn: 0,
      isHost: true,
      deckUsed: selectedDeck?.name || 'No Deck Selected',
    };

    const newGame: GameState = {
      players: { [userId]: hostPlayer },
      currentTurn: 1,
      currentRound: 1,
      priorityPlayerId: userId, // Will be randomized when second player joins
      gameStatus: 'setup',
      gameCode: code,
      rounds: [],
      startedAt: new Date(),
    };

    // Store game in Firebase
    await createFirebaseGame(code, newGame);
    setGameState(newGame);
    setShowCreateGame(false);
    setSelectedDeck(null);
    const deckMessage = selectedDeck ? `\nDeck: ${selectedDeck.name}` : '\nNo deck selected';
    window.alert(`Game Created!\nGame Code: ${code}\n\nShare this code with your opponent to join the game.${deckMessage}`);
  };

  const joinGame = async () => {
    if (!gameCode.trim()) {
      window.alert('Please enter a game code');
      return;
    }
    
    try {
      const code = gameCode.trim().toUpperCase();
      console.log('Attempting to join game:', code);
      console.log('User ID:', userId);
      
      const existingGame = await getFirebaseGame(code);
      console.log('Existing game:', existingGame);
      
      if (!existingGame) {
        window.alert('Game not found. Check the code and try again.');
        return;
      }
      
      if (existingGame.players[userId]) {
        window.alert('You are already in this game.');
        return;
      }
      
      if (Object.keys(existingGame.players).length >= 2) {
        window.alert('This game is full.');
        return;
      }
    
    const guestPlayer: PlayerState = {
      id: userId,
      name: user.displayName || user.email,
      morale: 50, // Always start at 50
      energy: 0,
      maxEnergyThisTurn: 0,
      isHost: false,
      deckUsed: selectedDeck?.name || 'No Deck Selected',
    };

    // Randomly decide who goes first
    const playerIds = [...Object.keys(existingGame.players), userId];
    const firstPlayer = playerIds[Math.floor(Math.random() * playerIds.length)];

    const joinedGame: GameState = {
      ...existingGame,
      players: {
        ...existingGame.players,
        [userId]: guestPlayer,
      },
      priorityPlayerId: firstPlayer,
      gameStatus: 'active',
    };

    console.log('Joined game:', joinedGame);
    
      // Update Firebase
      await updateFirebaseGame(code, joinedGame);
      setGameState(joinedGame);
      setShowJoinGame(false);
      setGameCode('');
      setSelectedDeck(null);
    } catch (error) {
      console.error('Error joining game:', error);
      window.alert('Failed to join game. Please try again.');
    }
  };

  const adjustValue = async (playerId: string, type: 'morale' | 'energy', amount: number) => {
    if (!gameState) return;

    const updateGameState = async (updatedGame: GameState) => {
      // Update local state
      setGameState(updatedGame);
      // Update Firebase for real-time synchronization
      if (updatedGame.gameCode) {
        await updateFirebaseGame(updatedGame.gameCode, updatedGame);
      }
    };

    const updatedGame = { ...gameState };
    const player = updatedGame.players[playerId];
    const newPlayer = { ...player };
    
    if (type === 'morale') {
      // Remove limits - allow any value
      newPlayer.morale = player.morale + amount;
    } else {
      const newEnergy = Math.max(0, player.energy + amount);
      newPlayer.energy = newEnergy;
      newPlayer.maxEnergyThisTurn = Math.max(newPlayer.maxEnergyThisTurn, newEnergy);
    }

    updatedGame.players[playerId] = newPlayer;
    await updateGameState(updatedGame);
  };

  const nextTurn = async () => {
    if (!gameState) return;

    const updateGameState = async (updatedGame: GameState) => {
      setGameState(updatedGame);
      if (updatedGame.gameCode) {
        await updateFirebaseGame(updatedGame.gameCode, updatedGame);
      }
    };

    const updatedGame = { ...gameState };
    const playerIds = Object.keys(updatedGame.players);
    
    // Check for round end conditions
    const moraleConditions = playerIds.map(id => ({
      playerId: id,
      morale: updatedGame.players[id].morale
    }));
    
    const hasWinCondition = moraleConditions.some(p => p.morale <= 0 || p.morale >= 100);

    if (hasWinCondition) {
      // Determine round winner and end reason
      const zeroMoralePlayer = moraleConditions.find(p => p.morale <= 0);
      const hundredMoralePlayer = moraleConditions.find(p => p.morale >= 100);
      
      let roundWinner: string | undefined;
      let endReason: 'morale_0_or_below' | 'morale_100_or_above';
      
      if (zeroMoralePlayer) {
        roundWinner = playerIds.find(id => id !== zeroMoralePlayer.playerId);
        endReason = 'morale_0_or_below';
      } else if (hundredMoralePlayer) {
        roundWinner = hundredMoralePlayer.playerId;
        endReason = 'morale_100_or_above';
      }

      // Create round result
      const roundResult: RoundResult = {
        roundNumber: updatedGame.currentRound,
        endTurn: updatedGame.currentTurn,
        playerMorale: {},
        winner: roundWinner,
        endReason: endReason!
      };
      
      playerIds.forEach(id => {
        roundResult.playerMorale[id] = updatedGame.players[id].morale;
      });

      updatedGame.rounds.push(roundResult);

      if (updatedGame.currentRound === 1) {
        // End of first round - reset for second round
        playerIds.forEach(id => {
          updatedGame.players[id] = {
            ...updatedGame.players[id],
            morale: 50, // Reset to 50
            energy: 0,
            maxEnergyThisTurn: 0,
          };
        });

        // Switch priority
        const currentPriorityIndex = playerIds.indexOf(updatedGame.priorityPlayerId);
        const nextPriorityId = playerIds[(currentPriorityIndex + 1) % playerIds.length];

        updatedGame.currentRound = 2;
        updatedGame.currentTurn = 1;
        updatedGame.priorityPlayerId = nextPriorityId;
      } else {
        // End of second round - determine overall winner and save match
        const roundWinners = updatedGame.rounds.map(r => r.winner);
        const player1Wins = roundWinners.filter(w => w === playerIds[0]).length;
        const player2Wins = roundWinners.filter(w => w === playerIds[1]).length;
        
        let overallWinner: string;
        if (player1Wins > player2Wins) {
          overallWinner = playerIds[0];
        } else if (player2Wins > player1Wins) {
          overallWinner = playerIds[1];
        } else {
          // Tied rounds - determine by largest morale difference
          const round1Diff = Math.abs(updatedGame.rounds[0].playerMorale[playerIds[0]] - updatedGame.rounds[0].playerMorale[playerIds[1]]);
          const round2Diff = Math.abs(updatedGame.rounds[1].playerMorale[playerIds[0]] - updatedGame.rounds[1].playerMorale[playerIds[1]]);
          
          if (round1Diff > round2Diff) {
            overallWinner = updatedGame.rounds[0].winner!;
          } else if (round2Diff > round1Diff) {
            overallWinner = updatedGame.rounds[1].winner!;
          } else {
            // Even tie - first round winner wins
            overallWinner = updatedGame.rounds[0].winner!;
          }
        }

        updatedGame.winner = overallWinner;
        updatedGame.gameStatus = 'ended';

        // Save match result
        const matchResult: MatchResult = {
          id: `${updatedGame.gameCode}_${Date.now()}`,
          gameCode: updatedGame.gameCode!,
          players: {},
          rounds: updatedGame.rounds,
          winner: overallWinner,
          winType: 'normal',
          startedAt: updatedGame.startedAt!,
          endedAt: new Date()
        };

        playerIds.forEach(id => {
          matchResult.players[id] = {
            name: updatedGame.players[id].name,
            deckUsed: updatedGame.players[id].deckUsed
          };
        });

        await saveMatchResult(matchResult);
      }
    } else {
      // Regular turn advancement
      // Reset energy to max from previous turn
      playerIds.forEach(id => {
        const player = updatedGame.players[id];
        updatedGame.players[id] = {
          ...player,
          energy: player.maxEnergyThisTurn,
          maxEnergyThisTurn: player.maxEnergyThisTurn,
        };
      });

      // Switch priority
      const currentPriorityIndex = playerIds.indexOf(updatedGame.priorityPlayerId);
      const nextPriorityId = playerIds[(currentPriorityIndex + 1) % playerIds.length];

      updatedGame.currentTurn += 1;
      updatedGame.priorityPlayerId = nextPriorityId;
    }

    await updateGameState(updatedGame);
  };

  const handleSurrender = () => {
    console.log('Surrender button clicked');
    console.log('Current gameState:', gameState);
    
    if (!gameState) {
      console.log('No gameState available');
      return;
    }

    console.log('Showing surrender modal');
    setShowSurrenderModal(true);
  };

  const confirmSurrender = async () => {
    console.log('Confirming surrender...');
    if (!gameState) {
      console.log('No game state');
      return;
    }

    const playerIds = Object.keys(gameState.players);
    console.log('All player IDs:', playerIds);
    console.log('Current user ID:', userId);
    const opponentId = playerIds.find(id => id !== userId);
    
    if (!opponentId) {
      console.log('No opponent found - single player game, ending game');
      // Handle single-player surrender (end the game)
      setGameState(null);
      setSelectedDeck(null);
      setShowSurrenderModal(false);
      return;
    }

    console.log('Processing surrender for game:', gameState.gameCode);
    const updatedGame = { ...gameState };
    
    // Create surrender round result
    const surrenderRound: RoundResult = {
      roundNumber: updatedGame.currentRound,
      endTurn: updatedGame.currentTurn,
      playerMorale: {},
      winner: opponentId,
      endReason: 'surrender'
    };
    
    playerIds.forEach(id => {
      surrenderRound.playerMorale[id] = updatedGame.players[id].morale;
    });

    updatedGame.rounds.push(surrenderRound);
    updatedGame.winner = opponentId;
    updatedGame.gameStatus = 'ended';

    // Save surrender match result
    const matchResult: MatchResult = {
      id: `${updatedGame.gameCode}_${Date.now()}`,
      gameCode: updatedGame.gameCode!,
      players: {},
      rounds: updatedGame.rounds,
      winner: opponentId,
      winType: 'surrender',
      startedAt: updatedGame.startedAt!,
      endedAt: new Date()
    };

    playerIds.forEach(id => {
      matchResult.players[id] = {
        name: updatedGame.players[id].name,
        deckUsed: updatedGame.players[id].deckUsed
      };
    });

    await saveMatchResult(matchResult);
    
    // Update game state
    if (updatedGame.gameCode) {
      console.log('Updating Firebase with surrender result');
      await updateFirebaseGame(updatedGame.gameCode, updatedGame);
    }
    console.log('Surrender complete, updating local state');
    setGameState(updatedGame);
    setShowSurrenderModal(false);
    console.log('Surrender modal closed');
  };

  const exitGame = () => {
    const confirmed = window.confirm('Are you sure you want to exit the game?');
    if (confirmed) {
      // Clean up subscription
      if (gameSubscription) {
        gameSubscription();
        setGameSubscription(null);
      }
      setGameState(null);
      setSelectedDeck(null);
    }
  };

  // Initialize card database and Dreamseeker matches on component mount
  React.useEffect(() => {
    const initializeData = async () => {
      await initializeCardDatabase();
      await loadDreamseekerMatches();
    };
    
    initializeData();
  }, []);

  // Show statistics screen
  if (showStatistics) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setShowStatistics(false)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Match History</Text>
          <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
        <HistoryScreen currentUser={user.email} />
      </View>
    );
  }

  // Show card browser screen
  if (showCardBrowser) {
    return <CardBrowser onBack={() => setShowCardBrowser(false)} />;
  }

  // Show deck builder screen
  if (showDeckBuilder) {
    return (
      <DeckBuilder 
        onBack={() => {
          setShowDeckBuilder(false);
          setEditingDeck(null);
        }}
        existingDeck={editingDeck}
      />
    );
  }

  // Show deck library screen
  if (showDeckLibrary) {
    return (
      <DeckLibrary 
        onBack={() => setShowDeckLibrary(false)}
        onEditDeck={(deck) => {
          setEditingDeck(deck);
          setShowDeckLibrary(false);
          setShowDeckBuilder(true);
        }}
        onNewDeck={() => {
          setEditingDeck(null);
          setShowDeckLibrary(false);
          setShowDeckBuilder(true);
        }}
        currentUser={userId}
      />
    );
  }

  if (!gameState) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Dreamworld TCG</Text>
          <TouchableOpacity style={styles.signOutButton} onPress={onSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.welcome}>Welcome, {user.displayName}!</Text>
          
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => setShowCreateGame(true)}
          >
            <Text style={styles.primaryButtonText}>Create Game</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.secondaryButton} 
            onPress={() => setShowJoinGame(true)}
          >
            <Text style={styles.secondaryButtonText}>Join Game</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statisticsButton} 
            onPress={() => setShowStatistics(true)}
          >
            <Text style={styles.statisticsButtonText}>View Statistics</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.cardBrowserButton} 
            onPress={() => setShowCardBrowser(true)}
          >
            <Text style={styles.cardBrowserButtonText}>Browse Cards</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deckLibraryButton} 
            onPress={() => setShowDeckLibrary(true)}
          >
            <Text style={styles.deckLibraryButtonText}>My Decks</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deckBuilderButton} 
            onPress={() => setShowDeckBuilder(true)}
          >
            <Text style={styles.deckBuilderButtonText}>Build Deck</Text>
          </TouchableOpacity>
        </View>

        {/* Create Game Modal */}
        <Modal visible={showCreateGame} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Create Game</Text>
              <Text style={styles.modalSubtitle}>Starting morale will be 50 for both players</Text>
              
              {/* Deck Selection */}
              <View style={styles.deckSelectionSection}>
                <Text style={styles.deckSelectionTitle}>Select Deck (Optional)</Text>
                <ScrollView style={styles.deckList} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity 
                    style={[styles.deckOption, !selectedDeck && styles.selectedDeck]}
                    onPress={() => setSelectedDeck(null)}
                  >
                    <Text style={styles.deckOptionText}>No Deck</Text>
                    <Text style={styles.deckOptionSubtext}>Track match without deck</Text>
                  </TouchableOpacity>
                  {availableDecks.map((deck) => (
                    <TouchableOpacity
                      key={deck.id}
                      style={[styles.deckOption, selectedDeck?.id === deck.id && styles.selectedDeck]}
                      onPress={() => setSelectedDeck(deck)}
                    >
                      <Text style={styles.deckOptionText}>{deck.name}</Text>
                      <Text style={styles.deckOptionSubtext}>
                        {deck.dreamseeker?.Name || 'No Dreamseeker'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowCreateGame(false);
                    setSelectedDeck(null);
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalCreateButton}
                  onPress={createGame}
                >
                  <Text style={styles.modalCreateText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Join Game Modal */}
        <Modal visible={showJoinGame} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Join Game</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter game code"
                value={gameCode}
                onChangeText={setGameCode}
                autoCapitalize="characters"
              />
              <Text style={styles.modalSubtitle}>Starting morale will be 50 for both players</Text>
              
              {/* Deck Selection */}
              <View style={styles.deckSelectionSection}>
                <Text style={styles.deckSelectionTitle}>Select Deck (Optional)</Text>
                <ScrollView style={styles.deckList} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity 
                    style={[styles.deckOption, !selectedDeck && styles.selectedDeck]}
                    onPress={() => setSelectedDeck(null)}
                  >
                    <Text style={styles.deckOptionText}>No Deck</Text>
                    <Text style={styles.deckOptionSubtext}>Track match without deck</Text>
                  </TouchableOpacity>
                  {availableDecks.map((deck) => (
                    <TouchableOpacity
                      key={deck.id}
                      style={[styles.deckOption, selectedDeck?.id === deck.id && styles.selectedDeck]}
                      onPress={() => setSelectedDeck(deck)}
                    >
                      <Text style={styles.deckOptionText}>{deck.name}</Text>
                      <Text style={styles.deckOptionSubtext}>
                        {deck.dreamseeker?.Name || 'No Dreamseeker'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowJoinGame(false);
                    setGameCode('');
                    setSelectedDeck(null);
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.modalCreateButton}
                  onPress={joinGame}
                >
                  <Text style={styles.modalCreateText}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <StatusBar style="auto" />
      </View>
    );
  }

  const playerIds = Object.keys(gameState.players);
  const currentPlayer = gameState.players[userId];
  const otherPlayerId = playerIds.find(id => id !== userId);
  const otherPlayer = otherPlayerId ? gameState.players[otherPlayerId] : null;

  // Game ended - show results screen
  if (gameState.gameStatus === 'ended') {
    const isWinner = gameState.winner === userId;
    const winnerName = gameState.players[gameState.winner!]?.name;
    const isSurrenderWin = gameState.rounds.some(r => r.endReason === 'surrender');
    
    return (
      <View style={styles.gameContainer}>
        <View style={styles.gameHeader}>
          <TouchableOpacity style={styles.exitButton} onPress={exitGame}>
            <Text style={styles.exitText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.gameCode}>Game Complete</Text>
          <View />
        </View>

        <View style={styles.endGameContainer}>
          <Text style={styles.endGameTitle}>
            {isWinner ? '🎉 Victory!' : '💔 Defeat'}
          </Text>
          
          <Text style={styles.endGameWinner}>
            {winnerName} wins the match{isSurrenderWin ? ' by surrender!' : '!'}
          </Text>

          <View style={styles.roundSummary}>
            <Text style={styles.roundSummaryTitle}>Match Summary</Text>
            
            {gameState.rounds.map((round, index) => (
              <View key={index} style={styles.roundResult}>
                <Text style={styles.roundTitle}>Round {round.roundNumber}</Text>
                <Text style={styles.roundWinner}>
                  Winner: {gameState.players[round.winner!]?.name}
                </Text>
                <Text style={styles.roundDetails}>
                  Ended on turn {round.endTurn} ({
                    round.endReason === 'morale_0_or_below' ? 'Morale ≤ 0' : 
                    round.endReason === 'morale_100_or_above' ? 'Morale ≥ 100' :
                    'Surrender'
                  })
                </Text>
                
                <View style={styles.finalMoraleContainer}>
                  <Text style={styles.finalMoraleTitle}>Final Morale:</Text>
                  {playerIds.map(playerId => (
                    <Text key={playerId} style={styles.finalMoraleValue}>
                      {gameState.players[playerId].name}: {round.playerMorale[playerId]}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.newGameButton} onPress={() => {
            setGameState(null);
            setSelectedDeck(null);
          }}>
            <Text style={styles.newGameButtonText}>Start New Game</Text>
          </TouchableOpacity>
        </View>

        <StatusBar style="auto" />
      </View>
    );
  }

  // Game is active - show the tracker

  return (
    <ScrollView style={styles.gameContainer} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <View style={styles.gameHeader}>
        <TouchableOpacity style={styles.exitButton} onPress={exitGame}>
          <Text style={styles.exitText}>← Exit</Text>
        </TouchableOpacity>
        <Text style={styles.gameCode}>Code: {gameState.gameCode}</Text>
        <Text style={styles.gameStatus}>Round {gameState.currentRound}</Text>
      </View>

      {/* Opponent (Top) */}
      {otherPlayer && (
        <View style={[styles.playerSection, styles.topPlayer]}>
          <Text style={styles.playerName}>
            {otherPlayer.name} {gameState.priorityPlayerId === otherPlayerId ? '👑' : ''}
          </Text>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Morale</Text>
              <Text style={styles.statValue}>{otherPlayer.morale}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Energy</Text>
              <Text style={styles.statValue}>{otherPlayer.energy}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Center - Turn Info */}
      <View style={styles.centerSection}>
        <Text style={styles.turnInfo}>Turn {gameState.currentTurn}</Text>
        <Text style={styles.debugText}>Game Status: {gameState.gameStatus}</Text>
        <TouchableOpacity style={styles.nextTurnButton} onPress={nextTurn}>
          <Text style={styles.nextTurnText}>Next Turn</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.surrenderButton} 
          onPress={() => {
            console.log('Surrender button pressed!');
            handleSurrender();
          }}
        >
          <Text style={styles.surrenderText}>🏳️ Surrender</Text>
        </TouchableOpacity>
      </View>

      {/* Current Player (Bottom) */}
      <View style={[styles.playerSection, styles.bottomPlayer]}>
        <Text style={styles.playerName}>
          {currentPlayer.name} {gameState.priorityPlayerId === userId ? '👑' : ''}
        </Text>
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Morale</Text>
            <Text style={styles.statValue}>{currentPlayer.morale}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.adjustButton}
                onPress={() => adjustValue(userId, 'morale', -5)}
              >
                <Text style={styles.adjustButtonText}>-5</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.adjustButton}
                onPress={() => adjustValue(userId, 'morale', -1)}
              >
                <Text style={styles.adjustButtonText}>-1</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.adjustButton}
                onPress={() => adjustValue(userId, 'morale', 1)}
              >
                <Text style={styles.adjustButtonText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.adjustButton}
                onPress={() => adjustValue(userId, 'morale', 5)}
              >
                <Text style={styles.adjustButtonText}>+5</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Energy</Text>
            <Text style={styles.statValue}>{currentPlayer.energy}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.adjustButton}
                onPress={() => adjustValue(userId, 'energy', -5)}
              >
                <Text style={styles.adjustButtonText}>-5</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.adjustButton}
                onPress={() => adjustValue(userId, 'energy', -1)}
              >
                <Text style={styles.adjustButtonText}>-1</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.adjustButton}
                onPress={() => adjustValue(userId, 'energy', 1)}
              >
                <Text style={styles.adjustButtonText}>+1</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.adjustButton}
                onPress={() => adjustValue(userId, 'energy', 5)}
              >
                <Text style={styles.adjustButtonText}>+5</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Surrender Confirmation Modal */}
      <Modal visible={showSurrenderModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Surrender Game?</Text>
            <Text style={styles.surrenderWarning}>
              Are you sure you want to surrender? This will end the game immediately and count as a loss for you.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowSurrenderModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.surrenderConfirmButton}
                onPress={async () => {
                  try {
                    await confirmSurrender();
                  } catch (error) {
                    console.error('Surrender failed:', error);
                    window.alert('Failed to surrender. Please try again.');
                  }
                }}
              >
                <Text style={styles.surrenderConfirmText}>Surrender</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StatusBar style="auto" />
    </ScrollView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  signOutButton: {
    padding: 8,
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingHorizontal: Math.max(20, (Dimensions.get('window').width - 350) / 2),
  },
  welcome: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginBottom: 15,
    width: '100%',
    maxWidth: 300,
    minHeight: 48,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
    width: '100%',
    maxWidth: 300,
    minHeight: 48,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  statisticsButton: {
    backgroundColor: '#28a745',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 15,
    width: '100%',
    maxWidth: 300,
    minHeight: 48,
  },
  statisticsButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cardBrowserButton: {
    backgroundColor: '#6f42c1',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 15,
    width: '100%',
    maxWidth: 300,
    minHeight: 48,
  },
  cardBrowserButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  deckLibraryButton: {
    backgroundColor: '#fd7e14',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 15,
    width: '100%',
    maxWidth: 300,
    minHeight: 48,
  },
  deckLibraryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  deckBuilderButton: {
    backgroundColor: '#e83e8c',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginTop: 15,
    width: '100%',
    maxWidth: 300,
    minHeight: 48,
  },
  deckBuilderButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    marginRight: 10,
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
  },
  modalCreateButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  modalCreateText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  gameContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    minHeight: '100vh',
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Math.max(10, Dimensions.get('window').width > 600 ? 15 : 8),
    paddingVertical: Math.max(8, Dimensions.get('window').height > 600 ? 12 : 6),
    backgroundColor: '#333',
    minHeight: Math.max(50, Dimensions.get('window').height > 600 ? 60 : 45),
  },
  exitButton: {
    padding: 12,
    minWidth: 60,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exitText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  gameCode: {
    color: '#fff',
    fontSize: Math.max(12, Dimensions.get('window').height > 600 ? 16 : 14),
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  gameStatus: {
    color: '#fff',
    fontSize: Math.max(12, Dimensions.get('window').height > 600 ? 16 : 14),
    textAlign: 'right',
  },
  playerSection: {
    flex: Dimensions.get('window').height < 500 ? 0 : 1,
    minHeight: Math.max(120, Dimensions.get('window').height < 500 ? 110 : Dimensions.get('window').height < 600 ? 130 : 160),
    maxHeight: Dimensions.get('window').height < 500 ? 150 : 'auto',
    justifyContent: 'center',
    paddingHorizontal: Math.max(10, Dimensions.get('window').width > 600 ? 15 : 8),
    paddingVertical: Math.max(6, Dimensions.get('window').height > 600 ? 15 : 8),
  },
  topPlayer: {
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  bottomPlayer: {
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  playerName: {
    color: '#fff',
    fontSize: Math.max(16, Dimensions.get('window').height > 600 ? 20 : 16),
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: Math.max(8, Dimensions.get('window').height > 600 ? 15 : 10),
  },
  upsideDown: {
    transform: [{ rotate: '180deg' }],
  },
  statsContainer: {
    flexDirection: Dimensions.get('window').width < 480 ? 'column' : 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: Dimensions.get('window').width < 480 ? 15 : 0,
  },
  statBox: {
    alignItems: 'center',
    minWidth: Dimensions.get('window').width < 480 ? '100%' : 'auto',
  },
  statLabel: {
    color: '#ccc',
    fontSize: Math.min(16, Dimensions.get('window').width < 480 ? 14 : 16),
    marginBottom: Dimensions.get('window').height < 600 ? 5 : 10,
  },
  statValue: {
    color: '#fff',
    fontSize: Math.min(42, Dimensions.get('window').width > 400 ? 42 : Dimensions.get('window').height < 600 ? 28 : 36),
    fontWeight: 'bold',
    marginBottom: Dimensions.get('window').height < 600 ? 8 : 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Math.max(4, Dimensions.get('window').width > 400 ? 8 : 5),
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  adjustButton: {
    backgroundColor: '#007AFF',
    paddingVertical: Math.max(8, Dimensions.get('window').height < 600 ? 6 : 10),
    paddingHorizontal: Math.max(10, Dimensions.get('window').width > 400 ? 12 : 8),
    borderRadius: 6,
    minWidth: Math.max(36, Dimensions.get('window').width > 400 ? 42 : 32),
    minHeight: Math.max(32, Dimensions.get('window').height < 600 ? 28 : 36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonText: {
    color: 'white',
    fontSize: Math.max(12, Dimensions.get('window').height < 600 ? 11 : 14),
    fontWeight: '600',
    textAlign: 'center',
  },
  centerSection: {
    alignItems: 'center',
    paddingVertical: Math.max(6, Dimensions.get('window').height > 600 ? 12 : 8),
    backgroundColor: '#2a2a2a',
    minHeight: Math.max(70, Dimensions.get('window').height < 500 ? 60 : 85),
    maxHeight: Dimensions.get('window').height < 500 ? 90 : 'auto',
    justifyContent: 'center',
  },
  turnInfo: {
    color: '#fff',
    fontSize: Math.max(16, Dimensions.get('window').height > 600 ? 22 : Dimensions.get('window').height < 500 ? 16 : 18),
    fontWeight: 'bold',
    marginBottom: Math.max(4, Dimensions.get('window').height < 500 ? 3 : 8),
    textAlign: 'center',
  },
  debugText: {
    color: '#ccc',
    fontSize: Math.max(9, Dimensions.get('window').height < 500 ? 8 : 11),
    marginBottom: Math.max(2, Dimensions.get('window').height < 500 ? 2 : 5),
    textAlign: 'center',
  },
  nextTurnButton: {
    backgroundColor: '#28a745',
    paddingVertical: Math.max(8, Dimensions.get('window').height < 600 ? 6 : 10),
    paddingHorizontal: Math.max(16, Dimensions.get('window').width > 400 ? 20 : 12),
    borderRadius: 8,
    marginBottom: Math.max(5, Dimensions.get('window').height < 600 ? 3 : 8),
    minHeight: Math.max(36, Dimensions.get('window').height < 600 ? 32 : 40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextTurnText: {
    color: 'white',
    fontSize: Math.max(14, Dimensions.get('window').height < 600 ? 12 : 16),
    fontWeight: '600',
  },
  surrenderButton: {
    backgroundColor: '#dc3545',
    paddingVertical: Math.max(6, Dimensions.get('window').height < 600 ? 4 : 8),
    paddingHorizontal: Math.max(12, Dimensions.get('window').width > 400 ? 16 : 10),
    borderRadius: 6,
    minHeight: Math.max(32, Dimensions.get('window').height < 600 ? 28 : 36),
    justifyContent: 'center',
    alignItems: 'center',
  },
  surrenderText: {
    color: 'white',
    fontSize: Math.max(12, Dimensions.get('window').height < 600 ? 10 : 14),
    fontWeight: '600',
  },
  endGameContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  endGameTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
    marginBottom: 20,
  },
  endGameWinner: {
    fontSize: 24,
    textAlign: 'center',
    color: '#fff',
    marginBottom: 40,
  },
  roundSummary: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  roundSummaryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  roundResult: {
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  roundTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  roundWinner: {
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 5,
  },
  roundDetails: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 10,
  },
  finalMoraleContainer: {
    marginTop: 10,
  },
  finalMoraleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 5,
  },
  finalMoraleValue: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 10,
  },
  newGameButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
  },
  newGameButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  surrenderWarning: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  surrenderConfirmButton: {
    flex: 1,
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 10,
  },
  surrenderConfirmText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deckSelectionSection: {
    marginTop: 15,
    marginBottom: 15,
  },
  deckSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  deckList: {
    maxHeight: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  deckOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: 'white',
  },
  selectedDeck: {
    backgroundColor: '#e3f2fd',
    borderBottomColor: '#2196f3',
  },
  deckOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  deckOptionSubtext: {
    fontSize: 12,
    color: '#666',
  },
});

export default GameTracker;