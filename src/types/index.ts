export interface User {
  id: string;
  email: string;
  displayName: string;
}

export interface Card {
  id: string;
  name: string;
  type: string;
  cost: number;
  attack?: number;
  defense?: number;
  morale?: number;
  description: string;
  imageUrl?: string;
}

export interface Deck {
  id: string;
  name: string;
  userId: string;
  cards: string[];
  dreamseeker: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameState {
  id: string;
  players: {
    [playerId: string]: PlayerState;
  };
  currentTurn: number;
  currentRound: number;
  priorityPlayerId: string;
  gameStatus: 'waiting' | 'active' | 'ended';
  winner?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerState {
  id: string;
  displayName: string;
  morale: number;
  energy: number;
  maxEnergyThisTurn: number;
  deckId?: string;
  roundWins: number;
  moraleHistory: number[];
}

export interface Match {
  id: string;
  players: string[];
  winner?: string;
  rounds: Round[];
  createdAt: Date;
  endedAt?: Date;
}

export interface Round {
  roundNumber: number;
  winner?: string;
  finalMorale: { [playerId: string]: number };
  turns: number;
}