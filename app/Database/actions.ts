"use server";

import {  Messages, LivePredictions, Bookmarks } from "./schema"; // Import the schema
import { eq, sql, and, inArray } from "drizzle-orm";
import { getWrongPredictionsTableFromType, getTableFromType, CONTRACT_TO_TABLE_MAPPING, getTableTypeFromMarketId } from "./config";
import { ReferralCodes, Referrals, FreeEntries, UsersTable } from "./schema";
import { EvidenceSubmissions, MarketOutcomes, PredictionIdeas, PotParticipationHistory, PotInformation } from "./schema";
import { recordPotEntry, recordUserPrediction } from './actions3';
import { desc } from "drizzle-orm";
import { getPrice } from '../Constants/getPrice';
import { getMarkets } from '../Constants/markets';
import { getTranslation } from '../Languages/languages';
import { db, getDbForRead } from "./db";

// UK timezone helper functions - Simplified approach using native JS timezone support
const getUKDateString = (date: Date = new Date()): string => {
  // Use toLocaleDateString with Europe/London timezone for accurate BST/GMT handling
  const ukDateString = date.toLocaleDateString('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }); // en-CA gives YYYY-MM-DD format directly

  return ukDateString;
};

const getTomorrowUKDateString = (date: Date = new Date()): string => {
  // Create a new date object to avoid mutating the original
  const tomorrow = new Date(date.getTime() + 24 * 60 * 60 * 1000); // Add 1 day in milliseconds

  // Get tomorrow's date in UK timezone
  const tomorrowUK = tomorrow.toLocaleDateString('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  return tomorrowUK;
};

const getUKTime = (date: Date = new Date()): Date => {
  // Convert to UK timezone and return as Date object
  const ukTimeString = date.toLocaleString('en-US', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return new Date(ukTimeString);
};



/**
 * Sets a unique username for a given wallet address.
 * If the wallet address doesn't exist, creates a new entry with the username.
 * If the username is already taken, throws an error.
 */

/**
 * Stores a new image URL for a wallet address.
 * Each entry gets a timestamp automatically.
 */





// Helper function to get question from contract address using markets data
const getQuestionFromContract = (contractAddress: string, tableType: string): string => {
  try {
    const t = getTranslation('en');
    const marketOptions = getMarkets(t, 'options');
    
    // Try to find the market by contract address
    const market = marketOptions.find(m => m.contractAddress === contractAddress);
    if (market?.question) {
      return market.question;
    }
    
    // If not found by contract, try to get by table type from different market categories
    if (tableType === 'featured') {
      const trendingMarkets = getMarkets(t, 'Trending');
      if (trendingMarkets.length > 0 && trendingMarkets[0].question) {
        return trendingMarkets[0].question;
      }
    }
    
    // Fallback to generic names based on table type
    switch (tableType) {
      case 'featured':
        return 'Bitcoin Price Movement';
      case 'crypto':
        return 'Crypto Market Movement';
      case 'stocks':
        return 'Stock Market Movement';
      default:
        return 'Market Movement Prediction';
    }
  } catch (error) {
    console.error('Error getting question from market data:', error);
    // Fallback to generic names
    switch (tableType) {
      case 'featured':
        return 'Bitcoin Price Movement';
      case 'crypto':
        return 'Crypto Market Movement';
      case 'stocks':
        return 'Stock Market Movement';
      default:
        return 'Market Movement Prediction';
    }
  }
};

export async function saveImageUrl(walletAddress: string, imageUrl: string) {
  try {
    // Normalize wallet address to lowercase for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    // Check if user already exists in users_table
    const existingUser = await db
      .select()
      .from(UsersTable)
      .where(eq(UsersTable.walletAddress, normalizedWalletAddress))
      .limit(1);

    if (existingUser.length > 0) {
      // Update existing user's imageUrl
      const result = await db
        .update(UsersTable)
        .set({ imageUrl })
        .where(eq(UsersTable.walletAddress, normalizedWalletAddress))
        .returning();
      return result;
    } else {
      // Create new user entry with just walletAddress and imageUrl
      const result = await db
        .insert(UsersTable)
        .values({
          walletAddress: normalizedWalletAddress,
          imageUrl,
        })
        .returning();
      return result;
    }
  } catch (error) {
    console.error("Error saving image URL:", error);
    throw new Error("Failed to save image URL");
  }
}

// export async function setUsername(walletAddress: string, newUsername: string) {
//   try {
//     await db
//       .insert(userPoints)
//       .values({ walletAddress, username: newUsername })
//       .onConflictDoUpdate({
//         target: userPoints.walletAddress,
//         set: { username: newUsername },
//       });
//   } catch (error: unknown) {
//     if (error.code === '23505' && error.constraint === 'user_points_username_key') {
//       throw new Error('Username is already taken');
//     } else {
//       console.error("Error setting username:", error);
//       throw new Error('Failed to set username');
//     }
//   }
// }

// export async function getUsername(walletAddress: string): Promise<string | null> {
//   try {
//     const result = await db
//       .select({ username: userPoints.username })
//       .from(userPoints)
//       .where(eq(userPoints.walletAddress, walletAddress))
//       .limit(1);
//     return result.length > 0 ? result[0].username : null;
//   } catch (error) {
//     console.error("Error fetching username:", error);
//     throw new Error("Failed to fetch username");
//   }
// }

/**
 * Retrieves the wallet address for a given username.
 * Returns null if the username doesn't exist.
 */
// export async function getWalletAddress(username: string): Promise<string | null> {
//   try {
//     const result = await db
//       .select({ walletAddress: userPoints.walletAddress })
//       .from(userPoints)
//       .where(eq(userPoints.username, username))
//       .limit(1);
//     return result.length > 0 ? result[0].walletAddress : null;
//   } catch (error) {
//     console.error("Error fetching wallet address:", error);
//     throw new Error("Failed to fetch wallet address");
//   }
// }

export async function createMessage(from: string, to: string, message: string, datetime: string) {
  return db.insert(Messages).values({ from, to, message, datetime }).returning();
}

// Alias for createMessage to match MessagingPage import
export async function sendMessage(from: string, to: string, message: string, datetime: string) {
  return createMessage(from, to, message, datetime);
}

// Function to get all messages for a recipient
// NOTE: Name is legacy - this returns ALL messages, not filtering by read status
export async function getUnreadMessages(to: string) {
  return db
    .select()
    .from(Messages)
    .where(and(eq(Messages.to, to)));
}

// Note: Message read status is now tracked client-side with cookies
// updateMessageReadStatus and markAsRead functions have been removed

// New function to delete a message
export async function deleteMessage(id: number) {
  try {
    return db
      .delete(Messages)
      .where(eq(Messages.id, id))
      .returning();
  } catch (error) {
    console.error("Error deleting message:", error);
    throw new Error("Failed to delete message");
  }
}

// Function to get all messages for a user (both sent and received)
export async function getAllMessages(address: string) {
  try {
    return db
      .select()
      .from(Messages)
      .where(
        sql`${Messages.from} = ${address} OR ${Messages.to} = ${address}`
      );
  } catch (error) {
    console.error("Error fetching all messages:", error);
    throw new Error("Failed to fetch all messages");
  }
}

/**
 * Places a Bitcoin price prediction bet for the next day.
 * Only allows one bet per wallet per prediction day.
 */

/**
 * Gets re-entry fee for a wallet address if they need to pay to re-enter
 * Returns null if no re-entry needed, otherwise returns today's dynamic entry fee
 */
export async function getReEntryFee(walletAddress: string, typeTable: string): Promise<number | null> {
  try {
    // console.log(`🔍 getReEntryFee: Checking wallet ${walletAddress} for table type: ${typeTable}`);
    const normalizedWalletAddress = walletAddress.toLowerCase(); // Fix case sensitivity!
    // console.log(`🔍 getReEntryFee: Normalized wallet address: ${normalizedWalletAddress}`);
    const wrongPredictionTable = getWrongPredictionsTableFromType(typeTable);
    // console.log(`🔍 getReEntryFee: Using wrong predictions table for query`);
    
    const result = await db
      .select({ walletAddress: wrongPredictionTable.walletAddress })
      .from(wrongPredictionTable)
      .where(eq(wrongPredictionTable.walletAddress, normalizedWalletAddress))
      .limit(1);
    
    console.log(`🔍 getReEntryFee: Query result length: ${result.length}`);
    
    // If user has wrong prediction, return 1 (simple elimination indicator)
    if (result.length > 0) {
      return 1;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting re-entry fee:", error);
    return null;
  }
}




/**
 * Check if a wallet address has wrong predictions for a specific market type
 * @param walletAddress - User's wallet address
 * @param tableType - Market type: "featured" or "crypto"
 * @returns Promise<boolean> - true if user has wrong predictions, false otherwise
 */
export async function hasWrongPredictions(walletAddress: string, tableType: string): Promise<boolean> {
  try {
    const normalizedWalletAddress = walletAddress.toLowerCase();

    const wrongPredictionTable = getWrongPredictionsTableFromType(tableType);
    
    
      const result = await db
        .select()
        .from(wrongPredictionTable)
        .where(eq(wrongPredictionTable.walletAddress, normalizedWalletAddress))
        .limit(1);
      return result.length > 0;
    
    
    return false;
  } catch (error) {
    console.error("Error checking wrong predictions:", error);
    return false;
  }
}

/**
 * Processes re-entry payment and removes user from wrong predictions
 */
export async function processReEntry(walletAddress: string, typeTable: string): Promise<boolean> {
  try {
    const wrongPredictionTable = getWrongPredictionsTableFromType(typeTable);
    const normalizedWalletAddress = walletAddress.toLowerCase(); // Normalize for consistency
    console.log(`PROCESSING REENTRY FOR ${normalizedWalletAddress} in table ${typeTable}`);
    
    const result = await db
      .delete(wrongPredictionTable)
      .where(eq(wrongPredictionTable.walletAddress, normalizedWalletAddress))
      .returning();
    
    // If successfully removed from wrong predictions, record the pot re-entry
    if (result.length > 0) {
      // Get contract address for the table type by finding it in the mapping
      let contractAddress: string | null = null;
      for (const [address, tableType] of Object.entries(CONTRACT_TO_TABLE_MAPPING)) {
        if (tableType === typeTable) {
          contractAddress = address;
          break;
        }
      }
      
      if (contractAddress) {
        // Record the pot re-entry in participation history
        const historyResult = await recordPotEntry(
          normalizedWalletAddress,
          contractAddress,
          typeTable,
          're-entry'
        );
        
        if (historyResult.success) {
          console.log(`✅ Successfully recorded pot re-entry for ${normalizedWalletAddress}`);
        } else {
          console.warn(`⚠️ Failed to record pot re-entry history: ${historyResult.message}`);
          // Continue anyway - removing from wrong predictions is the critical part
        }
      } else {
        console.warn(`⚠️ Could not determine contract address for table type: ${typeTable}`);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error processing re-entry:", error);
    return false;
  }
}

export async function placeBitcoinBet(walletAddress: string, prediction: 'positive' | 'negative', typeTable: string, questionText?: string, contractAddress?: string) {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    // Note: Saturday restrictions removed for new tournament format
    // Final day restrictions now handled dynamically via pot_information table
    
    // Get tomorrow's date for the prediction (in UK timezone)
    const now = new Date();
    const predictionDate = getTomorrowUKDateString(now);
    
    const betsTable = getTableFromType(typeTable);
    const wrongPredictionTable = getWrongPredictionsTableFromType(typeTable);
    
    // 1. Check if the user has wrong predictions (but don't block - they can re-enter)
    const wrongPrediction = await db
      .select()
      .from(wrongPredictionTable)
      .where(eq(wrongPredictionTable.walletAddress, normalizedWalletAddress))
      .limit(1);

    if (wrongPrediction.length > 0) {
      throw new Error(`You need to pay today's entry fee to re-enter after your wrong prediction. Please pay the re-entry fee first.`);
    }

    // 2. Check if the user already placed a bet for tomorrow
    const existingBet = await db
      .select()
      .from(betsTable)
      .where(and(
        eq(betsTable.walletAddress, normalizedWalletAddress),
        eq(betsTable.betDate, predictionDate)
      ))
      .limit(1);

    if (existingBet.length > 0) {
      // 3. If a bet exists, update the prediction
      // Create UK timezone timestamp for updated_at
      const ukUpdatedAt = getUKTime(now);
      
      await db
        .update(betsTable)
        .set({ 
          prediction,
          createdAt: ukUpdatedAt // Update timestamp to UK time when prediction changes
        })
        .where(and(
          eq(betsTable.walletAddress, normalizedWalletAddress),
          eq(betsTable.betDate, predictionDate)
        ));

      // Record the updated prediction in the history table for tracking
      // Try to get the question from the provided parameter, then fallback to contract/table lookup
      const questionName = questionText || getQuestionFromContract(contractAddress || '', typeTable);
      const trackingContractAddress = contractAddress || '';
      
      if (trackingContractAddress) {
        try {
          await recordUserPrediction(
            normalizedWalletAddress,
            questionName,
            prediction,
            trackingContractAddress,
            predictionDate
          );
          console.log(`✅ Recorded prediction history update for ${normalizedWalletAddress}: ${prediction} on ${questionName}`);
        } catch (historyError) {
          // Log error but don't fail the main operation
          console.error('Failed to record prediction history update:', historyError);
        }
      }

      return { updated: true, predictionDate };
    }

    // 4. Otherwise, insert new bet for tomorrow
    // Create UK timezone timestamp for created_at
    const ukCreatedAt = getUKTime(now);

    // DEBUG: Log timezone information
    console.log('=== TIMEZONE DEBUG ===');
    console.log('Server time (now):', now.toISOString());
    console.log('UK time (calculated):', ukCreatedAt.toISOString());
    console.log('Today UK date:', getUKDateString(now));
    console.log('Tomorrow UK date (bet_date):', predictionDate);
    console.log('======================');
    
    const result = await db
      .insert(betsTable)
      .values({
        walletAddress: normalizedWalletAddress,
        prediction,
        betDate: predictionDate,
        createdAt: ukCreatedAt, // Override default with UK timezone
      })
      .returning();

    // Record the prediction in the history table for tracking
    // Try to get the question from the provided parameter, then fallback to contract/table lookup
    const questionName = questionText || getQuestionFromContract(contractAddress || '', typeTable);
    const trackingContractAddress = contractAddress || '';
    
    if (trackingContractAddress) {
      try {
        await recordUserPrediction(
          normalizedWalletAddress,
          questionName,
          prediction,
          trackingContractAddress,
          predictionDate
        );
        console.log(`✅ Recorded prediction history for ${normalizedWalletAddress}: ${prediction} on ${questionName}`);
      } catch (historyError) {
        // Log error but don't fail the main operation
        console.error('Failed to record prediction history:', historyError);
      }
    }

    return { ...result[0], predictionDate };

  } catch (error: unknown) {
    console.error("Error placing Bitcoin prediction:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to place Bitcoin prediction");
  }
}


/**
 * Gets the user's bet for tomorrow (the active prediction).
 */
export async function getTomorrowsBet(walletAddress: string, tableType: string) {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    const predictionDate = getTomorrowUKDateString();
    
    const betsTable = getTableFromType(tableType);
    const result = await db
      .select()
      .from(betsTable)
      .where(and(
        eq(betsTable.walletAddress, normalizedWalletAddress),
        eq(betsTable.betDate, predictionDate)
      ))
      .limit(1);

    return result.length > 0 ? { ...result[0], predictionDate } : null;
  } catch (error) {
    console.error("Error fetching tomorrow's bet:", error);
    throw new Error("Failed to fetch tomorrow's bet");
  }
}

/**
 * Gets the user's bet for today (for display purposes).
 */
export async function getTodaysBet(walletAddress: string, tableType: string) {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    const today = getUKDateString();
    const betsTable = getTableFromType(tableType);
    const result = await db
      .select()
      .from(betsTable)
      .where(and(
        eq(betsTable.walletAddress, normalizedWalletAddress),
        eq(betsTable.betDate, today)
      ))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error fetching today's bet:", error);
    throw new Error("Failed to fetch today's bet");
  }
}

/**
 * Gets all bets for a specific date.
 */
export async function getBetsForDate(date: string, typeTable: string) {
  try {
    const betsTable = getTableFromType(typeTable);
    return db
      .select()
      .from(betsTable)
      .where(eq(betsTable.betDate, date));
  } catch (error) {
    console.error("Error fetching bets for date:", error);
    throw new Error("Failed to fetch bets for date");
  }

  
}

export async function getLatestImageUrl(walletAddress: string): Promise<string | null> {
  try {
    // Normalize wallet address to lowercase for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    const result = await db
      .select({ imageUrl: UsersTable.imageUrl })
      .from(UsersTable)
      .where(eq(UsersTable.walletAddress, normalizedWalletAddress))
      .limit(1);

    return result.length > 0 ? result[0].imageUrl : null;
  } catch (error) {
    console.error("Failed to retrieve image URL:", error);
    return null;
  }
}

// ====== REFERRAL SYSTEM FUNCTIONS ======

/**
 * Generates a unique referral code for a wallet address
 * Returns existing code if already exists
 */
export async function generateReferralCode(walletAddress: string): Promise<string> {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    // Check if user already has a referral code
    const existingCode = await db
      .select({ referralCode: ReferralCodes.referralCode })
      .from(ReferralCodes)
      .where(eq(ReferralCodes.walletAddress, normalizedWalletAddress))
      .limit(1);

    if (existingCode.length > 0) {
      return existingCode[0].referralCode;
    }

    // Generate a new unique 8-character code
    let referralCode: string;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Check if code already exists
      const existing = await db
        .select()
        .from(ReferralCodes)
        .where(eq(ReferralCodes.referralCode, referralCode))
        .limit(1);
        
      isUnique = existing.length === 0;
      attempts++;
    } while (!isUnique && attempts < maxAttempts);

    if (!isUnique) {
      throw new Error("Failed to generate unique referral code");
    }

    // Save the new referral code
    await db
      .insert(ReferralCodes)
      .values({
        walletAddress: normalizedWalletAddress,
        referralCode,
      });

    return referralCode;
  } catch (error) {
    console.error("Error generating referral code:", error);
    throw new Error("Failed to generate referral code");
  }
}

/**
 * Records a new referral when someone uses a referral code
 */
export async function recordReferral(referralCode: string, referredWallet: string): Promise<boolean> {
  try {
    // Normalize wallet address for consistency
    const normalizedReferredWallet = referredWallet.toLowerCase();
    
    // Input validation
    if (!referralCode || typeof referralCode !== 'string') {
      throw new Error("Invalid referral code format");
    }
    
    // Sanitize referral code (alphanumeric only, max 10 chars)
    const sanitizedCode = referralCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
    if (sanitizedCode.length < 1) {
      throw new Error("Invalid referral code");
    }
    
    // Find the referrer by their referral code
    const referrer = await db
      .select({ walletAddress: ReferralCodes.walletAddress })
      .from(ReferralCodes)
      .where(eq(ReferralCodes.referralCode, sanitizedCode))
      .limit(1);

    if (referrer.length === 0) {
      throw new Error("Invalid referral code");
    }

    const referrerWallet = referrer[0].walletAddress; // This is already normalized from ReferralCodes table

    // Check if this person was already referred by this referrer
    const existingReferral = await db
      .select()
      .from(Referrals)
      .where(and(
        eq(Referrals.referrerWallet, referrerWallet),
        eq(Referrals.referredWallet, normalizedReferredWallet)
      ))
      .limit(1);

    if (existingReferral.length > 0) {
      return false; // Already referred
    }

    // Record the referral
    await db
      .insert(Referrals)
      .values({
        referrerWallet,
        referredWallet: normalizedReferredWallet,
        referralCode: sanitizedCode,
        potEntryConfirmed: false,
      });

    return true;
  } catch (error) {
    console.error("Error recording referral:", error);
    throw new Error("Failed to record referral");
  }
}

/**
 * Confirms pot entry for a referral and updates free entries if milestone reached
 */
export async function confirmReferralPotEntry(referredWallet: string): Promise<void> {
  try {
    // Normalize wallet address for consistency
    const normalizedReferredWallet = referredWallet.toLowerCase();
    
    // Update all referrals for this wallet to confirmed
    const updatedReferrals = await db
      .update(Referrals)
      .set({ 
        potEntryConfirmed: true,
        confirmedAt: new Date()
      })
      .where(and(
        eq(Referrals.referredWallet, normalizedReferredWallet),
        eq(Referrals.potEntryConfirmed, false)
      ))
      .returning();

    // For each referrer, check if they've reached the milestone
    for (const referral of updatedReferrals) {
      await checkAndUpdateFreeEntries(referral.referrerWallet);
    }
  } catch (error) {
    console.error("Error confirming referral pot entry:", error);
    throw new Error("Failed to confirm referral pot entry");
  }
}

/**
 * Checks if a referrer has reached the milestone of 3 confirmed referrals
 * and awards free entries accordingly
 */
async function checkAndUpdateFreeEntries(referrerWallet: string): Promise<void> {
  try {
    // Normalize wallet address for complete consistency (already normalized but ensuring consistency)
    const normalizedReferrerWallet = referrerWallet.toLowerCase();
    
    // Count confirmed referrals
    const confirmedReferrals = await db
      .select()
      .from(Referrals)
      .where(and(
        eq(Referrals.referrerWallet, normalizedReferrerWallet),
        eq(Referrals.potEntryConfirmed, true)
      ));

    const confirmedCount = confirmedReferrals.length;
    const freeEntriesEarned = Math.floor(confirmedCount / 3);

    if (freeEntriesEarned > 0) {
      // Check if free entries record exists
      const existingRecord = await db
        .select()
        .from(FreeEntries)
        .where(eq(FreeEntries.walletAddress, normalizedReferrerWallet))
        .limit(1);

      if (existingRecord.length === 0) {
        // Create new record
        await db
          .insert(FreeEntries)
          .values({
            walletAddress: normalizedReferrerWallet,
            earnedFromReferrals: freeEntriesEarned,
            usedEntries: 0,
          });
      } else {
        // Update existing record
        await db
          .update(FreeEntries)
          .set({
            earnedFromReferrals: freeEntriesEarned,
            updatedAt: new Date(),
          })
          .where(eq(FreeEntries.walletAddress, normalizedReferrerWallet));
      }
    }
  } catch (error) {
    console.error("Error updating free entries:", error);
    throw new Error("Failed to update free entries");
  }
}

/**
 * Gets detailed free entries breakdown for a wallet
 */
export async function getFreeEntriesBreakdown(walletAddress: string): Promise<{
  total: number;
  fromReferrals: number;
  fromTrivia: number;
  fromWordle: number;
  used: number;
}> {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    const result = await db
      .select({
        earnedFromReferrals: FreeEntries.earnedFromReferrals,
        earnedFromTrivia: FreeEntries.earnedFromTrivia,
        earnedFromWordle: FreeEntries.earnedFromWordle,
        used: FreeEntries.usedEntries,
      })
      .from(FreeEntries)
      .where(eq(FreeEntries.walletAddress, normalizedWalletAddress))
      .limit(1);

    if (result.length === 0) {
      return {
        total: 0,
        fromReferrals: 0,
        fromTrivia: 0,
        fromWordle: 0,
        used: 0,
      };
    }

    const { earnedFromReferrals, earnedFromTrivia, earnedFromWordle, used } = result[0];
    const total = earnedFromReferrals + earnedFromTrivia + earnedFromWordle;
    
    return {
      total: Math.max(0, total - used),
      fromReferrals: earnedFromReferrals,
      fromTrivia: earnedFromTrivia,
      fromWordle: earnedFromWordle,
      used,
    };
  } catch (error) {
    console.error("Error getting free entries breakdown:", error);
    return {
      total: 0,
      fromReferrals: 0,
      fromTrivia: 0,
      fromWordle: 0,
      used: 0,
    };
  }
}

/**
 * Gets the available free entries for a wallet
 */
export async function getAvailableFreeEntries(walletAddress: string): Promise<number> {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    const result = await db
      .select({
        earnedFromReferrals: FreeEntries.earnedFromReferrals,
        earnedFromTrivia: FreeEntries.earnedFromTrivia,
        earnedFromWordle: FreeEntries.earnedFromWordle,
        used: FreeEntries.usedEntries,
      })
      .from(FreeEntries)
      .where(eq(FreeEntries.walletAddress, normalizedWalletAddress))
      .limit(1);

    if (result.length === 0) {
      return 0;
    }

    const { earnedFromReferrals, earnedFromTrivia, earnedFromWordle, used } = result[0];
    const totalEarned = earnedFromReferrals + earnedFromTrivia + earnedFromWordle;
    return Math.max(0, totalEarned - used);
  } catch (error) {
    console.error("Error getting available free entries:", error);
    return 0;
  }
}

/**
 * Awards a free entry for trivia game victory (100 correct answers)
 */
export async function awardTriviaFreeEntry(walletAddress: string): Promise<boolean> {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    const existingRecord = await db
      .select()
      .from(FreeEntries)
      .where(eq(FreeEntries.walletAddress, normalizedWalletAddress))
      .limit(1);

    if (existingRecord.length === 0) {
      // Create new record
      await db
        .insert(FreeEntries)
        .values({
          walletAddress: normalizedWalletAddress,
          earnedFromReferrals: 0,
          earnedFromTrivia: 1,
          earnedFromWordle: 0,
          usedEntries: 0,
        });
    } else {
      // Update existing record
      await db
        .update(FreeEntries)
        .set({
          earnedFromTrivia: sql`${FreeEntries.earnedFromTrivia} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(FreeEntries.walletAddress, normalizedWalletAddress));
    }

    return true;
  } catch (error) {
    console.error("Error awarding trivia free entry:", error);
    return false;
  }
}

/**
 * Awards a free entry for wordle game victory
 */
export async function awardWordleFreeEntry(walletAddress: string): Promise<boolean> {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    const existingRecord = await db
      .select()
      .from(FreeEntries)
      .where(eq(FreeEntries.walletAddress, normalizedWalletAddress))
      .limit(1);

    if (existingRecord.length === 0) {
      // Create new record
      await db
        .insert(FreeEntries)
        .values({
          walletAddress: normalizedWalletAddress,
          earnedFromReferrals: 0,
          earnedFromTrivia: 0,
          earnedFromWordle: 1,
          usedEntries: 0,
        });
    } else {
      // Update existing record
      await db
        .update(FreeEntries)
        .set({
          earnedFromWordle: sql`${FreeEntries.earnedFromWordle} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(FreeEntries.walletAddress, normalizedWalletAddress));
    }

    return true;
  } catch (error) {
    console.error("Error awarding wordle free entry:", error);
    return false;
  }
}

/**
 * Uses a free entry for pot entry
 */
export async function consumeFreeEntry(walletAddress: string): Promise<boolean> {
  try {
    // Normalize wallet address for consistency (also used in getAvailableFreeEntries)
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    const availableEntries = await getAvailableFreeEntries(normalizedWalletAddress);
    
    if (availableEntries <= 0) {
      return false;
    }

    // Increment used entries
    await db
      .update(FreeEntries)
      .set({
        usedEntries: sql`${FreeEntries.usedEntries} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(FreeEntries.walletAddress, normalizedWalletAddress));

    return true;
  } catch (error) {
    console.error("Error using free entry:", error);
    return false;
  }
}

/**
 * Gets referral stats for a wallet
 */
export async function getReferralStats(walletAddress: string) {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    // Get referral code
    const codeResult = await db
      .select({ referralCode: ReferralCodes.referralCode })
      .from(ReferralCodes)
      .where(eq(ReferralCodes.walletAddress, normalizedWalletAddress))
      .limit(1);

    // Count total and confirmed referrals
    const referrals = await db
      .select({
        confirmed: Referrals.potEntryConfirmed,
      })
      .from(Referrals)
      .where(eq(Referrals.referrerWallet, normalizedWalletAddress));

    const totalReferrals = referrals.length;
    const confirmedReferrals = referrals.filter(r => r.confirmed).length;
    
    // Get free entries info
    const freeEntriesResult = await db
      .select({
        earnedFromReferrals: FreeEntries.earnedFromReferrals,
        earnedFromTrivia: FreeEntries.earnedFromTrivia,
        earnedFromWordle: FreeEntries.earnedFromWordle,
        used: FreeEntries.usedEntries,
      })
      .from(FreeEntries)
      .where(eq(FreeEntries.walletAddress, normalizedWalletAddress))
      .limit(1);

    const freeEntries = freeEntriesResult.length > 0 ? freeEntriesResult[0] : { 
      earnedFromReferrals: 0, 
      earnedFromTrivia: 0, 
      earnedFromWordle: 0, 
      used: 0 
    };

    const totalEarned = freeEntries.earnedFromReferrals + freeEntries.earnedFromTrivia + freeEntries.earnedFromWordle;

    return {
      referralCode: codeResult.length > 0 ? codeResult[0].referralCode : null,
      totalReferrals,
      confirmedReferrals,
      freeEntriesEarned: totalEarned,
      freeEntriesFromReferrals: freeEntries.earnedFromReferrals,
      freeEntriesFromTrivia: freeEntries.earnedFromTrivia,
      freeEntriesFromWordle: freeEntries.earnedFromWordle,
      freeEntriesUsed: freeEntries.used,
      freeEntriesAvailable: Math.max(0, totalEarned - freeEntries.used),
    };
  } catch (error) {
    console.error("Error getting referral stats:", error);
    return {
      referralCode: null,
      totalReferrals: 0,
      confirmedReferrals: 0,
      freeEntriesEarned: 0,
      freeEntriesFromReferrals: 0,
      freeEntriesFromTrivia: 0,
      freeEntriesFromWordle: 0,
      freeEntriesUsed: 0,
      freeEntriesAvailable: 0,
    };
  }
}

/**
 * Places a live prediction for the current question
 */
export async function placeLivePrediction(walletAddress: string, prediction: 'positive' | 'negative') {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    const today = getUKDateString();
    
    // SECURITY: Server-side pot participation validation would require contract query here
    // Currently relying on client-side validation with triple-layer security:
    // 1. UI blocks non-participants 2. handlePrediction validates 3. Real-time contract check
    console.log(`🔒 Processing live prediction for: ${normalizedWalletAddress}`);
    
    // Check if user already made a prediction (no date filtering)
    const existingPrediction = await db
      .select()
      .from(LivePredictions)
      .where(eq(LivePredictions.walletAddress, normalizedWalletAddress))
      .limit(1);

    if (existingPrediction.length > 0) {
      // Update existing prediction instead of blocking
      const result = await db
        .update(LivePredictions)
        .set({ prediction })
        .where(eq(LivePredictions.walletAddress, normalizedWalletAddress))
        .returning();
      
      return { updated: true, alreadyExists: true, ...result[0] };
    } else {
      // Insert new prediction
      const result = await db
        .insert(LivePredictions)
        .values({
          walletAddress: normalizedWalletAddress,
          prediction,
          betDate: today,
        })
        .returning();
      
      return { updated: false, alreadyExists: false, ...result[0] };
    }
  } catch (error) {
    console.error("Error placing live prediction:", error);
    throw new Error("Failed to place live prediction");
  }
}

export async function getUserLivePrediction(walletAddress: string) {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    // Remove date filtering to match other live prediction functions
    const result = await db
      .select()
      .from(LivePredictions)
      .where(eq(LivePredictions.walletAddress, normalizedWalletAddress))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error("Error getting user live prediction:", error);
    throw new Error("Failed to get user live prediction");
  }
}

// Wordle 24-hour cooldown functions
export async function canPlayWordle(walletAddress: string): Promise<boolean> {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    const user = await db
      .select()
      .from(UsersTable)
      .where(eq(UsersTable.walletAddress, normalizedWalletAddress))
      .limit(1);

    if (user.length === 0) {
      // New user can play
      return true;
    }

    const lastPlay = user[0].lastWordlePlay;
    if (!lastPlay) {
      // Never played before
      return true;
    }

    // Check if 24 hours have passed
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return lastPlay < twentyFourHoursAgo;
  } catch (error) {
    console.error('Error checking Wordle eligibility:', error);
    return false;
  }
}

export async function recordWordlePlay(walletAddress: string): Promise<void> {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    const now = new Date();
    
    // Try to insert new user, or update existing user's last play time
    await db
      .insert(UsersTable)
      .values({
        walletAddress: normalizedWalletAddress,
        lastWordlePlay: now,
        wordlePlaysToday: 1,
      })
      .onConflictDoUpdate({
        target: UsersTable.walletAddress,
        set: {
          lastWordlePlay: now,
          wordlePlaysToday: sql`${UsersTable.wordlePlaysToday} + 1`,
        },
      });
  } catch (error) {
    console.error('Error recording Wordle play:', error);
    throw error;
  }
}

export async function getLastWordlePlay(walletAddress: string): Promise<Date | null> {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    const user = await db
      .select({
        lastWordlePlay: UsersTable.lastWordlePlay
      })
      .from(UsersTable)
      .where(eq(UsersTable.walletAddress, normalizedWalletAddress))
      .limit(1);

    return user.length > 0 ? user[0].lastWordlePlay : null;
  } catch (error) {
    console.error('Error getting last Wordle play:', error);
    return null;
  }
}

/**
 * Updates winner statistics after a pot is distributed
 * @param winnerAddresses - Array of winner wallet addresses
 * @param potAmountPerWinner - Amount each winner received in ETH wei (18 decimals)
 */
export async function updateWinnerStats(winnerAddresses: string[], potAmountPerWinner: bigint) {
  try {
    console.log(`Updating stats for ${winnerAddresses.length} winners, ${potAmountPerWinner} ETH wei each`);
    
    for (const address of winnerAddresses) {
      // Upsert user entry and update stats
      await db
        .insert(UsersTable)
        .values({
          walletAddress: address,
          potsWon: 1,
          totalEarningsETH: potAmountPerWinner,
        })
        .onConflictDoUpdate({
          target: UsersTable.walletAddress,
          set: {
            potsWon: sql`${UsersTable.potsWon} + 1`,
            totalEarningsETH: sql`${UsersTable.totalEarningsETH} + ${potAmountPerWinner}`,
          },
        });
    }
    
    console.log(`Successfully updated winner stats for ${winnerAddresses.length} users`);
    return true;
  } catch (error) {
    console.error("Error updating winner stats:", error);
    throw new Error("Failed to update winner stats");
  }
}

/**
 * Gets user statistics for ProfilePage
 * @param walletAddress - User's wallet address
 */
export async function getUserStats(walletAddress: string) {
  try {
    // Normalize wallet address to lowercase for consistency
    const normalizedAddress = walletAddress.toLowerCase();
    
    const user = await getDbForRead()
      .select({
        potsWon: UsersTable.potsWon,
        totalEarningsETH: UsersTable.totalEarningsETH, // ETH values in wei (18 decimals)
      })
      .from(UsersTable)
      .where(eq(UsersTable.walletAddress, normalizedAddress))
      .limit(1);

    if (user.length === 0) {
      return {
        potsWon: 0,
        totalEarningsETH: BigInt(0),
        totalEarnings: '$0.00', // Formatted for display
      };
    }

    // Convert ETH wei to USD for display
    const ethAmount = Number(user[0].totalEarningsETH) / 1000000000000000000; // Convert wei to ETH
    let ethPriceUSD = 4700; // Fallback ETH price
    try {
      ethPriceUSD = await getPrice('ETH') || 4700;
    } catch (error) {
      console.warn('Failed to fetch ETH price, using fallback:', error);
    }
    const earningsInDollars = ethAmount * ethPriceUSD;
    
    return {
      potsWon: user[0].potsWon,
      totalEarningsETH: user[0].totalEarningsETH,
      totalEarnings: `$${earningsInDollars.toFixed(2)}`, // Formatted for display
    };
  } catch (error) {
    console.error("Error getting user stats:", error);
    return {
      potsWon: 0,
      totalEarningsETH: BigInt(0),
      totalEarnings: '$0.00',
    };
  }
}

/**
 * Get leaderboard data with top 10 users + current user's position
 * @param currentUserAddress - Address of current user to highlight them
 */
export async function getLeaderboard(currentUserAddress?: string) {
  try {
    // Get ALL users ordered by total earnings (descending), then by pots won (descending)
    const allUsers = await db
      .select({
        walletAddress: UsersTable.walletAddress,
        potsWon: UsersTable.potsWon,
        totalEarningsETH: UsersTable.totalEarningsETH,
        imageUrl: UsersTable.imageUrl,
      })
      .from(UsersTable)
      .where(sql`${UsersTable.potsWon} > 0 OR ${UsersTable.totalEarningsETH} > 0`) // Only users with activity
      .orderBy(
        sql`${UsersTable.totalEarningsETH} DESC`, 
        sql`${UsersTable.potsWon} DESC`
      );

    // Get ETH price once for all users
    let ethPriceUSD = 4700; // Fallback ETH price
    try {
      ethPriceUSD = await getPrice('ETH') || 4700;
    } catch (error) {
      console.warn('Failed to fetch ETH price for leaderboard, using fallback:', error);
    }

    // Helper function to format user data
    const formatUser = (user: any, index: number) => {
      // Convert ETH wei to USD for display
      const ethAmount = Number(user.totalEarningsETH) / 1000000000000000000; // Convert wei to ETH
      const earningsInDollars = ethAmount * ethPriceUSD;
      const rank = index + 1;
      
      // Calculate accuracy (placeholder - we'd need prediction data for real accuracy)
      const baseAccuracy = 65;
      const performanceBonus = Math.min(15, (earningsInDollars / Math.max(user.potsWon, 1)) * 2);
      const accuracy = Math.min(95, baseAccuracy + performanceBonus);
      
      return {
        rank,
        walletAddress: user.walletAddress,
        name: `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`,
        earnings: `$${earningsInDollars.toFixed(2)}`,
        earningsRaw: earningsInDollars,
        marketsWon: user.potsWon,
        accuracy: `${accuracy.toFixed(1)}%`,
        imageUrl: user.imageUrl || null, // Include profile image if available
        isCurrentUser: currentUserAddress ? user.walletAddress === currentUserAddress.toLowerCase() : false,
      };
    };

    // Get top 10 users
    const top10 = allUsers.slice(0, 10).map((user, index) => formatUser(user, index));

    // If we have a current user, find their position
    if (currentUserAddress) {
      const normalizedCurrentUser = currentUserAddress.toLowerCase();
      const userIndex = allUsers.findIndex(user => 
        user.walletAddress === normalizedCurrentUser
      );

      if (userIndex >= 0) {
        const userRank = userIndex + 1;
        
        // If user is not in top 10, add them separately
        if (userRank > 10) {
          const currentUser = formatUser(allUsers[userIndex], userIndex);
          
          // Return top 10 + separator + user position
          return {
            users: top10,
            currentUser: currentUser,
            showSeparator: true,
            totalUsers: allUsers.length
          };
        }
      }
    }

    // If user is in top 10 or no current user, just return top 10
    return {
      users: top10,
      currentUser: null,
      showSeparator: false,
      totalUsers: allUsers.length
    };

  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return {
      users: [],
      currentUser: null,
      showSeparator: false,
      totalUsers: 0
    };
  }
}

/**
 * Get user's rank in the leaderboard
 */
export async function getUserRank(walletAddress: string) {
  try {
    // Get all users ordered by earnings, then find the user's position
    const users = await db
      .select({
        walletAddress: UsersTable.walletAddress,
        totalEarningsETH: UsersTable.totalEarningsETH,
        potsWon: UsersTable.potsWon,
      })
      .from(UsersTable)
      .where(sql`${UsersTable.potsWon} > 0 OR ${UsersTable.totalEarningsETH} > 0`)
      .orderBy(
        sql`${UsersTable.totalEarningsETH} DESC`, 
        sql`${UsersTable.potsWon} DESC`
      );

    const userIndex = users.findIndex(user => 
      user.walletAddress === walletAddress.toLowerCase()
    );

    return userIndex >= 0 ? userIndex + 1 : null; // Return rank (1-based) or null if not found
  } catch (error) {
    console.error("Error getting user rank:", error);
    return null;
  }
}

// ========== EVIDENCE SUBMISSION SYSTEM ==========

/**
 * Input validation and sanitization functions
 */
const isValidEthereumAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const isValidTableType = (tableType: string): boolean => {
  return tableType === 'featured' || tableType === 'crypto' || tableType === 'live';
};

const sanitizeString = (input: string): string => {
  // Remove null bytes, control characters, and trim whitespace
  return input.replace(/[\x00-\x1f\x7f-\x9f]/g, '').trim();
};

const isValidDateString = (dateString: string): boolean => {
  // Check if it's a valid YYYY-MM-DD format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  
  // Check if it's a valid date
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Submit evidence for disputing a market outcome
 * Includes comprehensive input validation and sanitization
 */
export async function submitEvidence(
  walletAddress: string, 
  marketType: string, 
  outcomeDate: string, 
  evidence: string,
  paymentTxHash?: string
) {
  try {
    // Input validation
    if (!walletAddress || typeof walletAddress !== 'string') {
      return { success: false, error: "Invalid wallet address" };
    }
    if (!marketType || typeof marketType !== 'string') {
      return { success: false, error: "Invalid market type" };
    }
    if (!outcomeDate || typeof outcomeDate !== 'string') {
      return { success: false, error: "Invalid outcome date" };
    }
    if (!evidence || typeof evidence !== 'string') {
      return { success: false, error: "Evidence text is required" };
    }

    // Sanitize inputs
    const sanitizedWalletAddress = sanitizeString(walletAddress);
    const sanitizedMarketType = sanitizeString(marketType);
    const sanitizedOutcomeDate = sanitizeString(outcomeDate);
    const sanitizedEvidence = sanitizeString(evidence);
    const sanitizedPaymentTxHash = paymentTxHash ? sanitizeString(paymentTxHash) : null;

    // Validate Ethereum address format
    if (!isValidEthereumAddress(sanitizedWalletAddress)) {
      return { success: false, error: "Invalid wallet address format" };
    }

    // Validate market type
    if (!isValidTableType(sanitizedMarketType)) {
      return { success: false, error: "Invalid market type. Must be 'featured' or 'crypto'" };
    }

    // Validate date format
    if (!isValidDateString(sanitizedOutcomeDate)) {
      return { success: false, error: "Invalid date format. Must be YYYY-MM-DD" };
    }

    // Validate evidence length (prevent extremely long inputs)
    if (sanitizedEvidence.length < 10) {
      return { success: false, error: "Evidence must be at least 10 characters long" };
    }
    if (sanitizedEvidence.length > 5000) {
      return { success: false, error: "Evidence must be less than 5000 characters" };
    }

    // Validate payment hash format if provided
    if (sanitizedPaymentTxHash && !isValidEthereumAddress(sanitizedPaymentTxHash)) {
      // Transaction hashes are 66 characters (0x + 64 hex chars)
      if (!/^0x[a-fA-F0-9]{64}$/.test(sanitizedPaymentTxHash)) {
        return { success: false, error: "Invalid payment transaction hash format" };
      }
    }

    // Check if market outcome exists and evidence window is active
    const marketOutcome = await db
      .select()
      .from(MarketOutcomes)
      .where(
        and(
          eq(MarketOutcomes.marketType, sanitizedMarketType),
          eq(MarketOutcomes.outcomeDate, sanitizedOutcomeDate)
        )
      )
      .limit(1);

    if (marketOutcome.length === 0) {
      return { success: false, error: "Market outcome not found" };
    }

    // Check if evidence window is still active
    const now = new Date();
    const evidenceExpiry = new Date(marketOutcome[0].evidenceWindowExpires);
    if (now > evidenceExpiry) {
      return { success: false, error: "Evidence submission window has expired" };
    }

    // Check if user has already submitted evidence for this outcome
    const existingEvidence = await db
      .select()
      .from(EvidenceSubmissions)
      .where(
        and(
          eq(EvidenceSubmissions.walletAddress, sanitizedWalletAddress.toLowerCase()),
          eq(EvidenceSubmissions.marketType, sanitizedMarketType),
          eq(EvidenceSubmissions.outcomeDate, sanitizedOutcomeDate)
        )
      )
      .limit(1);

    if (existingEvidence.length > 0) {
      return { success: false, error: "You have already submitted evidence for this outcome" };
    }

    // Insert evidence submission
    const result = await db
      .insert(EvidenceSubmissions)
      .values({
        walletAddress: sanitizedWalletAddress.toLowerCase(),
        marketType: sanitizedMarketType,
        outcomeDate: sanitizedOutcomeDate,
        evidence: sanitizedEvidence,
        paymentTxHash: sanitizedPaymentTxHash,
        status: 'pending'
      })
      .returning({ id: EvidenceSubmissions.id });

    // Mark market as disputed
    await db
      .update(MarketOutcomes)
      .set({ isDisputed: true })
      .where(
        and(
          eq(MarketOutcomes.marketType, sanitizedMarketType),
          eq(MarketOutcomes.outcomeDate, sanitizedOutcomeDate)
        )
      );

    return { 
      success: true, 
      submissionId: result[0].id,
      message: "Evidence submitted successfully" 
    };

  } catch (error) {
    console.error("Error submitting evidence:", error);
    return { success: false, error: "Failed to submit evidence. Please try again." };
  }
}

/**
 * Get user's evidence submission for a specific market outcome
 */
export async function getUserEvidenceSubmission(
  walletAddress: string, 
  marketType: string, 
  outcomeDate: string
) {
  try {
    // Input validation and sanitization
    if (!walletAddress || typeof walletAddress !== 'string') {
      return null;
    }
    if (!marketType || typeof marketType !== 'string') {
      return null;
    }
    if (!outcomeDate || typeof outcomeDate !== 'string') {
      return null;
    }

    const sanitizedWalletAddress = sanitizeString(walletAddress);
    const sanitizedMarketType = sanitizeString(marketType);
    const sanitizedOutcomeDate = sanitizeString(outcomeDate);

    if (!isValidEthereumAddress(sanitizedWalletAddress)) {
      return null;
    }
    if (!isValidTableType(sanitizedMarketType)) {
      return null;
    }
    if (!isValidDateString(sanitizedOutcomeDate)) {
      return null;
    }

    const evidence = await db
      .select({
        id: EvidenceSubmissions.id,
        evidence: EvidenceSubmissions.evidence,
        submittedAt: EvidenceSubmissions.submittedAt,
        status: EvidenceSubmissions.status,
        reviewedAt: EvidenceSubmissions.reviewedAt,
        reviewNotes: EvidenceSubmissions.reviewNotes,
      })
      .from(EvidenceSubmissions)
      .where(
        and(
          eq(EvidenceSubmissions.walletAddress, sanitizedWalletAddress.toLowerCase()),
          eq(EvidenceSubmissions.marketType, sanitizedMarketType),
          eq(EvidenceSubmissions.outcomeDate, sanitizedOutcomeDate)
        )
      )
      .limit(1);

    return evidence.length > 0 ? evidence[0] : null;

  } catch (error) {
    console.error("Error getting user evidence submission:", error);
    return null;
  }
}

/**
 * Get all evidence submissions for a market outcome (admin function)
 */
export async function getAllEvidenceSubmissions(
  marketType: string, 
  outcomeDate: string
) {
  try {
    // Input validation and sanitization
    if (!marketType || typeof marketType !== 'string') {
      return [];
    }
    if (!outcomeDate || typeof outcomeDate !== 'string') {
      return [];
    }

    const sanitizedMarketType = sanitizeString(marketType);
    const sanitizedOutcomeDate = sanitizeString(outcomeDate);

    if (!isValidTableType(sanitizedMarketType)) {
      return [];
    }
    if (!isValidDateString(sanitizedOutcomeDate)) {
      return [];
    }

    const submissions = await db
      .select()
      .from(EvidenceSubmissions)
      .where(
        and(
          eq(EvidenceSubmissions.marketType, sanitizedMarketType),
          eq(EvidenceSubmissions.outcomeDate, sanitizedOutcomeDate)
        )
      )
      .orderBy(EvidenceSubmissions.submittedAt);

    return submissions;

  } catch (error) {
    console.error("Error getting evidence submissions:", error);
    return [];
  }
}

// ==================== PREDICTION IDEAS FUNCTIONS ====================

/**
 * Submit a new prediction market idea
 */
export async function submitPredictionIdea({
  walletAddress,
  idea,
  category
}: {
  walletAddress: string;
  idea: string;
  category: string;
}) {
  try {
    // Validate inputs
    if (!walletAddress || typeof walletAddress !== 'string' || walletAddress.length < 10) {
      throw new Error('Invalid wallet address');
    }

    if (!idea || typeof idea !== 'string' || idea.trim().length < 10) {
      throw new Error('Idea must be at least 10 characters long');
    }

    if (!category || typeof category !== 'string') {
      throw new Error('Category is required');
    }

    const validCategories = ['crypto', 'stocks', 'sports', 'politics', 'entertainment', 'weather', 'tech', 'other'];
    if (!validCategories.includes(category)) {
      throw new Error('Invalid category');
    }

    // Sanitize inputs
    const sanitizedWalletAddress = walletAddress.trim().toLowerCase();
    const sanitizedIdea = idea.trim().substring(0, 500); // Limit to 500 characters
    const sanitizedCategory = category.toLowerCase();

    // Insert the idea
    const result = await db
      .insert(PredictionIdeas)
      .values({
        walletAddress: sanitizedWalletAddress,
        idea: sanitizedIdea,
        category: sanitizedCategory,
        submittedAt: new Date(),
        likes: 0,
        status: 'pending'
      })
      .returning();

    console.log('✅ Prediction idea submitted successfully:', result[0]);
    return { success: true, idea: result[0] };

  } catch (error) {
    console.error('❌ Error submitting prediction idea:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get recent prediction ideas (for community display)
 */
export async function getRecentPredictionIdeas(limit: number = 20) {
  try {
    const ideas = await db
      .select()
      .from(PredictionIdeas)
      .where(eq(PredictionIdeas.status, 'pending'))
      .orderBy(desc(PredictionIdeas.submittedAt))
      .limit(limit);

    return ideas;

  } catch (error) {
    console.error("Error getting recent prediction ideas:", error);
    return [];
  }
}

/**
 * Get prediction ideas by user wallet address
 */
export async function getUserPredictionIdeas(walletAddress: string) {
  try {
    if (!walletAddress || typeof walletAddress !== 'string') {
      throw new Error('Invalid wallet address');
    }

    const sanitizedAddress = walletAddress.trim().toLowerCase();

    const ideas = await db
      .select()
      .from(PredictionIdeas)
      .where(eq(PredictionIdeas.walletAddress, sanitizedAddress))
      .orderBy(desc(PredictionIdeas.submittedAt));

    return ideas;

  } catch (error) {
    console.error("Error getting user prediction ideas:", error);
    return [];
  }
}

/**
 * Like a prediction idea (increment likes counter)
 */
export async function likePredictionIdea(ideaId: number) {
  try {
    if (!ideaId || typeof ideaId !== 'number') {
      throw new Error('Invalid idea ID');
    }

    const result = await db
      .update(PredictionIdeas)
      .set({
        likes: sql`${PredictionIdeas.likes} + 1`
      })
      .where(eq(PredictionIdeas.id, ideaId))
      .returning();

    if (result.length === 0) {
      throw new Error('Idea not found');
    }

    return { success: true, likes: result[0].likes };

  } catch (error) {
    console.error("Error liking prediction idea:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Update prediction idea status (admin function)
 */
export async function updatePredictionIdeaStatus({
  ideaId,
  status,
  reviewedBy,
  reviewNotes,
  marketAddress
}: {
  ideaId: number;
  status: 'approved' | 'implemented' | 'rejected';
  reviewedBy: string;
  reviewNotes?: string;
  marketAddress?: string;
}) {
  try {
    if (!ideaId || typeof ideaId !== 'number') {
      throw new Error('Invalid idea ID');
    }

    if (!status || !['approved', 'implemented', 'rejected'].includes(status)) {
      throw new Error('Invalid status');
    }

    if (!reviewedBy || typeof reviewedBy !== 'string') {
      throw new Error('Reviewer address is required');
    }

    const updateData: any = {
      status,
      reviewedBy: reviewedBy.trim().toLowerCase(),
      reviewedAt: new Date()
    };

    if (reviewNotes) {
      updateData.reviewNotes = reviewNotes.trim();
    }

    if (status === 'implemented' && marketAddress) {
      updateData.implementedAt = new Date();
      updateData.marketAddress = marketAddress.trim();
    }

    const result = await db
      .update(PredictionIdeas)
      .set(updateData)
      .where(eq(PredictionIdeas.id, ideaId))
      .returning();

    if (result.length === 0) {
      throw new Error('Idea not found');
    }

    return { success: true, idea: result[0] };

  } catch (error) {
    console.error("Error updating prediction idea status:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get user profiles for a list of wallet addresses
 */
export async function getUserProfiles(walletAddresses: string[]) {
  try {
    if (!walletAddresses || walletAddresses.length === 0) {
      return [];
    }

    console.log('🔍 Looking for profiles for addresses:', walletAddresses);

    // Sanitize wallet addresses
    const sanitizedAddresses = walletAddresses.map(addr => addr.trim().toLowerCase());

    // Use IN clause instead of ANY for better compatibility
    const profiles = await db
      .select({
        walletAddress: UsersTable.walletAddress,
        imageUrl: UsersTable.imageUrl
      })
      .from(UsersTable)
      .where(sql`LOWER(${UsersTable.walletAddress}) IN (${sql.join(sanitizedAddresses.map(addr => sql`${addr}`), sql`, `)})`);

    console.log('📸 Found profiles:', profiles);
    return profiles;

  } catch (error) {
    console.error("Error getting user profiles:", error);
    return [];
  }
}

// Bookmark functions
export async function addBookmark(walletAddress: string, marketId: string, marketCategory: string, contractAddress?: string) {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    // Check if bookmark already exists
    const existingBookmark = await db
      .select()
      .from(Bookmarks)
      .where(and(
        eq(Bookmarks.walletAddress, normalizedWalletAddress),
        eq(Bookmarks.marketId, marketId)
      ))
      .limit(1);

    if (existingBookmark.length > 0) {
      console.log('📑 Bookmark already exists for market:', marketId);
      return { success: false, message: 'Market already bookmarked' };
    }

    // Add new bookmark - marketName and marketQuestion removed (we get live data from markets.ts)
    await db.insert(Bookmarks).values({
      walletAddress: normalizedWalletAddress,
      marketId,
      marketCategory,
      contractAddress,
    });

    console.log('📑 Bookmark added successfully for market:', marketId);
    return { success: true, message: 'Market bookmarked successfully' };

  } catch (error) {
    console.error("Error adding bookmark:", error);
    return { success: false, message: 'Failed to add bookmark' };
  }
}

export async function removeBookmark(walletAddress: string, marketId: string) {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    // Handle legacy 'Featured' -> 'Trending' transition for removal
    const searchIds = [marketId];
    if (marketId === 'Trending') {
      searchIds.push('Featured'); // Also remove legacy 'Featured' bookmarks
    }

    await db
      .delete(Bookmarks)
      .where(and(
        eq(Bookmarks.walletAddress, normalizedWalletAddress),
        inArray(Bookmarks.marketId, searchIds)
      ));

    console.log('📑 Bookmark removed successfully for market:', marketId);
    return { success: true, message: 'Bookmark removed successfully' };

  } catch (error) {
    console.error("Error removing bookmark:", error);
    return { success: false, message: 'Failed to remove bookmark' };
  }
}

export async function getUserBookmarks(walletAddress: string) {
  try {
    console.log('📑 Starting database query for bookmarks:', walletAddress);
    const startTime = Date.now();
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    const bookmarks = await getDbForRead()
      .select({
        id: Bookmarks.id,
        walletAddress: Bookmarks.walletAddress,
        marketId: Bookmarks.marketId,
        marketCategory: Bookmarks.marketCategory,
        contractAddress: Bookmarks.contractAddress,
        // Note: marketName and marketQuestion are intentionally excluded - we get live data from markets.ts
      })
      .from(Bookmarks)
      .where(eq(Bookmarks.walletAddress, normalizedWalletAddress))
      .orderBy(desc(Bookmarks.id))
      .limit(100); // Reasonable limit to prevent huge queries

    const queryTime = Date.now() - startTime;
    console.log('📑 Retrieved bookmarks for user:', walletAddress, 'Count:', bookmarks.length, 'Query time:', queryTime + 'ms');
    return bookmarks;

  } catch (error) {
    console.error("Error getting user bookmarks:", error);
    return [];
  }
}

export async function isMarketBookmarked(walletAddress: string, marketId: string) {
  try {
    // Normalize wallet address for consistency
    const normalizedWalletAddress = walletAddress.toLowerCase();
    
    // Handle legacy 'Featured' -> 'Trending' transition
    const searchIds = [marketId];
    if (marketId === 'Trending') {
      searchIds.push('Featured'); // Also check for legacy 'Featured' bookmarks
    }

    // console.log(`📑 Checking bookmark for wallet: ${normalizedWalletAddress}, marketIds: ${searchIds.join(', ')}`);

    // Select only essential columns to avoid issues with missing contract_address column
    const bookmark = await getDbForRead()
      .select({
        id: Bookmarks.id,
        marketId: Bookmarks.marketId,
        walletAddress: Bookmarks.walletAddress
      })
      .from(Bookmarks)
      .where(and(
        eq(Bookmarks.walletAddress, normalizedWalletAddress),
        inArray(Bookmarks.marketId, searchIds)
      ))
      .limit(1);

    const isBookmarked = bookmark.length > 0;
    // console.log(`📑 Result: ${isBookmarked} for ${marketId}`);
    return isBookmarked;

  } catch (error) {
    console.error("Error checking bookmark status:", error);
    return false;
  }
}


export async function getPredictionPercentages(marketId: string) {
  try {
    // Use the SAME date calculation functions that store predictions for consistency
    const tomorrowDateStr = getTomorrowUKDateString(); // Tomorrow's UK date

    console.log(`📊 getPredictionPercentages called with marketId: "${marketId}", tomorrowDate: ${tomorrowDateStr}`);

    // Get table type from market ID
    const tableType = getTableTypeFromMarketId(marketId);
    
    // Get the appropriate table using the existing getTableFromType function
    const BetsTable = getTableFromType(tableType);

    console.log(`📊 Using table type: "${tableType}" for market: "${marketId}"`);

    // Query the appropriate table - only for tomorrow's date
    const bets = await getDbForRead()
      .select({
        prediction: BetsTable.prediction
      })
      .from(BetsTable)
      .where(eq(BetsTable.betDate, tomorrowDateStr));
    
    // Count positive and negative predictions
    let totalPositive = 0;
    let totalNegative = 0;
    
    bets.forEach(bet => {
      if (bet.prediction === 'positive') {
        totalPositive++;
      } else if (bet.prediction === 'negative') {
        totalNegative++;
      }
    });

    const totalPredictions = totalPositive + totalNegative;
    
    console.log(`📊 ${marketId} predictions: ${totalPositive} positive, ${totalNegative} negative, ${totalPredictions} total`);
    
    if (totalPredictions === 0) {
      console.log(`📊 ${marketId}: No predictions found, returning 50/50%`);
      return { positivePercentage: 50, negativePercentage: 50, totalPredictions: 0 };
    }

    const positivePercentage = Math.round((totalPositive / totalPredictions) * 100);
    const negativePercentage = Math.round((totalNegative / totalPredictions) * 100);

    console.log(`📊 ${marketId} final percentages: ${positivePercentage}% positive, ${negativePercentage}% negative`);

    return {
      positivePercentage,
      negativePercentage,
      totalPredictions
    };

  } catch (error) {
    console.error("Error calculating prediction percentages:", error);
    return { positivePercentage: 50, negativePercentage: 50, totalPredictions: 0 };
  }
}

// ==========================================
// ANNOUNCEMENT FUNCTIONS
// ==========================================
// Using Messages table with special sender "SYSTEM_ANNOUNCEMENTS" for global announcements

const SYSTEM_ANNOUNCEMENT_SENDER = "SYSTEM_ANNOUNCEMENTS";
const ANNOUNCEMENT_RECIPIENT = "ALL_USERS"; // Broadcast to all users
const CONTRACT_PARTICIPANTS = "CONTRACT_PARTICIPANTS"; // Contract-specific announcements

/**
 * Creates a new global announcement (admin only)
 */
export async function createAnnouncement(message: string) {
  try {
    const datetime = new Date().toISOString();
    
    return db
      .insert(Messages)
      .values({
        from: SYSTEM_ANNOUNCEMENT_SENDER,
        to: ANNOUNCEMENT_RECIPIENT,
        message: message,
        datetime: datetime,
        contractAddress: null,
      })
      .returning();
  } catch (error) {
    console.error("Error creating announcement:", error);
    throw new Error("Failed to create announcement");
  }
}

/**
 * Creates a contract-specific announcement for participants
 */
export async function createContractAnnouncement(message: string, contractAddress: string) {
  try {
    const datetime = new Date().toISOString();
    
    return db
      .insert(Messages)
      .values({
        from: SYSTEM_ANNOUNCEMENT_SENDER,
        to: CONTRACT_PARTICIPANTS,
        message: message,
        datetime: datetime,
        contractAddress: contractAddress,
      })
      .returning();
  } catch (error) {
    console.error("Error creating contract announcement:", error);
    throw new Error("Failed to create contract announcement");
  }
}

/**
 * Creates a contract-specific announcement with duplicate prevention
 * Checks for identical announcements in the last 5 minutes to prevent spam
 */
export async function createContractAnnouncementSafe(
  message: string, 
  contractAddress: string,
  deduplicationWindow: number = 300000 // 5 minutes in milliseconds
) {
  try {
    console.log(`🔍 Checking for duplicate announcements for contract ${contractAddress}`);
    
    // Calculate cutoff time for deduplication window
    const cutoffTime = new Date(Date.now() - deduplicationWindow);
    
    // Check for identical announcements in recent history
    const recentDuplicate = await db
      .select()
      .from(Messages)
      .where(
        and(
          eq(Messages.from, SYSTEM_ANNOUNCEMENT_SENDER),
          eq(Messages.to, CONTRACT_PARTICIPANTS),
          eq(Messages.contractAddress, contractAddress),
          eq(Messages.message, message),
          sql`${Messages.datetime} > ${cutoffTime.toISOString()}`
        )
      )
      .limit(1);

    if (recentDuplicate.length > 0) {
      const duplicateAge = Date.now() - new Date(recentDuplicate[0].datetime).getTime();
      console.log(`🚫 Duplicate announcement prevented (identical message sent ${Math.round(duplicateAge / 1000)}s ago)`);
      return {
        isDuplicate: true,
        originalMessage: recentDuplicate[0],
        message: "Duplicate announcement prevented"
      };
    }

    // No duplicate found, create new announcement
    console.log(`✅ No duplicate found, creating new announcement`);
    const result = await createContractAnnouncement(message, contractAddress);
    
    return {
      isDuplicate: false,
      originalMessage: null,
      message: "Announcement created successfully",
      newAnnouncement: result[0]
    };
    
  } catch (error) {
    console.error("Error in createContractAnnouncementSafe:", error);
    throw new Error("Failed to create safe contract announcement");
  }
}

/**
 * Gets all announcements (global messages only)
 */
export async function getAllAnnouncements() {
  try {
    return db
      .select()
      .from(Messages)
      .where(
        and(
          eq(Messages.from, SYSTEM_ANNOUNCEMENT_SENDER),
          eq(Messages.to, ANNOUNCEMENT_RECIPIENT)
        )
      )
      .orderBy(sql`${Messages.datetime} DESC`);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    throw new Error("Failed to fetch announcements");
  }
}

/**
 * Gets announcements for contracts user participates in
 * Optimized with automatic limits and recent focus
 */
export async function getUserContractAnnouncements(userAddress: string) {
  try {
    console.log(`🔍 getUserContractAnnouncements: Starting for address ${userAddress}`);
    // Normalize wallet address for consistency
    const normalizedUserAddress = userAddress.toLowerCase();
    console.log(`🔍 getUserContractAnnouncements: Normalized address ${normalizedUserAddress}`);
    
    // 1. Get user's participating contracts (cached/optimized)
    const userContracts = await getUserParticipatingContracts(normalizedUserAddress);
    const contractAddresses = userContracts.map(c => c.contractAddress);
    console.log(`🔍 getUserContractAnnouncements: User ${normalizedUserAddress} participates in contracts:`, contractAddresses);
    
    // 2. Date filtering - only get recent announcements (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // 3. Get global announcements (limited and recent)
    const globalAnnouncements = await db
      .select()
      .from(Messages)
      .where(
        and(
          eq(Messages.from, SYSTEM_ANNOUNCEMENT_SENDER),
          eq(Messages.to, ANNOUNCEMENT_RECIPIENT),
          sql`${Messages.datetime} > ${thirtyDaysAgo.toISOString()}`
        )
      )
      .orderBy(sql`${Messages.datetime} DESC`)
      .limit(50); // Limit to 50 recent global announcements
    
    // 4. Get contract-specific announcements (limited and recent)
    let contractAnnouncements: any[] = [];
    if (contractAddresses.length > 0) {
      contractAnnouncements = await db
        .select()
        .from(Messages)
        .where(
          and(
            eq(Messages.from, SYSTEM_ANNOUNCEMENT_SENDER),
            eq(Messages.to, CONTRACT_PARTICIPANTS),
            inArray(Messages.contractAddress, contractAddresses),
            sql`${Messages.datetime} > ${thirtyDaysAgo.toISOString()}`
          )
        )
        .orderBy(sql`${Messages.datetime} DESC`)
        .limit(100); // Limit to 100 recent contract announcements
    }
      
    // 5. Combine, sort, and limit final result
    const combined = [...globalAnnouncements, ...contractAnnouncements]
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
      
    console.log(`🔍 getUserContractAnnouncements: Final combined announcements:`, {
      globalCount: globalAnnouncements.length,
      contractCount: contractAnnouncements.length,
      totalCount: combined.length,
      first3: combined.slice(0, 3)
    });
    
    // Return maximum 100 most recent announcements
    return combined.slice(0, 100);
      
  } catch (error) {
    console.error("Error fetching user contract announcements:", error);
    // Return empty array instead of throwing to prevent MessagingPage crashes
    return [];
  }
}

/**
 * Helper: Get contracts user participates in
 * Note: This is server-side and can't access blockchain directly.
 * For now, we'll use database predictions as a proxy for participation.
 * TODO: Consider caching blockchain participation data or using client-side approach.
 */
export async function getUserParticipatingContracts(userAddress: string) {
  try {
    // Normalize wallet address for consistency
    const normalizedUserAddress = userAddress.toLowerCase();
    console.log(`🔍 getUserParticipatingContracts: Checking participation for ${normalizedUserAddress}`);
    const contracts: { contractAddress: string; marketType: string }[] = [];
    
    // Debug: Let's see what's in the PotParticipationHistory for this user
    try {
      const allPotHistory = await db
        .select()
        .from(PotParticipationHistory)
        .where(eq(PotParticipationHistory.walletAddress, normalizedUserAddress))
        .limit(10);
      console.log(`🔍 PotParticipationHistory records for ${normalizedUserAddress}:`, allPotHistory);
    } catch (historyError) {
      console.error(`🔍 Error querying PotParticipationHistory:`, historyError);
    }
    
    // Import config dynamically
    const config = await import('./config');
    const CONTRACT_TO_TABLE_MAPPING = config.CONTRACT_TO_TABLE_MAPPING;
    
    // Check each contract type for user participation (predictions OR pot entry)
    for (const [contractAddress, tableType] of Object.entries(CONTRACT_TO_TABLE_MAPPING)) {
      let userParticipates = false;
      
      try {
        // First, check if user has entered this pot (via PotParticipationHistory)
        const potParticipation = await db
          .select()
          .from(PotParticipationHistory)
          .where(
            and(
              eq(PotParticipationHistory.walletAddress, normalizedUserAddress),
              eq(PotParticipationHistory.contractAddress, contractAddress.toLowerCase()), // Normalize contract address
              eq(PotParticipationHistory.eventType, 'entry')
            )
          )
          .limit(1);
        
        console.log(`🔍 Contract ${contractAddress} (${tableType}): PotParticipationHistory found: ${potParticipation.length > 0}`);
        
        if (potParticipation.length > 0) {
          userParticipates = true;
        } else {
          // Fallback: check if user has made predictions using scalable approach
          try {
            const BetsTable = getTableFromType(tableType);
            const predictions = await db
              .select()
              .from(BetsTable)
              .where(eq(BetsTable.walletAddress, normalizedUserAddress))
              .limit(1);
            userParticipates = predictions.length > 0;
            console.log(`🔍 Contract ${contractAddress} (${tableType}): Predictions found: ${predictions.length > 0}`);
          } catch (tableError) {
            console.error(`Error getting table for type ${tableType}:`, tableError);
            userParticipates = false;
          }
        }
      } catch (queryError) {
        console.error(`Error checking ${tableType} participation for ${userAddress}:`, queryError);
        // Continue with other contracts even if one fails
      }
      
      if (userParticipates) {
        console.log(`✅ Adding contract ${contractAddress} (${tableType}) to user's participating contracts`);
        contracts.push({ contractAddress, marketType: tableType });
      }
    }
    
    console.log(`🔍 getUserParticipatingContracts: Final result for ${normalizedUserAddress}:`, contracts);
    return contracts;
  } catch (error) {
    console.error("Error getting user participating contracts:", error);
    return [];
  }
}

/**
 * Gets all announcements for a user
 * Returns all available announcements - client filters unread ones using cookies
 * NOTE: Name is legacy - this returns ALL announcements, filtering is done client-side
 */
export async function getUnreadAnnouncements(userAddress: string) {
  try {
    // Normalize wallet address for consistency
    const normalizedUserAddress = userAddress.toLowerCase();
    
    // Get user's contracts for filtering
    const userContracts = await getUserParticipatingContracts(normalizedUserAddress);
    const contractAddresses = userContracts.map(c => c.contractAddress);
    
    // Get all global announcements
    const globalAnnouncements = await db
      .select()
      .from(Messages)
      .where(
        and(
          eq(Messages.from, SYSTEM_ANNOUNCEMENT_SENDER),
          eq(Messages.to, ANNOUNCEMENT_RECIPIENT)
        )
      );
    
    // Get contract-specific announcements for user's contracts
    let contractAnnouncements: any[] = [];
    if (contractAddresses.length > 0) {
      contractAnnouncements = await db
        .select()
        .from(Messages)
        .where(
          and(
            eq(Messages.from, SYSTEM_ANNOUNCEMENT_SENDER),
            eq(Messages.to, CONTRACT_PARTICIPANTS),
            inArray(Messages.contractAddress, contractAddresses)
          )
        );
    }
    
    // Return all announcements - client-side cookie filtering will handle read status
    return [...globalAnnouncements, ...contractAnnouncements]
      .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
      
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return [];
  }
}

/**
 * Legacy compatibility function for marking announcements as read
 * NOTE: Read status is now handled client-side with cookies. This function is a no-op stub.
 * @deprecated Use markAnnouncementsAsReadCookie from utils/announcementCookies.ts instead
 */
export async function markAnnouncementsAsRead(userAddress: string, announcementIds: number[]) {
  // This is a no-op function kept for backward compatibility
  // All read tracking is now done client-side with cookies
  console.log(`📖 Legacy function called - read status handled client-side (${announcementIds.length} announcements)`);
  return { success: true };
}

/**
 * Checks if user has any announcements available
 * NOTE: Name is legacy - this returns true if ANY announcements exist, client-side filtering determines unread status
 */
export async function hasUnreadAnnouncements(userAddress: string): Promise<boolean> {
  try {
    const allAnnouncements = await getUnreadAnnouncements(userAddress);
    // Return true if there are any announcements - client filters by read status using cookies
    return allAnnouncements.length > 0;
  } catch (error) {
    console.error("Error checking for announcements:", error);
    return false;
  }
}

// ==========================================
// NOTIFICATION FUNCTIONS
// ==========================================
// These functions send notifications AFTER successful core operations
// Call these separately to avoid slowing down critical business logic

/**
 * Sends market outcome notification to contract participants
 * Call this AFTER setDailyOutcome() succeeds
 */
export async function notifyMarketOutcome(
  contractAddress: string, 
  outcome: string, 
  marketType: string = 'market'
) {
  try {
    console.log(`📢 Sending market outcome notification for ${contractAddress}: ${outcome}`);
    
    const message = outcome === 'positive' 
      ? `🎉 Great news! Users who predicted POSITIVE won today's ${marketType} market!`
      : `🎉 Great news! Users who predicted NEGATIVE won today's ${marketType} market!`;
    
    const result = await createContractAnnouncementSafe(message, contractAddress);
    
    if (result.isDuplicate) {
      console.log(`🔄 Market outcome notification: ${result.message}`);
    } else {
      console.log(`✅ Market outcome notification sent successfully`);
    }
    
    return result;
  } catch (error) {
    console.error("❌ Error sending market outcome notification:", error);
    return { isDuplicate: false, error: error instanceof Error ? error.message : 'Unknown error' };
    // Don't throw - notifications failing shouldn't break main flow
  }
}

/**
 * Sends winner notification to contract participants
 * Call this AFTER processWinners() succeeds
 */
export async function notifyWinners(contractAddress: string, winnerAddresses: string[]) {
  try {
    console.log(`🏆 Sending winner notification for ${contractAddress} to ${winnerAddresses.length} winners`);
    
    const message = winnerAddresses.length === 1
      ? `🏆 Congratulations! You won the pot and received your prize!`
      : `🏆 Congratulations! You and ${winnerAddresses.length - 1} other winners split the pot!`;
    
    const result = await createContractAnnouncementSafe(message, contractAddress);
    
    if (result.isDuplicate) {
      console.log(`🔄 Winner notification: ${result.message}`);
    } else {
      console.log(`✅ Winner notification sent successfully`);
    }
    
    return result;
  } catch (error) {
    console.error("❌ Error sending winner notification:", error);
    return { isDuplicate: false, error: error instanceof Error ? error.message : 'Unknown error' };
    // Don't throw - notifications failing shouldn't break main flow
  }
}

/**
 * Sends elimination notification to contract participants who lost
 * Call this AFTER processing wrong predictions
 */
export async function notifyEliminatedUsers(
  contractAddress: string, 
  eliminatedCount: number, 
  marketType: string = 'market'
) {
  try {
    console.log(`📉 Sending elimination notification for ${contractAddress} to ${eliminatedCount} users`);
    
    const message = eliminatedCount === 0
      ? `🎉 Amazing! No one was eliminated this round - all predictions were correct!`
      : eliminatedCount === 1
        ? `📉 Your prediction was incorrect this time. Pay today's entry fee to re-enter the ${marketType} pot!`
        : `😱 Were you one of the unlucky ones? ${eliminatedCount} users were eliminated. If that's you, pay today's entry fee to re-enter!`;
    
    const result = await createContractAnnouncementSafe(message, contractAddress);
    
    if (result.isDuplicate) {
      console.log(`🔄 Elimination notification: ${result.message}`);
    } else {
      console.log(`✅ Elimination notification sent successfully`);
    }
    
    return result;
  } catch (error) {
    console.error("❌ Error sending elimination notification:", error);
    return { isDuplicate: false, error: error instanceof Error ? error.message : 'Unknown error' };
    // Don't throw - notifications failing shouldn't break main flow
  }
}

/**
 * Sends pot distribution completion notification
 * Call this AFTER successful ETH distribution to winners
 */
export async function notifyPotDistributed(
  contractAddress: string, 
  totalAmount: string,
  winnerCount: number
) {
  try {
    console.log(`💰 Sending pot distribution notification for ${contractAddress}`);
    
    const message = winnerCount === 1
      ? `💰 Pot distributed! ${totalAmount} ETH has been sent to the winner!`
      : `💰 Pot distributed! ${totalAmount} ETH has been split between ${winnerCount} winners!`;
    
    const result = await createContractAnnouncementSafe(message, contractAddress);
    
    if (result.isDuplicate) {
      console.log(`🔄 Pot distribution notification: ${result.message}`);
    } else {
      console.log(`✅ Pot distribution notification sent successfully`);
    }
    
    return result;
  } catch (error) {
    console.error("❌ Error sending pot distribution notification:", error);
    return { isDuplicate: false, error: error instanceof Error ? error.message : 'Unknown error' };
    // Don't throw - notifications failing shouldn't break main flow
  }
}

/**
 * Sends general market update notification
 * Call this for any other market events (new participants, etc.)
 */
export async function notifyMarketUpdate(
  contractAddress: string, 
  message: string
) {
  try {
    console.log(`📊 Sending market update notification for ${contractAddress}`);
    
    const result = await createContractAnnouncementSafe(`📊 ${message}`, contractAddress);
    
    if (result.isDuplicate) {
      console.log(`🔄 Market update notification: ${result.message}`);
    } else {
      console.log(`✅ Market update notification sent successfully`);
    }
    
    return result;
  } catch (error) {
    console.error("❌ Error sending market update notification:", error);
    return { isDuplicate: false, error: error instanceof Error ? error.message : 'Unknown error' };
    // Don't throw - notifications failing shouldn't break main flow
  }
}

/**
 * Get participant emails for a specific contract
 * @param participants Array of participant wallet addresses
 * @returns Array of email addresses for participants who have provided emails
 */
export async function getParticipantEmails(participants: string[]): Promise<string[]> {
  try {
    if (!participants || participants.length === 0) {
      return [];
    }

    console.log(`📧 Fetching emails for ${participants.length} participants`);
    console.log(`📧 Participants:`, participants);
    
    // Normalize wallet addresses for consistency
    const normalizedAddresses = participants.map(addr => addr.toLowerCase());
    
    // Get users who have provided emails
    const usersWithEmails = await db
      .select({ email: UsersTable.email })
      .from(UsersTable)
      .where(
        and(
          inArray(UsersTable.walletAddress, normalizedAddresses),
          sql`${UsersTable.email} IS NOT NULL AND ${UsersTable.email} != ''`
        )
      );
    
    const emails = usersWithEmails
      .map(user => user.email)
      .filter((email): email is string => email !== null && email !== '');
    
    console.log(`📧 Found ${emails.length} email addresses out of ${participants.length} participants`);
    return emails;
    
  } catch (error) {
    console.error("❌ Error fetching participant emails:", error);
    return [];
  }
}

/**
 * Send email notification when minimum players threshold is reached
 * @param emails Array of email addresses to notify
 * @param currentParticipants Number of current participants
 * @param marketType Type of market (for email subject/content)
 */
export async function sendMinimumPlayersEmail(
  emails: string[], 
  currentParticipants: number,
  marketType: string = 'market'
): Promise<{ success: boolean; sent: number; errors: string[] }> {
  try {
    if (!emails || emails.length === 0) {
      console.log('📧 No email addresses to notify');
      return { success: true, sent: 0, errors: [] };
    }

    console.log(`📧 Sending minimum players email to ${emails.length} participants`);

    const subject = `🎉 Your ${marketType} pot is ready! Predictions can now begin`;
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">🎉 Great News!</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Your pot is ready to start!</h2>
          
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Your <strong>${marketType}</strong> prediction pot now has <strong>${currentParticipants} participants</strong> and has reached the minimum threshold.
          </p>
          
          <div style="background: #f8f9ff; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #333; font-weight: 500;">
              🚀 Predictions can now begin! Log in to make your predictions and compete for the pot.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://prediwin.com'}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      text-decoration: none; 
                      padding: 12px 30px; 
                      border-radius: 6px; 
                      font-weight: bold; 
                      display: inline-block;">
              Make Predictions Now
            </a>
          </div>
          
          <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #999; font-size: 14px; margin: 0;">
              Good luck with your predictions! 🍀
            </p>
          </div>
        </div>
      </div>
    `;

    // Use Next.js API route to send emails - need absolute URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: emails,
        subject,
        html: htmlContent,
        type: 'minimum-players-reached'
      }),
    });

    if (!response.ok) {
      throw new Error(`Email API responded with status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log(`✅ Email notification sent successfully to ${emails.length} participants`);
    return { success: true, sent: emails.length, errors: [] };
    
  } catch (error) {
    console.error("❌ Error sending minimum players email:", error);
    return { 
      success: false, 
      sent: 0, 
      errors: [error instanceof Error ? error.message : 'Unknown email error'] 
    };
  }
}

/**
 * Sends notification when a contract reaches minimum players threshold
 * Call this when participant count goes from (minPlayers-1) to minPlayers
 */
export async function notifyMinimumPlayersReached(
  contractAddress: string, 
  currentParticipants: number,
  marketType: string = 'market',
  participantAddresses: string[] = []
) {
  try {
    console.log(`🎯 Sending minimum players reached notification for ${contractAddress}: ${currentParticipants} participants`);
    
    // Check if we've already sent a minimum players reached announcement for this contract
    // Use database flag for robust deduplication
    const potInfo = await db
      .select({ announcementSent: PotInformation.announcementSent })
      .from(PotInformation)
      .where(eq(PotInformation.contractAddress, contractAddress))
      .limit(1);
    
    if (potInfo.length > 0 && potInfo[0].announcementSent) {
      console.log(`🔄 Minimum players notification already sent for contract ${contractAddress} - skipping duplicate (database flag)`);
      return {
        isDuplicate: true,
        message: "Minimum players notification already sent for this contract (database flag)",
        existingFlag: true
      };
    }
    
    // Function to get next calendar day in UTC
    const getNextCalendarDayUTC = (): string => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCDate(now.getUTCDate() + 1);
      
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'UTC'
      };
      
      return tomorrow.toLocaleDateString('en-US', options);
    };

    const nextDay = getNextCalendarDayUTC();
    const message = currentParticipants === 2
      ? `🎉 Great news! Your pot is ready with ${currentParticipants} participants! Starting on ${nextDay} when the pot officially begins.`
      : `🎉 Awesome! Your ${marketType} pot is ready with ${currentParticipants} participants! Starting on ${nextDay} when the pot officially begins.`;
    
    // Create the announcement directly since we've already checked for duplicates
    const announcementResult = await createContractAnnouncement(message, contractAddress);
    console.log(`✅ Minimum players notification sent successfully (${currentParticipants} participants)`);
    
    // Set the announcement flag to prevent future duplicates
    // Use upsert pattern - either update existing record or create new one
    if (potInfo.length > 0) {
      // Update existing pot info
      await db
        .update(PotInformation)
        .set({ announcementSent: true })
        .where(eq(PotInformation.contractAddress, contractAddress));
      console.log(`🎯 Updated announcementSent flag for existing pot info`);
    } else {
      // Create new pot info record with announcement flag set
      await db
        .insert(PotInformation)
        .values({
          contractAddress,
          announcementSent: true,
          hasStarted: false,
          isFinalDay: false
        });
      console.log(`🎯 Created new pot info record with announcementSent flag`);
    }
    
    const result = {
      isDuplicate: false,
      message: "New minimum players notification created successfully",
      newAnnouncement: announcementResult[0],
      flagSet: true
    };
    
    // Send email notifications to participants if addresses are provided (only for new announcements)
    if (!result.isDuplicate) {
      console.log(`📧 Email notification check: ${participantAddresses.length} participant addresses provided for ${currentParticipants} participants`);
      console.log(`📧 Data freshness: ${participantAddresses.length < currentParticipants ? '❌ STALE (missing participants)' : '✅ FRESH'}`);
    } else {
      console.log(`📧 Skipping email notifications - announcement already sent previously`);
    }
    
    if (!result.isDuplicate && participantAddresses && participantAddresses.length > 0) {
      try {
        console.log(`📧 Attempting to send email notifications to ${participantAddresses.length} participants`);
        
        // Get email addresses for participants
        console.log(`📧 Attempting to get emails for ${participantAddresses.length} participants:`, participantAddresses);
        const emails = await getParticipantEmails(participantAddresses);
        
        console.log(`📧 Found ${emails.length} email addresses:`, emails.length > 0 ? emails : 'none');
        
        if (emails.length > 0) {
          // Send email notifications using the existing email function
          console.log(`📧 Sending email notifications to ${emails.length} participants with emails`);
          const emailResult = await sendMinimumPlayersEmail(emails, currentParticipants, marketType);
          
          console.log(`📧 Email notification result:`, emailResult);
          if (!emailResult.success) {
            console.error(`📧 Email sending failed:`, emailResult.errors);
          }
        } else {
          console.log(`📧 No email addresses found for ${participantAddresses.length} participants - check if users have provided emails in their profiles`);
        }
      } catch (emailError) {
        console.error("❌ Error sending email notifications:", emailError);
        // Don't let email errors affect the main notification flow
      }
    }
    
    return result;
  } catch (error) {
    console.error("❌ Error sending minimum players notification:", error);
    return { isDuplicate: false, error: error instanceof Error ? error.message : 'Unknown error' };
    // Don't throw - notifications failing shouldn't break main flow
  }
}

// ==========================================
// CLEANUP FUNCTIONS
// ==========================================

/**
 * Automatically cleans up old announcements (older than 60 days)
 * Call this periodically or from admin panel
 */
export async function cleanupOldAnnouncements() {
  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const result = await db
      .delete(Messages)
      .where(
        and(
          eq(Messages.from, SYSTEM_ANNOUNCEMENT_SENDER),
          sql`${Messages.datetime} < ${sixtyDaysAgo.toISOString()}`
        )
      );
      
    console.log(`🧹 Cleaned up old announcements older than 60 days`);
    return result;
  } catch (error) {
    console.error("❌ Error cleaning up old announcements:", error);
    throw new Error("Failed to cleanup old announcements");
  }
}

/**
 * Gets announcement statistics for admin monitoring
 */
export async function getAnnouncementStats() {
  try {
    // Count global announcements
    const globalCount = await db
      .select({ count: sql`count(*)` })
      .from(Messages)
      .where(
        and(
          eq(Messages.from, SYSTEM_ANNOUNCEMENT_SENDER),
          eq(Messages.to, ANNOUNCEMENT_RECIPIENT)
        )
      );
      
    // Count contract announcements
    const contractCount = await db
      .select({ count: sql`count(*)` })
      .from(Messages)
      .where(
        and(
          eq(Messages.from, SYSTEM_ANNOUNCEMENT_SENDER),
          eq(Messages.to, CONTRACT_PARTICIPANTS)
        )
      );
      
    // Count recent announcements (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentCount = await db
      .select({ count: sql`count(*)` })
      .from(Messages)
      .where(
        and(
          eq(Messages.from, SYSTEM_ANNOUNCEMENT_SENDER),
          sql`${Messages.datetime} > ${sevenDaysAgo.toISOString()}`
        )
      );
    
    return {
      globalAnnouncements: Number(globalCount[0]?.count) || 0,
      contractAnnouncements: Number(contractCount[0]?.count) || 0,
      recentAnnouncements: Number(recentCount[0]?.count) || 0,
      totalAnnouncements: (Number(globalCount[0]?.count) || 0) + (Number(contractCount[0]?.count) || 0)
    };
  } catch (error) {
    console.error("❌ Error getting announcement stats:", error);
    return {
      globalAnnouncements: 0,
      contractAnnouncements: 0,
      recentAnnouncements: 0,
      totalAnnouncements: 0
    };
  }
}

// ========== EMAIL MANAGEMENT ==========

/**
 * Check if a user has an email address stored
 */
export async function getUserEmail(walletAddress: string) {
  try {
    if (!walletAddress) {
      return null;
    }

    const result = await db.select({ 
      email: UsersTable.email
    })
    .from(UsersTable)
    .where(eq(UsersTable.walletAddress, walletAddress.toLowerCase()))
    .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error("❌ Error getting user email:", error);
    return null;
  }
}

/**
 * Save or update a user's email address
 */
export async function saveUserEmail(walletAddress: string, email: string) {
  try {
    if (!walletAddress || !email) {
      return { success: false, error: "Invalid wallet address or email" };
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: "Invalid email format" };
    }

    // Comprehensive email sanitization
    const sanitizedWalletAddress = walletAddress.toLowerCase().trim();
    const sanitizedEmail = email
      .trim()
      .toLowerCase()
      .replace(/[<>"\\'`]/g, '') // Remove dangerous characters
      .substring(0, 254); // Limit length (email standard max is 254)

    // Validate sanitized email still matches regex
    if (!emailRegex.test(sanitizedEmail)) {
      return { success: false, error: "Invalid email format after sanitization" };
    }

    // Try to update existing user or create new user
    const result = await db.select()
      .from(UsersTable)
      .where(eq(UsersTable.walletAddress, sanitizedWalletAddress))
      .limit(1);

    if (result.length > 0) {
      // Update existing user
      await db.update(UsersTable)
        .set({ email: sanitizedEmail })
        .where(eq(UsersTable.walletAddress, sanitizedWalletAddress));
    } else {
      // Create new user
      await db.insert(UsersTable).values({
        walletAddress: sanitizedWalletAddress,
        email: sanitizedEmail
      });
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Error saving user email:", error);
    return { success: false, error: "Failed to save email" };
  }
}


