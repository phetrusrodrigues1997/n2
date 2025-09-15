# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**PrediWin.com** - Next.js prediction market platform on Base network. Users predict asset price movements, pay ETH entry fees, winners split pots.

### Core Features
- **Dynamic Pricing**: Entry fees based on days since pot started (fixed $0.02-0.05 days 1-4, doubling from $0.10 day 5+)
- **Minimum 2 Players**: All pots require 2+ participants before predictions can begin
- **Re-entry System**: Wrong predictors can pay current entry fee to re-enter
- **Private Pot Creation**: Users can create custom prediction markets via factory contract
- **F1 Tournament System**: Season-long elimination tournaments with penalty-exempt contracts

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Run development server
npm run build        # Build for production
npm run lint         # Run linter
```

## Architecture

### Tech Stack
- **Framework**: Next.js 14 App Router with TypeScript
- **Blockchain**: Base network using OnchainKit and Wagmi
- **Database**: PostgreSQL with Drizzle ORM (read/write replica separation)
- **Styling**: Custom CSS

### Key Directories
- `app/Pages/`: Main pages (LandingPage, MakePredictionPage, createPotPage)
- `app/Database/`: Schema and database operations
  - `actions.ts`: Main database functions
  - `schema.ts`: Database schema
  - `config.ts`: Contract mappings and configuration
- `app/Constants/`: Markets configuration and pricing
- `app/Languages/`: Translation system (EN/PT)

### Database Schema (Key Tables)
- `FeaturedBets`: Bitcoin and featured asset predictions
- `CryptoBets`: General crypto predictions
- `WrongPredictions*`: Tracking incorrect predictions and re-entry fees
- `MarketOutcomes`: Prediction results with exact question matching
- `PotParticipationHistory`: Entry/exit audit trail for fair penalties
- `UsersTable`: User profiles and statistics

## Critical Production Issues & Fixes

### Fixed Contract Bug (August 2025)
**Problem**: Original contract used `transfer()` which fails with 2300 gas limit when sending to smart contracts
**Solution**: Deployed `PredictionPotFixed` at `0xd1547F5bC0390F5020B2A80F262e28ccfeF2bf9c` using `call()` instead

### Database Performance Optimization
**Issue**: LandingPage bookmark system made 50+ simultaneous queries overwhelming database
**Fix**: Batched processing (10 markets per batch with delays), request debouncing, proper cleanup

## Adding New Market Contracts

**Critical Steps** (all required):

1. **Update `app/Constants/markets.ts`**
   - Add `contractAddress` to market in options category
   - Add complete market data (question, icon cannot be empty)

2. **Update `app/Database/config.ts`**
   - Add contract to `CONTRACT_TO_TABLE_MAPPING`
   - Update `getMarketDisplayName()` function

3. **Update `app/Database/schema.ts`**
   - Create `{Market}Bets` and `WrongPredictions{Market}` tables

4. **Update `app/Database/actions.ts`**
   - Import new tables
   - Add cases to `getTableFromType()` and `getWrongPredictionsTableFromType()`

5. **⚠️ CRITICAL: Update `app/hooks/useContractData.ts`**
   - Add `participantsQueryN` and `balanceQueryN` hooks for new contract
   - Update `participantsData` and `balancesData` arrays
   - **Without this, contract shows $0 balance and 0 participants**

6. **Enable Percentages in `app/Pages/LandingPage.tsx`**
   - Add market ID to `marketsWithContracts` array

### Common Integration Mistakes
- Missing contract hooks in `useContractData.ts` → $0 balance display
- Market ID vs Display Name mismatch in balance access
- Empty question/icon fields → "undefined market" error
- Missing database table imports → "Invalid table type" errors

## Key Configuration

### Smart Contracts
- **Fixed Contract**: `0xd1547F5bC0390F5020B2A80F262e28ccfeF2bf9c` (uses `call()` not `transfer()`)
- **Factory Contract**: `0x34c2fF1bb3a8cbF05a7a98f70143DD6F22Df3490` (private pot creation)

### Environment Variables
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY`
- `NEXT_PUBLIC_PROJECT_ID`
- `OPENAI_API_KEY` (AI trivia)
- `DATABASE_URL` (primary)
- `READ_REPLICA_URL` (read replica)

### Database Connection Strategy
- **Primary** (`getDbForWrite()`): INSERT, UPDATE, DELETE operations
- **Read Replica** (`getDbForRead()`): SELECT queries for performance

## F1 Tournament System 🏁

**PrediWin now supports season-long Formula 1 tournament prediction contests using penalty-exempt contracts.**

### Tournament Architecture

**Dual System Design:**
- **Regular Contracts**: Daily prediction markets with automatic penalty system
- **F1 Contracts**: Event-based tournaments with manual outcome control

### Key Components

#### 1. Penalty Exemption System
```typescript
// Database/config.ts
export const PENALTY_EXEMPT_CONTRACTS: string[] = [
  "0xBahrainGP2024",
  "0xSaudiGP2024",
  // ... other F1 race contracts
];
```

**Behavior:**
- **Regular contracts**: Automatic `checkMissedPenalty` runs daily
- **F1 contracts**: Penalty checks skipped entirely

#### 2. Fixed Entry Fee System
```typescript
// Database/config.ts
export const PENALTY_EXEMPT_ENTRY_FEE = 1.00; // $1.00 USD
```

**Behavior:**
- **Regular contracts**: Dynamic pricing ($0.02-0.05 early, doubling later)
- **F1 contracts**: Fixed $1.00 for entry and re-entry

#### 3. Event-Specific Bet Dates
```typescript
// Database/eventDates.ts
export const EVENT_DATE_MAPPING = {
  "0xBahrainGP2024": "2024-03-02",
  "0xSaudiGP2024": "2024-03-09",
  // ... race calendar
};
```

**Behavior:**
- **Regular contracts**: Predictions stored with tomorrow's date
- **F1 contracts**: Predictions stored with race date from mapping

#### 4. Manual Non-Predictor Elimination
```typescript
// In setDailyOutcome() - Database/OwnerActions.ts
await setDailyOutcome(outcome, tableType, questionName, raceDate, contractParticipants);
```

**Behavior:**
- **Regular contracts**: Only eliminate wrong predictions
- **F1 contracts**: Eliminate both wrong predictions AND non-predictors

### Tournament Flow

1. **Pre-Season**: Users enter F1 contract with $1 fee
2. **Race Week**: Users predict race outcomes (stored with race date)
3. **Race Day**: Admin sets outcome with participant list
4. **Elimination**: Wrong predictors + non-predictors eliminated automatically
5. **Next Week**: Entry fee increases, survivors continue to next race
6. **Season End**: Last person standing wins entire pot

### Implementation Files

- **`Database/config.ts`**: Penalty exemption and fee configuration
- **`Database/eventDates.ts`**: Race calendar mapping
- **`Database/actions.ts`**: Updated prediction insertion logic
- **`Database/OwnerActions.ts`**: Enhanced outcome setting with non-predictor elimination
- **`Pages/LandingPage.tsx`**: Penalty exemption in checkMissedPenalty loop
- **`Pages/PredictionPotTest.tsx`**: Fixed fee logic for exempt contracts
- **`Pages/MakePredictionsPage.tsx`**: Fixed re-entry fee logic

### Adding New F1 Races

1. **Add contract to exempt list**:
```typescript
export const PENALTY_EXEMPT_CONTRACTS: string[] = [
  "0xMonacoGP2024", // Add new race contract
];
```

2. **Set race date**:
```typescript
export const EVENT_DATE_MAPPING = {
  "0xMonacoGP2024": "2024-05-26", // Add race date
};
```

3. **Weekly updates**: Manually update race dates as needed

**System maintains complete backward compatibility - existing users unaffected.**

## Development Notes

- **Translation System**: Ultra-conservative approach - only display strings translated, never database/contract logic
- **Minimum Players**: Set via `MIN_PLAYERS` constants in `database/config.ts` (currently 2)
- **OnchainKit Version**: `0.37.5` (stable version, avoid newer versions with modal issues)
- **Prediction Language**: Uses "predict/prediction" terminology, not "bet/betting"
- **Mobile Strategy**: PWA + Capacitor for native deployment