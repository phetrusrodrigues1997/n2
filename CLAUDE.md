# CLAUDE.md

**PrediWin.com** - Next.js prediction tournament platform on Base network.

## Development Commands

```bash
npm run dev          # Run development server
npm run build        # Build for production
npm run lint         # Run linter
```

## Tech Stack
- **Framework**: Next.js 14 App Router with TypeScript
- **Blockchain**: Base network using OnchainKit and Wagmi
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Custom CSS

## Key Directories
- `app/Pages/`: Main pages (LandingPage, MakePredictionPage, TutorialBridge, NewsPage)
- `app/Database/`: Schema and database operations
- `app/Languages/`: Translation system (EN/PT)
- `app/Constants/`: Markets configuration

## Smart Contracts
- **Main Contract**: `0xd1547F5bC0390F5020B2A80F262e28ccfeF2bf9c`
- **Factory Contract**: `0x34c2fF1bb3a8cbF05a7a98f70143DD6F22Df3490`

## Adding New Market Contracts

1. **Update `app/Constants/markets.ts`** - Add contract address and market data
2. **Update `app/Database/config.ts`** - Add to `CONTRACT_TO_TABLE_MAPPING`
3. **Update `app/Database/schema.ts`** - Create `{Market}Bets` table
4. **⚠️ CRITICAL: Update `app/hooks/useContractData.ts`** - Add contract hooks
5. **Update `app/Pages/LandingPage.tsx`** - Add to `marketsWithContracts` array

## Tournament Types

### Daily Tournaments
- **Pricing**: Days 1-4 fixed ($0.02-0.05), then doubling from $0.10
- **Behavior**: Dynamic penalty system, re-entry allowed

### Weekly Tournaments (F1)
- **Contract**: `0x7357650abC8B1f980806E80a6c3FB56Aae23c45e`
- **Pricing**: Fixed $1.00 entry fee
- **Behavior**: Penalty-exempt, event-based timing

**Key Config Files:**
- `Database/config.ts` - `PENALTY_EXEMPT_CONTRACTS`
- `Database/eventDates.ts` - `EVENT_DATE_MAPPING`