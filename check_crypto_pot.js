require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkFeaturedPot() {
  try {
    const FEATURED_CONTRACT = '0xd1547F5bC0390F5020B2A80F262e28ccfeF2bf9c';

    console.log('=== CHECKING FEATURED POT AFTER TOGGLING "HAS STARTED" ===');
    console.log('Contract:', FEATURED_CONTRACT);
    console.log('');

    // Get pot information
    const potInfo = await sql`
      SELECT * FROM pot_information
      WHERE LOWER(contract_address) = LOWER(${FEATURED_CONTRACT})
      ORDER BY id DESC LIMIT 1
    `;

    console.log('=== POT INFORMATION ===');
    if (potInfo.length > 0) {
      console.log('✅ Pot Information Found:');
      console.log(`  - Has Started: ${potInfo[0].has_started}`);
      console.log(`  - Is Final Day: ${potInfo[0].is_final_day}`);
      console.log(`  - Started On Date: ${potInfo[0].started_on_date || 'NULL'}`);
      console.log(`  - Last Day Date: ${potInfo[0].last_day_date || 'NULL'}`);
      console.log(`  - Announcement Sent: ${potInfo[0].announcement_sent}`);
      console.log(`  - Created At: ${potInfo[0].created_at}`);
    } else {
      console.log('❌ No pot information found');
    }
    console.log('');

    // Get participation history
    const participants = await sql`
      SELECT wallet_address, event_type, event_timestamp, table_type
      FROM pot_participation_history
      WHERE LOWER(contract_address) = LOWER(${FEATURED_CONTRACT})
      ORDER BY event_timestamp DESC
    `;

    console.log('=== PARTICIPATION HISTORY ===');
    console.log(`✅ Total participants: ${participants.length}`);
    participants.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.wallet_address} (${p.event_type}) - ${p.event_timestamp}`);
    });
    console.log('');

    // Get messages for this contract
    const messages = await sql`
      SELECT id, message, datetime
      FROM "Messages"
      WHERE LOWER("to") = LOWER(${FEATURED_CONTRACT})
      ORDER BY datetime DESC
      LIMIT 10
    `;

    console.log('=== MESSAGES TABLE (Last 10) ===');
    if (messages.length > 0) {
      console.log(`✅ Found ${messages.length} message(s):`);
      messages.forEach((m, i) => {
        console.log(`  ${i + 1}. [${m.datetime}] ${m.message}`);
      });
    } else {
      console.log('❌ No messages found for this contract');
    }
    console.log('');

    // Get user predictions for featured
    const predictions = await sql`
      SELECT wallet_address, prediction, bet_date, created_at
      FROM featured_bets
      ORDER BY created_at DESC
    `;

    console.log('=== USER PREDICTIONS (Featured Bets) ===');
    console.log(`Total predictions: ${predictions.length}`);
    if (predictions.length > 0) {
      predictions.forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.wallet_address} - ${p.prediction} (${p.bet_date})`);
      });
    } else {
      console.log('  No predictions yet');
    }
    console.log('');

    // Analysis
    console.log('=== ANALYSIS ===');
    const participantAddresses = participants.map(p => p.wallet_address.toLowerCase());
    const predictionAddresses = predictions.map(p => p.wallet_address.toLowerCase());

    const nonPredictors = participantAddresses.filter(addr => !predictionAddresses.includes(addr));
    console.log(`Participants who entered: ${participantAddresses.length}`);
    console.log(`Participants who predicted: ${predictionAddresses.length}`);
    console.log(`Non-predictors (should be eliminated): ${nonPredictors.length}`);
    if (nonPredictors.length > 0) {
      console.log('Non-predictor addresses:');
      nonPredictors.forEach(addr => console.log(`  - ${addr}`));
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkFeaturedPot();
