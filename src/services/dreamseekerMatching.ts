import { Card } from './cardDatabase';

interface DreamseekerMatch {
  dreamseeker: string;
  base: string;
}

let dreamseekerMatches: DreamseekerMatch[] = [];

// Load Dreamseeker-Base matches from the matches file
export const loadDreamseekerMatches = async (): Promise<void> => {
  try {
    const response = await fetch('./matches');
    const matchesText = await response.text();
    
    dreamseekerMatches = matchesText
      .trim()
      .split('\n')
      .map(line => {
        const [dreamseeker, base] = line.split(':');
        return {
          dreamseeker: dreamseeker.trim(),
          base: base.trim()
        };
      })
      .filter(match => match.dreamseeker && match.base);
    
    console.log(`Loaded ${dreamseekerMatches.length} Dreamseeker-Base matches`);
  } catch (error) {
    console.error('Failed to load Dreamseeker matches:', error);
  }
};

// Check if a card is a Dreamseeker based on the matches file
export const isDreamseeker = (card: Card): boolean => {
  return dreamseekerMatches.some(match => 
    match.dreamseeker.toLowerCase() === card.Name.toLowerCase()
  );
};

// Get the matching Base for a Dreamseeker
export const getMatchingBase = (dreamseekerCard: Card): string | null => {
  const match = dreamseekerMatches.find(match => 
    match.dreamseeker.toLowerCase() === dreamseekerCard.Name.toLowerCase()
  );
  return match ? match.base : null;
};

// Get the matching Dreamseeker for a Base
export const getMatchingDreamseeker = (baseCard: Card): string | null => {
  const match = dreamseekerMatches.find(match => 
    match.base.toLowerCase() === baseCard.Name.toLowerCase()
  );
  return match ? match.dreamseeker : null;
};

// Get all Dreamseeker names for filtering
export const getAllDreamseekerNames = (): string[] => {
  return dreamseekerMatches.map(match => match.dreamseeker);
};

// Get all Base names for filtering
export const getAllBaseNames = (): string[] => {
  return dreamseekerMatches.map(match => match.base);
};

// Check if a Base has a matching Dreamseeker
export const isMatchedBase = (card: Card): boolean => {
  return dreamseekerMatches.some(match => 
    match.base.toLowerCase() === card.Name.toLowerCase()
  );
};