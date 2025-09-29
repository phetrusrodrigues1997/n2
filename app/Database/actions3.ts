"use server";

import { eq, and, desc, asc } from 'drizzle-orm';
import { PotParticipationHistory, UserPredictionHistory } from './schema';
import { getBetsTableName, getWrongPredictionsTableName, TableType, getCurrentUTCTime, getCurrentUTCDateString } from './config';
import { getDbForWrite, getDbForRead, getDb } from "./db";
import { neon } from "@neondatabase/serverless";

/**
 * Records when a user enters or re-enters a pot
 */
export async function recordPotEntry(
  walletAddress: string,
  contractAddress: string,
  tableType: string, // 'featured', 'crypto', etc.
  eventType: 'entry' | 're-entry' = 'entry' // Defaults to 'entry' for backwards compatibility
): Promise<{ success: boolean; message: string }> {
  try {
     console.log(`📝 Recording pot ${eventType} for ${walletAddress} in ${tableType} pot`);
    
    await getDb().insert(PotParticipationHistory).values({
      walletAddress: walletAddress.toLowerCase(),
      contractAddress: contractAddress.toLowerCase(),
      tableType,
      eventType,
      // eventTimestamp will be set automatically by defaultNow()
    });

    return { 
      success: true, 
      message: `Pot ${eventType} recorded successfully` 
    };
  } catch (error) {
    console.error(`Error recording pot ${eventType}:`, error);
    return { 
      success: false, 
      message: `Failed to record pot ${eventType}` 
    };
  }
}

// recordPotReEntry function removed - now use recordPotEntry(walletAddress, contractAddress, tableType, 're-entry')

/**
 * Records when a user exits a pot
 */
export async function recordPotExit(
  walletAddress: string,
  contractAddress: string,
  tableType: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`📝 Recording pot exit for ${walletAddress} from ${tableType} pot`);
    
    await getDb().insert(PotParticipationHistory).values({
      walletAddress: walletAddress.toLowerCase(),
      contractAddress: contractAddress.toLowerCase(),
      tableType,
      eventType: 'exit',
      // eventTimestamp will be set automatically by defaultNow()
    });

    return { 
      success: true, 
      message: 'Pot exit recorded successfully' 
    };
  } catch (error) {
    console.error('Error recording pot exit:', error);
    return { 
      success: false, 
      message: 'Failed to record pot exit' 
    };
  }
}

/**
 * Checks if a user was actively participating in a pot on a specific date
 * Returns true if they had entered ON OR BEFORE that date and hadn't exited
 * (Users can predict starting from their entry day - same day predictions allowed)
 */
export async function isUserActiveOnDate(
  walletAddress: string,
  contractAddress: string,
  targetDate: string // YYYY-MM-DD format
): Promise<boolean> {
  try {
    console.log(`🔍 Checking if ${walletAddress} was active on ${targetDate} in pot ${contractAddress}`);
    
    // Get all entry/exit events for this user and contract up to the target date
    const events = await getDbForRead()
      .select()
      .from(PotParticipationHistory)
      .where(
        and(
          eq(PotParticipationHistory.walletAddress, walletAddress.toLowerCase()),
          eq(PotParticipationHistory.contractAddress, contractAddress.toLowerCase())
        )
      )
      .orderBy(asc(PotParticipationHistory.eventTimestamp));

    // Filter events that happened ON OR BEFORE the target date (users can predict on entry day)
    // Extract UTC date string from timestamp for comparison
    const relevantEvents = events.filter(event => {
      const eventDateStr = new Date(event.eventTimestamp).toISOString().split('T')[0]; // YYYY-MM-DD UTC
      return eventDateStr <= targetDate;
    });
    
    if (relevantEvents.length === 0) {
      console.log(`📊 No events found for ${walletAddress} on/before ${targetDate} - not active`);
      return false;
    }

    // Check the most recent event - if it's an entry, user is active; if exit, not active
    const mostRecentEvent = relevantEvents[relevantEvents.length - 1];
    const isActive = mostRecentEvent.eventType === 'entry';
    
    console.log(`📊 Most recent event for ${walletAddress} on/on/before ${targetDate}: ${mostRecentEvent.eventType} on ${mostRecentEvent.eventTimestamp} - Eligible: ${isActive}`);
    
    return isActive;
  } catch (error) {
    console.error('Error checking user active status:', error);
    return false; // Default to not active on error
  }
}

/**
 * Gets all users who were eligible for making predictions on a specific date
 * (i.e., users who had entered the pot ON OR BEFORE that date and hadn't exited)
 * Users can predict starting from their entry day (same day predictions allowed)
 */
export async function getEligiblePredictors(
  contractAddress: string,
  targetDate: string // YYYY-MM-DD format
): Promise<string[]> {
  try {
    console.log(`🎯 Getting eligible predictors for pot ${contractAddress} on ${targetDate}`);
    
    // Get all entry/exit events for this contract up to the target date
    const events = await getDbForRead()
      .select()
      .from(PotParticipationHistory)
      .where(eq(PotParticipationHistory.contractAddress, contractAddress.toLowerCase()))
      .orderBy(asc(PotParticipationHistory.eventTimestamp));

    // Filter events that happened ON OR BEFORE the target date (users can predict on entry day)
    // Extract UTC date string from timestamp for comparison
    const relevantEvents = events.filter(event => {
      const eventDateStr = new Date(event.eventTimestamp).toISOString().split('T')[0]; // YYYY-MM-DD UTC
      return eventDateStr <= targetDate;
    });
    
    if (relevantEvents.length === 0) {
      console.log(`📊 No events found for pot ${contractAddress} on/before ${targetDate}`);
      return [];
    }

    // Group events by wallet address and find the most recent event for each user
    const userEventMap = new Map<string, typeof relevantEvents[0]>();
    
    for (const event of relevantEvents) {
      const currentEvent = userEventMap.get(event.walletAddress);
      if (!currentEvent ||
          new Date(event.eventTimestamp).getTime() > new Date(currentEvent.eventTimestamp).getTime()) {
        userEventMap.set(event.walletAddress, event);
      }
    }

    // Filter users whose most recent event was an entry OR re-entry (meaning they're active)
    // FIXED: Include both 'entry' and 're-entry' events for consistency with grace period logic
    const eligibleUsers = Array.from(userEventMap.entries())
      .filter(([_, event]) => event.eventType === 'entry' || event.eventType === 're-entry')
      .map(([walletAddress, _]) => walletAddress);

    console.log(`📊 Found ${eligibleUsers.length} eligible predictors for ${targetDate}: ${eligibleUsers.slice(0, 3).join(', ')}${eligibleUsers.length > 3 ? '...' : ''}`);
    
    return eligibleUsers;
  } catch (error) {
    console.error('Error getting eligible predictors:', error);
    return [];
  }
}

/**
 * Gets the participation history for a specific user and contract
 * Useful for debugging and user interface displays
 */
export async function getUserParticipationHistory(
  walletAddress: string,
  contractAddress?: string
): Promise<Array<{
  id: number;
  contractAddress: string;
  tableType: string;
  eventType: 'entry' | 'exit';
  // eventDate removed - only eventTimestamp is used now
  eventTimestamp: Date;
}>> {
  try {
    console.log(`📋 Getting participation history for ${walletAddress}${contractAddress ? ` in pot ${contractAddress}` : ' (all pots)'}`);
    
    // Build the where conditions
    const whereConditions = contractAddress 
      ? and(
          eq(PotParticipationHistory.walletAddress, walletAddress.toLowerCase()),
          eq(PotParticipationHistory.contractAddress, contractAddress.toLowerCase())
        )
      : eq(PotParticipationHistory.walletAddress, walletAddress.toLowerCase());

    const events = await getDb()
      .select()
      .from(PotParticipationHistory)
      .where(whereConditions);

    const sortedEvents = events.sort((a, b) => {
      // Sort by timestamp only (descending order - newest first)
      return new Date(b.eventTimestamp).getTime() - new Date(a.eventTimestamp).getTime();
    });

    console.log(`📋 Found ${sortedEvents.length} participation events for ${walletAddress}`);
    
    // Cast eventType to the correct type since we know it's either 'entry' or 'exit'
    return sortedEvents.map(event => ({
      ...event,
      eventType: event.eventType as 'entry' | 'exit'
    }));
  } catch (error) {
    console.error('Error getting user participation history:', error);
    return [];
  }
}



export async function clearPotParticipationHistory(contract: string) {
  await getDb()
    .delete(PotParticipationHistory)
    .where(eq(PotParticipationHistory.contractAddress, contract.toLowerCase()));
    console.log(`🧹 Clearing pot participation history for contract: ${contract.toLowerCase()}`);
}

/**
 * Records a user's prediction in the prediction history table
 * This provides a comprehensive log of all predictions made by users with question context
 */
export async function recordUserPrediction(
  walletAddress: string,
  questionName: string,
  prediction: 'positive' | 'negative',
  contractAddress: string,
  predictionDate: string // YYYY-MM-DD format
): Promise<{ success: boolean; message: string }> {
  try {
    const normalizedWalletAddress = walletAddress.toLowerCase();
    const normalizedContractAddress = contractAddress.toLowerCase();
    console.log(`📝 Recording prediction: ${normalizedWalletAddress} predicted ${prediction} for ${questionName} (${normalizedContractAddress}) on ${predictionDate}`);
    
    // Check if user already has a prediction for this question and date
    const existingPrediction = await getDb()
      .select()
      .from(UserPredictionHistory)
      .where(
        and(
          eq(UserPredictionHistory.walletAddress, normalizedWalletAddress),
          eq(UserPredictionHistory.questionName, questionName),
          eq(UserPredictionHistory.predictionDate, predictionDate)
        )
      )
      .limit(1);

    if (existingPrediction.length > 0) {
      // Update existing prediction
      await getDb()
        .update(UserPredictionHistory)
        .set({
          prediction,
          contractAddress: normalizedContractAddress, // Update contract address in case it changed
          createdAt: getCurrentUTCTime(), // Update timestamp to reflect the change
        })
        .where(
          and(
            eq(UserPredictionHistory.walletAddress, normalizedWalletAddress),
            eq(UserPredictionHistory.questionName, questionName),
            eq(UserPredictionHistory.predictionDate, predictionDate)
          )
        );

      console.log(`✅ Updated existing prediction for ${normalizedWalletAddress}: ${prediction} on ${questionName}`);
      return { 
        success: true, 
        message: 'Prediction updated successfully' 
      };
    } else {
      // Insert new prediction
      await getDb().insert(UserPredictionHistory).values({
        walletAddress: normalizedWalletAddress,
        questionName,
        prediction,
        contractAddress: normalizedContractAddress,
        predictionDate,
      });

      console.log(`✅ Inserted new prediction for ${normalizedWalletAddress}: ${prediction} on ${questionName}`);
      return { 
        success: true, 
        message: 'Prediction recorded successfully' 
      };
    }
  } catch (error) {
    console.error('Error recording user prediction:', error);
    return { 
      success: false, 
      message: 'Failed to record prediction' 
    };
  }
}

/**
 * Gets all predictions made by a specific wallet address for a specific contract
 * Returns the question names and predictions for analysis
 */
export async function getUserPredictionsByContract(
  walletAddress: string,
  contractAddress: string
): Promise<Array<{
  questionName: string;
  prediction: 'positive' | 'negative';
  predictionDate: string;
  createdAt: Date;
}>> {
  try {
    const normalizedWalletAddress = walletAddress.toLowerCase();
    const normalizedContractAddress = contractAddress.toLowerCase();
    
    console.log(`🔍 Getting predictions for wallet: ${normalizedWalletAddress}, contract: ${normalizedContractAddress}`);
    
    // Get all predictions first
    const allPredictions = await getDb()
      .select({
        questionName: UserPredictionHistory.questionName,
        prediction: UserPredictionHistory.prediction,
        predictionDate: UserPredictionHistory.predictionDate,
        createdAt: UserPredictionHistory.createdAt,
      })
      .from(UserPredictionHistory)
      .where(
        and(
          eq(UserPredictionHistory.walletAddress, normalizedWalletAddress),
          eq(UserPredictionHistory.contractAddress, normalizedContractAddress)
        )
      )
      .orderBy(desc(UserPredictionHistory.createdAt)); // Most recent first

    console.log(`📊 Found ${allPredictions.length} total predictions for ${normalizedWalletAddress} in contract ${normalizedContractAddress}`);

    // Group by predictionDate and keep only the most recent prediction for each date
    const latestPredictionsPerDate = new Map<string, typeof allPredictions[0]>();

    for (const prediction of allPredictions) {
      if (!latestPredictionsPerDate.has(prediction.predictionDate)) {
        latestPredictionsPerDate.set(prediction.predictionDate, prediction);
      }
    }

    // Convert back to array and sort by date descending (most recent dates first)
    const predictions = Array.from(latestPredictionsPerDate.values())
      .sort((a, b) => new Date(b.predictionDate).getTime() - new Date(a.predictionDate).getTime());

    console.log(`📊 Filtered to ${predictions.length} unique predictions per date for ${normalizedWalletAddress}`);

    // Cast prediction type since we know it's either 'positive' or 'negative'
    return predictions.map(prediction => ({
      ...prediction,
      prediction: prediction.prediction as 'positive' | 'negative'
    }));
    
  } catch (error) {
    console.error('Error getting user predictions by contract:', error);
    return [];
  }
}

/**
 * Enhanced function to get user predictions with their results from market outcomes
 * Matches predictions to outcomes using questionName + predictionDate
 */
export async function getUserPredictionsWithResults(
  walletAddress: string,
  contractAddress: string
): Promise<Array<{
  questionName: string;
  prediction: 'positive' | 'negative';
  predictionDate: string;
  createdAt: Date;
  status: 'pending' | 'correct' | 'incorrect';
  actualOutcome?: string;
  isProvisional?: boolean;
}>> {
  try {
    const normalizedWalletAddress = walletAddress.toLowerCase();
    const normalizedContractAddress = contractAddress.toLowerCase();
    
    console.log(`🔍 Getting predictions with results for wallet: ${normalizedWalletAddress}, contract: ${normalizedContractAddress}`);
    
    // Get user's predictions
    const predictions = await getUserPredictionsByContract(walletAddress, contractAddress);
    
    // Get table type from contract address
    const { CONTRACT_TO_TABLE_MAPPING } = await import('./config');
    const tableType = CONTRACT_TO_TABLE_MAPPING[contractAddress as keyof typeof CONTRACT_TO_TABLE_MAPPING];
    
    if (!tableType) {
      console.warn('Unknown contract address, returning predictions without results');
      return predictions.map(p => ({ ...p, status: 'pending' as const }));
    }
    
    // Get all market outcomes for this table type
    const { MarketOutcomes } = await import('./schema');
    const { eq, and } = await import('drizzle-orm');
    
    const predictionsWithResults = await Promise.all(
      predictions.map(async (prediction) => {
        try {
          // Look for market outcome that matches question + date + table type
          const outcome = await getDb()
            .select()
            .from(MarketOutcomes)
            .where(and(
              eq(MarketOutcomes.questionName, prediction.questionName),
              eq(MarketOutcomes.outcomeDate, prediction.predictionDate),
              eq(MarketOutcomes.marketType, tableType)
            ))
            .limit(1);
          
          const result = outcome[0];
          let status: 'pending' | 'correct' | 'incorrect';
          let actualOutcome: string | undefined;
          let isProvisional = false;
          
          if (!result) {
            // No outcome set yet
            status = 'pending';
          } else if (result.finalOutcome) {
            // Final outcome available
            actualOutcome = result.finalOutcome;
            status = result.finalOutcome === prediction.prediction ? 'correct' : 'incorrect';
          } else if (result.provisionalOutcome) {
            // Only provisional outcome available
            actualOutcome = result.provisionalOutcome;
            status = result.provisionalOutcome === prediction.prediction ? 'correct' : 'incorrect';
            isProvisional = true;
          } else {
            status = 'pending';
          }
          
          return {
            ...prediction,
            status,
            actualOutcome,
            isProvisional
          };
        } catch (error) {
          console.error(`Error getting outcome for prediction ${prediction.questionName}:`, error);
          return { ...prediction, status: 'pending' as const };
        }
      })
    );
    
    console.log(`✅ Retrieved ${predictionsWithResults.length} predictions with results`);
    return predictionsWithResults;
    
  } catch (error) {
    console.error('Error getting user predictions with results:', error);
    // Fallback to basic predictions without results
    return (await getUserPredictionsByContract(walletAddress, contractAddress))
      .map(p => ({ ...p, status: 'pending' as const }));
  }
}

