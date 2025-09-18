// src/data/markets.ts
import { getTranslation } from '../Languages/languages'

// "Translation" is whatever shape getTranslation returns
type Translation = ReturnType<typeof getTranslation>

export interface Market {
  id: string
  name: string
  symbol: string
  contractAddress?: string
  color: string
  question: string
  icon: string
  currentPrice: string
  participants: number
  potSize: string
  potNumber?: number
  tabId?: string
}

// ============================================
// CENTRALIZED MARKET DEFINITIONS - DRY PRINCIPLE
// Each market defined ONCE with all its properties
// ============================================

const MARKET_DEFINITIONS: Record<string, Market> = {
  // ACTIVE CONTRACTS - Markets with deployed smart contracts
  trending: {
    id: 'Trending',
    name: 'Trending',
    symbol: 'Trending',
    contractAddress: '0xd1547F5bC0390F5020B2A80F262e28ccfeF2bf9c',
    color: '#1DB954',
    question: 'Solo female artist has #1 song on Spotify Global',
    icon: "/AdeleIcon.png",
    currentPrice: '$150',
    participants: 42,
    potSize: '$420',
    potNumber: 1,
  },

    formula1: {
    id: 'formula1',
    name: 'Formula 1',
    symbol: 'F1',
    contractAddress: '0x7357650abC8B1f980806E80a6c3FB56Aae23c45e',
    color: '#E10600',
    question: 'Verstappen wins first race of the season',
    icon: '/formula.jpg',
    currentPrice: '$100',
    participants: 0,
    potSize: '$0',
    potNumber: 2,
  },

  crypto: {
    id: 'Crypto',
    name: 'Crypto',
    symbol: '',
    contractAddress: '0xe9b69d0EA3a6E018031931d300319769c6629866',
    color: '#FF5733',
    question: 'Bitcoin closes higher than opening price',
    icon: '/BitCoinIcon.png',
    currentPrice: '$100',
    participants: 50,
    potSize: '$500',
    potNumber: 3,
  },

  stocks: {
    id: 'stocks',
    name: 'Tesla',
    symbol: 'TSLA',
    contractAddress: '0xf07E717e1dB49dDdB207C68cCb433BaE4Bc65fC9',
    color: '#E31837',
    question: '', // Will be populated with translation
    icon: '/stocks.jpg',
    currentPrice: '$248.50',
    participants: 156,
    potSize: '$1,560',
    potNumber: 4,
  },

  music: {
    id: 'music',
    name: 'Music Charts',
    symbol: '',
    contractAddress: '0xb85D3aE374b8098A6cA553dB90C0978401a34f71',
    color: '#DA70D6',
    question: 'Espresso reaches #1 on Spotify Global',
    icon: '/SabrinaCarpIcon.png',
    currentPrice: '$130',
    participants: 42,
    potSize: '$420',
    potNumber: 5,
  },

  

  // COMING SOON - Markets without deployed contracts yet
  sports: {
    id: 'sports',
    name: 'Sports',
    symbol: '',
    color: '#33FF57',
    question: '',
    icon: '/XTwitterIcon.png',
    currentPrice: '$200',
    participants: 75,
    potSize: '$750',
  },

  xtrends: {
    id: 'xtrends',
    name: 'X Trending Topics',
    symbol: '',
    color: '#FF4500',
    question: 'Which topic will rank #1 on X trending topics in the United States by 21:00 UTC today?',
    icon: '/xtwitter.jpg',
    currentPrice: '$250',
    participants: 62,
    potSize: '$620',
  },

  weather: {
    id: 'weather',
    name: 'Weather',
    symbol: '',
    color: '#87CEEB',
    question: '',
    icon: '/RainbowIcon.png',
    currentPrice: '$90',
    participants: 38,
    potSize: '$380',
  },

  politics: {
    id: 'politics',
    name: 'Politics',
    symbol: '🏛️',
    color: '#1E90FF',
    question: 'Trump announces new China tariffs',
    icon: '/TrumpIcon.png',
    currentPrice: '$310',
    participants: 62,
    potSize: '$620',
  },

  elections: {
    id: 'elections',
    name: 'Elections',
    symbol: '🗳️',
    color: '#FF4500',
    question: 'Who will be the next president of the United States?',
    icon: '/KamalaHarrisIcon.png',
    currentPrice: '$470',
    participants: 94,
    potSize: '$940',
  },

  tvshows: {
    id: 'tvshows',
    name: 'TV Shows',
    symbol: '📺',
    color: '#8A2BE2',
    question: 'New Stranger Things trailer drops',
    icon: '/StrangerThingsIcon.png',
    currentPrice: '$180',
    participants: 51,
    potSize: '$510',
  },

  popculture: {
    id: 'popculture',
    name: 'Pop Culture',
    symbol: '🎤',
    color: '#FF69B4',
    question: 'Drake posts on X tomorrow',
    icon: '/DrakeIcon.png',
    currentPrice: '$150',
    participants: 45,
    potSize: '$450',
  },

  technews: {
    id: 'technews',
    name: 'Tech News',
    symbol: '💻',
    color: '#00CED1',
    question: 'ChatGPT goes open source',
    icon: '/OpenAIIcon.png',
    currentPrice: '$225',
    participants: 60,
    potSize: '$600',
  },

  movies: {
    id: 'movies',
    name: 'Box Office',
    symbol: '🎬',
    color: '#FFD700',
    question: 'Leonardo DiCaprio wins an Oscar',
    icon: '/DiCaprioIcon.png',
    currentPrice: '$270',
    participants: 58,
    potSize: '$580',
  },

  space: {
    id: 'space',
    name: 'Astronomy',
    symbol: '🚀',
    color: '#7B68EE',
    question: 'NASA finds life on Europa?',
    icon: '/GalaxyIcon.png',
    currentPrice: '$140',
    participants: 36,
    potSize: '$360',
  },

  fashion: {
    id: 'fashion',
    name: 'Fashion Trends',
    symbol: '👗',
    color: '#FFB6C1',
    question: 'Major brand launches sustainable fashion line',
    icon: '/DuaLipaCloseIcon.png',
    currentPrice: '$110',
    participants: 30,
    potSize: '$300',
  },

  celebs: {
    id: 'celebs',
    name: 'Celebrity News',
    symbol: '🌟',
    color: '#FFA500',
    question: 'Dua Lipa tweets about new album?',
    icon: '/DuaLipaIcon.png',
    currentPrice: '$160',
    participants: 47,
    potSize: '$470',
  },

  health: {
    id: 'health',
    name: 'Health & Fitness',
    symbol: '💪',
    color: '#32CD32',
    question: 'Pfizer releases new advertisement',
    icon: '/PfizerIcon.png',
    currentPrice: '$175',
    participants: 44,
    potSize: '$440',
  },

  gaming: {
    id: 'gaming',
    name: 'Gaming',
    symbol: '🎮',
    color: '#6A5ACD',
    question: 'GTA 6 gets announced?',
    icon: '/GTAIVIcon.png',
    currentPrice: '$205',
    participants: 53,
    potSize: '$530',
  },

  travel: {
    id: 'travel',
    name: 'Travel & Tourism',
    symbol: '✈️',
    color: '#00BFFF',
    question: 'Ibiza records highest temperature in Spain?',
    icon: '/BeachBenchIcon.png',
    currentPrice: '$185',
    participants: 40,
    potSize: '$400',
  },

  // Special markets with unique definitions
  chelseaManutd: {
    id: 'chelsea-manutd',
    name: 'Chelsea vs Man United',
    symbol: '⚽️',
    color: '#034694',
    question: 'Chelsea beats Manchester United',
    icon: '/FootballIcon.png',
    currentPrice: '-',
    participants: 210,
    potSize: '$2,100',
  },

  londonTemp: {
    id: 'london-temp-3pm',
    name: 'London 3PM ≥ 22°C',
    symbol: '',
    color: '#4682B4',
    question: 'London Heathrow hits 22°C at 3PM UTC?',
    icon: '/londonbigben.jpg',
    currentPrice: '-',
    participants: 94,
    potSize: '$940',
  },

  usSportsTop: {
    id: 'us-sports-top',
    name: 'Sports',
    symbol: '',
    color: '#1DA1F2',
    question: 'Sports topic trends #1 on US X?',
    icon: '/alcaraztennis.jpg',
    currentPrice: '-',
    participants: 112,
    potSize: '$1120',
  },
};

// ============================================
// CATEGORY MAPPINGS - Define which markets belong to each category
// ⚠️ IMPORTANT: When adding a new market to MARKET_DEFINITIONS, you MUST also add it here!
// - Add to 'options' array for main landing page display
// - Add individual category mapping for direct access
// ============================================

const CATEGORY_MAPPINGS: Record<string, string[]> = {
  // Main categories
  'options': ['trending', 'formula1','crypto','stocks', 'music', 'xtrends', 'weather', 'sports', 'politics', 'elections', 'tvshows', 'popculture', 'technews', 'movies', 'space', 'fashion', 'celebs', 'health', 'gaming', 'travel'],

  // Individual market categories
  'Trending': ['trending'],
  'formula1': ['formula1'],
  'Crypto': ['crypto'],
  'stocks': ['stocks'],
  'music': ['music'],
  'sports': ['chelseaManutd'],
  'politics': ['politics'],
  'elections': ['elections'],
  'tvshows': ['tvshows'],
  'popculture': ['popculture'],
  'technews': ['technews'],
  'movies': ['movies'],
  'space': ['space'],
  'fashion': ['fashion'],
  'celebs': ['celebs'],
  'health': ['health'],
  'gaming': ['gaming'],
  'travel': ['travel'],
  'weather': ['londonTemp'],
  'xtrends': ['usSportsTop'],
};

// ============================================
// OPTIMIZED getMarkets FUNCTION - No more if/else chains!
// ============================================

export const getMarkets = (t: Translation, category: string): Market[] => {
  // Get the market keys for this category
  const marketKeys = CATEGORY_MAPPINGS[category] || [];

  // Map keys to actual market objects and apply translations
  return marketKeys
    .map(key => {
      const market = MARKET_DEFINITIONS[key];
      if (!market) {
        console.warn(`Market definition not found for key: ${key}`);
        return null;
      }

      // Apply dynamic translations for specific markets
      let translatedMarket = { ...market };

      // Apply Tesla question translation for stocks
      if (key === 'stocks') {
        translatedMarket.question = t.teslaQuestion || market.question;
      }

      return translatedMarket;
    })
    .filter((market): market is Market => market !== null);
};