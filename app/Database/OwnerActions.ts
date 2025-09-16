"use server";

import { WrongPredictions, WrongPredictionsCrypto, FeaturedBets, CryptoBets, StocksBets, MusicBets, LivePredictions, LiveQuestions, UsersTable, MarketOutcomes, EvidenceSubmissions, PotInformation, UserPredictionHistory } from "../Database/schema";
import { eq, inArray, lt, asc, sql, and } from "drizzle-orm";
import { getBetsTableName, getWrongPredictionsTableFromType, getTableFromType, TableType, CONTRACT_TO_TABLE_MAPPING, PENALTY_EXEMPT_CONTRACTS } from "./config";
import { db, readDb, getDbForWrite, getDbForRead } from "./db";

// Test database connectivity
export async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Simple connectivity test
    const testQuery = await getDbForRead().select().from(FeaturedBets).limit(1);
    console.log('✅ Database connection successful');

    // Check if MarketOutcomes table exists
    try {
      const marketOutcomesTest = await getDbForRead().select().from(MarketOutcomes).limit(1);
      console.log('✅ MarketOutcomes table exists and accessible');
      return { success: true, message: 'Database and MarketOutcomes table accessible' };
    } catch (tableError) {
      console.error('❌ MarketOutcomes table issue:', tableError);
      return { success: false, message: `MarketOutcomes table error: ${tableError instanceof Error ? tableError.message : 'Unknown table error'}` };
    }
  } catch (dbError) {
    console.error('❌ Database connection failed:', dbError);
    return { success: false, message: `Database connection failed: ${dbError instanceof Error ? dbError.message : 'Unknown connection error'}` };
  }
}

/**
 * Sets the provisional outcome with 1-hour evidence window.
 * @param outcome - Either "positive" or "negative".
 * @param tableType - Table type ('featured' or 'crypto').
 */

/**
 * Sets the final outcome and processes winners immediately.
 * Only handles actual wrong predictions - non-predictor penalties are handled at page level.
 * @param outcome - Either "positive" or "negative".
 * @param tableType - Table type ('featured' or 'crypto').
 * @param targetDate - Optional: YYYY-MM-DD format. If not provided, uses today's date.
 */





export async function setProvisionalOutcome(
  outcome: "positive" | "negative",
  tableType: string,
  questionName: string, // "Bitcoin", "Ethereum", "Tesla", etc.
  outcomeDate?: string
) {
  // Add input validation
  if (!outcome || !tableType) {
    throw new Error(`Invalid parameters: outcome=${outcome}, tableType=${tableType}`);
  }
  
  if (!['positive', 'negative'].includes(outcome)) {
    throw new Error(`Invalid outcome: ${outcome}. Must be 'positive' or 'negative'`);
  }
  
  if (!['featured', 'crypto', 'live'].includes(tableType)) {
    throw new Error(`Invalid tableType: ${tableType}. Must be 'featured', 'crypto', or 'live'`);
  }

  // Check database connection
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const now = Date.now(); // Use timestamp instead of Date object
  const today = new Date(now);
  const targetDate = outcomeDate || today.toISOString().split('T')[0]; // YYYY-MM-DD format
  
  // Calculate 1-hour evidence window expiry
  const evidenceWindowExpires = new Date(now + 60 * 60 * 1000); // 1 hour from now

  try {
    console.log(`🟡 Setting provisional outcome for ${tableType}: ${outcome} on ${targetDate}`);
    console.log(`🟡 Evidence window expires at: ${evidenceWindowExpires.toISOString()}`);
    console.log(`🟡 Database URL exists:`, !!process.env.DATABASE_URL);

    // Check if there's already an outcome for this market and date
    console.log(`🔍 Checking for existing outcome...`);
    let existingOutcome;
    try {
      existingOutcome = await db.select()
        .from(MarketOutcomes)
        .where(and(
          eq(MarketOutcomes.marketType, tableType),
          eq(MarketOutcomes.questionName, questionName),
          eq(MarketOutcomes.outcomeDate, targetDate)
        ));
      console.log(`✅ Successfully queried existing outcomes. Found: ${existingOutcome.length}`);
    } catch (selectError) {
      console.error(`❌ Error selecting from MarketOutcomes:`, selectError);
      throw new Error(`Database select failed: ${selectError instanceof Error ? selectError.message : 'Unknown select error'}`);
    }

    if (existingOutcome.length > 0) {
      // Update existing outcome
      console.log(`🔄 Updating existing outcome with ID: ${existingOutcome[0].id}`);
      try {
        const result = await db.update(MarketOutcomes)
          .set({
            provisionalOutcome: outcome,
            provisionalOutcomeSetAt: today,
            evidenceWindowExpires: evidenceWindowExpires,
            isDisputed: false // Reset dispute status
          })
          .where(eq(MarketOutcomes.id, existingOutcome[0].id));

        console.log(`✅ Updated existing provisional outcome for ${tableType} on ${targetDate}`);
        return { success: true, message: `Updated existing provisional outcome for ${tableType}` };
      } catch (updateError) {
        console.error(`❌ Error updating MarketOutcomes:`, updateError);
        throw new Error(`Database update failed: ${updateError instanceof Error ? updateError.message : 'Unknown update error'}`);
      }
    } else {
      // Insert new outcome record
      console.log(`➕ Creating new outcome record...`);
      try {
        const result = await db.insert(MarketOutcomes).values({
          marketType: tableType,
          questionName: questionName,
          outcomeDate: targetDate,
          provisionalOutcome: outcome,
          evidenceWindowExpires: evidenceWindowExpires,
          isDisputed: false
        });

        console.log(`✅ Created new provisional outcome for ${tableType} on ${targetDate}. Evidence window expires at: ${evidenceWindowExpires.toISOString()}`);
        return { success: true, message: `Created new provisional outcome for ${tableType}` };
      } catch (insertError) {
        console.error(`❌ Error inserting into MarketOutcomes:`, insertError);
        throw new Error(`Database insert failed: ${insertError instanceof Error ? insertError.message : 'Unknown insert error'}`);
      }
    }
  } catch (error) {
    console.error(`❌ Error setting provisional outcome for ${tableType}:`, error);
    console.error(`❌ Error details:`, {
      outcome,
      tableType,
      targetDate,
      evidenceWindowExpires: evidenceWindowExpires.toISOString(),
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw new Error(`Failed to set provisional outcome for ${tableType}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getProvisionalOutcome(tableType: string, questionName: string, outcomeDate?: string) {
  const targetDate = outcomeDate || new Date().toISOString().split('T')[0]; // Today if no date provided
  
  try {
    // Get outcome record for the specified market type, question, and date
    const result = await db.select()
      .from(MarketOutcomes)
      .where(and(
        eq(MarketOutcomes.marketType, tableType),
        eq(MarketOutcomes.questionName, questionName),
        eq(MarketOutcomes.outcomeDate, targetDate)
      ))
      .limit(1);

    if (result.length === 0) {
      return null; // No provisional outcome set
    }

    const outcomeData = result[0];
    const now = new Date();
    const evidenceExpiry = new Date(outcomeData.evidenceWindowExpires);
    const isWindowActive = now < evidenceExpiry;

    return {
      outcome: outcomeData.provisionalOutcome as 'positive' | 'negative',
      setAt: outcomeData.provisionalOutcomeSetAt.toISOString(), // Convert to string
      evidenceWindowExpires: evidenceExpiry.toISOString(), // Convert to string
      isEvidenceWindowActive: isWindowActive,
      finalOutcome: outcomeData.finalOutcome as 'positive' | 'negative' | null,
      isDisputed: outcomeData.isDisputed
    };
  } catch (error) {
    console.error(`Error getting provisional outcome for ${tableType}:`, error);
    throw new Error(`Failed to get provisional outcome for ${tableType}: ${error}`);
  }
}

export async function setDailyOutcome(
  outcome: "positive" | "negative",
  tableType: string,
  questionName: string, // "Bitcoin", "Ethereum", "Tesla", etc.
  targetDate?: string, // Optional: YYYY-MM-DD format. If not provided, uses today's date
  contractParticipants: string[] = [] // Optional: Contract participants for penalty-exempt contracts
): Promise<void> {
  // Call the enhanced version but don't return the statistics (for backward compatibility)
  await setDailyOutcomeWithStats(outcome, tableType, questionName, targetDate, contractParticipants);
}

/**
 * Sets the final outcome and returns detailed statistics about eliminated users.
 * This enhanced version provides accurate counts for announcement purposes.
 */
export async function setDailyOutcomeWithStats(
  outcome: "positive" | "negative",
  tableType: string,
  questionName: string, // "Bitcoin", "Ethereum", "Tesla", etc.
  targetDate?: string, // Optional: YYYY-MM-DD format. If not provided, uses today's date
  contractParticipants: string[] = [] // Optional: Contract participants for penalty-exempt contracts
): Promise<{
  eliminatedCount: number;
  totalParticipants: number;
  correctPredictors: number;
  targetDate: string;
}> {
  const opposite = outcome === "positive" ? "negative" : "positive";
  const betsTable = getTableFromType(tableType);
  const wrongPredictionTable = getWrongPredictionsTableFromType(tableType);

  // Get contract address from table type to fetch isFinalDay from PotInformation
  const contractAddress = Object.keys(CONTRACT_TO_TABLE_MAPPING).find(
    addr => CONTRACT_TO_TABLE_MAPPING[addr as keyof typeof CONTRACT_TO_TABLE_MAPPING] === tableType
  );

  let isFinalDay = false;
  if (contractAddress) {
    try {
      const potInfo = await db.select().from(PotInformation)
        .where(eq(PotInformation.contractAddress, contractAddress.toLowerCase()))
        .limit(1);
      
      if (potInfo.length > 0) {
        isFinalDay = potInfo[0].isFinalDay;
        console.log(`📅 Final day status for ${tableType}: ${isFinalDay}`);
      } else {
        console.log(`⚠️ No pot information found for ${tableType} (${contractAddress}), defaulting to non-final day`);
      }
    } catch (potInfoError) {
      console.error(`Error fetching pot information for ${tableType}:`, potInfoError);
    }
  } else {
    console.log(`⚠️ No contract address found for table type ${tableType}, defaulting to non-final day`);
  }

  try {
    // First, update the MarketOutcomes table to mark this as the final outcome
    const now = Date.now();
    const today = new Date(now);
    const finalTargetDate = targetDate || today.toISOString().split('T')[0]; // Use provided date or default to today
    
    console.log(`🔴 Setting final outcome for ${tableType}: ${outcome} on ${finalTargetDate}`);
    
    // Check if there's an existing outcome for this market, question, and date
    const existingOutcome = await db.select()
      .from(MarketOutcomes)
      .where(and(
        eq(MarketOutcomes.marketType, tableType),
        eq(MarketOutcomes.questionName, questionName),
        eq(MarketOutcomes.outcomeDate, finalTargetDate)
      ));

    if (existingOutcome.length > 0) {
      // Update existing outcome to mark it as final
      await db.update(MarketOutcomes)
        .set({
          finalOutcome: outcome,
          finalOutcomeSetAt: today,
        })
        .where(eq(MarketOutcomes.id, existingOutcome[0].id));
      
      console.log(`✅ Updated existing outcome to final for ${tableType} on ${finalTargetDate}`);
    } else {
      // Create new outcome record (shouldn't happen in normal flow, but just in case)
      console.warn(`⚠️ No existing provisional outcome found, creating final outcome directly`);
      await db.insert(MarketOutcomes).values({
        marketType: tableType,
        questionName: questionName,
        outcomeDate: finalTargetDate,
        provisionalOutcome: outcome,
        finalOutcome: outcome,
        finalOutcomeSetAt: today,
        evidenceWindowExpires: today, // Set to now since it's final
        isDisputed: false
      });
    }
    // Get all users who made predictions for the target date
    const allPredictors = await db
      .select({ walletAddress: betsTable.walletAddress })
      .from(betsTable)
      .where(eq(betsTable.betDate, finalTargetDate));

    // Get all wrong predictions for the target date
    const allWrongBets = await db
      .select()
      .from(betsTable)
      .where(and(
        eq(betsTable.prediction, opposite),
        eq(betsTable.betDate, finalTargetDate)
      ));

    // Process wrong predictions (users who predicted incorrectly)
    // Note: Non-predictor penalties are now handled at the page level via checkMissedPredictionPenalty()
    if (allWrongBets.length > 0) {
      console.log(`❌ Processing ${allWrongBets.length} wrong predictions for ${finalTargetDate}`);
      
      const wrongPredictionDate = finalTargetDate;
      
      const wrongAddresses = allWrongBets.map(bet => ({
        walletAddress: bet.walletAddress.toLowerCase(), // Normalize wallet address for consistency
        wrongPredictionDate: wrongPredictionDate,
      }));

      await db
        .insert(wrongPredictionTable)
        .values(wrongAddresses)
        .onConflictDoNothing();

      if (wrongAddresses.length > 0) {
        await db
          .delete(betsTable)
          .where(
            inArray(betsTable.walletAddress, wrongAddresses.map(w => w.walletAddress))
          );
      }
    } else {
      console.log(`✅ No wrong predictions found for ${finalTargetDate}`);
    }

    // For penalty-exempt contracts, also eliminate non-predictors when setting daily outcome
    // This is needed because these contracts don't use checkMissedPredictionPenalty
    if (contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress) && contractParticipants.length > 0) {
      console.log(`🎯 Processing non-predictors for penalty-exempt contract: ${contractAddress}`);
      console.log(`📊 Contract participants: ${contractParticipants.length}, Predictors: ${allPredictors.length}`);

      try {
        // Find non-predictors: participants who are in the contract but didn't make predictions
        const predictorAddresses = allPredictors.map(p => p.walletAddress.toLowerCase());
        const nonPredictors = contractParticipants.filter(participant =>
          !predictorAddresses.includes(participant.toLowerCase())
        );

        if (nonPredictors.length > 0) {
          console.log(`🚫 Found ${nonPredictors.length} non-predictors to eliminate for ${finalTargetDate}`);

          const nonPredictorRecords = nonPredictors.map(address => ({
            walletAddress: address.toLowerCase(),
            wrongPredictionDate: finalTargetDate,
          }));

          // Add non-predictors to wrong predictions table
          await db
            .insert(wrongPredictionTable)
            .values(nonPredictorRecords)
            .onConflictDoNothing();

          console.log(`✅ Successfully eliminated ${nonPredictors.length} non-predictors for penalty-exempt contract`);
        } else {
          console.log(`✅ No non-predictors found for penalty-exempt contract ${contractAddress}`);
        }

      } catch (contractError) {
        console.error(`❌ Error processing non-predictors for exempt contract ${contractAddress}:`, contractError);
      }
    } else if (contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress) && contractParticipants.length === 0) {
      console.log(`⚠️ Penalty-exempt contract ${contractAddress} detected but no participants provided - skipping non-predictor elimination`);
    }
    
    // Only clear ALL predictions on non-final days
    // On final day, keep correct predictions for winner determination
    if (!isFinalDay) {
      // Clear ALL processed predictions for the target date (both right and wrong have been handled)
      if (allPredictors.length > 0) {
        await db
          .delete(betsTable)
          .where(and(
            inArray(betsTable.walletAddress, allPredictors.map(p => p.walletAddress)),
            eq(betsTable.betDate, finalTargetDate)
          ));
      } else {
        console.log(`No predictions found for target date ${finalTargetDate} - nothing to clear`);
      }
    } else {
      // Final day: Keep correct predictions, but wrong predictions were already deleted above
      console.log("Final day detected - keeping correct predictions in table for winner determination");
      console.log(`Wrong predictions for ${finalTargetDate} have been cleared, correct predictions remain`);
    }
    
    // Calculate statistics for return
    const eliminatedCount = allWrongBets.length;
    const totalParticipants = allPredictors.length;
    const correctPredictors = totalParticipants - eliminatedCount;
    
    console.log(`📊 Outcome Statistics: ${eliminatedCount} eliminated, ${correctPredictors} correct out of ${totalParticipants} total`);
    
    // Return detailed statistics
    return {
      eliminatedCount,
      totalParticipants,
      correctPredictors,
      targetDate: finalTargetDate
    };
      
  } catch (error) {
    console.error("Error processing outcome:", error);
    throw new Error("Failed to set daily outcome");
  }
}

/**
 * Checks if a user is eligible to bet.
 * @param address - Wallet address.
 * @param betsTable - Table to use instead of BitcoinBets (must match its shape).
 */
export async function canUserBet(
  address: string,
  typeTable: string
): Promise<boolean> {
  // Normalize wallet address for consistency
  const normalizedAddress = address.toLowerCase();
  
  const betsTable = getTableFromType(typeTable);
  const wrongPredictionTable = getWrongPredictionsTableFromType(typeTable);
  const [alreadyBet, isWrong] = await Promise.all([
    db.select().from(betsTable).where(eq(betsTable.walletAddress, normalizedAddress)),
    db.select().from(wrongPredictionTable).where(eq(wrongPredictionTable.walletAddress, normalizedAddress)),
  ]);

  return alreadyBet.length === 0 && isWrong.length === 0;
}

/**
 * Clears all wrong predictions.
 */
export async function clearWrongPredictions(tableType: string) {
  try {
    console.log(`🧹 Starting clearWrongPredictions for tableType: ${tableType}`);
    const wrongPredictionTable = getWrongPredictionsTableFromType(tableType);
    const betsTable = getTableFromType(tableType);
    
    console.log(`🗑️ Clearing wrong predictions table...`);
    const wrongPredictionsResult = await db.delete(wrongPredictionTable);
    console.log(`✅ Cleared wrong predictions table, affected rows:`, wrongPredictionsResult);
    
    console.log(`🗑️ Clearing bets table (${tableType})...`);
    const betsTableResult = await db.delete(betsTable);
    console.log(`✅ Cleared bets table, affected rows:`, betsTableResult);
    
    console.log(`🎉 Successfully cleared both tables for ${tableType}`);
  } catch (err) {
    console.error("❌ Failed to clear tables", err);
    throw new Error("Could not clear wrong predictions");
  }
}

/**
 * Gets the wallet addresses of users who are still in the game.
 * Only considers participants who are BOTH in the pot AND made predictions.
 * Note: Non-predictor elimination is now handled in setDailyOutcome().
 * @param typeTable - Table type ('featured' or 'crypto')
 * @param contractParticipants - Array of wallet addresses currently in the pot contract
 */
export async function determineWinners(typeTable: string, contractParticipants: string[] = []) {
  try {
    const betsTable = getTableFromType(typeTable);
    
    // Get all users who made predictions
    const allPredictors = await db
      .select({ walletAddress: betsTable.walletAddress })
      .from(betsTable);

    // If no contract participants provided, fall back to old behavior (for backward compatibility)
    if (contractParticipants.length === 0) {
      console.warn("No contract participants provided - using old logic (potential exploit!)");
      return allPredictors.map(w => w.walletAddress).join(",");
    }

    // Normalize addresses to lowercase for comparison
    const normalizedParticipants = contractParticipants.map(addr => addr.toLowerCase());
    
    // Filter to only include predictors who are also pot participants
    const eligibleWinners = allPredictors.filter(predictor => 
      normalizedParticipants.includes(predictor.walletAddress.toLowerCase())
    );


    return eligibleWinners.map(w => w.walletAddress).join(",");
  } catch (error) {
    console.error("Error determining winners:", error);
    throw new Error("Failed to determine winners");
  }
}

/**
 * Gets the wallet addresses of users who made correct live predictions.
 * This function should be called after manually determining the correct answer for the live question.
 * Also rotates to the next question by removing the current one and generating a new one.
 * @param correctAnswer - Either "positive" or "negative" - the correct answer for the live question
 */
export async function determineWinnersLive(correctAnswer: "positive" | "negative", questionName: string = "Live Question") {
  try {
    // First, update the MarketOutcomes table to mark this as the final outcome
    const now = Date.now();
    const today = new Date(now);
    const targetDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log(`🔴 Setting final outcome for live: ${correctAnswer} on ${targetDate}`);
    
    // Check if there's an existing outcome for this market, question, and date
    const existingOutcome = await db.select()
      .from(MarketOutcomes)
      .where(and(
        eq(MarketOutcomes.marketType, 'live'),
        eq(MarketOutcomes.questionName, questionName),
        eq(MarketOutcomes.outcomeDate, targetDate)
      ));

    if (existingOutcome.length > 0) {
      // Update existing outcome to mark it as final
      await db.update(MarketOutcomes)
        .set({
          finalOutcome: correctAnswer,
          finalOutcomeSetAt: today,
        })
        .where(eq(MarketOutcomes.id, existingOutcome[0].id));
      
      console.log(`✅ Updated existing outcome to final for live on ${targetDate}`);
    } else {
      // Create new outcome record (shouldn't happen in normal flow, but just in case)
      console.warn(`⚠️ No existing provisional outcome found for live, creating final outcome directly`);
      await db.insert(MarketOutcomes).values({
        marketType: 'live',
        questionName: questionName,
        outcomeDate: targetDate,
        provisionalOutcome: correctAnswer,
        finalOutcome: correctAnswer,
        finalOutcomeSetAt: today,
        evidenceWindowExpires: today, // Set to now since it's final
        isDisputed: false
      });
    }
    
    console.log(`Looking for winners with prediction: ${correctAnswer}`);
    
    // Get all users who predicted correctly (no date filtering)
    const winners = await db
      .select({ walletAddress: LivePredictions.walletAddress })
      .from(LivePredictions)
      .where(eq(LivePredictions.prediction, correctAnswer));

    console.log(`Found ${winners.length} winners for ${correctAnswer} prediction`);

    // After determining winners, rotate to next question
    await rotateToNextQuestion();

    return winners.map(w => w.walletAddress).join(",");
  } catch (error) {
    console.error("Error determining live prediction winners:", error);
    throw new Error("Failed to determine live prediction winners");
  }
}

/**
 * Rotates to the next question by removing the current (oldest) question and generating a new one
 */
async function rotateToNextQuestion() {
  try {
    // Get all questions ordered by creation time (oldest first)
    const allQuestions = await db
      .select()
      .from(LiveQuestions)
      .orderBy(asc(LiveQuestions.id));
    
    
    // Remove the oldest question if we have more than 1
    if (allQuestions.length > 1) {
      const questionToDelete = allQuestions[0];
      
      await db
        .delete(LiveQuestions)
        .where(eq(LiveQuestions.id, questionToDelete.id));
      
    } else {
      console.log('Question rotation: Only 1 question found, keeping it and adding another');
    }
    
    // Generate one new question to maintain supply
    const { generateQuestionBatch } = await import('../Services/questionGenerator');
    const questionBatch: { question: string }[] = await generateQuestionBatch(1);
    
    if (questionBatch.length > 0) {
      await db
        .insert(LiveQuestions)
        .values({
          question: questionBatch[0].question,
        });
      
      console.log(`Question rotation: Generated new question: "${questionBatch[0].question}"`);
    }
    
    const finalCount = await db
      .select()
      .from(LiveQuestions)
      .then(result => result.length);
    
    
  } catch (error) {
    console.error('Error during question rotation:', error);
    throw new Error('Failed to rotate to next question');
  }
}

/**
 * Clears all live predictions (no date filtering - matches the determineWinnersLive logic)
 */
export async function clearLivePredictions() {
  try {
    // Clear ALL predictions (no date filtering)
    await db
      .delete(LivePredictions);
      
    console.log("Cleared all live predictions");
  } catch (error) {
    console.error("Failed to clear live predictions:", error);
    throw new Error("Could not clear live predictions");
  }
}

/**
 * Clears market outcome for live predictions after pot distribution
 */
export async function clearLiveMarketOutcome(questionName: string = "Live Question") {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log(`🗑️ Clearing live market outcome for ${today}`);
    
    // Clear market outcome for live table type and specific question
    const result = await db
      .delete(MarketOutcomes)
      .where(and(
        eq(MarketOutcomes.marketType, 'live'),
        eq(MarketOutcomes.questionName, questionName),
        eq(MarketOutcomes.outcomeDate, today)
      ));
    
    console.log(`✅ Cleared live market outcome, affected rows:`, result);
  } catch (error) {
    console.error("❌ Failed to clear live market outcome:", error);
    throw new Error("Could not clear live market outcome");
  }
}

/**
 * Clears all evidence submissions for live predictions after pot distribution
 */
export async function clearLiveEvidenceSubmissions() {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    console.log(`🗑️ Clearing live evidence submissions for ${today}`);
    
    // Clear evidence submissions for live table type
    const result = await db
      .delete(EvidenceSubmissions)
      .where(and(
        eq(EvidenceSubmissions.marketType, 'live'),
        eq(EvidenceSubmissions.outcomeDate, today)
      ));
    
    console.log(`✅ Cleared live evidence submissions, affected rows:`, result);
  } catch (error) {
    console.error("❌ Failed to clear live evidence submissions:", error);
    throw new Error("Could not clear live evidence submissions");
  }
}

/**
 * Updates winner statistics after a pot is distributed
 * This should be called AFTER the smart contract distributes the pot
 * @param winnerAddresses - Array of winner wallet addresses (from determineWinners)
 * @param potAmountPerWinner - Amount each winner received in ETH wei (18 decimals)
 */
export async function updateWinnerStats(winnerAddresses: string[], potAmountPerWinner: bigint) {
  try {
    console.log(`🔍 updateWinnerStats called with:`, { 
      winnerAddresses, 
      potAmountPerWinner: potAmountPerWinner.toString(),
      potAmountPerWinnerNumber: Number(potAmountPerWinner)
    });
    console.log(`Updating stats for ${winnerAddresses.length} winners, ${potAmountPerWinner} ETH wei each`);
    
    // Ensure we have an array of addresses
    const addresses = Array.isArray(winnerAddresses) ? winnerAddresses : [];
    
    if (addresses.length === 0) {
      console.warn(`⚠️ No addresses provided to updateWinnerStats`);
      return false;
    }
    
    console.log(`📍 Processing addresses:`, addresses);
    
    for (let i = 0; i < addresses.length; i++) {
      const address = addresses[i];
      if (!address || typeof address !== 'string' || address.trim() === '') {
        console.log(`⚠️ Skipping invalid address at index ${i}:`, address);
        continue;
      }
      
      console.log(`📝 Updating stats for address ${i + 1}/${addresses.length}: ${address}`);
      
      // Normalize wallet address to lowercase for consistency with profile image saving
      const normalizedAddress = address.toLowerCase().trim();
      
      // First check if user exists
      const existingUser = await db
        .select()
        .from(UsersTable)
        .where(eq(UsersTable.walletAddress, normalizedAddress))
        .limit(1);
      
      console.log(`🔍 User lookup for ${normalizedAddress}:`, existingUser);
      
      let result;
      if (existingUser.length > 0) {
        // Update existing user
        console.log(`📝 User ${normalizedAddress} exists, current pots won: ${existingUser[0].potsWon}, updating stats...`);
        
        // Get current values for logging
        const currentPotsWon = existingUser[0].potsWon || 0;
        const currentEarnings = existingUser[0].totalEarningsETH || BigInt(0);
        
        result = await db
          .update(UsersTable)
          .set({
            potsWon: currentPotsWon + 1, // Direct increment instead of SQL expression
            totalEarningsETH: currentEarnings + potAmountPerWinner, // Direct addition instead of SQL expression
          })
          .where(eq(UsersTable.walletAddress, normalizedAddress))
          .returning();
          
        console.log(`📊 Updated from potsWon: ${currentPotsWon} → ${currentPotsWon + 1}`);
      } else {
        // Insert new user
        console.log(`📝 User ${normalizedAddress} doesn't exist, creating new entry...`);
        result = await db
          .insert(UsersTable)
          .values({
            walletAddress: normalizedAddress,
            potsWon: 1,
            totalEarningsETH: potAmountPerWinner,
          })
          .returning();
          
        console.log(`📊 Created new user with potsWon: 1`);
      }
      
      console.log(`✅ Database result for user ${address}:`, result);
      
      // Verify the update worked by checking the database
      const verifyUpdate = await db
        .select()
        .from(UsersTable)
        .where(eq(UsersTable.walletAddress, normalizedAddress))
        .limit(1);
        
      console.log(`🔍 Verification query after update:`, verifyUpdate);
    }
    
    console.log(`✅ Successfully updated winner stats for ${addresses.length} users`);
    return true;
  } catch (error) {
    console.error("❌ Error updating winner stats:", error);
    console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    throw new Error(`Failed to update winner stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Gets user stats for debugging purposes
 * @param walletAddress - User's wallet address
 */
export async function getUserStats(walletAddress: string) {
  try {
    const normalizedAddress = walletAddress.toLowerCase().trim();
    
    const userStats = await db
      .select()
      .from(UsersTable)
      .where(eq(UsersTable.walletAddress, normalizedAddress))
      .limit(1);
    
    console.log(`📊 User stats for ${walletAddress}:`, userStats);
    
    if (userStats.length === 0) {
      return { found: false, address: normalizedAddress };
    }
    
    return { 
      found: true, 
      address: normalizedAddress,
      potsWon: userStats[0].potsWon,
      totalEarningsETH: userStats[0].totalEarningsETH.toString(),
      imageUrl: userStats[0].imageUrl,
      collectedAt: userStats[0].collectedAt
    };
  } catch (error) {
    console.error("Error getting user stats:", error);
    return { found: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Gets all wrong predictions for a specific market type (to remove from contract)
 * @param tableType - Table type ('featured' or 'crypto')
 */
export async function getWrongPredictions(tableType: string): Promise<string[]> {
  try {
    const wrongPredictionTable = getWrongPredictionsTableFromType(tableType);
    const wrongPredictions = await db
      .select({ walletAddress: wrongPredictionTable.walletAddress })
      .from(wrongPredictionTable);
    
    return wrongPredictions.map(wp => wp.walletAddress);
  } catch (error) {
    console.error("Error getting wrong predictions:", error);
    return [];
  }
}

/**
 * Resets pot information and clears user prediction history for a specific contract address
 * @param contractAddress - The contract address to reset data for
 */
export async function clearPotInformation(contractAddress: string): Promise<boolean> {
  try {
    console.log(`🔄 Starting clearPotInformation for contract: ${contractAddress}`);
    console.log(`🔍 Contract address type: ${typeof contractAddress}, length: ${contractAddress.length}`);
    
    // Normalize contract address to match database format (check both cases)
    const normalizedAddress = contractAddress.toLowerCase();
    const upperCaseAddress = contractAddress.toUpperCase();
    
    console.log(`🔍 Normalized addresses - Lower: ${normalizedAddress}, Upper: ${upperCaseAddress}`);
    
    // First, check what pot information records exist for debugging
    console.log(`🔍 Checking existing pot information records...`);
    const allPotInfo = await db.select().from(PotInformation);
    console.log(`📊 All pot information records:`, allPotInfo);
    console.log(`📊 Total pot information records: ${allPotInfo.length}`);
    
    // Check for exact match
    const exactMatch = allPotInfo.find(record => record.contractAddress === contractAddress);
    const lowerMatch = allPotInfo.find(record => record.contractAddress.toLowerCase() === normalizedAddress);
    const upperMatch = allPotInfo.find(record => record.contractAddress.toUpperCase() === upperCaseAddress);
    
    console.log(`🎯 Exact match found:`, !!exactMatch);
    console.log(`🎯 Lower case match found:`, !!lowerMatch);
    console.log(`🎯 Upper case match found:`, !!upperMatch);
    
    if (exactMatch) {
      console.log(`✅ Using exact match: ${exactMatch.contractAddress}`);
    } else if (lowerMatch) {
      console.log(`✅ Using lower case match: ${lowerMatch.contractAddress}`);
    } else if (upperMatch) {
      console.log(`✅ Using upper case match: ${upperMatch.contractAddress}`);
    } else {
      console.log(`❌ No matching pot information found for any case variation`);
    }
    
    // Reset pot information to default values - try both case variations
    console.log(`🔄 Attempting to reset pot information...`);
    let potInfoResult;
    
    // Try exact match first
    potInfoResult = await db
      .update(PotInformation)
      .set({
        hasStarted: false,
        isFinalDay: false,
        startedOnDate: null,
        lastDayDate: null,
        announcementSent: false
      })
      .where(eq(PotInformation.contractAddress, contractAddress.toLowerCase()));
    
    console.log(`📊 Pot info reset result (exact):`, potInfoResult);
    
    // If no rows affected, try lowercase
    if (potInfoResult.rowCount === 0) {
      console.log(`🔄 No rows affected with exact match, trying lowercase...`);
      potInfoResult = await db
        .update(PotInformation)
        .set({
          hasStarted: false,
          isFinalDay: false,
          startedOnDate: null,
          lastDayDate: null,
          announcementSent: false
        })
        .where(eq(PotInformation.contractAddress, normalizedAddress));
      
      console.log(`📊 Pot info reset result (lowercase):`, potInfoResult);
    }
    
    // If still no rows affected, try uppercase
    if (potInfoResult.rowCount === 0) {
      console.log(`🔄 No rows affected with lowercase, trying uppercase...`);
      potInfoResult = await db
        .update(PotInformation)
        .set({
          hasStarted: false,
          isFinalDay: false,
          startedOnDate: null,
          lastDayDate: null,
          announcementSent: false
        })
        .where(eq(PotInformation.contractAddress, upperCaseAddress));
      
      console.log(`📊 Pot info reset result (uppercase):`, potInfoResult);
    }
    
    console.log(`✅ Final pot information reset result - affected rows: ${potInfoResult.rowCount || 0}`);
    
    // Check existing user prediction history for debugging
    console.log(`🔍 Checking existing user prediction history...`);
    const allPredictionHistory = await db.select().from(UserPredictionHistory);
    console.log(`📊 Total prediction history records: ${allPredictionHistory.length}`);
    
    const matchingPredictions = allPredictionHistory.filter(record => 
      record.contractAddress === contractAddress ||
      record.contractAddress.toLowerCase() === normalizedAddress ||
      record.contractAddress.toUpperCase() === upperCaseAddress
    );
    console.log(`📊 Matching prediction history records: ${matchingPredictions.length}`);
    console.log(`📊 Matching prediction records:`, matchingPredictions);
    
    // Clear all user prediction history for this contract - try all case variations
    console.log(`🔄 Attempting to clear user prediction history...`);
    let predictionHistoryResult = await db
      .delete(UserPredictionHistory)
      .where(eq(UserPredictionHistory.contractAddress, contractAddress));
    
    console.log(`📊 Prediction history delete result (exact):`, predictionHistoryResult);
    
    // Try other case variations if needed
    const exactDeleted = predictionHistoryResult.rowCount || 0;
    if (exactDeleted === 0) {
      console.log(`🔄 No rows deleted with exact match, trying lowercase...`);
      const lowerResult = await db
        .delete(UserPredictionHistory)
        .where(eq(UserPredictionHistory.contractAddress, normalizedAddress));
      console.log(`📊 Prediction history delete result (lowercase):`, lowerResult);
      
      if ((lowerResult.rowCount || 0) === 0) {
        console.log(`🔄 No rows deleted with lowercase, trying uppercase...`);
        const upperResult = await db
          .delete(UserPredictionHistory)
          .where(eq(UserPredictionHistory.contractAddress, upperCaseAddress));
        console.log(`📊 Prediction history delete result (uppercase):`, upperResult);
        predictionHistoryResult = upperResult;
      } else {
        predictionHistoryResult = lowerResult;
      }
    }
    
    console.log(`✅ Final user prediction history delete result - affected rows: ${predictionHistoryResult.rowCount || 0}`);
    
    const totalPotInfoRows = potInfoResult.rowCount || 0;
    const totalPredictionRows = predictionHistoryResult.rowCount || 0;
    
    console.log(`🎉 Operation completed successfully!`);
    console.log(`📊 Summary: Reset ${totalPotInfoRows} pot info records, deleted ${totalPredictionRows} prediction history records`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to reset pot data for ${contractAddress}:`, error);
    console.error(`❌ Error details:`, {
      contractAddress,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw new Error(`Could not reset pot data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

