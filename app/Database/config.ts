import { WrongPredictions, WrongPredictionsCrypto, WrongPredictionsStocks, WrongPredictionsMusic } from "./schema";
import {  FeaturedBets, CryptoBets, StocksBets, MusicBets, LivePredictions, Bookmarks, UserAnnouncementReads } from "./schema"; // Import the schema

// Minimum players required to start a pot
export const MIN_PLAYERS = 2; // Minimum participants for first market
export const MIN_PLAYERS2 = 2; // Minimum participants for second market

// Dynamic pricing configuration
export const BASE_ENTRY_FEE = 0.02; // Base entry fee in USD (used when pot hasn't started)
export const PRICING_TIERS = {
  EARLY_DAYS: [0.02, 0.03, 0.04, 0.05], // Days 1-4 pricing in USD
  DOUBLING_START_FEE: 0.10, // Starting fee for doubling period (day 5)
} as const;

// Calculate dynamic entry fee based on pot start date
export const calculateEntryFee = (hasStarted: boolean, startedOnDate: string | null): number => {
  // If pot hasn't started, use base fee
  if (!hasStarted || !startedOnDate) {
    return BASE_ENTRY_FEE;
  }
  
  // Calculate days since start
  const startDate = new Date(startedOnDate);
  const today = new Date();
  const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1; // +1 because day 1 is the start date
  
  // Days 1-4: Use fixed early pricing
  if (daysSinceStart <= 4) {
    return PRICING_TIERS.EARLY_DAYS[daysSinceStart - 1] || BASE_ENTRY_FEE;
  }
  
  // Day 5+: Double each day starting from 0.10
  const doublingDays = daysSinceStart - 4; // Days beyond the early pricing period
  const fee = PRICING_TIERS.DOUBLING_START_FEE * Math.pow(2, doublingDays - 1);
  
  return Number(fee.toFixed(2)); // Round to 2 decimal places
};

// Centralized contract address to table type mappings
// Used across PredictionPotTest, MakePredictionsPage, LandingPage, BookmarksPage, TutorialBridge, AdminEvidenceReviewPage
export const CONTRACT_TO_TABLE_MAPPING = {
  "0xd1547F5bC0390F5020B2A80F262e28ccfeF2bf9c": "featured",
  "0xe9b69d0EA3a6E018031931d300319769c6629866": "crypto", 
  "0xf07E717e1dB49dDdB207C68cCb433BaE4Bc65fC9": "stocks",
  "0xb85D3aE374b8098A6cA553dB90C0978401a34f71": "music",
} as const;

// Type for contract addresses
export type ContractAddress = keyof typeof CONTRACT_TO_TABLE_MAPPING;
export type TableType = typeof CONTRACT_TO_TABLE_MAPPING[ContractAddress];

export const getTableFromType = (tableType: string) => {
  switch (tableType) {
    case 'featured':
      return FeaturedBets;
    case 'crypto':
      return CryptoBets;
    case 'stocks':
      return StocksBets;
    case 'music':
      return MusicBets;
    default:
      throw new Error(`Invalid table type: ${tableType}. Must be 'featured', 'crypto', 'stocks', or 'music'`);
  }
};
// Centralized table name mappings for database operations
export const TABLE_MAPPINGS = {
  // Bets tables (predictions/votes)
  BETS: {
    featured: 'featured_bets',
    crypto: 'crypto_bets', 
    stocks: 'stocks_bets',
    music: 'music_bets'
  } as const,
  
  // Wrong predictions tables (penalties/eliminations)
  WRONG_PREDICTIONS: {
    featured: 'wrong_Predictions', // Note: Capital P for legacy reasons
    crypto: 'wrong_predictions_crypto',
    stocks: 'wrong_predictions_stocks',
    music: 'wrong_predictions_music'
  } as const
} as const;

// Utility functions for getting table names (for raw SQL queries)
export const getBetsTableName = (tableType: TableType): string => {
  return TABLE_MAPPINGS.BETS[tableType] || TABLE_MAPPINGS.BETS.featured;
};

export const getWrongPredictionsTableName = (tableType: TableType): string => {
  return TABLE_MAPPINGS.WRONG_PREDICTIONS[tableType] || TABLE_MAPPINGS.WRONG_PREDICTIONS.featured;
};

export const getWrongPredictionsTableFromType = (tableType: string) => {
  switch (tableType) {
    case 'featured':
      return WrongPredictions;
    case 'crypto':
      console.log("Using crypto wrong predictions table");
      return WrongPredictionsCrypto;
    case 'stocks':
      return WrongPredictionsStocks;
    case 'music':
      return WrongPredictionsMusic;
    default:
      throw new Error(`Invalid table type: ${tableType}. Must be 'featured', 'crypto', 'stocks', or 'music'`);
  }
};

// Re-export for backwards compatibility and consistency
export { getBetsTableName as getBetsTable };
export { getWrongPredictionsTableName as getWrongPredictionsTable };

// Utility function to convert table type to display name
export const getMarketDisplayName = (tableType: TableType): string => {
  switch (tableType) {
    case 'featured':
      return 'Trending';
    case 'crypto':
      return 'Crypto';
    case 'stocks':
      return 'stocks';
    case 'music':
      return 'Music Charts';
    default:
      return tableType; // fallback to the original table type
  }
};

// UK timezone helper function
export const getUKTime = (date: Date = new Date()): Date => {
  // Use Intl.DateTimeFormat to get UK time directly
  const ukTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);

  const year = parseInt(ukTime.find(part => part.type === 'year')?.value || '0');
  const month = parseInt(ukTime.find(part => part.type === 'month')?.value || '0') - 1; // months are 0-indexed
  const day = parseInt(ukTime.find(part => part.type === 'day')?.value || '0');
  const hour = parseInt(ukTime.find(part => part.type === 'hour')?.value || '0');
  const minute = parseInt(ukTime.find(part => part.type === 'minute')?.value || '0');
  const second = parseInt(ukTime.find(part => part.type === 'second')?.value || '0');

  return new Date(year, month, day, hour, minute, second);
};

// Get tonight's midnight (UK timezone) - when timer resets to 24 hours
export const getTonightMidnight = (): Date => {
  const ukNow = getUKTime();
  // Create tomorrow's midnight in UK timezone
  const tomorrow = new Date(ukNow.getFullYear(), ukNow.getMonth(), ukNow.getDate() + 1, 0, 0, 0, 0);
  return tomorrow;
};

// Format milliseconds to HH:MM:SS format
export const formatTime = (milliseconds: number): string => {
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Calculate time until midnight UK time
export const getTimeUntilMidnight = (): string => {
  const ukNow = getUKTime();
  const tonightMidnight = getTonightMidnight();
  const timeLeft = tonightMidnight.getTime() - ukNow.getTime();
  
  if (timeLeft <= 0) {
    return '00:00:00';
  } else {
    return formatTime(timeLeft);
  }
};