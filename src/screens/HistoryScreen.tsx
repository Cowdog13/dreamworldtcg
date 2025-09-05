import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import { getUserMatches } from '../services/firebaseData';

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

interface MatchStats {
  totalGames: number;
  wins: number;
  losses: number;
  normalWins: number;
  surrenderWins: number;
  normalLosses: number;
  surrenderLosses: number;
  timesReduced0: number; // How many times player was reduced to 0 or below
  timesOpponentReduced0: number; // How many times opponent was reduced to 0 or below
  avgMoraleDifference: number;
  winRate: number;
}

interface FilterOptions {
  result: 'all' | 'wins' | 'losses';
  winType: 'all' | 'normal' | 'surrender';
  deck: 'all' | string;
  excludeDeck: 'none' | string; // Exclude matches with specific deck
  opponent: string; // Search for specific opponent by name
}

interface HistoryScreenProps {
  currentUser: string;
}

const HistoryScreen = ({ currentUser }: HistoryScreenProps) => {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<MatchResult[]>([]);
  const [stats, setStats] = useState<MatchStats | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    result: 'all',
    winType: 'all',
    deck: 'all',
    excludeDeck: 'none',
    opponent: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Get match history from Firebase
  const getMatchHistory = async (): Promise<MatchResult[]> => {
    try {
      return await getUserMatches(currentUser);
    } catch {
      return [];
    }
  };


  const calculateStats = (userEmail: string, matchList: MatchResult[]): MatchStats => {
    const userMatches = matchList.filter(match => 
      Object.keys(match.players).includes(userEmail)
    );

    let wins = 0, losses = 0;
    let normalWins = 0, surrenderWins = 0;
    let normalLosses = 0, surrenderLosses = 0;
    let timesReduced0 = 0, timesOpponentReduced0 = 0;
    let totalMoraleDiff = 0;

    userMatches.forEach(match => {
      const isWinner = match.winner === userEmail;
      const isSurrender = match.winType === 'surrender';
      
      if (isWinner) {
        wins++;
        if (isSurrender) surrenderWins++;
        else normalWins++;
      } else {
        losses++;
        if (isSurrender) surrenderLosses++;
        else normalLosses++;
      }

      // Calculate morale statistics
      match.rounds.forEach(round => {
        const userMorale = round.playerMorale[userEmail] || 0;
        const opponentMorale = Object.values(round.playerMorale).find(m => 
          m !== userMorale
        ) || 0;
        
        if (userMorale <= 0) timesReduced0++;
        if (opponentMorale <= 0) timesOpponentReduced0++;
        
        totalMoraleDiff += Math.abs(userMorale - opponentMorale);
      });
    });

    const totalGames = userMatches.length;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
    const avgMoraleDifference = totalGames > 0 ? totalMoraleDiff / (totalGames * 2) : 0; // Div by 2 for avg per round

    return {
      totalGames,
      wins,
      losses,
      normalWins,
      surrenderWins,
      normalLosses,
      surrenderLosses,
      timesReduced0,
      timesOpponentReduced0,
      avgMoraleDifference: Math.round(avgMoraleDifference),
      winRate: Math.round(winRate * 100) / 100,
    };
  };

  const getUsedDecks = (): string[] => {
    const deckNames = new Set<string>();
    matches.forEach(match => {
      const playerInfo = match.players[currentUser];
      if (playerInfo?.deckUsed) {
        deckNames.add(playerInfo.deckUsed);
      }
    });
    return Array.from(deckNames).sort();
  };

  const applyFilters = (matchList: MatchResult[], filterOptions: FilterOptions, userEmail: string) => {
    return matchList.filter(match => {
      const userInMatch = Object.keys(match.players).includes(userEmail);
      if (!userInMatch) return false;

      const isWinner = match.winner === userEmail;
      
      // Filter by result
      if (filterOptions.result === 'wins' && !isWinner) return false;
      if (filterOptions.result === 'losses' && isWinner) return false;
      
      // Filter by win type
      if (filterOptions.winType === 'normal' && match.winType !== 'normal') return false;
      if (filterOptions.winType === 'surrender' && match.winType !== 'surrender') return false;
      
      // Filter by deck
      if (filterOptions.deck !== 'all') {
        const playerInfo = match.players[currentUser];
        const playerDeck = playerInfo?.deckUsed;
        
        if (filterOptions.deck === 'no-deck' && playerDeck) return false;
        if (filterOptions.deck !== 'no-deck' && playerDeck !== filterOptions.deck) return false;
      }
      
      // Exclude specific deck
      if (filterOptions.excludeDeck !== 'none') {
        const playerInfo = match.players[currentUser];
        const playerDeck = playerInfo?.deckUsed;
        
        if (filterOptions.excludeDeck === 'no-deck' && !playerDeck) return false;
        if (filterOptions.excludeDeck !== 'no-deck' && playerDeck === filterOptions.excludeDeck) return false;
      }
      
      // Filter by opponent name
      if (filterOptions.opponent.trim()) {
        const opponentId = Object.keys(match.players).find(id => id !== userEmail);
        const opponentName = opponentId ? match.players[opponentId].name : '';
        const searchTerm = filterOptions.opponent.trim().toLowerCase();
        
        if (!opponentName.toLowerCase().includes(searchTerm)) return false;
      }
      
      return true;
    });
  };

  useEffect(() => {
    const loadMatches = async () => {
      const allMatches = await getMatchHistory();
      setMatches(allMatches);
      
      const filtered = applyFilters(allMatches, filters, currentUser);
      setFilteredMatches(filtered);
      
      const statistics = calculateStats(currentUser, allMatches);
      setStats(statistics);
    };
    
    loadMatches();
  }, [currentUser]);

  useEffect(() => {
    const filtered = applyFilters(matches, filters, currentUser);
    setFilteredMatches(filtered);
  }, [filters, matches, currentUser]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderMatch = ({ item }: { item: MatchResult }) => {
    const isWinner = item.winner === currentUser;
    const opponentId = Object.keys(item.players).find(id => id !== currentUser);
    const opponentName = opponentId ? item.players[opponentId].name : 'Unknown';
    
    return (
      <View style={[styles.matchCard, isWinner ? styles.winCard : styles.lossCard]}>
        <View style={styles.matchHeader}>
          <Text style={[styles.matchResult, { color: isWinner ? '#28a745' : '#dc3545' }]}>
            {isWinner ? '🎉 Victory' : '💔 Defeat'}
            {item.winType === 'surrender' && (
              <Text style={styles.surrenderText}> (Surrender)</Text>
            )}
          </Text>
          <Text style={styles.matchDate}>
            {formatDate(item.startedAt)}
          </Text>
        </View>
        
        <Text style={styles.opponent}>vs {opponentName}</Text>
        <Text style={styles.gameCode}>Game: {item.gameCode}</Text>
        <Text style={styles.deckUsed}>
          Deck: {item.players[currentUser]?.deckUsed || 'No deck selected'}
        </Text>
        
        <View style={styles.roundsContainer}>
          {item.rounds.map((round, index) => (
            <View key={index} style={styles.roundSummary}>
              <Text style={styles.roundText}>
                R{round.roundNumber}: {round.playerMorale[currentUser] || 0} - {round.playerMorale[opponentId!] || 0}
                {round.endReason === 'surrender' && ' (S)'}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (!stats) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading statistics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Statistics Summary */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Your Statistics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalGames}</Text>
            <Text style={styles.statLabel}>Total Games</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#28a745' }]}>{stats.wins}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: '#dc3545' }]}>{stats.losses}</Text>
            <Text style={styles.statLabel}>Losses</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.winRate}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
        </View>

        <View style={styles.detailedStats}>
          <Text style={styles.detailStat}>Normal W/L: {stats.normalWins}/{stats.normalLosses}</Text>
          <Text style={styles.detailStat}>Surrender W/L: {stats.surrenderWins}/{stats.surrenderLosses}</Text>
          <Text style={styles.detailStat}>Times reduced to 0: {stats.timesReduced0}</Text>
          <Text style={styles.detailStat}>Opponent reduced to 0: {stats.timesOpponentReduced0}</Text>
          <Text style={styles.detailStat}>Avg morale difference: {stats.avgMoraleDifference}</Text>
        </View>
      </View>

      {/* Filters */}
      <TouchableOpacity 
        style={styles.filterButton} 
        onPress={() => setShowFilters(true)}
      >
        <Text style={styles.filterButtonText}>
          Filters ({filteredMatches.length}/{matches.length} matches)
        </Text>
      </TouchableOpacity>

      {/* Match History */}
      <FlatList
        data={filteredMatches}
        renderItem={renderMatch}
        keyExtractor={(item) => item.id}
        style={styles.matchList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No matches found</Text>
            <Text style={styles.emptySubtext}>
              {matches.length === 0 
                ? 'Play some games to see your history!'
                : 'Try adjusting your filters'
              }
            </Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <Text style={styles.filterTitle}>Filter Matches</Text>
            
            {/* Opponent Search */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Search Opponent:</Text>
              <TextInput
                style={styles.opponentSearchInput}
                placeholder="Enter opponent name..."
                value={filters.opponent}
                onChangeText={(text) => setFilters({...filters, opponent: text})}
                clearButtonMode="while-editing"
              />
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Result:</Text>
              <View style={styles.filterOptions}>
                {['all', 'wins', 'losses'].map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOption,
                      filters.result === option && styles.activeFilter
                    ]}
                    onPress={() => setFilters({...filters, result: option as any})}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.result === option && styles.activeFilterText
                    ]}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Type:</Text>
              <View style={styles.filterOptions}>
                {['all', 'normal', 'surrender'].map(option => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.filterOption,
                      filters.winType === option && styles.activeFilter
                    ]}
                    onPress={() => setFilters({...filters, winType: option as any})}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.winType === option && styles.activeFilterText
                    ]}>
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Deck:</Text>
              <View style={styles.deckFilterContainer}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filters.deck === 'all' && styles.activeFilter
                  ]}
                  onPress={() => setFilters({...filters, deck: 'all'})}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.deck === 'all' && styles.activeFilterText
                  ]}>
                    All Decks
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filters.deck === 'no-deck' && styles.activeFilter
                  ]}
                  onPress={() => setFilters({...filters, deck: 'no-deck'})}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.deck === 'no-deck' && styles.activeFilterText
                  ]}>
                    No Deck
                  </Text>
                </TouchableOpacity>
                {getUsedDecks().map(deckName => (
                  <TouchableOpacity
                    key={deckName}
                    style={[
                      styles.filterOption,
                      filters.deck === deckName && styles.activeFilter
                    ]}
                    onPress={() => setFilters({...filters, deck: deckName})}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.deck === deckName && styles.activeFilterText
                    ]}>
                      {deckName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Exclude Deck:</Text>
              <View style={styles.deckFilterContainer}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filters.excludeDeck === 'none' && styles.activeFilter
                  ]}
                  onPress={() => setFilters({...filters, excludeDeck: 'none'})}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.excludeDeck === 'none' && styles.activeFilterText
                  ]}>
                    Don't Exclude
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    filters.excludeDeck === 'no-deck' && styles.activeFilter
                  ]}
                  onPress={() => setFilters({...filters, excludeDeck: 'no-deck'})}
                >
                  <Text style={[
                    styles.filterOptionText,
                    filters.excludeDeck === 'no-deck' && styles.activeFilterText
                  ]}>
                    Exclude No Deck
                  </Text>
                </TouchableOpacity>
                {getUsedDecks().map(deckName => (
                  <TouchableOpacity
                    key={deckName}
                    style={[
                      styles.filterOption,
                      filters.excludeDeck === deckName && styles.activeFilter
                    ]}
                    onPress={() => setFilters({...filters, excludeDeck: deckName})}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filters.excludeDeck === deckName && styles.activeFilterText
                    ]}>
                      Exclude {deckName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterButtons}>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={() => setFilters({
                  result: 'all',
                  winType: 'all',
                  deck: 'all',
                  excludeDeck: 'none',
                  opponent: ''
                })}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.applyButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  detailedStats: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailStat: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  filterButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 15,
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  matchList: {
    flex: 1,
  },
  matchCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 5,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  winCard: {
    borderLeftColor: '#28a745',
  },
  lossCard: {
    borderLeftColor: '#dc3545',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchResult: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  surrenderText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  matchDate: {
    fontSize: 12,
    color: '#666',
  },
  opponent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  gameCode: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  deckUsed: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  roundsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  roundSummary: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roundText: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  filterSection: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  opponentSearchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  filterOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  deckFilterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeFilter: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: 'white',
    fontWeight: '600',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    color: '#666',
  },
  applyButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default HistoryScreen;