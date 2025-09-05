export interface CardAbility {
  id: number;
  Name: string;
  Description: string;
}

export interface Card {
  ID: number;
  Name: string;
  Type: string;
  Subtype: string;
  FactionStat: string;
  Cost: number;
  AttackStat: number;
  DefenseStat: number;
  MindStat: number;
  SkillStat: number;
  EnergyStat: number;
  Initiative?: string;
  Backlash?: string;
  Abilities: CardAbility[];
  Rarity: string;
  MaxCopiesInDeck: number;
  Flavortext: string;
  imageUrl?: string;
  cardId?: number;
}

export interface CardSet {
  name: string;
  cards: Card[];
  spriteSheetUrl: string;
  spriteSheetCols: number;
  spriteSheetRows: number;
}

// Parse Tabletop Simulator card data
const parseTabletopSimulatorData = (jsonData: any): CardSet => {
  const objectState = jsonData.ObjectStates[0];
  const customDeck = objectState.CustomDeck["1"];
  
  const cardSet: CardSet = {
    name: objectState.Nickname || "Unknown Set",
    cards: [],
    spriteSheetUrl: customDeck.FaceURL,
    spriteSheetCols: customDeck.NumWidth,
    spriteSheetRows: customDeck.NumHeight
  };

  // Parse each card from ContainedObjects
  objectState.ContainedObjects?.forEach((cardObj: any, index: number) => {
    try {
      const gmNotes = JSON.parse(cardObj.GMNotes);
      
      const card: Card = {
        ID: gmNotes.ID || index + 1,
        Name: gmNotes.Name || cardObj.Nickname || "Unknown Card",
        Type: gmNotes.Type || "Unknown",
        Subtype: gmNotes.Subtype || "",
        FactionStat: gmNotes.FactionStat || "Neutral",
        Cost: gmNotes.Cost || 0,
        AttackStat: gmNotes.AttackStat || 0,
        DefenseStat: gmNotes.DefenseStat || 0,
        MindStat: gmNotes.MindStat || 0,
        SkillStat: gmNotes.SkillStat || 0,
        EnergyStat: gmNotes.EnergyStat || 0,
        Abilities: gmNotes.Abilities || [],
        Rarity: gmNotes.Rarity || "Common",
        MaxCopiesInDeck: gmNotes.MaxCopiesInDeck || 1,
        Flavortext: gmNotes.Flavortext || "",
        cardId: cardObj.CardID
      };

      // Calculate individual card position in sprite sheet for image URL
      if (card.cardId !== undefined && customDeck.FaceURL) {
        const cardIndex = card.cardId - 100; // Assuming cards start at ID 100
        card.imageUrl = `${customDeck.FaceURL}#${cardIndex}`;
      }

      cardSet.cards.push(card);
    } catch (error) {
      console.error(`Failed to parse card at index ${index}:`, error);
    }
  });

  return cardSet;
};

// Card database class
class CardDatabase {
  public cardSets: CardSet[] = [];
  public allCards: Card[] = [];

  // Load card sets from JSON data
  loadCardSet(jsonData: any): void {
    const cardSet = parseTabletopSimulatorData(jsonData);
    this.cardSets.push(cardSet);
    this.allCards = [...this.allCards, ...cardSet.cards];
  }

  // Get all cards
  getAllCards(): Card[] {
    return this.allCards;
  }

  // Get cards by faction
  getCardsByFaction(faction: string): Card[] {
    return this.allCards.filter(card => 
      card.FactionStat.toLowerCase() === faction.toLowerCase()
    );
  }

  // Get cards by type
  getCardsByType(type: string): Card[] {
    return this.allCards.filter(card => 
      card.Type.toLowerCase() === type.toLowerCase()
    );
  }

  // Search cards by name
  searchCardsByName(query: string): Card[] {
    const lowercaseQuery = query.toLowerCase();
    return this.allCards.filter(card =>
      card.Name.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Advanced search with multiple criteria
  searchCards(criteria: {
    name?: string;
    faction?: string;
    type?: string;
    subtype?: string;
    rarity?: string;
    minCost?: number;
    maxCost?: number;
    hasAbility?: string;
  }): Card[] {
    return this.allCards.filter(card => {
      if (criteria.name && !card.Name.toLowerCase().includes(criteria.name.toLowerCase())) {
        return false;
      }
      if (criteria.faction && card.FactionStat.toLowerCase() !== criteria.faction.toLowerCase()) {
        return false;
      }
      if (criteria.type && card.Type.toLowerCase() !== criteria.type.toLowerCase()) {
        return false;
      }
      if (criteria.subtype && card.Subtype.toLowerCase() !== criteria.subtype.toLowerCase()) {
        return false;
      }
      if (criteria.rarity && card.Rarity.toLowerCase() !== criteria.rarity.toLowerCase()) {
        return false;
      }
      if (criteria.minCost !== undefined && card.Cost < criteria.minCost) {
        return false;
      }
      if (criteria.maxCost !== undefined && card.Cost > criteria.maxCost) {
        return false;
      }
      if (criteria.hasAbility) {
        const hasAbility = card.Abilities.some(ability =>
          ability.Name.toLowerCase().includes(criteria.hasAbility!.toLowerCase()) ||
          ability.Description.toLowerCase().includes(criteria.hasAbility!.toLowerCase())
        );
        if (!hasAbility) return false;
      }
      return true;
    });
  }

  // Get card by ID
  getCardById(id: number): Card | undefined {
    return this.allCards.find(card => card.ID === id);
  }

  // Get unique values for filters
  getUniqueFactions(): string[] {
    return [...new Set(this.allCards.map(card => card.FactionStat))];
  }

  getUniqueTypes(): string[] {
    return [...new Set(this.allCards.map(card => card.Type))];
  }

  getUniqueSubtypes(): string[] {
    return [...new Set(this.allCards.map(card => card.Subtype))].filter(Boolean);
  }

  getUniqueRarities(): string[] {
    return [...new Set(this.allCards.map(card => card.Rarity))];
  }

  // Get cost range
  getCostRange(): { min: number; max: number } {
    const costs = this.allCards.map(card => card.Cost);
    return {
      min: Math.min(...costs),
      max: Math.max(...costs)
    };
  }
}

// Create global card database instance
export const cardDatabase = new CardDatabase();

// Parse CSV data into card objects
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
};

const parseCSVData = (csvText: string): Card[] => {
  const lines = csvText.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  const cards: Card[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < headers.length) continue;
    
    const cardData: any = {};
    headers.forEach((header, index) => {
      cardData[header] = values[index] || '';
    });
    
    // Parse abilities from Effect columns
    const abilities: CardAbility[] = [];
    if (cardData.Effect1) {
      abilities.push({
        id: 1,
        Name: "Primary Effect",
        Description: cardData.Effect1
      });
    }
    if (cardData.Effect2) {
      abilities.push({
        id: 2,
        Name: "Secondary Effect", 
        Description: cardData.Effect2
      });
    }
    if (cardData.Effect3) {
      abilities.push({
        id: 3,
        Name: "Tertiary Effect",
        Description: cardData.Effect3
      });
    }
    
    // Generate image URL based on card name (sanitized for file system)
    const sanitizedName = cardData.Name
      .replace(/[^a-zA-Z0-9\s\-]/g, '') // Remove special characters except hyphens
      .replace(/\s+/g, '-')             // Replace spaces with hyphens
      .toLowerCase();
    
    // Map CSV data to Card interface
    const card: Card = {
      ID: i,
      Name: cardData.Name || "Unknown Card",
      Type: cardData.Type || "Unknown",
      Subtype: cardData.Category || "",
      FactionStat: cardData.Faction || "Neutral",
      Cost: parseInt(cardData.Cost) || 0,
      AttackStat: parseInt(cardData.Damage) || 0,
      DefenseStat: parseInt(cardData.Defense) || 0,
      MindStat: parseInt(cardData.Mentality) || 0,
      SkillStat: parseInt(cardData.Tenacity) || 0,
      EnergyStat: 0, // Keep for compatibility but not used
      Initiative: cardData.Initiative || '',
      Backlash: cardData.Backlash || '',
      Abilities: abilities,
      Rarity: cardData.Legendary === "Yes" ? "Legendary" : "Common",
      MaxCopiesInDeck: cardData.Legendary === "Yes" ? 1 : 3,
      Flavortext: "",
      imageUrl: `./cards/${sanitizedName}.png`
    };
    
    cards.push(card);
  }
  
  return cards;
};

// Initialize with CSV data
export const initializeCardDatabase = async () => {
  try {
    // Load CSV data
    const response = await fetch('./CardList.csv');
    const csvText = await response.text();
    const parsedCards = parseCSVData(csvText);
    
    // Create card set from CSV data
    const cardSet: CardSet = {
      name: "Dreamworld TCG Complete Set",
      cards: parsedCards,
      spriteSheetUrl: "",
      spriteSheetCols: 1,
      spriteSheetRows: 1
    };
    
    cardDatabase.cardSets.push(cardSet);
    cardDatabase.allCards = [...cardDatabase.allCards, ...parsedCards];
    
    console.log(`Loaded ${cardDatabase.getAllCards().length} cards from CSV`);
    console.log(`Factions: ${cardDatabase.getUniqueFactions().join(', ')}`);
    console.log(`Types: ${cardDatabase.getUniqueTypes().join(', ')}`);
  } catch (error) {
    console.error('Failed to load card database:', error);
  }
};