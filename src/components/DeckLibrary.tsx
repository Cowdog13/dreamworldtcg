import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { getUserDecks, saveUserDecks } from '../services/firebaseData';

interface DeckCard {
  ID: number;
  Name: string;
  Type: string;
  quantity: number;
}

interface Deck {
  id: string;
  name: string;
  dreamseeker?: DeckCard;
  base?: DeckCard;
  dreamplanes: DeckCard[];
  mainDeck: DeckCard[];
  sideboard: DeckCard[];
  createdAt: Date;
  lastModified: Date;
}

interface DeckLibraryProps {
  onBack: () => void;
  onEditDeck: (deck: Deck) => void;
  onNewDeck: () => void;
  currentUser: string;
}

const DeckLibrary: React.FC<DeckLibraryProps> = ({ onBack, onEditDeck, onNewDeck, currentUser }) => {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [showDeckDetail, setShowDeckDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      const savedDecks = await getUserDecks(currentUser);
      
      // Sort by last modified date (newest first)
      savedDecks.sort((a: Deck, b: Deck) => b.lastModified.getTime() - a.lastModified.getTime());
      setDecks(savedDecks);
    } catch (error) {
      console.error('Failed to load decks:', error);
      setDecks([]);
    }
  };

  const confirmDelete = (deckId: string) => {
    setDeckToDelete(deckId);
    setShowDeleteConfirm(true);
  };

  const deleteDeck = async () => {
    if (!deckToDelete) return;
    
    try {
      const updatedDecks = decks.filter(deck => deck.id !== deckToDelete);
      setDecks(updatedDecks);
      await saveUserDecks(currentUser, updatedDecks);
      setSelectedDeck(null);
      setShowDeckDetail(false);
      setShowDeleteConfirm(false);
      setDeckToDelete(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete deck.');
      setShowDeleteConfirm(false);
      setDeckToDelete(null);
    }
  };

  const duplicateDeck = async (originalDeck: Deck) => {
    const duplicatedDeck: Deck = {
      ...originalDeck,
      id: Date.now().toString(),
      name: `${originalDeck.name} (Copy)`,
      createdAt: new Date(),
      lastModified: new Date(),
    };

    try {
      const updatedDecks = [duplicatedDeck, ...decks];
      setDecks(updatedDecks);
      await saveUserDecks(currentUser, updatedDecks);
      Alert.alert('Success', `Deck "${duplicatedDeck.name}" has been created!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to duplicate deck.');
    }
  };

  const validateDeck = (deck: Deck): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!deck.dreamseeker) errors.push('Missing Dreamseeker');
    if (!deck.base) errors.push('Missing Base');
    
    const dreamplaneCount = deck.dreamplanes.reduce((sum, c) => sum + c.quantity, 0);
    if (dreamplaneCount !== 10) {
      errors.push(`Dreamplanes: ${dreamplaneCount}/10`);
    }
    
    const mainDeckSize = deck.mainDeck.reduce((sum, c) => sum + c.quantity, 0);
    if (mainDeckSize !== 30) {
      errors.push(`Main deck: ${mainDeckSize}/30 cards`);
    }
    
    const sideboardSize = deck.sideboard.reduce((sum, c) => sum + c.quantity, 0);
    if (sideboardSize > 8) {
      errors.push(`Sideboard: ${sideboardSize}/8 cards`);
    }
    
    return { valid: errors.length === 0, errors };
  };

  const renderDeckItem = ({ item }: { item: Deck }) => {
    const { valid, errors } = validateDeck(item);
    const mainDeckSize = item.mainDeck.reduce((sum, c) => sum + c.quantity, 0);
    const sideboardSize = item.sideboard.reduce((sum, c) => sum + c.quantity, 0);
    
    return (
      <TouchableOpacity
        style={[styles.deckItem, !valid && styles.invalidDeckItem]}
        onPress={() => {
          setSelectedDeck(item);
          setShowDeckDetail(true);
        }}
      >
        <View style={styles.deckItemContent}>
          <View style={styles.deckHeader}>
            <Text style={styles.deckName}>{item.name}</Text>
            <View style={styles.validationBadge}>
              {valid ? (
                <Text style={styles.validBadge}>✓ Valid</Text>
              ) : (
                <Text style={styles.invalidBadge}>{errors.length} Issues</Text>
              )}
            </View>
          </View>
          
          <View style={styles.deckStats}>
            <Text style={styles.deckStat}>
              Dreamseeker: {item.dreamseeker?.Name || 'None'}
            </Text>
            <Text style={styles.deckStat}>
              Main Deck: {mainDeckSize}/30 • Sideboard: {sideboardSize}/8
            </Text>
            <Text style={styles.deckStat}>
              Dreamplanes: {item.dreamplanes.reduce((sum, c) => sum + c.quantity, 0)}/10
            </Text>
          </View>
          
          <View style={styles.deckFooter}>
            <Text style={styles.dateText}>
              Created: {item.createdAt.toLocaleDateString()}
            </Text>
            <Text style={styles.dateText}>
              Modified: {item.lastModified.toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        <View style={styles.deckActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => onEditDeck(item)}
          >
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDeckDetail = () => {
    if (!selectedDeck) return null;
    
    const { valid, errors } = validateDeck(selectedDeck);
    
    return (
      <Modal visible={showDeckDetail} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.deckDetailModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedDeck.name}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDeckDetail(false)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.deckDetailContent}>
              {!valid && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorTitle}>Issues with this deck:</Text>
                  {errors.map((error, index) => (
                    <Text key={index} style={styles.errorText}>• {error}</Text>
                  ))}
                </View>
              )}
              
              {/* Dreamseeker */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Dreamseeker</Text>
                {selectedDeck.dreamseeker ? (
                  <Text style={styles.cardDetailText}>
                    {selectedDeck.dreamseeker.Name}
                  </Text>
                ) : (
                  <Text style={styles.emptyText}>No Dreamseeker selected</Text>
                )}
              </View>
              
              {/* Base */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Base</Text>
                {selectedDeck.base ? (
                  <Text style={styles.cardDetailText}>
                    {selectedDeck.base.Name}
                  </Text>
                ) : (
                  <Text style={styles.emptyText}>No Base selected</Text>
                )}
              </View>
              
              {/* Dreamplanes */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  Dreamplanes ({selectedDeck.dreamplanes.reduce((sum, c) => sum + c.quantity, 0)}/10)
                </Text>
                {selectedDeck.dreamplanes.map((card, index) => (
                  <Text key={index} style={styles.cardDetailText}>
                    {card.quantity}x {card.Name}
                  </Text>
                ))}
                {selectedDeck.dreamplanes.length === 0 && (
                  <Text style={styles.emptyText}>No Dreamplanes added</Text>
                )}
              </View>
              
              {/* Main Deck */}
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>
                  Main Deck ({selectedDeck.mainDeck.reduce((sum, c) => sum + c.quantity, 0)}/30)
                </Text>
                {selectedDeck.mainDeck.map((card, index) => (
                  <Text key={index} style={styles.cardDetailText}>
                    {card.quantity}x {card.Name} ({card.Type})
                  </Text>
                ))}
                {selectedDeck.mainDeck.length === 0 && (
                  <Text style={styles.emptyText}>No cards in main deck</Text>
                )}
              </View>
              
              {/* Sideboard */}
              {selectedDeck.sideboard.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>
                    Sideboard ({selectedDeck.sideboard.reduce((sum, c) => sum + c.quantity, 0)}/8)
                  </Text>
                  {selectedDeck.sideboard.map((card, index) => (
                    <Text key={index} style={styles.cardDetailText}>
                      {card.quantity}x {card.Name} ({card.Type})
                    </Text>
                  ))}
                </View>
              )}
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionButton, styles.editButton]}
                onPress={() => {
                  setShowDeckDetail(false);
                  onEditDeck(selectedDeck);
                }}
              >
                <Text style={styles.modalActionText}>Edit Deck</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalActionButton, styles.duplicateButton]}
                onPress={async () => {
                  await duplicateDeck(selectedDeck);
                  setShowDeckDetail(false);
                }}
              >
                <Text style={styles.modalActionText}>Duplicate</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalActionButton, styles.deleteButton]}
                onPress={() => confirmDelete(selectedDeck.id)}
              >
                <Text style={styles.modalActionText}>Delete</Text>
              </TouchableOpacity>
            </View>
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
        <Text style={styles.title}>Deck Library</Text>
        <TouchableOpacity style={styles.newDeckButton} onPress={onNewDeck}>
          <Text style={styles.newDeckButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {decks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No Decks Yet</Text>
          <Text style={styles.emptyStateText}>
            Create your first deck to get started!
          </Text>
          <TouchableOpacity style={styles.createFirstDeckButton} onPress={onNewDeck}>
            <Text style={styles.createFirstDeckButtonText}>Create First Deck</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={decks}
          renderItem={renderDeckItem}
          keyExtractor={(item) => item.id}
          style={styles.deckList}
          contentContainerStyle={styles.deckListContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {renderDeckDetail()}
      
      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.deleteConfirmModal}>
            <Text style={styles.deleteConfirmTitle}>Delete Deck</Text>
            <Text style={styles.deleteConfirmText}>
              Are you sure you want to delete this deck? This action cannot be undone.
            </Text>
            
            <View style={styles.deleteConfirmActions}>
              <TouchableOpacity
                style={[styles.deleteConfirmButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setDeckToDelete(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.deleteConfirmButton, styles.confirmDeleteButton]}
                onPress={deleteDeck}
              >
                <Text style={styles.confirmDeleteButtonText}>Delete</Text>
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
  newDeckButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  newDeckButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  createFirstDeckButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  createFirstDeckButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  deckList: {
    flex: 1,
  },
  deckListContent: {
    padding: 15,
  },
  deckItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  invalidDeckItem: {
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  deckItemContent: {
    flex: 1,
  },
  deckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deckName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  validationBadge: {
    marginLeft: 10,
  },
  validBadge: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '600',
  },
  invalidBadge: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '600',
  },
  deckStats: {
    marginBottom: 8,
  },
  deckStat: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  deckFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateText: {
    fontSize: 12,
    color: '#888',
  },
  deckActions: {
    justifyContent: 'center',
    marginLeft: 15,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deckDetailModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#999',
  },
  deckDetailContent: {
    flex: 1,
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#fee',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
  },
  detailSection: {
    marginBottom: 20,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  cardDetailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 10,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  duplicateButton: {
    backgroundColor: '#6c757d',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  modalActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteConfirmModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  deleteConfirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 15,
  },
  deleteConfirmText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: 10,
  },
  deleteConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    backgroundColor: '#dc3545',
  },
  confirmDeleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DeckLibrary;