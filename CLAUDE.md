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
- `app/Pages/`: Main pages (LandingPage, MakePredictionPage, createPotPage, NewsPage)
- `app/Database/`: Schema and database operations
  - `actions.ts`: Main database functions
  - `schema.ts`: Database schema
  - `config.ts`: Contract mappings and configuration
- `app/Constants/`: Markets configuration and pricing
- `app/Languages/`: Translation system (EN/PT)
- `app/Sections/`: Reusable components (NavigationMenu, etc.)

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
  "0x7357650abC8B1f980806E80a6c3FB56Aae23c45e", // F1 Tournament 2025
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
  "0x7357650abC8B1f980806E80a6c3FB56Aae23c45e": "2025-03-16", // Bahrain GP 2025
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

### Current F1 Contract

**Active Formula 1 Tournament Contract**: `0x7357650abC8B1f980806E80a6c3FB56Aae23c45e`
- **Current Race**: Bahrain GP 2025 (March 16, 2025)
- **Status**: Penalty-exempt with fixed $1.00 USD entry fee
- **Table Type**: `formula1` (Formula1Bets and WrongPredictionsFormula1)

### Adding New F1 Races

1. **Add contract to exempt list**:
```typescript
export const PENALTY_EXEMPT_CONTRACTS: string[] = [
  "0x7357650abC8B1f980806E80a6c3FB56Aae23c45e", // Current F1 contract
  "0xNewRaceContract2025", // Add new race contract
];
```

2. **Set race date**:
```typescript
export const EVENT_DATE_MAPPING = {
  "0x7357650abC8B1f980806E80a6c3FB56Aae23c45e": "2025-03-16", // Current race
  "0xNewRaceContract2025": "2025-03-30", // Add new race date
};
```

3. **Weekly updates**: Manually update race dates as needed

**System maintains complete backward compatibility - existing users unaffected.**

## Tournament Filtering System

**Filter markets by tournament type on LandingPage**

### Filter Options (`page.tsx` + `LandingPage.tsx`)
- **All**: Show all markets (default)
- **Daily**: Non-penalty-exempt contracts only
- **Weekly**: Penalty-exempt contracts only
- **Recently Started**: Markets with `startedOnDate` ≤ 3 days ago

### Implementation
- Filter bar replaces second carousel when filter symbol clicked
- Filters stay open until filter symbol clicked again (not auto-close on selection)
- Uses `potInformation` state with `startedOnDate` from `/api/pot-info` endpoint

## News System

**Twitter-style news feed accessible via navigation menus**

### NewsPage Component (`app/Pages/NewsPage.tsx`)
- **Desktop**: Grid layout with featured article + card grid
- **Mobile**: Single-column Twitter-style feed
- **Navigation**: Desktop hamburger menu "News" + mobile bottom nav (replaces search)
- **Content**: 6 articles using market icons from `markets.ts` with realistic headlines and sources

### Navigation Updates
- **Desktop menu**: Added "News" option to hamburger dropdown
- **Mobile bottom nav**: Replaced search button with news button (newspaper icon)
- **Live Markets**: Routes to `LiveMarketPotEntry` component

## Development Notes

- **Translation System**: Ultra-conservative approach - only display strings translated, never database/contract logic
- **Minimum Players**: Set via `MIN_PLAYERS` constants in `database/config.ts` (currently 2)
- **OnchainKit Version**: `0.37.5` (stable version, avoid newer versions with modal issues)
- **Prediction Language**: Uses "predict/prediction" terminology, not "bet/betting"
- **Mobile Strategy**: PWA + Capacitor for native deployment