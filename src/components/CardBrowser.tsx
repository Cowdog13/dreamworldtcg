import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { Card, cardDatabase } from '../services/cardDatabase';
import { isDreamseeker, loadDreamseekerMatches } from '../services/dreamseekerMatching';

interface CardBrowserProps {
  onSelectCard?: (card: Card) => void;
  onBack: () => void;
}

interface FilterState {
  name: string;
  faction: string;
  type: string;
  rarity: string;
  minCost: string;
  maxCost: string;
}

const CardBrowser: React.FC<CardBrowserProps> = ({ onSelectCard, onBack }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    name: '',
    faction: '',
    type: '',
    rarity: '',
    minCost: '',
    maxCost: '',
  });

  // Available filter options
  const [factions, setFactions] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [rarities, setRarities] = useState<string[]>([]);

  useEffect(() => {
    const initializeData = async () => {
      await loadDreamseekerMatches();
      const allCards = cardDatabase.getAllCards();
      setCards(allCards);
      setFilteredCards(allCards);
      
      // Set up filter options including Dreamseeker as a type
      setFactions(cardDatabase.getUniqueFactions());
      const types = [...cardDatabase.getUniqueTypes(), 'Dreamseeker'];
      setTypes(types);
      setRarities(cardDatabase.getUniqueRarities());
    };
    
    initializeData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, cards]);

  const applyFilters = () => {
    const searchCriteria: any = {};
    
    if (filters.name) searchCriteria.name = filters.name;
    if (filters.faction) searchCriteria.faction = filters.faction;
    if (filters.type) {
      if (filters.type === 'Dreamseeker') {
        // Special filter for Dreamseekers
        const filtered = cardDatabase.searchCards(searchCriteria).filter(card => isDreamseeker(card));
        setFilteredCards(filtered);
        return;
      } else {
        searchCriteria.type = filters.type;
      }
    }
    if (filters.rarity) searchCriteria.rarity = filters.rarity;
    if (filters.minCost) searchCriteria.minCost = parseInt(filters.minCost);
    if (filters.maxCost) searchCriteria.maxCost = parseInt(filters.maxCost);

    const filtered = cardDatabase.searchCards(searchCriteria);
    setFilteredCards(filtered);
  };

  const resetFilters = () => {
    setFilters({
      name: '',
      faction: '',
      type: '',
      rarity: '',
      minCost: '',
      maxCost: '',
    });
  };

  const renderCard = ({ item }: { item: Card }) => (
    <TouchableOpacity
      style={styles.cardItem}
      onPress={() => setSelectedCard(item)}
    >
      <View style={styles.cardImageContainer}>
        {item.imageUrl ? (
          <Image 
            source={{ uri: item.imageUrl }} 
            style={styles.cardImage}
            onError={() => console.log(`Failed to load image: ${item.imageUrl}`)}
          />
        ) : (
          <View style={[styles.cardImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>{item.Name.charAt(0)}</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.Name}</Text>
        <Text style={styles.cardType}>{item.Type} - {item.Subtype}</Text>
        <Text style={styles.cardFaction}>{item.FactionStat}</Text>
        <View style={styles.cardStats}>
          <Text style={styles.statText}>Cost: {item.Cost}</Text>
          {item.AttackStat > 0 && <Text style={styles.statText}>ATK: {item.AttackStat}</Text>}
          {item.DefenseStat > 0 && <Text style={styles.statText}>DEF: {item.DefenseStat}</Text>}
        </View>
      </View>
      {onSelectCard && (
        <TouchableOpacity
          style={styles.selectButton}
          onPress={() => onSelectCard(item)}
        >
          <Text style={styles.selectButtonText}>Add</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const renderCardDetail = () => {
    if (!selectedCard) return null;

    return (
      <Modal visible={!!selectedCard} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.cardDetailModal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedCard.imageUrl ? (
                <Image 
                  source={{ uri: selectedCard.imageUrl }} 
                  style={styles.detailCardImage}
                  onError={() => console.log(`Failed to load detail image: ${selectedCard.imageUrl}`)}
                />
              ) : (
                <View style={[styles.detailCardImage, styles.detailPlaceholderImage]}>
                  <Text style={styles.detailPlaceholderText}>{selectedCard.Name}</Text>
                </View>
              )}
              
              <Text style={styles.detailCardName}>{selectedCard.Name}</Text>
              <Text style={styles.detailCardType}>
                {selectedCard.Type} - {selectedCard.Subtype}
              </Text>
              <Text style={styles.detailCardFaction}>
                Faction: {selectedCard.FactionStat}
              </Text>
              <Text style={styles.detailCardRarity}>
                Rarity: {selectedCard.Rarity}
              </Text>

              <View style={styles.statsContainer}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Cost:</Text>
                  <Text style={styles.statValue}>{selectedCard.Cost}</Text>
                </View>
                {selectedCard.AttackStat > 0 && (
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Attack:</Text>
                    <Text style={styles.statValue}>{selectedCard.AttackStat}</Text>
                  </View>
                )}
                {selectedCard.DefenseStat > 0 && (
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Defense:</Text>
                    <Text style={styles.statValue}>{selectedCard.DefenseStat}</Text>
                  </View>
                )}
                {selectedCard.MindStat > 0 && (
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Mind:</Text>
                    <Text style={styles.statValue}>{selectedCard.MindStat}</Text>
                  </View>
                )}
                {selectedCard.SkillStat > 0 && (
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Skill:</Text>
                    <Text style={styles.statValue}>{selectedCard.SkillStat}</Text>
                  </View>
                )}
                {selectedCard.EnergyStat > 0 && (
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Energy:</Text>
                    <Text style={styles.statValue}>{selectedCard.EnergyStat}</Text>
                  </View>
                )}
              </View>

              {selectedCard.Abilities.length > 0 && (
                <View style={styles.abilitiesContainer}>
                  <Text style={styles.abilitiesTitle}>Abilities:</Text>
                  {selectedCard.Abilities.map((ability, index) => (
                    <View key={index} style={styles.abilityItem}>
                      <Text style={styles.abilityName}>{ability.Name}</Text>
                      <Text style={styles.abilityDescription}>{ability.Description}</Text>
                    </View>
                  ))}
                </View>
              )}

              {selectedCard.Flavortext && (
                <Text style={styles.flavorText}>{selectedCard.Flavortext}</Text>
              )}

              <Text style={styles.deckLimit}>
                Max copies in deck: {selectedCard.MaxCopiesInDeck}
              </Text>

              {onSelectCard && (
                <TouchableOpacity
                  style={styles.addToDeckButton}
                  onPress={() => {
                    onSelectCard(selectedCard);
                    setSelectedCard(null);
                  }}
                >
                  <Text style={styles.addToDeckButtonText}>Add to Deck</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedCard(null)}
            >
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Card Browser</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.cardCount}>
        {filteredCards.length} of {cards.length} cards
      </Text>

      <FlatList
        data={filteredCards}
        renderItem={renderCard}
        keyExtractor={(item) => item.ID.toString()}
        style={styles.cardList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No cards found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
          </View>
        }
      />

      {/* Filter Modal */}
      <Modal visible={showFilters} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <Text style={styles.filterTitle}>Filter Cards</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              <TextInput
                style={styles.filterInput}
                placeholder="Card name..."
                value={filters.name}
                onChangeText={(text) => setFilters({...filters, name: text})}
              />

              <Text style={styles.filterLabel}>Faction:</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterOption, !filters.faction && styles.activeFilter]}
                  onPress={() => setFilters({...filters, faction: ''})}
                >
                  <Text style={styles.filterOptionText}>All</Text>
                </TouchableOpacity>
                {factions.map(faction => (
                  <TouchableOpacity
                    key={faction}
                    style={[styles.filterOption, filters.faction === faction && styles.activeFilter]}
                    onPress={() => setFilters({...filters, faction})}
                  >
                    <Text style={styles.filterOptionText}>{faction}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.filterLabel}>Type:</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterOption, !filters.type && styles.activeFilter]}
                  onPress={() => setFilters({...filters, type: ''})}
                >
                  <Text style={styles.filterOptionText}>All</Text>
                </TouchableOpacity>
                {types.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterOption, filters.type === type && styles.activeFilter]}
                    onPress={() => setFilters({...filters, type})}
                  >
                    <Text style={styles.filterOptionText}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.costFilter}>
                <TextInput
                  style={[styles.filterInput, styles.costInput]}
                  placeholder="Min cost"
                  value={filters.minCost}
                  onChangeText={(text) => setFilters({...filters, minCost: text})}
                  keyboardType="numeric"
                />
                <Text style={styles.costSeparator}>to</Text>
                <TextInput
                  style={[styles.filterInput, styles.costInput]}
                  placeholder="Max cost"
                  value={filters.maxCost}
                  onChangeText={(text) => setFilters({...filters, maxCost: text})}
                  keyboardType="numeric"
                />
              </View>

            </ScrollView>

            <View style={styles.filterButtons}>
              <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
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

      {renderCardDetail()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  filterButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cardCount: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    paddingVertical: 10,
  },
  cardList: {
    flex: 1,
  },
  cardItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginVertical: 5,
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardImageContainer: {
    width: 60,
    height: 84,
  },
  cardImage: {
    width: 60,
    height: 84,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  placeholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  cardFaction: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  cardStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statText: {
    fontSize: 12,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: '#333',
  },
  selectButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  selectButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDetailModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    position: 'relative',
  },
  detailCardImage: {
    width: 200,
    height: 280,
    alignSelf: 'center',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#ddd',
  },
  detailPlaceholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  detailPlaceholderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6c757d',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  detailCardName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  detailCardType: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 4,
  },
  detailCardFaction: {
    fontSize: 14,
    textAlign: 'center',
    color: '#888',
    marginBottom: 4,
  },
  detailCardRarity: {
    fontSize: 14,
    textAlign: 'center',
    color: '#888',
    marginBottom: 16,
  },
  statsContainer: {
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 16,
    color: '#333',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  abilitiesContainer: {
    marginBottom: 16,
  },
  abilitiesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  abilityItem: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  abilityName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  abilityDescription: {
    fontSize: 14,
    color: '#666',
  },
  flavorText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    color: '#888',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  deckLimit: {
    fontSize: 12,
    textAlign: 'center',
    color: '#999',
    marginBottom: 16,
  },
  addToDeckButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  addToDeckButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#999',
  },
  // Filter modal styles
  filterModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  filterInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  filterOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeFilter: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#333',
  },
  costFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  costInput: {
    flex: 1,
    marginBottom: 0,
  },
  costSeparator: {
    fontSize: 16,
    color: '#666',
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

export default CardBrowser;