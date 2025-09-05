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
  Alert,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Card, cardDatabase } from '../services/cardDatabase';
import { 
  isDreamseeker, 
  getMatchingBase, 
  getMatchingDreamseeker,
  loadDreamseekerMatches 
} from '../services/dreamseekerMatching';

interface DeckCard extends Card {
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

interface DeckBuilderProps {
  onBack: () => void;
  existingDeck?: Deck;
}

const DECK_RULES = {
  dreamseeker: { min: 1, max: 1 },
  base: { min: 1, max: 1 },
  dreamplanes: { min: 10, max: 10 },
  mainDeck: { min: 30, max: 30 },
  sideboard: { min: 0, max: 8 },
};

const DeckBuilder: React.FC<DeckBuilderProps> = ({ onBack, existingDeck }) => {
  const [deck, setDeck] = useState<Deck>({
    id: existingDeck?.id || Date.now().toString(),
    name: existingDeck?.name || 'New Deck',
    dreamseeker: existingDeck?.dreamseeker,
    base: existingDeck?.base,
    dreamplanes: existingDeck?.dreamplanes || [],
    mainDeck: existingDeck?.mainDeck || [],
    sideboard: existingDeck?.sideboard || [],
    createdAt: existingDeck?.createdAt || new Date(),
    lastModified: new Date(),
  });

  const [availableCards, setAvailableCards] = useState<Card[]>([]);
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedFaction, setSelectedFaction] = useState<string>('All');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [deckName, setDeckName] = useState(deck.name);
  const [activeSection, setActiveSection] = useState<'dreamseeker' | 'base' | 'dreamplanes' | 'mainDeck' | 'sideboard'>('mainDeck');
  const [hoveredCard, setHoveredCard] = useState<Card | null>(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [viewingCard, setViewingCard] = useState<Card | null>(null);
  const [viewingCardIndex, setViewingCardIndex] = useState<number>(-1);
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const [advancedFilters, setAdvancedFilters] = useState({
    minAttack: '',
    maxAttack: '',
    minDefense: '',
    maxDefense: '',
    minCost: '',
    maxCost: '',
    minInitiative: '',
    maxInitiative: '',
    minBacklash: '',
    maxBacklash: '',
    hasAbility: '',
    statType: 'all' // all, attack, defense, cost, mentality, etc
  });

  useEffect(() => {
    const initializeData = async () => {
      await loadDreamseekerMatches();
      const cards = cardDatabase.getAllCards();
      setAvailableCards(cards);
      setFilteredCards(cards);
    };
    
    initializeData();
  }, []);

  const applyAdvancedFilters = () => {
    let filtered = availableCards;

    // Basic filters
    if (searchQuery) {
      filtered = filtered.filter(card =>
        card.Name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedType !== 'All') {
      if (selectedType === 'Dreamseeker') {
        filtered = filtered.filter(card => isDreamseeker(card));
      } else {
        filtered = filtered.filter(card => card.Type === selectedType);
      }
    }

    if (selectedFaction !== 'All') {
      filtered = filtered.filter(card => card.FactionStat === selectedFaction);
    }

    // Advanced stat filters
    if (advancedFilters.minAttack) {
      const minAttack = parseInt(advancedFilters.minAttack);
      filtered = filtered.filter(card => card.AttackStat >= minAttack);
    }
    
    if (advancedFilters.maxAttack) {
      const maxAttack = parseInt(advancedFilters.maxAttack);
      filtered = filtered.filter(card => card.AttackStat <= maxAttack);
    }
    
    if (advancedFilters.minDefense) {
      const minDefense = parseInt(advancedFilters.minDefense);
      filtered = filtered.filter(card => card.DefenseStat >= minDefense);
    }
    
    if (advancedFilters.maxDefense) {
      const maxDefense = parseInt(advancedFilters.maxDefense);
      filtered = filtered.filter(card => card.DefenseStat <= maxDefense);
    }
    
    if (advancedFilters.minCost) {
      const minCost = parseInt(advancedFilters.minCost);
      filtered = filtered.filter(card => card.Cost >= minCost);
    }
    
    if (advancedFilters.maxCost) {
      const maxCost = parseInt(advancedFilters.maxCost);
      filtered = filtered.filter(card => card.Cost <= maxCost);
    }
    
    if (advancedFilters.minInitiative) {
      const minInitiative = parseInt(advancedFilters.minInitiative);
      filtered = filtered.filter(card => parseInt(card.Initiative || '0') >= minInitiative);
    }
    
    if (advancedFilters.maxInitiative) {
      const maxInitiative = parseInt(advancedFilters.maxInitiative);
      filtered = filtered.filter(card => parseInt(card.Initiative || '0') <= maxInitiative);
    }
    
    if (advancedFilters.minBacklash) {
      const minBacklash = parseInt(advancedFilters.minBacklash);
      filtered = filtered.filter(card => parseInt(card.Backlash || '0') >= minBacklash);
    }
    
    if (advancedFilters.maxBacklash) {
      const maxBacklash = parseInt(advancedFilters.maxBacklash);
      filtered = filtered.filter(card => parseInt(card.Backlash || '0') <= maxBacklash);
    }
    
    if (advancedFilters.hasAbility) {
      const abilitySearch = advancedFilters.hasAbility.toLowerCase();
      filtered = filtered.filter(card =>
        card.Abilities.some(ability =>
          ability.Name.toLowerCase().includes(abilitySearch) ||
          ability.Description.toLowerCase().includes(abilitySearch)
        )
      );
    }

    setFilteredCards(filtered);
  };

  useEffect(() => {
    applyAdvancedFilters();
  }, [searchQuery, selectedType, selectedFaction, advancedFilters, availableCards]);

  const addCardToDeck = (card: Card) => {
    const newDeck = { ...deck };
    
    if (isDreamseeker(card)) {
      // Handle Dreamseeker based on active section
      if (activeSection === 'sideboard') {
        // Add to sideboard
        const currentSize = newDeck.sideboard.reduce((sum, c) => sum + c.quantity, 0);
        if (currentSize >= 8) {
          window.alert('Your sideboard is full.');
          return;
        }
        
        // Check total copies across all sections
        const mainDeckCopies = newDeck.mainDeck.find(c => c.ID === card.ID)?.quantity || 0;
        const sideboardCopies = newDeck.sideboard.find(c => c.ID === card.ID)?.quantity || 0;
        const dreamplaneCopies = newDeck.dreamplanes.find(c => c.ID === card.ID)?.quantity || 0;
        const totalCopies = mainDeckCopies + sideboardCopies + dreamplaneCopies;
        
        if (totalCopies >= 3) {
          window.alert('You can only have 3 total copies of this card across all sections.');
          return;
        }
        
        const existing = newDeck.sideboard.find(c => c.ID === card.ID);
        if (existing) {
          existing.quantity++;
        } else {
          newDeck.sideboard.push({ ...card, quantity: 1 });
        }
        
        // Auto-add matching Base to sideboard if space allows
        const matchingBaseName = getMatchingBase(card);
        if (matchingBaseName) {
          const matchingBaseCard = availableCards.find(c => 
            c.Type === 'Base' && c.Name.toLowerCase() === matchingBaseName.toLowerCase()
          );
          
          if (matchingBaseCard) {
            const currentSizeAfterDreamseeker = newDeck.sideboard.reduce((sum, c) => sum + c.quantity, 0);
            const baseExistsInSideboard = newDeck.sideboard.find(c => c.ID === matchingBaseCard.ID);
            
            if (currentSizeAfterDreamseeker < 8 && !baseExistsInSideboard) {
              newDeck.sideboard.push({ ...matchingBaseCard, quantity: 1 });
              window.alert(
                'Dreamseeker Added!', 
                `Added ${card.Name} and automatically paired it with ${matchingBaseCard.Name} in sideboard.`
              );
            } else {
              window.alert('Dreamseeker Added!', `Added ${card.Name} to sideboard.`);
            }
          }
        }
      } else {
        // Add to main Dreamseeker slot
        if (newDeck.dreamseeker) {
          window.alert('You can only have 1 Dreamseeker in your deck.');
          return;
        }
        
        // Add the Dreamseeker
        newDeck.dreamseeker = { ...card, quantity: 1 };
        
        // Automatically add matching Base
        const matchingBaseName = getMatchingBase(card);
        if (matchingBaseName) {
          const matchingBaseCard = availableCards.find(c => 
            c.Type === 'Base' && c.Name.toLowerCase() === matchingBaseName.toLowerCase()
          );
          
          if (matchingBaseCard) {
            newDeck.base = { ...matchingBaseCard, quantity: 1 };
            window.alert(
              'Dreamseeker Added!', 
              `Added ${card.Name} and automatically paired it with ${matchingBaseCard.Name}.`
            );
          } else {
            window.alert(
              'Warning', 
              `Added ${card.Name} but couldn't find matching Base "${matchingBaseName}".`
            );
          }
        } else {
          window.alert('Dreamseeker Added!', `Added ${card.Name}.`);
        }
      }
    } else if (card.Type === 'Base') {
      // Handle Base based on active section
      if (activeSection === 'sideboard') {
        // Add to sideboard
        const currentSize = newDeck.sideboard.reduce((sum, c) => sum + c.quantity, 0);
        if (currentSize >= 8) {
          window.alert('Your sideboard is full.');
          return;
        }
        
        // Check total copies across all sections
        const mainDeckCopies = newDeck.mainDeck.find(c => c.ID === card.ID)?.quantity || 0;
        const sideboardCopies = newDeck.sideboard.find(c => c.ID === card.ID)?.quantity || 0;
        const dreamplaneCopies = newDeck.dreamplanes.find(c => c.ID === card.ID)?.quantity || 0;
        const totalCopies = mainDeckCopies + sideboardCopies + dreamplaneCopies;
        
        if (totalCopies >= 3) {
          window.alert('You can only have 3 total copies of this card across all sections.');
          return;
        }
        
        const existing = newDeck.sideboard.find(c => c.ID === card.ID);
        if (existing) {
          existing.quantity++;
        } else {
          newDeck.sideboard.push({ ...card, quantity: 1 });
        }
        
        // Auto-add matching Dreamseeker to sideboard if space allows
        const matchingDreamseekerName = getMatchingDreamseeker(card);
        if (matchingDreamseekerName) {
          const matchingDreamseekerCard = availableCards.find(c => 
            c.Name.toLowerCase() === matchingDreamseekerName.toLowerCase()
          );
          
          if (matchingDreamseekerCard) {
            const currentSizeAfterBase = newDeck.sideboard.reduce((sum, c) => sum + c.quantity, 0);
            const dreamseekerExistsInSideboard = newDeck.sideboard.find(c => c.ID === matchingDreamseekerCard.ID);
            
            if (currentSizeAfterBase < 8 && !dreamseekerExistsInSideboard) {
              newDeck.sideboard.push({ ...matchingDreamseekerCard, quantity: 1 });
              window.alert(
                'Base Added!', 
                `Added ${card.Name} and automatically paired it with ${matchingDreamseekerCard.Name} in sideboard.`
              );
            } else {
              window.alert('Base Added!', `Added ${card.Name} to sideboard.`);
            }
          }
        }
      } else {
        // Add to main Base slot
        if (newDeck.base) {
          window.alert('You can only have 1 Base in your deck.');
          return;
        }
        newDeck.base = { ...card, quantity: 1 };
        
        // Auto-add matching Dreamseeker
        const matchingDreamseekerName = getMatchingDreamseeker(card);
        if (matchingDreamseekerName) {
          const matchingDreamseekerCard = availableCards.find(c => 
            c.Name.toLowerCase() === matchingDreamseekerName.toLowerCase()
          );
          
          if (matchingDreamseekerCard && !newDeck.dreamseeker) {
            newDeck.dreamseeker = { ...matchingDreamseekerCard, quantity: 1 };
            window.alert(
              'Base Added!', 
              `Added ${card.Name} and automatically paired it with ${matchingDreamseekerCard.Name}.`
            );
          } else {
            window.alert('Base Added!', `Added ${card.Name}.`);
          }
        }
      }
    } else if (card.Type === 'Dreamplane') {
      if (activeSection !== 'dreamplanes') {
        window.alert('Dreamplanes must be added to the Dreamplane section.');
        return;
      }
      
      // Check if adding this card would exceed the Dreamplane limit
      const currentDreamplaneCount = newDeck.dreamplanes.reduce((sum, c) => sum + c.quantity, 0);
      if (currentDreamplaneCount >= 10) {
        window.alert('You can only have 10 Dreamplanes in your deck.');
        return;
      }
      
      // Check total copies across main deck and sideboard
      const mainDeckCopies = newDeck.mainDeck.find(c => c.ID === card.ID)?.quantity || 0;
      const sideboardCopies = newDeck.sideboard.find(c => c.ID === card.ID)?.quantity || 0;
      const dreamplaneCopies = newDeck.dreamplanes.find(c => c.ID === card.ID)?.quantity || 0;
      const totalCopies = mainDeckCopies + sideboardCopies + dreamplaneCopies;
      
      if (totalCopies >= 3) {
        window.alert('You can only have 3 total copies of this card across all sections.');
        return;
      }
      
      const existing = newDeck.dreamplanes.find(c => c.ID === card.ID);
      if (existing) {
        existing.quantity++;
      } else {
        newDeck.dreamplanes.push({ ...card, quantity: 1 });
      }
    } else {
      // Add to main deck or sideboard based on active section
      const targetSection = activeSection === 'sideboard' ? 'sideboard' : 'mainDeck';
      const maxSize = targetSection === 'sideboard' ? 8 : 30;
      
      const currentSize = newDeck[targetSection].reduce((sum, c) => sum + c.quantity, 0);
      if (currentSize >= maxSize) {
        window.alert('Error', `Your ${targetSection === 'sideboard' ? 'sideboard' : 'main deck'} is full.`);
        return;
      }
      
      // Check total copies across main deck, sideboard, and dreamplanes
      const mainDeckCopies = newDeck.mainDeck.find(c => c.ID === card.ID)?.quantity || 0;
      const sideboardCopies = newDeck.sideboard.find(c => c.ID === card.ID)?.quantity || 0;
      const dreamplaneCopies = newDeck.dreamplanes.find(c => c.ID === card.ID)?.quantity || 0;
      const totalCopies = mainDeckCopies + sideboardCopies + dreamplaneCopies;
      
      if (totalCopies >= 3) {
        window.alert('You can only have 3 total copies of this card across all sections.');
        return;
      }
      
      const existing = newDeck[targetSection].find(c => c.ID === card.ID);
      if (existing) {
        existing.quantity++;
      } else {
        newDeck[targetSection].push({ ...card, quantity: 1 });
      }
    }
    
    newDeck.lastModified = new Date();
    setDeck(newDeck);
  };

  const removeCardFromDeck = (cardId: number, section: keyof Deck) => {
    const newDeck = { ...deck };
    let removedCard: Card | undefined;
    
    if (section === 'dreamseeker') {
      removedCard = newDeck.dreamseeker;
      newDeck.dreamseeker = undefined;
      
      // Remove matching Base if it exists
      if (removedCard && newDeck.base) {
        const matchingBaseName = getMatchingBase(removedCard);
        if (matchingBaseName && newDeck.base.Name.toLowerCase() === matchingBaseName.toLowerCase()) {
          newDeck.base = undefined;
        }
      }
    } else if (section === 'base') {
      removedCard = newDeck.base;
      newDeck.base = undefined;
      
      // Remove matching Dreamseeker if it exists
      if (removedCard && newDeck.dreamseeker) {
        const matchingDreamseekerName = getMatchingDreamseeker(removedCard);
        if (matchingDreamseekerName && newDeck.dreamseeker.Name.toLowerCase() === matchingDreamseekerName.toLowerCase()) {
          newDeck.dreamseeker = undefined;
        }
      }
    } else if (section === 'dreamplanes' || section === 'mainDeck' || section === 'sideboard') {
      const sectionCards = newDeck[section] as DeckCard[];
      const cardIndex = sectionCards.findIndex(c => c.ID === cardId);
      if (cardIndex >= 0) {
        removedCard = sectionCards[cardIndex];
        
        // For sideboard Dreamseeker/Base removal, always remove matching pairs
        if (section === 'sideboard' && removedCard) {
          let matchingCardIndex = -1;
          
          if (isDreamseeker(removedCard)) {
            // Find matching Base from sideboard
            const matchingBaseName = getMatchingBase(removedCard);
            if (matchingBaseName) {
              matchingCardIndex = sectionCards.findIndex(c => 
                c.Type === 'Base' && c.Name.toLowerCase() === matchingBaseName.toLowerCase()
              );
            }
          } else if (removedCard.Type === 'Base') {
            // Find matching Dreamseeker from sideboard
            const matchingDreamseekerName = getMatchingDreamseeker(removedCard);
            if (matchingDreamseekerName) {
              matchingCardIndex = sectionCards.findIndex(c => 
                c.Name.toLowerCase() === matchingDreamseekerName.toLowerCase()
              );
            }
          }
          
          // Remove both cards, handling index shifts
          const indicesToRemove = [cardIndex];
          if (matchingCardIndex >= 0 && matchingCardIndex !== cardIndex) {
            indicesToRemove.push(matchingCardIndex);
          }
          
          // Sort indices in descending order to avoid index shifting issues
          indicesToRemove.sort((a, b) => b - a);
          
          for (const index of indicesToRemove) {
            if (sectionCards[index].quantity > 1) {
              sectionCards[index].quantity--;
            } else {
              sectionCards.splice(index, 1);
            }
          }
        } else {
          // Regular removal for non-sideboard or non-matching cards
          if (sectionCards[cardIndex].quantity > 1) {
            sectionCards[cardIndex].quantity--;
          } else {
            sectionCards.splice(cardIndex, 1);
          }
        }
      }
    }
    
    newDeck.lastModified = new Date();
    setDeck(newDeck);
  };

  const validateDeck = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!deck.dreamseeker) errors.push('Missing Dreamseeker');
    if (!deck.base) errors.push('Missing Base');
    
    const dreamplaneCount = deck.dreamplanes.reduce((sum, c) => sum + c.quantity, 0);
    if (dreamplaneCount !== 10) {
      errors.push(`Dreamplanes: ${dreamplaneCount}/10 (must be exactly 10)`);
    }
    
    const mainDeckSize = deck.mainDeck.reduce((sum, c) => sum + c.quantity, 0);
    if (mainDeckSize !== 30) {
      errors.push(`Main deck: ${mainDeckSize}/30 cards (must be exactly 30)`);
    }
    
    const sideboardSize = deck.sideboard.reduce((sum, c) => sum + c.quantity, 0);
    if (sideboardSize > 8) {
      errors.push(`Sideboard: ${sideboardSize}/8 cards (maximum 8)`);
    }
    
    // Check if sideboard has Dreamseeker but no Base
    const sideboardHasDreamseeker = deck.sideboard.some(card => 
      card.Type === 'Dreamshape' && card.Subtype === 'Avatar'
    );
    const sideboardHasBase = deck.sideboard.some(card => card.Type === 'Base');
    
    if (sideboardHasDreamseeker && !sideboardHasBase) {
      errors.push('Sideboard with Dreamseeker must also include a Base');
    }
    
    // Check for card copy limits across all sections
    const cardCounts: { [cardId: number]: { name: string; total: number } } = {};
    
    // Count cards in main deck
    deck.mainDeck.forEach(card => {
      cardCounts[card.ID] = { 
        name: card.Name, 
        total: (cardCounts[card.ID]?.total || 0) + card.quantity 
      };
    });
    
    // Count cards in sideboard
    deck.sideboard.forEach(card => {
      cardCounts[card.ID] = { 
        name: card.Name, 
        total: (cardCounts[card.ID]?.total || 0) + card.quantity 
      };
    });
    
    // Count cards in dreamplanes
    deck.dreamplanes.forEach(card => {
      cardCounts[card.ID] = { 
        name: card.Name, 
        total: (cardCounts[card.ID]?.total || 0) + card.quantity 
      };
    });
    
    // Check for violations
    Object.entries(cardCounts).forEach(([cardId, info]) => {
      if (info.total > 3) {
        errors.push(`${info.name}: ${info.total}/3 copies (maximum 3 across all sections)`);
      }
    });
    
    return { valid: errors.length === 0, errors };
  };

  const saveDeck = () => {
    const { valid, errors } = validateDeck();
    
    if (!valid) {
      window.alert('Invalid Deck', 'Please fix these issues:\n\n' + errors.join('\n'));
      return;
    }
    
    const updatedDeck = { ...deck, name: deckName };
    
    try {
      const savedDecks = JSON.parse(localStorage.getItem('dreamworld_decks') || '[]');
      const existingIndex = savedDecks.findIndex((d: Deck) => d.id === updatedDeck.id);
      
      if (existingIndex >= 0) {
        savedDecks[existingIndex] = updatedDeck;
      } else {
        savedDecks.push(updatedDeck);
      }
      
      localStorage.setItem('dreamworld_decks', JSON.stringify(savedDecks));
      setDeck(updatedDeck);
      setShowSaveModal(false);
      window.alert('Success', `Deck "${deckName}" has been saved!`);
    } catch (error) {
      window.alert('Failed to save deck.');
    }
  };

  const renderCardItem = ({ item, index }: { item: Card; index: number }) => (
    <View style={styles.cardItem}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.Name}</Text>
        <Text style={styles.cardType}>
          {isDreamseeker(item) ? 'Dreamseeker' : item.Type} - {item.Subtype}
        </Text>
        <Text style={styles.cardFaction}>{item.FactionStat}</Text>
        <View style={styles.cardStats}>
          <Text style={styles.cardStat}>Cost: {item.Cost}</Text>
          {item.AttackStat > 0 && <Text style={styles.cardStat}>ATK: {item.AttackStat}</Text>}
          {item.DefenseStat > 0 && <Text style={styles.cardStat}>DEF: {item.DefenseStat}</Text>}
          {item.MindStat > 0 && <Text style={styles.cardStat}>Mind: {item.MindStat}</Text>}
          {item.Initiative && <Text style={styles.cardStat}>Init: {item.Initiative}</Text>}
          {item.Backlash && <Text style={styles.cardStat}>Back: {item.Backlash}</Text>}
        </View>
      </View>
      <View style={styles.cardButtons}>
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => {
            if (viewingCard?.ID === item.ID) {
              setViewingCard(null);
              setViewingCardIndex(-1);
            } else {
              setViewingCard(item);
              setViewingCardIndex(index);
            }
          }}
        >
          <Text style={styles.viewButtonText}>
            {viewingCard?.ID === item.ID ? 'Hide' : 'View'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => addCardToDeck(item)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDeckCard = ({ item, section }: { item: DeckCard; section: keyof Deck }) => (
    <View style={styles.deckCardItem}>
      <View style={styles.deckCardInfo}>
        <Text style={styles.deckCardName}>{item.Name}</Text>
        <Text style={styles.deckCardType}>{item.Type}</Text>
        <Text style={styles.deckCardQuantity}>x{item.quantity}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeCardFromDeck(item.ID, section)}
      >
        <Text style={styles.removeButtonText}>-</Text>
      </TouchableOpacity>
    </View>
  );

  const { valid, errors } = validateDeck();

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Deck Builder</Text>
        <TouchableOpacity
          style={[styles.saveButton, valid ? styles.validDeck : styles.invalidDeck]}
          onPress={() => setShowSaveModal(true)}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.deckStatus}>
        <Text style={styles.deckName}>{deck.name}</Text>
        <Text style={[styles.validationText, valid ? styles.validText : styles.errorText]}>
          {valid ? '✓ Deck Valid' : `${errors.length} Issues`}
        </Text>
      </View>

      <View style={styles.mainContent}>
        {/* Deck Sections */}
        <View style={styles.deckPanel}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Dreamseeker */}
            <View style={styles.deckSection}>
              <Text style={styles.sectionTitle}>
                Dreamseeker ({deck.dreamseeker ? 1 : 0}/1)
              </Text>
              {deck.dreamseeker ? (
                renderDeckCard({ item: deck.dreamseeker, section: 'dreamseeker' })
              ) : (
                <Text style={styles.emptyText}>No Dreamseeker selected</Text>
              )}
            </View>

            {/* Base */}
            <View style={styles.deckSection}>
              <Text style={styles.sectionTitle}>
                Base ({deck.base ? 1 : 0}/1)
              </Text>
              {deck.base ? (
                renderDeckCard({ item: deck.base, section: 'base' })
              ) : (
                <Text style={styles.emptyText}>No Base selected</Text>
              )}
            </View>

            {/* Dreamplanes */}
            <TouchableOpacity 
              style={[styles.deckSection, activeSection === 'dreamplanes' && styles.activeSection]}
              onPress={() => setActiveSection('dreamplanes')}
            >
              <Text style={styles.sectionTitle}>
                Dreamplanes ({deck.dreamplanes.reduce((sum, c) => sum + c.quantity, 0)}/10)
              </Text>
              {deck.dreamplanes.map((card, index) => (
                <View key={`${card.ID}-${index}`}>
                  {renderDeckCard({ item: card, section: 'dreamplanes' })}
                </View>
              ))}
              {deck.dreamplanes.length === 0 && (
                <Text style={styles.emptyText}>No Dreamplanes added</Text>
              )}
            </TouchableOpacity>

            {/* Main Deck */}
            <TouchableOpacity 
              style={[styles.deckSection, activeSection === 'mainDeck' && styles.activeSection]}
              onPress={() => setActiveSection('mainDeck')}
            >
              <Text style={styles.sectionTitle}>
                Main Deck ({deck.mainDeck.reduce((sum, c) => sum + c.quantity, 0)}/30)
              </Text>
              {deck.mainDeck.map((card, index) => (
                <View key={`${card.ID}-${index}`}>
                  {renderDeckCard({ item: card, section: 'mainDeck' })}
                </View>
              ))}
              {deck.mainDeck.length === 0 && (
                <Text style={styles.emptyText}>No cards in main deck</Text>
              )}
            </TouchableOpacity>

            {/* Sideboard */}
            <TouchableOpacity 
              style={[styles.deckSection, activeSection === 'sideboard' && styles.activeSection]}
              onPress={() => setActiveSection('sideboard')}
            >
              <Text style={styles.sectionTitle}>
                Sideboard ({deck.sideboard.reduce((sum, c) => sum + c.quantity, 0)}/8)
              </Text>
              {deck.sideboard.map((card, index) => (
                <View key={`${card.ID}-${index}`}>
                  {renderDeckCard({ item: card, section: 'sideboard' })}
                </View>
              ))}
              {deck.sideboard.length === 0 && (
                <Text style={styles.emptyText}>No cards in sideboard</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Card Browser */}
        <View style={styles.cardPanel}>
          <View style={styles.filters}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search cards..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            
            <View style={styles.filterRow}>
              <Text>Type:</Text>
              <View style={styles.filterButtons}>
                {['All', 'Dreamseeker', 'Dreamshape', 'Base', 'Dreamplane', 'Distort', 'Warp', 'Attachment', 'Landmark'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.filterButton, selectedType === type && styles.activeFilter]}
                    onPress={() => setSelectedType(type)}
                  >
                    <Text style={[styles.filterButtonText, selectedType === type && styles.activeFilterText]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterRow}>
              <Text>Faction:</Text>
              <View style={styles.filterButtons}>
                {['All', 'Asylum', 'Authority', 'Havoc', 'Mercenary', 'Outlander', 'Sect13'].map(faction => (
                  <TouchableOpacity
                    key={faction}
                    style={[styles.filterButton, selectedFaction === faction && styles.activeFilter]}
                    onPress={() => setSelectedFaction(faction)}
                  >
                    <Text style={[styles.filterButtonText, selectedFaction === faction && styles.activeFilterText]}>
                      {faction}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.advancedSearchToggle}
              onPress={() => setShowAdvancedSearch(!showAdvancedSearch)}
            >
              <Text style={styles.advancedSearchText}>
                {showAdvancedSearch ? '▼ Advanced Search' : '▶ Advanced Search'}
              </Text>
            </TouchableOpacity>

            {showAdvancedSearch && (
              <View style={styles.advancedFilters}>
                <View style={styles.advancedRow}>
                  <TextInput
                    style={styles.advancedInput}
                    placeholder="Min Attack"
                    value={advancedFilters.minAttack}
                    onChangeText={(text) => setAdvancedFilters({...advancedFilters, minAttack: text})}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.advancedInput}
                    placeholder="Max Attack"
                    value={advancedFilters.maxAttack}
                    onChangeText={(text) => setAdvancedFilters({...advancedFilters, maxAttack: text})}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.advancedRow}>
                  <TextInput
                    style={styles.advancedInput}
                    placeholder="Min Defense"
                    value={advancedFilters.minDefense}
                    onChangeText={(text) => setAdvancedFilters({...advancedFilters, minDefense: text})}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.advancedInput}
                    placeholder="Max Defense"
                    value={advancedFilters.maxDefense}
                    onChangeText={(text) => setAdvancedFilters({...advancedFilters, maxDefense: text})}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.advancedRow}>
                  <TextInput
                    style={styles.advancedInput}
                    placeholder="Min Cost"
                    value={advancedFilters.minCost}
                    onChangeText={(text) => setAdvancedFilters({...advancedFilters, minCost: text})}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.advancedInput}
                    placeholder="Max Cost"
                    value={advancedFilters.maxCost}
                    onChangeText={(text) => setAdvancedFilters({...advancedFilters, maxCost: text})}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.advancedRow}>
                  <TextInput
                    style={styles.advancedInput}
                    placeholder="Min Initiative"
                    value={advancedFilters.minInitiative}
                    onChangeText={(text) => setAdvancedFilters({...advancedFilters, minInitiative: text})}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.advancedInput}
                    placeholder="Max Initiative"
                    value={advancedFilters.maxInitiative}
                    onChangeText={(text) => setAdvancedFilters({...advancedFilters, maxInitiative: text})}
                    keyboardType="numeric"
                  />
                </View>
                
                <View style={styles.advancedRow}>
                  <TextInput
                    style={styles.advancedInput}
                    placeholder="Min Backlash"
                    value={advancedFilters.minBacklash}
                    onChangeText={(text) => setAdvancedFilters({...advancedFilters, minBacklash: text})}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={styles.advancedInput}
                    placeholder="Max Backlash"
                    value={advancedFilters.maxBacklash}
                    onChangeText={(text) => setAdvancedFilters({...advancedFilters, maxBacklash: text})}
                    keyboardType="numeric"
                  />
                </View>

                <TextInput
                  style={styles.abilitySearchInput}
                  placeholder="Search abilities/effects..."
                  value={advancedFilters.hasAbility}
                  onChangeText={(text) => setAdvancedFilters({...advancedFilters, hasAbility: text})}
                />

                <TouchableOpacity
                  style={styles.clearFiltersButton}
                  onPress={() => setAdvancedFilters({
                    minAttack: '', maxAttack: '', minDefense: '', maxDefense: '',
                    minCost: '', maxCost: '', minInitiative: '', maxInitiative: '',
                    minBacklash: '', maxBacklash: '', hasAbility: '', statType: 'all'
                  })}
                >
                  <Text style={styles.clearFiltersText}>Clear Advanced Filters</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.cardBrowserContent}>
            <FlatList
              data={filteredCards}
              renderItem={renderCardItem}
              keyExtractor={(item) => item.ID.toString()}
              style={styles.cardList}
              showsVerticalScrollIndicator={false}
              onScroll={(event) => setScrollOffset(event.nativeEvent.contentOffset.y)}
              scrollEventThrottle={16}
              getItemLayout={(data, index) => ({
                length: 80, // Approximate height of each card item
                offset: 80 * index,
                index,
              })}
            />


            {/* Hover Preview */}
            {hoveredCard && !viewingCard && (
              <View style={styles.hoverPreview}>
                {hoveredCard.imageUrl && (
                  <Image 
                    source={{ uri: hoveredCard.imageUrl }} 
                    style={styles.hoverImage}
                    onError={() => console.log(`Failed to load hover image: ${hoveredCard.imageUrl}`)}
                  />
                )}
                <Text style={styles.hoverCardName}>{hoveredCard.Name}</Text>
                <Text style={styles.hoverCardType}>
                  {isDreamseeker(hoveredCard) ? 'Dreamseeker' : hoveredCard.Type}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Save Modal */}
      <Modal visible={showSaveModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.saveModal}>
            <Text style={styles.modalTitle}>Save Deck</Text>
            
            <TextInput
              style={styles.deckNameInput}
              placeholder="Enter deck name..."
              value={deckName}
              onChangeText={setDeckName}
            />

            {!valid && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorTitle}>Fix these issues first:</Text>
                {errors.map((error, index) => (
                  <Text key={index} style={styles.errorText}>• {error}</Text>
                ))}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, !valid && styles.disabledButton]}
                onPress={saveDeck}
                disabled={!valid}
              >
                <Text style={styles.modalSaveText}>Save Deck</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    
    {/* Card Image Viewer - Fixed overlay outside scroll container */}
    {viewingCard && (
      <View style={styles.cardViewerBackdrop}>
        <TouchableOpacity 
          style={styles.backdrop}
          onPress={() => setViewingCard(null)}
          activeOpacity={1}
        />
        <View style={styles.cardViewer}>
          {viewingCard.imageUrl && (
            <Image 
              source={{ uri: viewingCard.imageUrl }} 
              style={styles.cardViewerImage}
              onError={() => console.log(`Failed to load card image: ${viewingCard.imageUrl}`)}
            />
          )}
          <View style={styles.cardViewerInfo}>
            <Text style={styles.cardViewerName}>{viewingCard.Name}</Text>
            <Text style={styles.cardViewerType}>
              {isDreamseeker(viewingCard) ? 'Dreamseeker' : viewingCard.Type} - {viewingCard.Subtype}
            </Text>
            <Text style={styles.cardViewerFaction}>{viewingCard.FactionStat}</Text>
            {viewingCard.Abilities && viewingCard.Abilities.length > 0 && (
              <View style={styles.cardViewerAbilities}>
                <Text style={styles.cardViewerAbilitiesTitle}>Abilities:</Text>
                {viewingCard.Abilities.map((ability, index) => (
                  <Text key={index} style={styles.cardViewerAbility}>
                    • {ability.Name}: {ability.Description}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>
      </View>
    )}
    
    </KeyboardAvoidingView>
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  validDeck: {
    backgroundColor: '#28a745',
  },
  invalidDeck: {
    backgroundColor: '#6c757d',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deckStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  deckName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  validationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  validText: {
    color: '#28a745',
  },
  errorText: {
    color: '#dc3545',
  },
  mainContent: {
    flex: 1,
    flexDirection: Dimensions.get('window').width < 768 ? 'column' : 'row',
  },
  deckPanel: {
    flex: Dimensions.get('window').width < 768 ? 0 : 1,
    height: Dimensions.get('window').width < 768 ? Math.max(450, Dimensions.get('window').height * 0.6) : 'auto',
    backgroundColor: 'white',
    margin: Dimensions.get('window').width < 768 ? 5 : 10,
    borderRadius: 8,
    padding: Dimensions.get('window').width < 768 ? 12 : 10,
    minHeight: Dimensions.get('window').width < 768 ? 450 : 'auto',
  },
  cardPanel: {
    flex: 1,
    backgroundColor: 'white',
    margin: Dimensions.get('window').width < 768 ? 5 : 10,
    borderRadius: 8,
  },
  deckSection: {
    marginBottom: Dimensions.get('window').width < 768 ? 12 : 15,
    padding: Dimensions.get('window').width < 768 ? 12 : 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    minHeight: Dimensions.get('window').width < 768 ? 80 : 'auto',
  },
  activeSection: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#2196f3',
  },
  sectionTitle: {
    fontSize: Dimensions.get('window').width < 768 ? 14 : 16,
    fontWeight: 'bold',
    marginBottom: Dimensions.get('window').width < 768 ? 6 : 8,
    color: '#333',
  },
  emptyText: {
    fontSize: Dimensions.get('window').width < 768 ? 11 : 12,
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: Dimensions.get('window').width < 768 ? 4 : 0,
  },
  deckCardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Dimensions.get('window').width < 768 ? 10 : 4,
    paddingHorizontal: Dimensions.get('window').width < 768 ? 10 : 0,
    backgroundColor: Dimensions.get('window').width < 768 ? '#fff' : 'transparent',
    marginBottom: Dimensions.get('window').width < 768 ? 6 : 0,
    borderRadius: Dimensions.get('window').width < 768 ? 6 : 0,
    borderWidth: Dimensions.get('window').width < 768 ? 1 : 0,
    borderColor: Dimensions.get('window').width < 768 ? '#e0e0e0' : 'transparent',
    minHeight: Dimensions.get('window').width < 768 ? 50 : 'auto',
    shadowColor: Dimensions.get('window').width < 768 ? '#000' : 'transparent',
    shadowOffset: Dimensions.get('window').width < 768 ? { width: 0, height: 1 } : { width: 0, height: 0 },
    shadowOpacity: Dimensions.get('window').width < 768 ? 0.1 : 0,
    shadowRadius: Dimensions.get('window').width < 768 ? 2 : 0,
    elevation: Dimensions.get('window').width < 768 ? 1 : 0,
  },
  deckCardInfo: {
    flex: 1,
  },
  deckCardName: {
    fontSize: Dimensions.get('window').width < 768 ? 12 : 14,
    fontWeight: '600',
    color: '#333',
  },
  deckCardType: {
    fontSize: Dimensions.get('window').width < 768 ? 10 : 12,
    color: '#666',
  },
  deckCardQuantity: {
    fontSize: Dimensions.get('window').width < 768 ? 10 : 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dc3545',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  filters: {
    padding: Dimensions.get('window').width < 768 ? 10 : 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  filterRow: {
    marginBottom: 10,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 5,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeFilter: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  activeFilterText: {
    color: 'white',
    fontWeight: '600',
  },
  cardList: {
    flex: 1,
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  cardType: {
    fontSize: 12,
    color: '#666',
  },
  cardFaction: {
    fontSize: 12,
    color: '#888',
  },
  cardCost: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#28a745',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  deckNameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  errorContainer: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#fee',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666',
  },
  modalSaveButton: {
    flex: 2,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  modalSaveText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  advancedSearchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginTop: 5,
  },
  advancedFilters: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
  },
  advancedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  advancedInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    backgroundColor: 'white',
  },
  abilitySearchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  clearFiltersButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dc3545',
    borderRadius: 4,
    marginTop: 5,
  },
  cardBrowserContent: {
    flex: 1,
    position: 'relative',
  },
  hoverPreview: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 200,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  hoverImage: {
    width: 180,
    height: 252,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
  },
  hoverCardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  hoverCardType: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  cardStats: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  cardStat: {
    fontSize: 11,
    color: '#888',
  },
  cardButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  viewButton: {
    backgroundColor: '#6f42c1',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  cardViewerBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  cardViewer: {
    width: Dimensions.get('window').width < 768 ? Math.min(280, Dimensions.get('window').width - 40) : 300,
    maxHeight: Dimensions.get('window').height - 100,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  cardViewerImage: {
    width: '100%',
    height: Dimensions.get('window').width < 768 ? 200 : 280,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f0f0f0',
    resizeMode: 'contain',
  },
  cardViewerInfo: {
    flex: 1,
  },
  cardViewerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  cardViewerType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cardViewerFaction: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  cardViewerAbilities: {
    marginTop: 8,
  },
  cardViewerAbilitiesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  cardViewerAbility: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
    lineHeight: 16,
  },
  advancedSearchText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  clearFiltersText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
});

export default DeckBuilder;