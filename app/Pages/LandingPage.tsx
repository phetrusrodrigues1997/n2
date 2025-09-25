'use client';

import React, { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { formatUnits } from 'viem';
// Removed checkMissedPredictionPenalty import - penalties now handled server-side in setDailyOutcome
import { ArrowRight, Bookmark, Check, BookOpen, ChevronRight, ChevronLeft, X, CheckCircle2, DollarSign, Target, TrendingUp, Users, Calendar, BarChart2, RefreshCw, Plus } from 'lucide-react';
import { Language, getTranslation, supportedLanguages, getTranslatedMarketQuestion } from '../Languages/languages';
import { getMarkets, Market } from '../Constants/markets';
import { CustomAlert, useCustomAlert } from '../Components/CustomAlert';
import { addBookmark, removeBookmark, isMarketBookmarked, getPredictionPercentages, getTomorrowsBet, placeBitcoinBet, isEliminated, getUserEmail } from '../Database/actions';
import { CONTRACT_TO_TABLE_MAPPING, getMarketDisplayName, MIN_PLAYERS, MIN_PLAYERS2, getTableTypeFromMarketId, MARKETS_WITH_CONTRACTS, PENALTY_EXEMPT_CONTRACTS, calculateEntryFee, PENALTY_EXEMPT_ENTRY_FEE } from '../Database/config';
import { getEventDate } from '../Database/eventDates';
import { getPrice } from '../Constants/getPrice';
import { useContractData } from '../hooks/useContractData';
import { useCountdownTimer } from '../hooks/useCountdownTimer';
import { set } from 'lodash';
import LoadingScreenAdvanced from '../Components/LoadingScreenAdvanced';
import EmailCollection from '../Components/EmailCollection';

// Types for prediction data
interface TodaysBet {
  id: number;
  walletAddress: string;
  prediction: string;
  betDate: string;
  createdAt: Date;
}

type TableType = typeof CONTRACT_TO_TABLE_MAPPING[keyof typeof CONTRACT_TO_TABLE_MAPPING];

interface LandingPageProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  isMobileSearchActive?: boolean;
  searchQuery?: string;
  selectedMarket?: string;
  setSelectedMarket?: (market: string) => void;
  onLoadingChange?: (isLoading: boolean) => void;
  currentLanguage?: Language;
  tournamentFilter?: 'all' | 'daily' | 'weekly' | 'recently';
  onTutorialStateChange?: (isOpen: boolean) => void;
}

// Helper function to get contract address from markets data
const getContractAddress = (marketId: string): string | null => {
  const marketOptions = getMarkets(getTranslation('en'), 'options');
  const market = marketOptions.find(m => m.id === marketId || m.name === marketId);
  return market?.contractAddress || null;
};

// Helper function to get entry fee display text
const getEntryFeeDisplay = (marketId: string): string => {
  const contractAddress = getContractAddress(marketId);

  // Check if this is a penalty-exempt contract
  if (contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress)) {
    return `$${PENALTY_EXEMPT_ENTRY_FEE.toFixed(2)}`;
  }

  // Use dynamic pricing for regular contracts
  // For now, using default values since we don't have pot info here
  // In a real implementation, you'd need to fetch pot status
  const entryFeeUsd = calculateEntryFee(true, new Date().toISOString()); // hasStarted=true, current date
  return `$${entryFeeUsd.toFixed(2)}`;
};

const LandingPage = ({ activeSection, setActiveSection, isMobileSearchActive = false, searchQuery = '', selectedMarket: propSelectedMarket = 'Trending', setSelectedMarket, onLoadingChange, currentLanguage: propCurrentLanguage, tournamentFilter = 'all', onTutorialStateChange }: LandingPageProps) => {
  const { contractAddresses, participantsData, balancesData, isConnected, address } = useContractData();
  const [isVisible, setIsVisible] = useState(false);
  // Use language from parent component or fallback to 'en'
  const currentLanguage = propCurrentLanguage || 'en';
  const selectedMarket = propSelectedMarket;
  const { alertState, showAlert, closeAlert } = useCustomAlert();

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isSkeletonLoading, setIsSkeletonLoading] = useState(false);

  // Animation state for selected market
  const [animatingMarket, setAnimatingMarket] = useState<string | null>(null);
  const [previousSelectedMarket, setPreviousSelectedMarket] = useState(selectedMarket);

  // Trigger animation when selectedMarket changes
  useEffect(() => {
    if (selectedMarket !== previousSelectedMarket) {
      setAnimatingMarket(selectedMarket);
      setPreviousSelectedMarket(selectedMarket);
      const timer = setTimeout(() => setAnimatingMarket(null), 600);
      return () => clearTimeout(timer);
    }
  }, [selectedMarket, previousSelectedMarket]);

  // Bookmark state
  const [bookmarkedMarkets, setBookmarkedMarkets] = useState<Set<string>>(new Set());
  const [bookmarkLoading, setBookmarkLoading] = useState<string | null>(null);

  // Prediction percentages state
  const [predictionPercentages, setPredictionPercentages] = useState<Record<string, {
    positivePercentage: number;
    negativePercentage: number;
    totalPredictions: number;
  }>>({});

  // Pot balances state
  const [potBalances, setPotBalances] = useState<Record<string, string>>({});
  const [ethPrice, setEthPrice] = useState<number | null>(null);

  // User prediction state for each market
  const [userPredictions, setUserPredictions] = useState<Record<string, TodaysBet | null>>({});

  // Elimination status for each market (contract address -> boolean)
  const [eliminationStatus, setEliminationStatus] = useState<Record<string, boolean>>({});

  // Pot information state for each market (contract address -> pot info)
  const [potInformation, setPotInformation] = useState<Record<string, {
    hasStarted: boolean;
    announcementSent: boolean;
    isFinalDay: boolean;
    startedOnDate: string | null;
  }>>({});

  // Vote change loading states
  const [voteChangeLoading, setVoteChangeLoading] = useState<Record<string, boolean>>({});


  // Tips carousel state
  const [currentTipIndex, setCurrentTipIndex] = useState(0);


  // Tips carousel auto-rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prevIndex) => (prevIndex + 1) % 5); // 5 tips total
    }, 9000);

    return () => clearInterval(interval);
  }, []);

  // Pagination state
  const [displayedMarketsCount, setDisplayedMarketsCount] = useState(12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const MARKETS_PER_PAGE = 12;

  // Animation state for position swapping
  const [swapAnimation, setSwapAnimation] = useState<{
    fromIndex: number;
    toIndex: number;
    isAnimating: boolean;
  } | null>(null);

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isTutorialLanguageDropdownOpen, setIsTutorialLanguageDropdownOpen] = useState(false);
  const [showTutorialEmailCollection, setShowTutorialEmailCollection] = useState(false);
  const [userHasEmail, setUserHasEmail] = useState<boolean | null>(null);

  // Notify parent when tutorial state changes
  useEffect(() => {
    if (onTutorialStateChange) {
      onTutorialStateChange(showTutorial);
    }
  }, [showTutorial, onTutorialStateChange]);




  // Load more markets function
  const loadMoreMarkets = () => {
    if (isLoadingMore) return;

    // Get marketOptions to avoid reference before initialization
    const currentMarketOptions = getMarkets(getTranslation(currentLanguage), 'options');

    // Check if there are actually more markets to load
    const totalAvailableMarkets = searchQuery
      ? currentMarketOptions.filter(option => {
        const marketData = getMarkets(getTranslation(currentLanguage), option.id);
        const market = marketData[0];
        return market && (
          getTranslatedMarketQuestion(market, currentLanguage).toLowerCase().includes(searchQuery.toLowerCase()) ||
          market.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }).length
      : currentMarketOptions.length;

    // Don't load more if we've already displayed all available markets
    if (displayedMarketsCount >= totalAvailableMarkets) {
      return;
    }

    setIsLoadingMore(true);
    // Simulate loading delay for better UX
    setTimeout(() => {
      setDisplayedMarketsCount(prev => Math.min(prev + MARKETS_PER_PAGE, totalAvailableMarkets));
      setIsLoadingMore(false);
    }, 500);
  };

  // Reset pagination when search changes
  useEffect(() => {
    setDisplayedMarketsCount(12);
  }, [searchQuery]);

  // Infinite scroll detection
  useEffect(() => {
    const handleScroll = () => {
      if (isLoadingMore) return;

      // Get marketOptions inside the effect to avoid reference before initialization
      const currentMarketOptions = getMarkets(getTranslation(currentLanguage), 'options');

      // Check if there are more markets to load before triggering scroll load
      const totalAvailableMarkets = searchQuery
        ? currentMarketOptions.filter(option => {
          const marketData = getMarkets(getTranslation(currentLanguage), option.id);
          const market = marketData[0];
          return market && (
            getTranslatedMarketQuestion(market, currentLanguage).toLowerCase().includes(searchQuery.toLowerCase()) ||
            market.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }).length
        : currentMarketOptions.length;

      // Don't trigger loading if we've already displayed all available markets
      if (displayedMarketsCount >= totalAvailableMarkets) {
        return;
      }

      // Check if user scrolled near bottom of page
      const scrollTop = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      if (scrollTop + windowHeight >= docHeight - 800) { // 800px before bottom
        loadMoreMarkets();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, displayedMarketsCount, searchQuery, currentLanguage]);




  // Function to get next Saturday midnight (pot closes)
  const getNextSaturdayMidnight = (): Date => {
    const now = new Date();
    const currentDay = now.getDay();
    let daysUntilSaturday;

    if (currentDay === 6) {
      // Saturday - next Saturday (next week)
      daysUntilSaturday = 7;
    } else {
      // Sunday (0) to Friday (5) - this Saturday
      daysUntilSaturday = 6 - currentDay;
    }

    const nextSaturday = new Date(now);
    nextSaturday.setDate(now.getDate() + daysUntilSaturday);
    nextSaturday.setHours(0, 0, 0, 0); // Midnight UTC
    return nextSaturday;
  };

  // Function to get next midnight
  const getNextMidnight = (): Date => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0); // Next midnight
    return midnight;
  };



  // Tutorial functions
  const nextTutorialStep = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(tutorialStep + 1);
    }
  };

  const prevTutorialStep = () => {
    if (tutorialStep > 0) {
      setTutorialStep(tutorialStep - 1);
    }
  };

  const closeTutorial = () => {
    setShowTutorial(false);
    setTutorialStep(0);
    setIsTutorialLanguageDropdownOpen(false);
    setShowTutorialEmailCollection(false);
    // Set cookie to remember user has seen tutorial
    Cookies.set('landingPageTutorialSeen', 'true', { expires: 1 / 24 }); // 1 hour expiry for testing
  };

  const handleEmailCollectionComplete = (hasEmail: boolean) => {
    // Update email status and move to first tutorial step after email collection
    setUserHasEmail(true);
    setShowTutorialEmailCollection(false);
    setTutorialStep(0);
  };

  const handleEmailCollectionSkip = () => {
    // Mark as skipped (no email but don't show collection again) and move to first tutorial step
    setUserHasEmail(false);
    setShowTutorialEmailCollection(false);
    setTutorialStep(0);
  };

  const handleTutorialLanguageChange = (language: Language) => {
    setIsTutorialLanguageDropdownOpen(false);
    // Dispatch custom event to notify page.tsx about language change
    const event = new CustomEvent('changeLanguage', { detail: language });
    window.dispatchEvent(event);
  };

  // Check user email status when connected (only once)
  useEffect(() => {
    const checkUserEmail = async () => {
      if (isConnected && address && userHasEmail === null) {
        try {
          const userEmailData = await getUserEmail(address);
          setUserHasEmail(!!userEmailData?.email);
        } catch (error) {
          console.error('Error checking user email:', error);
          setUserHasEmail(false);
        }
      } else if (!isConnected || !address) {
        setUserHasEmail(null);
      }
    };

    checkUserEmail();
  }, [isConnected, address, userHasEmail]);

  // Check if user has seen tutorial before and show automatically
  useEffect(() => {
    const hasSeenTutorial = Cookies.get('landingPageTutorialSeen');

    // Only show tutorial if user hasn't seen it before, loading is complete, and we know email status
    if (!hasSeenTutorial && !isLoading && userHasEmail !== null && isConnected) {
      // Delay showing tutorial by 1 second after loading completes for better UX
      const tutorialTimer = setTimeout(() => {
        setShowTutorial(true);
        // If user doesn't have email, start with email collection, otherwise start with tutorial steps
        if (!userHasEmail) {
          setShowTutorialEmailCollection(true);
          setTutorialStep(-1); // Use -1 to indicate email collection step
        } else {
          setTutorialStep(0); // Start with first tutorial step
        }
      }, 1000);

      return () => clearTimeout(tutorialTimer);
    }
  }, [isLoading, userHasEmail, isConnected]);

  // Loading effect
  useEffect(() => {
    // Notify parent that loading started
    onLoadingChange?.(true);

    // Phase 1: LoadingScreenAdvanced for 5 seconds
    const phase1Timer = setTimeout(() => {
      setIsLoading(false);
      setIsSkeletonLoading(true);
    }, 5000);

    // Phase 2: Skeleton loading for 4 seconds (total 9 seconds)
    const phase2Timer = setTimeout(() => {
      setIsSkeletonLoading(false);
      setIsVisible(true);
      // Notify parent that loading is complete
      onLoadingChange?.(false);
    }, 9000);

    // Language is now managed by parent component

    return () => {
      clearTimeout(phase1Timer);
      clearTimeout(phase2Timer);
    };
  }, []);








  const t = getTranslation(currentLanguage);

  // Tips array using translations
  const tips = [
    t.tip1,
    t.tip2,
    t.tip3,
    t.tip4,
    t.tip5
  ];

  // Close tutorial language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isTutorialLanguageDropdownOpen && !target.closest('[data-tutorial-language-dropdown]')) {
        setIsTutorialLanguageDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isTutorialLanguageDropdownOpen]);

  // Tutorial steps data (using the content from TutorialBridge.tsx)
  const tutorialSteps = [
    {
      title: t.globalCompetition || "Global Competition",
      content: t.globalCompetitionDesc || "Join thousands of users worldwide in predicting market movements. Every prediction counts towards building a global community of forecasters.",
    },
    {
      title: t.tutorialStep2Title || "Growing Tournament Pots",
      content: t.tutorialStep2Description || "Each tournament has its own pot that grows every time a player enters or re-enters. The more players, the bigger the rewards!",
    },
    {
      title: t.dynamicPricing || "Entry Fees Grow the Pots",
      content: (
        <div>
          
          <span style={{color: '#6B7280', fontWeight: 'bold', opacity: 0.7}}>{t.entryFeeExample}</span> → <span style={{color: '#039905', fontWeight: 'bold'}}>{t.potBalanceExample}</span> {t.meansYouPay} {t.entryFeeExample} {t.canWin} {t.potBalanceExample} {t.canWinPotBalance}.
        </div>
      ),
    },
    {
      title: t.dailyPredictions || "Daily Predictions",
      content: t.dailyPredictionsDesc || "Make your prediction each day before midnight. Will Bitcoin go up or down tomorrow? Simple yes/no predictions with real rewards.",
    },
    {
      title: t.tutorialStep5Title || "Weekly Predictions",
      content: t.tutorialStep5Description || "Some tournaments happen weekly, and begin one week before the first day of the event. Examples include Formula 1 races, NBA playoffs, and World Cup matches.",
    },
    {
      title: t.secondChances || "Second Chances",
      content: t.secondChancesDesc || "Made a wrong prediction? Pay a re-entry fee to get back in the game. No permanent eliminations - just strategic comebacks.",
    },
    {
      title: t.finalShowdown || "Final Showdown",
      content: t.finalShowdownDesc || "Saturday night is elimination time. Correct predictors stay in and share the prize. Wrong predictors face the music.",
    },

  ];
  
  

  const markets = getMarkets(t, selectedMarket);
  const marketOptions = getMarkets(t, 'options');

  // Load bookmark status for all possible markets (optimized)
  useEffect(() => {
    let isCancelled = false;

    const loadBookmarkStatus = async () => {
      if (!isConnected || !address) {
        setBookmarkedMarkets(new Set());
        return;
      }

      try {
        console.log('📑 Loading bookmark status for user:', address);

        // Get all possible market IDs from all categories
        const allPossibleMarkets = [
          ...marketOptions, // From options category
        ];

        // Loop through all market options and get markets from each category
        marketOptions.forEach(option => {
          try {
            const categoryMarkets = getMarkets(t, option.id);
            allPossibleMarkets.push(...categoryMarkets);
          } catch (error) {
            // Ignore categories that don't exist or have errors
            console.log(`Category ${option.id} not found or has no markets`);
          }
        });

        // Remove duplicates by creating a Map with market.id as key
        const uniqueMarkets = Array.from(
          new Map(allPossibleMarkets.map(market => [market.id, market])).values()
        );

        // console.log('📑 Checking bookmarks for', uniqueMarkets.length, 'markets');

        // Batch the bookmark checks to prevent overwhelming the database
        const BATCH_SIZE = 10;
        const bookmarkedSet = new Set<string>();

        for (let i = 0; i < uniqueMarkets.length; i += BATCH_SIZE) {
          if (isCancelled) return;

          const batch = uniqueMarkets.slice(i, i + BATCH_SIZE);
          const batchChecks = await Promise.all(
            batch.map(async (market) => {
              const isBookmarked = await isMarketBookmarked(address, market.id);
              return { marketId: market.id, isBookmarked };
            })
          );

          batchChecks
            .filter(check => check.isBookmarked)
            .forEach(check => bookmarkedSet.add(check.marketId));

          // Small delay between batches to prevent overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!isCancelled) {
          setBookmarkedMarkets(bookmarkedSet);
          console.log('📑 Loaded', bookmarkedSet.size, 'bookmarks');
        }
      } catch (error) {
        console.error('Error loading bookmark status:', error);
      }
    };

    // Add debouncing to prevent rapid successive calls
    const timeoutId = setTimeout(() => {
      loadBookmarkStatus();
      loadUserPredictions();
    }, 200);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [address, isConnected]); // Removed marketOptions and t to prevent excessive re-runs

  // Load prediction percentages for markets with contract addresses
  useEffect(() => {
    const loadPredictionPercentages = async () => {
      try {
        console.log('📊 Loading prediction percentages...');

        // Markets that have prediction data (imported from config.ts)
        const percentagePromises = MARKETS_WITH_CONTRACTS.map(async (marketId) => {
          const percentages = await getPredictionPercentages(marketId);
          return { marketId, percentages };
        });

        const results = await Promise.all(percentagePromises);
        const percentagesMap = results.reduce((acc, { marketId, percentages }) => {
          acc[marketId] = percentages;
          return acc;
        }, {} as Record<string, any>);

        setPredictionPercentages(percentagesMap);
        console.log('📊 Loaded prediction percentages:', percentagesMap);

      } catch (error) {
        console.error('Error loading prediction percentages:', error);
      }
    };

    loadPredictionPercentages();

    // Load percentages once on component mount only
    // Removed automatic refresh to prevent continuous re-renders

  }, []); // Load percentages once on component mount

  // Use fallback ETH price to avoid CORS issues
  useEffect(() => {
    setEthPrice(4700); // Fallback ETH price
    console.log('💰 Using fallback ETH price: 4700');
  }, []);

  // Helper function to convert ETH to USD (same as in PredictionPotTest)
  const ethToUsd = (ethAmount: bigint): number => {
    const fallbackEthPrice = 4700;
    const currentEthPrice = ethPrice || fallbackEthPrice;
    const ethValue = Number(formatUnits(ethAmount, 18));
    return ethValue * currentEthPrice;
  };

  // Update pot balances when contract balances or ETH price changes
  useEffect(() => {
    if (!ethPrice) return;

    const newPotBalances: Record<string, string> = {};

    // Calculate balances for each contract
    balancesData.forEach((balance, index) => {
      if (balance?.value) {
        const usdAmount = ethToUsd(balance.value);
        const contractAddress = contractAddresses[index];
        const marketType = CONTRACT_TO_TABLE_MAPPING[contractAddress];

        // Map contract to market name using utility function
        const marketName = getMarketDisplayName(marketType);

        // Show 2 decimal places if under $10, otherwise round to nearest dollar
        const formattedAmount = usdAmount < 10 ? usdAmount.toFixed(2) : usdAmount.toFixed(0);
        newPotBalances[marketName] = `$${formattedAmount}`;
        console.log(`💰 ${marketName} pot balance: ${formatUnits(balance.value, 18)} ETH = ${newPotBalances[marketName]}`);
      }
    });

    setPotBalances(newPotBalances);
    Cookies.set('potBalances', JSON.stringify(newPotBalances), { expires: 1 / 24 }); // 1 hour expiry
  }, [ethPrice, balancesData.length, ...balancesData.map(b => b?.value)]);

  // Check elimination status when user connects (penalties now handled server-side in setDailyOutcome)
  useEffect(() => {
    const checkEliminationStatus = async () => {
      if (!isConnected || !address) {
        return;
      }

      console.log('🔍 Checking elimination status for all markets...');

      // Check each contract for elimination status only
      const newEliminationStatus: Record<string, boolean> = {};

      for (const contractAddress of contractAddresses) {
        try {
          const marketType = CONTRACT_TO_TABLE_MAPPING[contractAddress];
          console.log(`🔍 Checking elimination status for ${marketType} (${contractAddress})`);

          // Check if user is eliminated (has re-entry fee)
          const reEntryFee = await isEliminated(address, marketType);
          newEliminationStatus[contractAddress] = reEntryFee !== null && reEntryFee > 0;
          console.log(`🔍 Elimination status for ${marketType}: ${newEliminationStatus[contractAddress]}`);
        } catch (error) {
          console.error(`❌ Error checking elimination status for ${contractAddress}:`, error);
          newEliminationStatus[contractAddress] = false; // Default to not eliminated on error
        }
      }

      // Update elimination status state
      setEliminationStatus(newEliminationStatus);
    };

    checkEliminationStatus();
  }, [isConnected, address]);

  // Fetch pot information for all contracts
  useEffect(() => {
    const fetchAllPotInformation = async () => {
      if (contractAddresses.length === 0) return;

      console.log('🔍 Fetching pot information for all contracts...');
      const newPotInformation: Record<string, { hasStarted: boolean; announcementSent: boolean; isFinalDay: boolean; startedOnDate: string | null }> = {};

      for (const contractAddress of contractAddresses) {
        try {
          const response = await fetch('/api/pot-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contractAddress })
          });

          if (response.ok) {
            const data = await response.json();
            newPotInformation[contractAddress] = {
              hasStarted: data.hasStarted || false,
              announcementSent: data.announcementSent || false,
              isFinalDay: data.isFinalDay || false,
              startedOnDate: data.startedOnDate || null
            };
            console.log(`🔍 Pot info for ${contractAddress}:`, newPotInformation[contractAddress]);
          } else {
            console.error(`❌ Failed to fetch pot info for ${contractAddress}`);
            // Set defaults on error
            newPotInformation[contractAddress] = {
              hasStarted: false,
              announcementSent: false,
              isFinalDay: false,
              startedOnDate: null
            };
          }
        } catch (error) {
          console.error(`❌ Error fetching pot info for ${contractAddress}:`, error);
          // Set defaults on error
          newPotInformation[contractAddress] = {
            hasStarted: false,
            announcementSent: false,
            isFinalDay: false,
            startedOnDate: null
          };
        }
      }

      setPotInformation(newPotInformation);
      console.log('✅ Pot information loaded for all contracts:', newPotInformation);
    };

    fetchAllPotInformation();
  }, [contractAddresses]); // Only trigger when contractAddresses changes

  // Handle bookmark toggle
  const handleBookmarkToggle = async (market: any, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering market click

    if (!isConnected || !address) {
      showAlert('Please connect your wallet to bookmark markets', 'info', 'Connect Wallet');
      return;
    }

    const isCurrentlyBookmarked = bookmarkedMarkets.has(market.id);
    setBookmarkLoading(market.id);

    try {
      if (isCurrentlyBookmarked) {
        const result = await removeBookmark(address, market.id);
        if (result.success) {
          setBookmarkedMarkets(prev => {
            const newSet = new Set(prev);
            newSet.delete(market.id);
            return newSet;
          });
          showAlert('Bookmark removed', 'success', 'Success');
        } else {
          showAlert(result.message, 'error', 'Error');
        }
      } else {
        const contractAddress = getContractAddress(market.id);
        const result = await addBookmark(
          address,
          market.id,
          selectedMarket, // market category
          contractAddress || undefined
        );
        if (result.success) {
          setBookmarkedMarkets(prev => new Set(prev).add(market.id));
          showAlert('Market bookmarked!', 'success', 'Success');
        } else {
          showAlert(result.message, 'error', 'Error');
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      showAlert('Failed to update bookmark', 'error', 'Error');
    } finally {
      setBookmarkLoading(null);
    }
  };

  // Helper function to check if user is a participant in the selected market
  const isUserParticipant = (contractAddress: string): boolean => {
    if (!isConnected || !address) return false;

    const contractIndex = contractAddresses.findIndex(addr => addr === contractAddress);
    if (contractIndex === -1) return false;

    const participants = participantsData[contractIndex];
    if (!participants || !Array.isArray(participants)) return false;

    return participants.some(
      (participant: string) => participant.toLowerCase() === address.toLowerCase()
    );
  };

  // Helper function to check if there are enough participants for a contract
  const hasEnoughParticipants = (contractAddress: string): boolean => {
    const contractIndex = contractAddresses.findIndex(addr => addr === contractAddress);
    if (contractIndex === -1) return false;

    const participants = participantsData[contractIndex];
    if (!participants || !Array.isArray(participants)) return false;

    // Determine minimum players based on contract index
    const minPlayersRequired = contractIndex === 0 ? MIN_PLAYERS : MIN_PLAYERS2;
    return participants.length >= minPlayersRequired;
  };


  // Helper function to get real pot balance for a market
  const getRealPotBalance = (marketId: string): string => {
    // console.log(`🔍 getRealPotBalance called with marketId: "${marketId}"`);
    // console.log(`🔍 Available potBalances keys:`, Object.keys(potBalances));
    // console.log(`🔍 potBalances object:`, potBalances);

    // Check if we have real balance data
    if (potBalances[marketId]) {
      console.log(`✅ Found balance for "${marketId}": ${potBalances[marketId]}`);
      return potBalances[marketId];
    }

    // Only try display name mapping for markets that have contracts
    if (MARKETS_WITH_CONTRACTS.includes(marketId as any)) {
      // Try to map market ID to table type, then to display name for lookup
      const tableType = getTableTypeFromMarketId(marketId);
      const displayName = getMarketDisplayName(tableType as any); // Type assertion needed
      // console.log(`🔍 Trying display name "${displayName}" for market ID "${marketId}" (table type: ${tableType})`);

      if (potBalances[displayName]) {
        console.log(`✅ Found balance using display name "${displayName}": ${potBalances[displayName]}`);
        return potBalances[displayName];
      }
    }

    // Fallback to $0 if no data
    // console.log(`❌ No balance found for "${marketId}" or mapped display name, returning $0`);
    return '$0';
  };

  // Function to load user predictions for all markets
  const loadUserPredictions = async () => {
    if (!isConnected || !address) {
      setUserPredictions({});
      return;
    }

    try {
      console.log('📊 Loading user predictions for wallet:', address);

      // Load predictions for each table type
      const predictionPromises = Object.values(CONTRACT_TO_TABLE_MAPPING).map(async (tableType) => {
        try {
          const prediction = await getTomorrowsBet(address, tableType);
          return { tableType, prediction };
        } catch (error) {
          console.error(`Error loading prediction for ${tableType}:`, error);
          return { tableType, prediction: null };
        }
      });

      const results = await Promise.all(predictionPromises);

      // Convert results to Record<string, TodaysBet | null> keyed by market name
      const predictionsMap: Record<string, TodaysBet | null> = {};
      results.forEach(({ tableType, prediction }) => {
        // Map table types to market names using utility function
        const marketName = getMarketDisplayName(tableType);

        predictionsMap[marketName] = prediction;
        if (prediction) {
          console.log(`✅ User has ${prediction.prediction} prediction for ${marketName}`);
        }
      });

      setUserPredictions(predictionsMap);
    } catch (error) {
      console.error('Error loading user predictions:', error);
    }
  };

  // Helper function to get user prediction for a market (handles naming mismatch)
  const getUserPrediction = (marketId: string): TodaysBet | null => {
    // console.log(`🔍 getUserPrediction called with marketId: "${marketId}"`);

    // Only return predictions for markets that have deployed contracts
    // This prevents button state from bleeding across markets
    const contractAddress = getContractAddress(marketId);
    if (!contractAddress) {
      // console.log(`❌ No contract address for "${marketId}", no prediction available`);
      return null;
    }

    // Check if we have prediction data directly
    if (userPredictions[marketId]) {
      // console.log(`✅ Found prediction for "${marketId}"`);
      return userPredictions[marketId];
    }

    // Try to map market ID to table type, then to display name for lookup
    const tableType = getTableTypeFromMarketId(marketId);
    const displayName = getMarketDisplayName(tableType as any); // Type assertion needed
    // console.log(`🔍 Trying display name "${displayName}" for market ID "${marketId}" (table type: ${tableType})`);

    if (userPredictions[displayName]) {
      // console.log(`✅ Found prediction using display name "${displayName}"`);
      return userPredictions[displayName];
    }

    // console.log(`❌ No prediction found for "${marketId}" or mapped display name`);
    return null;
  };

  // Helper function to get button content based on user's prediction
  const getButtonContent = (marketId: string, buttonType: 'positive' | 'negative') => {
    const prediction = getUserPrediction(marketId);
    const contractAddress = getContractAddress(marketId);
    const isParticipant = contractAddress && isUserParticipant(contractAddress);
    const isLoading = voteChangeLoading[marketId];

    // Show loading spinner if vote is being changed
    if (isLoading) {
      return (
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
        </div>
      );
    }

    if (prediction && prediction.prediction === buttonType) {
      // User has voted for this option
      if (isParticipant) {
        // Show confirmed tick for participants (they can't click to change from same option)
        return (
          <div className="flex items-center justify-center gap-2">
            <Check className={`w-4 h-4 ${buttonType === 'positive' ? 'text-purple-600' : 'text-blue-600'}`} />
            {/* <span>✓</span> */}
          </div>
        );
      }
    }

    // For participants who haven't voted or want to change: show clickable option
    // For non-participants: show default option (will navigate to pot entry)
    return buttonType === 'positive' ? t.higher : t.lower;
  };

  // Helper function to get button styling based on user's prediction
  const getButtonStyles = (marketId: string, buttonType: 'positive' | 'negative', baseClasses: string) => {
    const prediction = getUserPrediction(marketId);
    const contractAddress = getContractAddress(marketId);
    const isParticipant = contractAddress && isUserParticipant(contractAddress);
    const isEliminated = contractAddress && eliminationStatus[contractAddress];
    const isLoading = voteChangeLoading[marketId];

    // Loading state
    if (isLoading) {
      return baseClasses.replace(/hover:bg-\w+-\d+/, 'cursor-wait opacity-50');
    }

    // If user is eliminated, grey out the buttons
    if (isEliminated) {
      return baseClasses.replace(/bg-\w+-\d+/g, 'bg-gray-100').replace(/hover:bg-\w+-\d+/g, 'hover:bg-gray-200').replace(/text-\w+-\d+/g, 'text-gray-500');
    }

    if (prediction && prediction.prediction === buttonType) {
      // User has voted for this option - show confirmed styling with white background
      if (buttonType === 'positive') {
        return baseClasses.replace('bg-purple-50 hover:bg-blue-200 text-purple-700', 'bg-white text-purple-600 cursor-default border border-purple-600');
      } else {
        return baseClasses.replace('bg-blue-50 hover:bg-purple-200 text-blue-700', 'bg-white text-blue-600 cursor-default border border-blue-600');
      }
    }

    // If user is participant and has voted for the opposite option, make this button more prominent (change vote)
    if (isParticipant && prediction && prediction.prediction !== buttonType) {
      if (buttonType === 'positive') {
        return baseClasses.replace('bg-purple-50 hover:bg-blue-200 text-purple-700', 'bg-purple-100 hover:bg-purple-200 text-purple-800');
      } else {
        return baseClasses.replace('bg-blue-50 hover:bg-purple-200 text-blue-700', 'bg-blue-100 hover:bg-blue-200 text-blue-800');
      }
    }

    // Default button styling
    return baseClasses;
  };

  // Function to handle vote changes for participants
  const handleVoteChange = async (marketId: string, newVote: 'positive' | 'negative') => {
    if (!isConnected || !address) {
      showAlert('Please connect your wallet to vote', 'info', 'Connect Wallet');
      return;
    }

    // Check if user is a participant in this market
    const contractAddress = getContractAddress(marketId);
    if (!contractAddress || !isUserParticipant(contractAddress)) {
      showAlert('You must be a pot participant to vote', 'info', 'Join Pot');
      return;
    }

    // Get the table type for this market
    const tableType = Object.entries(CONTRACT_TO_TABLE_MAPPING).find(
      ([addr]) => addr === contractAddress
    )?.[1];

    if (!tableType) {
      showAlert('Unable to determine market type', 'error', 'Error');
      return;
    }

    try {
      // Set loading state for this market
      setVoteChangeLoading(prev => ({ ...prev, [marketId]: true }));

      // Get the market question for tracking
      const marketData = getMarkets(getTranslation(currentLanguage), marketId);
      const marketQuestion = marketData[0]?.question || 'Market prediction';

      // Check if this is a penalty-exempt contract and if we're day
      if (contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress)) {
        const eventDate = getEventDate(contractAddress);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        console.log("Event date:", eventDate, "Today's date:", today);
        if (eventDate === today) {
          showAlert('Predictions are not allowed on the day of the event.', 'error', 'Restriction');
          return;
        }
      }

      // Place/update the prediction
      await placeBitcoinBet(address, newVote, tableType, marketQuestion, contractAddress);

      // Update local state immediately for better UX
      const updatedPrediction: TodaysBet = {
        id: Date.now(), // temporary ID
        walletAddress: address,
        prediction: newVote,
        betDate: new Date().toISOString().split('T')[0],
        createdAt: new Date()
      };

      setUserPredictions(prev => ({
        ...prev,
        [marketId]: updatedPrediction
      }));

      // Show success message
      // showAlert(`Vote changed to ${newVote === 'positive' ? 'Yes' : 'No'} for ${marketId}`, 'success', 'Vote Updated');

    } catch (error) {
      console.error('Error changing vote:', error);
      showAlert(error instanceof Error ? error.message : 'Failed to change vote', 'error', 'Error');
    } finally {
      // Clear loading state
      setVoteChangeLoading(prev => ({ ...prev, [marketId]: false }));
    }
  };

  // Helper function to handle button clicks - support vote changing for participants
  const handleButtonClick = (marketId: string, buttonType: 'positive' | 'negative', originalClickHandler: (e: React.MouseEvent) => void) => {
    return async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const prediction = getUserPrediction(marketId);
      const contractAddress = getContractAddress(marketId);
      const isParticipant = contractAddress && isUserParticipant(contractAddress);
      const enoughParticipants = contractAddress && hasEnoughParticipants(contractAddress);
      const potInfo = contractAddress ? potInformation[contractAddress] : null;
      const potHasStarted = potInfo?.hasStarted || false;

      // If user is a participant but not enough players, redirect to NotReadyPage
      if (isParticipant && !enoughParticipants) {
        setActiveSection('notReadyPage');
        return;
      }

      // If user is a participant but pot hasn't started yet, redirect to NotReadyPage
      if (isParticipant && !potHasStarted) {
        console.log(`🚫 LandingPage: Participant tried to vote but pot hasn't started for ${contractAddress}`);
        setActiveSection('notReadyPage');
        return;
      }

      // If user is a participant and has already voted for this option, do nothing
      if (prediction && prediction.prediction === buttonType && isParticipant) {
        return;
      }

      // If user is a participant and wants to change their vote (with enough participants and pot started)
      if (prediction && prediction.prediction !== buttonType && isParticipant && enoughParticipants && potHasStarted) {
        await handleVoteChange(marketId, buttonType);
        return;
      }

      // If user is a participant but hasn't voted yet (with enough participants and pot started)
      if (isParticipant && !prediction && enoughParticipants && potHasStarted) {
        await handleVoteChange(marketId, buttonType);
        return;
      }

      // For non-participants, execute original click handler (navigate to pot entry)
      originalClickHandler(e);
    };
  };


  // Utility function to truncate text without trailing spaces before ellipsis
  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;

    // Find the last space before maxLength
    let cutoff = maxLength;
    while (cutoff > 0 && text[cutoff] !== ' ') {
      cutoff--;
    }

    // If no space found within reasonable range, try to find a better cutoff point
    if (cutoff === 0 || cutoff < maxLength * 0.6) {
      // Look for spaces in a wider range
      cutoff = Math.min(maxLength - 3, text.length);
      while (cutoff > maxLength * 0.5 && text[cutoff] !== ' ') {
        cutoff--;
      }
      // If still no good break point, just cut shorter to avoid mid-word breaks
      if (cutoff < maxLength * 0.5) {
        cutoff = Math.floor(maxLength * 0.8);
      }
    }

    // Trim any trailing spaces and add ellipsis
    return text.substring(0, cutoff).trimEnd() + '...';
  };

  const handleMarketClick = (marketId: string, reentry: boolean = false) => {
    const contractAddress = getContractAddress(marketId);

    if (contractAddress) {
      // Find the market question from the correct category
      let market: Market | undefined = undefined;

      // Try to find the market in the specific category first
      const marketCategory = getMarkets(t, marketId);
      market = marketCategory.find(m => m.id === marketId);

      // Fallback: try to find in current markets or options
      if (!market) {
        market = markets.find(m => m.id === marketId);
      }

      const marketQuestion = market?.question || '';
      const marketIcon = market?.icon || '';

      // Set the cookies with proper options
      Cookies.set('selectedMarket', contractAddress, {
        sameSite: 'lax',
        expires: 7 // Cookie expires in 7 days
      });

      Cookies.set('selectedMarketQuestion', marketQuestion, {
        sameSite: 'lax',
        expires: 7 // Cookie expires in 7 days
      });

      Cookies.set('selectedMarketIcon', marketIcon, {
        sameSite: 'lax',
        expires: 7 // Cookie expires in 7 days
      });

      // Always route to TutorialBridge (dashboard) so users can see the chart and choose their action
      setTimeout(() => {
        if (reentry) {
          console.log(reentry)
          setActiveSection('makePrediction');
        } else {
          console.log("Still call this")
          setActiveSection('potInfo');
        }
      }, 200);

    } else {
      showAlert(`${markets.find((m) => m.id === marketId)?.name} ${t.comingSoon}`, 'info', 'Coming Soon');
    }
  };

  // Skeleton component for market cards
  const MarketCardSkeleton = () => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-pulse">
      {/* Header skeleton */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-100 rounded w-1/2"></div>
        </div>
        <div className="w-6 h-6 bg-gray-200 rounded"></div>
      </div>

      {/* Price and timer skeleton */}
      <div className="mb-4">
        <div className="h-6 bg-gray-200 rounded w-20 mb-2"></div>
        <div className="h-4 bg-gray-100 rounded w-16"></div>
      </div>

      {/* Progress bar skeleton */}
      <div className="mb-4">
        <div className="h-2 bg-gray-100 rounded-full"></div>
      </div>

      {/* Buttons skeleton */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-12 bg-gray-200 rounded-lg"></div>
        <div className="h-12 bg-gray-200 rounded-lg"></div>
      </div>
    </div>
  );

  // Show LoadingScreenAdvanced first
  if (isLoading) {
    return <LoadingScreenAdvanced subtitle={t.loadingPredictions ||"Just a moment..."} />;
  }

  // Show skeleton loading second
  if (isSkeletonLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header area skeleton */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="flex gap-4 overflow-x-auto">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-100 rounded-lg w-24 flex-shrink-0"></div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main content skeleton */}
        <div className="max-w-7xl mx-auto p-4">
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-24"></div>
              </div>
            ))}
          </div>

          {/* Market cards skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <MarketCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <style>{`
        @keyframes pulse-right {
          0% { transform: translateX(0); }
          50% { transform: translateX(3px); }
          100% { transform: translateX(0); }
        }
        
        @keyframes professional-glow {
          0%, 100% {
            box-shadow: 
              0 0 0 1px rgba(220, 38, 38, 0.3),
              0 0 8px rgba(220, 38, 38, 0.15),
              0 0 16px rgba(220, 38, 38, 0.1);
          }
          50% {
            box-shadow: 
              0 0 0 1px rgba(220, 38, 38, 0.6),
              0 0 12px rgba(220, 38, 38, 0.3),
              0 0 24px rgba(220, 38, 38, 0.2),
              0 0 32px rgba(220, 38, 38, 0.1);
          }
        }
        
        @keyframes swapToFirst {
          0% { 
            transform: translateY(0) translateX(0) scale(1);
            z-index: 1;
          }
          50% { 
            transform: translateY(-20px) translateX(-10px) scale(1.05);
            z-index: 10;
          }
          100% { 
            transform: translateY(var(--swap-distance)) translateX(0) scale(1);
            z-index: 1;
          }
        }
        
        @keyframes swapFromFirst {
          0% { 
            transform: translateY(0) translateX(0) scale(1);
            z-index: 1;
          }
          50% { 
            transform: translateY(20px) translateX(10px) scale(0.95);
            z-index: 10;
          }
          100% { 
            transform: translateY(var(--swap-distance)) translateX(0) scale(1);
            z-index: 1;
          }
        }
        
        .swap-to-first {
          animation: swapToFirst 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          position: relative;
        }
        
        .swap-from-first {
          animation: swapFromFirst 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
          position: relative;
        }
        
        .pulsing-glow-selected {
          background: linear-gradient(135deg, rgb(220, 38, 38), rgb(239, 68, 68), rgb(55, 65, 81));
          animation: professional-glow 2.5s ease-in-out infinite;
        }
        
        @keyframes pulse-glow {
          0%, 100% { 
            transform: scale(1); 
            box-shadow: 0 0 0 0 rgba(17, 0, 0, 0.2);
          }
          50% { 
            transform: scale(1.02); 
            box-shadow: 0 0 0 3px rgba(17, 0, 0, 0.08), 0 0 10px rgba(170, 0, 0, 0.1);
          }
        }
        
        .animate-pulse-right {
          animation: pulse-right 6s ease-in-out infinite;
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
      `}</style>

      <div className="min-h-screen bg-white text-gray-900 overflow-hidden">

        {/* Markets Grid */}
        <section className="relative z-10 pt-2 md:mt-[5.5rem]">
          <div className="max-w-7xl mx-auto px-2 md:px-8">

            {/* Mobile Markets Display - All Markets */}
            <div className="md:hidden space-y-2 -translate-y-2">
              {(() => {
                // Get all markets and deduplicate by ID
                const allMarkets = marketOptions.map(option => {
                  const marketData = getMarkets(t, option.id);
                  const market = marketData[0]; // Get the first (main) market for each option

                  if (market) {
                    // Store the tab option ID so we can match it later
                    market.tabId = option.id;
                    // Update pot size with real balance
                    market.potSize = getRealPotBalance(option.id);
                    return market;
                  } else {
                    // Create a fallback market for categories without data
                    return {
                      id: option.id,
                      name: option.name,
                      symbol: option.symbol,
                      color: option.color || '#666666',
                      question: `${option.name} predictions coming soon...`,
                      icon: option.icon || '🔮',
                      currentPrice: '-',
                      participants: 0,
                      potSize: getRealPotBalance(option.id),
                      tabId: option.id
                    };
                  }
                });

                // Filter markets based on search query
                let filteredMarkets = searchQuery
                  ? allMarkets.filter(market =>
                    getTranslatedMarketQuestion(market, currentLanguage).toLowerCase().includes(searchQuery.toLowerCase()) ||
                    market.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  : allMarkets;

                // Filter markets based on tournament type (daily/weekly)
                if (tournamentFilter !== 'all') {
                  filteredMarkets = filteredMarkets.filter(market => {
                    const contractAddress = getContractAddress(market.id);
                    const isPenaltyExempt = contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress);

                    if (tournamentFilter === 'daily') {
                      return !isPenaltyExempt; // Daily tournaments are non-penalty-exempt
                    } else if (tournamentFilter === 'weekly') {
                      return isPenaltyExempt; // Weekly tournaments are penalty-exempt
                    } else if (tournamentFilter === 'recently') {
                      // Recently started: check if started_on_date is within 3 days
                      const potInfo = contractAddress ? potInformation[contractAddress] : null;
                      const startedOnDate = potInfo?.startedOnDate;
                      if (startedOnDate) {
                        const startDate = new Date(startedOnDate);
                        const today = new Date();
                        const diffTime = today.getTime() - startDate.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays <= 3;
                      }
                      return false;
                    }
                    return true;
                  });
                }

                // Reorder: selected market first, then others (match by tabId) - move displaced market further down
                const selectedMarketData = filteredMarkets.find(market => market.tabId === selectedMarket);
                const otherMarkets = filteredMarkets.filter(market => market.tabId !== selectedMarket);

                // Insert the selected market first, but put the previously selected market at position 16 instead of 2
                let orderedMarkets: typeof filteredMarkets = [];
                if (selectedMarketData) {
                  // Debug logging
                  // console.log('selectedMarket:', selectedMarket);
                  // console.log('previousSelectedMarket:', previousSelectedMarket);

                  orderedMarkets = [selectedMarketData];

                  // We want to move "Trending" market to position 16+, so filter it out from early positions
                  const trendingMarket = otherMarkets.find(market => market.tabId === 'Trending');
                  const otherMarketsFiltered = otherMarkets.filter(market => market.tabId !== 'Trending');

                  // Add first 15 other markets (excluding Trending)
                  orderedMarkets = [...orderedMarkets, ...otherMarketsFiltered.slice(0, 15)];

                  // Add the Trending market at position 16+ (only if it's not the currently selected market)
                  if (trendingMarket && selectedMarket !== 'Trending') {
                    orderedMarkets = [...orderedMarkets, trendingMarket];
                  }

                  // Add any remaining markets
                  orderedMarkets = [...orderedMarkets, ...otherMarketsFiltered.slice(15)];

                  // console.log('orderedMarkets first 5:', orderedMarkets.slice(0, 5).map(m => m.tabId));
                } else {
                  orderedMarkets = filteredMarkets;
                }

                // Apply pagination
                const displayedMarkets = orderedMarkets.slice(0, displayedMarketsCount);

                // Pre-calculate layout data for performance optimization
                const marketsWithLayoutData = displayedMarkets.map((market: Market, index: number) => {
                  const marketIndex = marketOptions.findIndex(m => m.id === market.id);
                  const useTraditionalLayout = ((marketIndex + 1) % 3 === 0) || marketIndex === 0;
                  return { ...market, marketIndex, useTraditionalLayout };
                });

                return marketsWithLayoutData.map((market, index: number) => {
                  // Calculate animation classes
                  const isSwapping = swapAnimation && swapAnimation.isAnimating;
                  const isSwappingToFirst = isSwapping && swapAnimation.toIndex === index;
                  const isSwappingFromFirst = isSwapping && swapAnimation.fromIndex === index;

                  // Calculate swap distance for CSS variable
                  const swapDistance = isSwapping
                    ? `${(Math.abs(swapAnimation.toIndex - swapAnimation.fromIndex) * 100)}px`
                    : '0px';

                  return (
                    <div key={`mobile-${market.id}-${index}`} className={market.marketIndex === 0 ? 'mt-2' : ''}>
                      <div className="relative">
                        {/* Re-enter button overlay - positioned outside opacity container */}
                        {(() => {
                          const contractAddress = getContractAddress(market.id);
                          const isEliminated = contractAddress && eliminationStatus[contractAddress];
                          const userIsParticipant = contractAddress ? isUserParticipant(contractAddress) : false;

                          return (isEliminated && userIsParticipant) ? (
                            <div className="absolute bottom-2 left-2 right-2 z-20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleMarketClick(market.id, true);
                                }}
                                className="w-full group relative overflow-hidden bg-black hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 hover:scale-[1.02]"
                              >
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                                  </svg>
                                  Re-enter
                                </span>
                              </button>
                            </div>
                          ) : null;
                        })()}

                        {/* Eliminated status overlay - positioned outside opacity container */}
                        {(() => {
                          const contractAddress = getContractAddress(market.id);
                          const isEliminated = contractAddress && eliminationStatus[contractAddress];

                          return isEliminated ? (
                            <div className="absolute top-2 right-2 z-20">
                              <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs text-[#ee0000]">
                                <span>Eliminated</span>
                              </div>
                            </div>
                          ) : null;
                        })()}

                        <div
                          onClick={() => {
                            if (!isSwapping) {
                              handleMarketClick(market.id);
                            }
                          }}
                          className={`group cursor-pointer relative overflow-hidden transition-all duration-500 ${market.marketIndex === 0 ? 'shadow-[-4px_0_12px_rgba(147,51,234,0.2),_0_-1px_20px_rgba(147,51,234,0.02),_4px_0_12px_rgba(59,130,246,0.2),_0_2px_16px_rgba(59,130,246,0.02)]' : 'hover:shadow-purple-200'} ${isSwappingToFirst ? 'swap-to-first' : isSwappingFromFirst ? 'swap-from-first' : ''
                            } ${animatingMarket === market.tabId ? 'animate-scale-once' : ''} ${(() => {
                              const contractAddress = getContractAddress(market.id);
                              const isEliminated = contractAddress && eliminationStatus[contractAddress];
                              return isEliminated ? 'opacity-60 grayscale-[0.3] rounded-lg' : 'rounded-2xl';
                            })()}`}
                          style={{
                            '--swap-distance': swapDistance
                          } as React.CSSProperties}
                        >
                          <div className={`h-full ${market.marketIndex === 0 ? 'min-h-[325px] bg-[#fefefe]' : 'min-h-[260px] bg-white'} flex flex-col justify-between transition-all duration-300 ${(() => {
                            const contractAddress = getContractAddress(market.id);
                            const isEliminated = contractAddress && eliminationStatus[contractAddress];

                            // Reduce bottom padding for non-traditional layouts to make div shorter
                            let classes = market.useTraditionalLayout ? 'p-4 pb-5' : 'p-4 pb-0';

                            // Add extra top padding for first market
                            if (market.marketIndex === 0) {
                              classes = classes.replace('p-4', 'px-4 pt-4 pb-4');
                            }

                            if (isEliminated) {
                              classes += ' border border-gray-300 rounded-lg';
                            } 
                            
                            else if (market.marketIndex === 0) {
                              // No bottom border for first market
                              if (market.tabId === selectedMarket) {
                                classes += ' shadow-lg shadow-purple-100/50';
                              }
                            } else if (market.tabId === selectedMarket) {
                              classes += ' border-b border-gray-200 shadow-lg shadow-purple-100/50';
                            } else {
                              classes += ' border-b border-gray-200';
                            }

                            return classes;
                          })()}`}>
                            {/* Background Gradient Accent */}
                            <div className="absolute top-0 left-0 right-0 h-1"></div>

                            {/* Main content area */}
                            <div className="flex-1 flex flex-col">
                            {/* Header with Icon, Question, and Percentage */}
                            <div className="flex items-center gap-3 mb-6 relative">
                              {/* Small Square Image */}
                              <div className="flex-shrink-0">
                                <div className={`rounded-lg ${market.marketIndex === 0 ? 'w-24 h-24' : 'w-16 h-16'} bg-white overflow-hidden relative`}>
                                {market.icon && (market.icon.slice(0, 1) === '/') ? (
                                <img
                                    src={market.icon}
                                    alt={`${market.name} Icon`}
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg text-gray-600">{market.icon}</span>
                                  </div>
                                )}
                                </div>
                              </div>

                              {/* Question */}
                              <div className={`flex-1 flex items-center ${(() => {
                                const contractAddress = getContractAddress(market.id);
                                const isEliminated = contractAddress && eliminationStatus[contractAddress];
                                const showThermometer = market.useTraditionalLayout && !isEliminated;
                                return showThermometer ? 'pr-16' : 'pr-4';
                              })()}`}>                <p className="text-sm leading-tight font-['Inter','system-ui','-apple-system','Segoe_UI','Roboto','Helvetica_Neue',sans-serif]" style={{
                                  color: '#374151',
                                  fontWeight: '650',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {(() => {
                                    const wrapLimit = market.useTraditionalLayout ? 25 : 37;
                                    const truncateLimit = 60;

                                    let text = getTranslatedMarketQuestion(market, currentLanguage);

                                    // Truncate if over 100 characters
                                    if (text.length > truncateLimit) {
                                      text = text.substring(0, truncateLimit) + '...';
                                    }

                                    // Insert line break at wrap limit (word boundary aware)
                                    if (text.length > wrapLimit) {
                                      let breakPoint = wrapLimit;

                                      // Find the last space before the wrap limit to avoid breaking words
                                      const textUpToLimit = text.substring(0, wrapLimit);
                                      const lastSpaceIndex = textUpToLimit.lastIndexOf(' ');

                                      // If we found a space and it's not too far back, use it as break point
                                      if (lastSpaceIndex > 0 && lastSpaceIndex > wrapLimit - 20) {
                                        breakPoint = lastSpaceIndex;
                                      }

                                      const beforeBreak = text.substring(0, breakPoint);
                                      const afterBreak = text.substring(breakPoint).trim(); // trim to remove leading space

                                      return (
                                        <>
                                          {beforeBreak}
                                          <br />
                                          {afterBreak}
                                        </>
                                      );
                                    }

                                    return text;
                                  })()}
                                </p>
                              </div>

                              {(() => {
                                // Mobile: Alternating layout system
                                const contractAddress = getContractAddress(market.id);
                                const isEliminated = contractAddress && eliminationStatus[contractAddress];

                                // Show percentage for first market - always display, fallback to 0%
                                if (market.marketIndex === 0 && !isEliminated) {
                                  return (
                                    <div className="absolute top-1/2 right-0 transform -translate-y-1/2">
                                      <div className="text-right flex flex-col items-end">
                                        {/* Just percentage for first market - vertically centered */}
                                        <div className="text-base font-bold text-gray-900 leading-none">
                                          {(() => {
                                            const percentageData = predictionPercentages[market.tabId || market.id];
                                            if (!percentageData) return '0%'; // Fallback to 0%

                                            const totalVotes = percentageData.totalPredictions ?? 0;
                                            const positive = Math.round((percentageData.positivePercentage ?? 0) / 100 * totalVotes);
                                            const negative = totalVotes - positive;
                                            const smoothedPercentage = (((positive + 0.5) / (positive + negative + 1)) * 100).toFixed(0);
                                            return smoothedPercentage + '%';
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                // Show thermometer for traditional layout (even index markets), but not for first market
                                else if (market.useTraditionalLayout && !isEliminated && market.marketIndex !== 0) {
                                  return (
                                    <div className="absolute top-0 right-0">
                                      <div className="text-right flex flex-col items-end">
                                        {/* Thermometer Arc */}
                                        <div className="w-16 h-8 mb-1 relative">
                                          <svg className="w-16 h-8" viewBox="0 0 100 50">
                                            {/* Background arc */}
                                            <path
                                              d="M 10 45 A 40 40 0 0 1 90 45"
                                              stroke="#e5e7eb"
                                              strokeWidth="6"
                                              fill="none"
                                              strokeLinecap="round"
                                            />
                                            {/* Progress arc */}
                                            <path
                                              d="M 10 45 A 40 40 0 0 1 90 45"
                                              stroke={(() => {
                                                const percentageData = predictionPercentages[market.tabId || market.id];
                                                const positivePercentage = percentageData?.positivePercentage ?? 0;
                                                return positivePercentage >= 80 ? '#10b981' :
                                                  positivePercentage >= 60 ? '#f59e0b' :
                                                    positivePercentage >= 40 ? '#f97316' : '#ef4444';
                                              })()}
                                              strokeWidth="6"
                                              fill="none"
                                              strokeLinecap="round"
                                              strokeDasharray={(() => {
                                                const percentageData = predictionPercentages[market.tabId || market.id];
                                                const positivePercentage = percentageData?.positivePercentage ?? 0;
                                                return `${positivePercentage * 1.26} 126`;
                                              })()}
                                              className="transition-all duration-300"
                                            />
                                          </svg>

                                          {/* Text overlaid inside the arc */}
                                          <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
                                            <div className="text-base font-bold text-gray-900 leading-none">
                                              {(() => {
                                                const percentageData = predictionPercentages[market.tabId || market.id];
                                                if (!percentageData) return '0'; // Fallback to 0%

                                                const totalVotes = percentageData.totalPredictions ?? 0;
                                                const positive = Math.round((percentageData.positivePercentage ?? 0) / 100 * totalVotes);
                                                const negative = totalVotes - positive;
                                                const smoothedPercentage = (((positive + 0.5) / (positive + negative + 1)) * 100).toFixed(0);
                                                return smoothedPercentage;
                                              })()}%
                                            </div>
                                            <div className="text-xs text-gray-500 leading-none -mt-0.5">chance</div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>


                            {(() => {
                              // Mobile: Alternating button layout system
                              if (market.useTraditionalLayout) {
                                // Traditional buttons (even index markets)
                                return (
                                  <div className={`flex justify-center gap-2 mb-3 ${market.marketIndex === 0 ? '-translate-y-1' : 'translate-y-3'}`}>
                                    <button
                                      onClick={handleButtonClick(market.id, 'positive', (e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        console.log('Yes button clicked for market:', market.id);
                                        Cookies.set('votingPreference', 'positive', { sameSite: 'lax', expires: 1 });
                                        Cookies.set('selectedMarketForVoting', market.id, { sameSite: 'lax', expires: 1 });
                                        // Visual feedback
                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#faf5ff';
                                        (e.currentTarget as HTMLButtonElement).style.color = '#7e22ce';
                                        // Navigate to market after brief visual feedback
                                        setTimeout(() => {
                                          handleMarketClick(market.id);
                                        }, 300);
                                      })}
                                      className={getButtonStyles(market.id, 'positive', "bg-purple-50 hover:bg-blue-200 text-purple-700 px-22 py-2 rounded-lg text-base font-bold transition-all duration-200 flex-1 max-w-[213px] flex items-center justify-center")}
                                    >
                                      {getButtonContent(market.id, 'positive')}
                                    </button>
                                    <button
                                      onClick={handleButtonClick(market.id, 'negative', (e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        console.log('No button clicked for market:', market.id);
                                        Cookies.set('votingPreference', 'negative', { sameSite: 'lax', expires: 1 });
                                        Cookies.set('selectedMarketForVoting', market.id, { sameSite: 'lax', expires: 1 });
                                        // Visual feedback
                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#eff6ff';
                                        (e.currentTarget as HTMLButtonElement).style.color = '#1d4ed8';
                                        // Navigate to market after brief visual feedback
                                        setTimeout(() => {
                                          handleMarketClick(market.id);
                                        }, 300);
                                      })}
                                      className={getButtonStyles(market.id, 'negative', "bg-blue-50 hover:bg-purple-200 text-blue-700 px-22 py-2 rounded-lg text-base font-bold transition-all duration-200 flex-1 max-w-[213px] flex items-center justify-center")}
                                    >
                                      {getButtonContent(market.id, 'negative')}
                                    </button>
                                  </div>
                                );
                              } else {
                                // Non-traditional layout: always show percentage layout with fallback to 0%
                                const percentages = predictionPercentages[market.tabId || market.id];

                                // Calculate percentages with fallback to 0%
                                let yesPercentage = 0;
                                let noPercentage = 0;

                                if (percentages) {
                                  const totalVotes = percentages.totalPredictions ?? 0;
                                  const positive = Math.round((percentages.positivePercentage ?? 0) / 100 * totalVotes);
                                  const negative = totalVotes - positive;
                                  yesPercentage = Math.round(((positive + 0.5) / (positive + negative + 1)) * 100);
                                  noPercentage = 100 - yesPercentage;
                                }

                                return (
                                  <div className={`flex items-center justify-between ${market.marketIndex === 0 ? 'mb-3 -translate-y-3' : 'mb-6'}`}>
                                    {/* Left side: Yes/No labels stacked */}
                                    <div className="flex flex-col gap-2">
                                      <div className="text-base font-normal text-black">{t.higher}</div>
                                      <div className="text-base font-normal text-black">{t.lower}</div>
                                    </div>

                                    {/* Right side: Percentages and buttons */}
                                    <div className="flex items-center gap-3">
                                      <div className="flex flex-col gap-2 text-right">
                                        <div className="text-base font-bold text-gray-900">{yesPercentage}%</div>
                                        <div className="text-base font-bold text-gray-900">{noPercentage}%</div>
                                      </div>
                                      <div className="flex flex-col gap-2">
                                        <button
                                          onClick={handleButtonClick(market.id, 'positive', (e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            console.log('Yes button clicked for market:', market.id);
                                            Cookies.set('votingPreference', 'positive', { sameSite: 'lax', expires: 1 });
                                            Cookies.set('selectedMarketForVoting', market.id, { sameSite: 'lax', expires: 1 });
                                            // Visual feedback
                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#faf5ff';
                                            (e.currentTarget as HTMLButtonElement).style.color = '#7e22ce';
                                            // Navigate to market after brief visual feedback
                                            setTimeout(() => {
                                              handleMarketClick(market.id);
                                            }, 300);
                                          })}
                                          className={`${getButtonStyles(market.id, 'positive', "bg-purple-50 hover:bg-blue-200 text-purple-700 px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 min-w-[45px]")}`}
                                        >
                                          {getButtonContent(market.id, 'positive')}
                                        </button>
                                        <button
                                          onClick={handleButtonClick(market.id, 'negative', (e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            console.log('No button clicked for market:', market.id);
                                            Cookies.set('votingPreference', 'negative', { sameSite: 'lax', expires: 1 });
                                            Cookies.set('selectedMarketForVoting', market.id, { sameSite: 'lax', expires: 1 });
                                            // Visual feedback
                                            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#eff6ff';
                                            (e.currentTarget as HTMLButtonElement).style.color = '#1d4ed8';
                                            // Navigate to market after brief visual feedback
                                            setTimeout(() => {
                                              handleMarketClick(market.id);
                                            }, 300);
                                          })}
                                          className={`${getButtonStyles(market.id, 'negative', "bg-blue-50 hover:bg-purple-200 text-blue-700 px-4 py-1.5 rounded-lg text-sm font-bold transition-all duration-200 min-w-[45px]")}`}
                                        >
                                          {getButtonContent(market.id, 'negative')}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            })()}
                            </div>

                            {/* Entry Fee -> Pot Balance Display */}
                            <div className={`flex justify-center items-center ${(() => {
                              // For first market on mobile, add additional -translate-y
                              if (market.marketIndex === 0) {
                                return '-translate-y-1';
                              }
                              return !market.useTraditionalLayout ? '-translate-y-8' : '';
                            })()}`}>
                              <div className="flex items-center gap-2 text-sm text-gray-700 opacity-100">
                                <span className= "font-bold opacity-50" style={{ fontFamily: '"SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif', fontWeight: '500' }}>{getEntryFeeDisplay(market.id)}</span>
                                <svg className="w-4 h-4 font-medium text-gray-700 opacity-40 " fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                <span className="text-[#039905] font-bold" style={{ fontFamily: '"SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif', fontWeight: '500' }}>{market.potSize}</span>
                              </div>
                            </div>

                            {/* Tip sentence for first market only */}
                            {(() => {
                              return market.marketIndex === 0 ? (
                                <div className="flex justify-start mb-2">
                                  <div className="text-base text-gray-500 text-left h-12 flex flex-col">
                                    <div className="flex-1 flex items-center justify-start">
                                      <p className="transition-opacity duration-300 leading-tight">
                                        <span className="text-[#040404] font-semibold">{t.tipLabel}</span>
                                        <span className="text-gray-400 font-bold mx-1 opacity-50" style={{ fontSize: '8px' }}>•</span>
                                        <span className="opacity-80">{tips[currentTipIndex]}</span>
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ) : null;
                            })()}

                            {/* Stats Footer */}
                            {(() => {
                              const contractAddress = getContractAddress(market.id);
                              const userIsParticipant = contractAddress ? isUserParticipant(contractAddress) : false;

                              if (userIsParticipant) {
                                // USER IS PARTICIPANT: Show ONLY full-width "More Info" button
                                return (
                                  <div className="absolute bottom-2 left-2 right-2 z-20">
                                    <button
                                      onClick={() => {
                                        handleMarketClick(market.id);
                                        setActiveSection('potInfo');
                                      }}
                                      className="w-full group relative overflow-hidden bg-black hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 hover:scale-[1.02]"
                                    >
                                      <span className="relative z-10 flex items-center justify-center gap-2">
                                        More Info
                                        <ArrowRight className="w-4 h-4 text-white" />
                                      </span>
                                    </button>
                                  </div>
                                );
                              } else {
                                // USER IS NOT PARTICIPANT: Show two-column layout
                                return (
                                  <div className={`flex justify-between items-center pt-2 ${(() => {
                                    return !market.useTraditionalLayout ? '-translate-y-2' : 'translate-y-2';
                                  })()}`}>
                              <div className="text-sm font-medium text-gray-700 opacity-50 leading-none flex items-center gap-2 tracking-wide" style={{ fontFamily: '"SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif', fontWeight: '500' }}>
                                {(() => {
                                  const contractAddress = getContractAddress(market.id);
                                  // Always show potTopic and daily/weekly info - no more timers in LandingPage
                                  const isPenaltyExempt = contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress);
                                  return (
                                    <>
                                      {market.potTopic || 'N/A'}
                                      <span className="font-medium text-gray-700 opacity-50" style={{ fontSize: '8px' }}>•</span>
                                      <RefreshCw className="w-3 h-3" />
                                      {isPenaltyExempt ? (t.weekly || 'Weekly') : (t.daily || 'Daily')}
                                    </>
                                  );
                                })()}
                              </div>

                                    {/* Non-participant: Show bookmark button */}
                                

                                    <button
                                      onClick={(e) => handleBookmarkToggle(market, e)}
                                      disabled={bookmarkLoading === market.id}
                                      className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                                      style={{ opacity: 0.7 }}
                                    >
                                      {bookmarkLoading === market.id ? (
                                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-purple-700 border-t-transparent"></div>
                                      ) : bookmarkedMarkets.has(market.id) ? (
                                        <Bookmark
                                          className="w-4 h-4 transition-all duration-200 text-purple-700 fill-purple-700"
                                        />
                                      ) : (
                                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <circle cx="12" cy="12" r="11" strokeWidth={1.5} />
                                          <path d="M12 7v10M7 12h10" strokeWidth={2} strokeLinecap="round" />
                                        </svg>
                                      )}
                                    </button>
                                  </div>
                                );
                              }
                            })()}

                            {/* Carousel indicators for first market only */}
                            {market.marketIndex === 0 && (
                              <div className="flex justify-center gap-1 mt-2">
                                {tips.map((_, index) => (
                                  <div
                                    key={index}
                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                      index === currentTipIndex ? 'bg-gray-600' : 'bg-gray-300'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Mobile Loading More Indicator - Hidden button */}
              {(() => {
                const allMarkets = marketOptions.length;
                const hasMoreMarkets = displayedMarketsCount < allMarkets && !searchQuery;

                return (
                  <div className="md:hidden">
                    {isLoadingMore && (
                      <div className="flex justify-center items-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
                        <span className="ml-3 text-gray-600">Loading more pots...</span>
                      </div>
                    )}

                    {/* Button hidden with 'hidden' class */}
                    {hasMoreMarkets && !isLoadingMore && (
                      <div className="text-center py-6 hidden">
                        <button
                          onClick={loadMoreMarkets}
                          className="bg-purple-700 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200"
                        >
                          Load More Pots ({allMarkets - displayedMarketsCount} remaining)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          </div>
        </section>

        {/* Desktop Markets Grid - Full Width */}
        <section className="relative z-10 -mt-24 pb-16 hidden md:block">
          <div className="max-w-7xl mx-auto px-2 md:px-8">
            {/* All Markets Display - Full Width Grid */}
            <div className="grid grid-cols-4 gap-4">
              {(() => {
                // Get all markets and deduplicate by ID
                const allMarkets = marketOptions.map(option => {
                  const marketData = getMarkets(t, option.id);
                  const market = marketData[0]; // Get the first (main) market for each option

                  if (market) {
                    // Store the tab option ID so we can match it later
                    market.tabId = option.id;
                    // Update pot size with real balance
                    market.potSize = getRealPotBalance(option.id);
                    return market;
                  } else {
                    // Create a fallback market for categories without data
                    return {
                      id: option.id,
                      name: option.name,
                      symbol: option.symbol,
                      color: option.color || '#666666',
                      question: `${option.name} predictions coming soon...`,
                      icon: option.icon || '🔮',
                      currentPrice: '-',
                      participants: 0,
                      potSize: getRealPotBalance(option.id),
                      tabId: option.id
                    };
                  }
                });

                // Filter markets based on search query
                let filteredMarkets = searchQuery
                  ? allMarkets.filter(market =>
                    getTranslatedMarketQuestion(market, currentLanguage).toLowerCase().includes(searchQuery.toLowerCase()) ||
                    market.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  : allMarkets;

                // Filter markets based on tournament type (daily/weekly)
                if (tournamentFilter !== 'all') {
                  filteredMarkets = filteredMarkets.filter(market => {
                    const contractAddress = getContractAddress(market.id);
                    const isPenaltyExempt = contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress);

                    if (tournamentFilter === 'daily') {
                      return !isPenaltyExempt; // Daily tournaments are non-penalty-exempt
                    } else if (tournamentFilter === 'weekly') {
                      return isPenaltyExempt; // Weekly tournaments are penalty-exempt
                    } else if (tournamentFilter === 'recently') {
                      // Recently started: check if started_on_date is within 3 days
                      const potInfo = contractAddress ? potInformation[contractAddress] : null;
                      const startedOnDate = potInfo?.startedOnDate;
                      if (startedOnDate) {
                        const startDate = new Date(startedOnDate);
                        const today = new Date();
                        const diffTime = today.getTime() - startDate.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays <= 3;
                      }
                      return false;
                    }
                    return true;
                  });
                }

                // Reorder: selected market first, then others (match by tabId) - move displaced market further down
                const selectedMarketData = filteredMarkets.find(market => market.tabId === selectedMarket);
                const otherMarkets = filteredMarkets.filter(market => market.tabId !== selectedMarket);

                // Insert the selected market first, but put the previously selected market at position 16 instead of 2
                let orderedMarkets: typeof filteredMarkets = [];
                if (selectedMarketData) {
                  orderedMarkets = [selectedMarketData];

                  // We want to move "Trending" market to position 16+, so filter it out from early positions
                  const trendingMarket = otherMarkets.find(market => market.tabId === 'Trending');
                  const otherMarketsFiltered = otherMarkets.filter(market => market.tabId !== 'Trending');

                  // Add first 15 other markets (excluding Trending)
                  orderedMarkets = [...orderedMarkets, ...otherMarketsFiltered.slice(0, 15)];

                  // Add the Trending market at position 16+ (only if it's not the currently selected market)
                  if (trendingMarket && selectedMarket !== 'Trending') {
                    orderedMarkets = [...orderedMarkets, trendingMarket];
                  }

                  // Add any remaining markets
                  orderedMarkets = [...orderedMarkets, ...otherMarketsFiltered.slice(15)];
                } else {
                  orderedMarkets = filteredMarkets;
                }

                // Apply pagination for desktop
                const displayedMarkets = orderedMarkets.slice(0, displayedMarketsCount);

                // Pre-calculate layout data for performance optimization
                const marketsWithLayoutData = displayedMarkets.map((market: Market, index: number) => {
                  const marketIndex = marketOptions.findIndex(m => m.id === market.id);
                  const useTraditionalLayout = ((marketIndex + 1) % 3 === 0) || marketIndex === 0;
                  return { ...market, marketIndex, useTraditionalLayout };
                });

                return marketsWithLayoutData.map((market, index) => {
                  // Calculate animation classes
                  const isSwapping = swapAnimation && swapAnimation.isAnimating;
                  const isSwappingToFirst = isSwapping && swapAnimation.toIndex === index;
                  const isSwappingFromFirst = isSwapping && swapAnimation.fromIndex === index;

                  // Calculate swap distance for CSS variable (desktop uses grid so different calculation)
                  const swapDistance = isSwapping
                    ? `${(Math.abs(swapAnimation.toIndex - swapAnimation.fromIndex) * 180)}px`
                    : '0px';

                  return (
                    <div key={`desktop-${market.id}-${index}`} className="relative">
                      {/* Re-enter button overlay - positioned outside opacity container */}
                      {(() => {
                        const contractAddress = getContractAddress(market.id);
                        const isEliminated = contractAddress && eliminationStatus[contractAddress];
                        const userIsParticipant = contractAddress ? isUserParticipant(contractAddress) : false;

                        return (isEliminated && userIsParticipant) ? (
                          <div className="absolute bottom-2 left-2 right-2 z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleMarketClick(market.id, true);
                              }}
                              className="w-full group relative overflow-hidden bg-black hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 hover:scale-[1.02]"
                            >
                              <span className="relative z-10 flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
                                </svg>
                                Re-enter
                              </span>
                            </button>
                          </div>
                        ) : null;
                      })()}

                      {/* Eliminated status overlay - positioned outside opacity container */}
                      {(() => {
                        const contractAddress = getContractAddress(market.id);
                        const isEliminated = contractAddress && eliminationStatus[contractAddress];

                        return isEliminated ? (
                          <div className="absolute top-2 right-2 z-20">
                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded text-xs text-[#ee0000]">
                              <span>Eliminated</span>
                            </div>
                          </div>
                        ) : null;
                      })()}

                      <div
                        onClick={() => {
                          if (!isSwapping) {
                            handleMarketClick(market.id);
                          }
                        }}
                        className={`group hover:scale-[1.004] rounded-2xl cursor-pointer relative overflow-hidden transition-all duration-500  hover:shadow-purple-200 ${isSwappingToFirst ? 'swap-to-first' : isSwappingFromFirst ? 'swap-from-first' : ''
                          } ${animatingMarket === market.tabId ? 'animate-scale-once' : ''} ${(() => {
                            const contractAddress = getContractAddress(market.id);
                            const isEliminated = contractAddress && eliminationStatus[contractAddress];
                            return isEliminated ? 'opacity-60 grayscale-[0.3]' : '';
                          })()}`}
                        style={{
                          '--swap-distance': swapDistance
                        } as React.CSSProperties}
                      >
                        <div className={`rounded-2xl p-3 h-full flex flex-col justify-between min-h-[180px] transition-all duration-300 bg-white ${(() => {
                          const contractAddress = getContractAddress(market.id);
                          const isEliminated = contractAddress && eliminationStatus[contractAddress];

                          if (isEliminated) {
                            return 'border border-gray-400 hover:border-gray-500';
                          } else {
                            return 'border border-gray-200 hover:border-gray-300';
                          }
                        })()}`}>

                          {/* Main content area */}
                          <div className="flex-1 flex flex-col">
                          {/* Header with Icon, Question, and Percentage */}
                          <div className="flex items-start gap-3 mb-3 relative">
                            {/* Small Square Image */}
                            <div className="flex-shrink-0">
                              <div className="rounded-lg w-14 h-14 bg-white overflow-hidden relative">
                                {market.icon && (market.icon.slice(0, 1) === '/') ? (
                                  <img
                                    src={market.icon}
                                    alt={`${market.name} Icon`}
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg text-gray-600">{market.icon}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Question */}
                            {(() => {
                              // Determine if thermometer will be shown to adjust question width
                              const contractAddress = getContractAddress(market.id);
                              const isEliminated = contractAddress && eliminationStatus[contractAddress];
                              const showThermometer = market.useTraditionalLayout && !isEliminated;

                              return (
                                <div className={`flex-1 ${showThermometer ? 'pr-16' : 'pr-4'}`}>
                                  <p className="text-sm leading-tight font-['Inter','system-ui','-apple-system','Segoe_UI','Roboto','Helvetica_Neue',sans-serif]" style={{
                                    color: '#374151',
                                    fontWeight: '650',
                                    maxHeight: '2.5rem',
                                    overflow: 'hidden'
                                  }}>
                                    {(() => {
                                      const charLimit = market.useTraditionalLayout ? 30 : 45; // Desktop: keep traditional tight, moderate expansion for new style
                                      return truncateText(getTranslatedMarketQuestion(market, currentLanguage), charLimit);
                                    })()}
                                  </p>
                                </div>
                              );
                            })()}

                            {(() => {
                              // Alternating layout system
                              const contractAddress = getContractAddress(market.id);
                              const isEliminated = contractAddress && eliminationStatus[contractAddress];

                              // Show thermometer for traditional layout (even index markets) - Desktop shows full thermometer including first market
                              if (market.useTraditionalLayout && !isEliminated) {
                                return (
                                  <div className="absolute top-0 -right-1">
                                    <div className="text-right flex flex-col items-end">
                                      {/* Thermometer Arc */}
                                      <div className="w-16 h-8 mb-1 relative">
                                        <svg className="w-16 h-8" viewBox="0 0 100 50">
                                          {/* Background arc */}
                                          <path
                                            d="M 10 45 A 40 40 0 0 1 90 45"
                                            stroke="#e5e7eb"
                                            strokeWidth="6"
                                            fill="none"
                                            strokeLinecap="round"
                                          />
                                          {/* Progress arc */}
                                          <path
                                            d="M 10 45 A 40 40 0 0 1 90 45"
                                            stroke={(() => {
                                              const percentageData = predictionPercentages[market.tabId || market.id];
                                              const positivePercentage = percentageData?.positivePercentage ?? 0;
                                              return positivePercentage >= 80 ? '#10b981' :
                                                positivePercentage >= 60 ? '#f59e0b' :
                                                  positivePercentage >= 40 ? '#f97316' : '#ef4444';
                                            })()}
                                            strokeWidth="6"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeDasharray={(() => {
                                              const percentageData = predictionPercentages[market.tabId || market.id];
                                              const positivePercentage = percentageData?.positivePercentage ?? 0;
                                              return `${positivePercentage * 1.26} 126`;
                                            })()}
                                            className="transition-all duration-300"
                                          />
                                        </svg>

                                        {/* Text overlaid inside the arc */}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
                                          <div className="text-base font-bold text-gray-900 leading-none">
                                            {(() => {
                                              const percentageData = predictionPercentages[market.tabId || market.id];
                                              if (!percentageData) return '0'; // Fallback to 0%

                                              const totalVotes = percentageData.totalPredictions ?? 0;
                                              const positive = Math.round((percentageData.positivePercentage ?? 0) / 100 * totalVotes);
                                              const negative = totalVotes - positive;
                                              const smoothedPercentage = (((positive + 0.5) / (positive + negative + 1)) * 100).toFixed(0);
                                              return smoothedPercentage;
                                            })()}%
                                          </div>
                                          <div className="text-xs text-gray-500 leading-none -mt-0.5">chance</div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>


                          {(() => {
                            // Alternating button layout system
                            if (market.useTraditionalLayout) {
                              // Traditional buttons (even index markets)
                              return (
                                <div className="flex justify-center gap-2 mb-3 translate-y-2">
                                  <button
                                    onClick={handleButtonClick(market.id, 'positive', (e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      console.log('Yes button clicked for market:', market.id);
                                      Cookies.set('votingPreference', 'positive', { sameSite: 'lax', expires: 1 });
                                      Cookies.set('selectedMarketForVoting', market.id, { sameSite: 'lax', expires: 1 });
                                      // Visual feedback
                                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#faf5ff';
                                      (e.currentTarget as HTMLButtonElement).style.color = '#7e22ce';
                                      // Navigate to market after brief visual feedback
                                      setTimeout(() => {
                                        handleMarketClick(market.id);
                                      }, 300);
                                    })}
                                    className={getButtonStyles(market.id, 'positive', "bg-purple-50 hover:bg-blue-200 text-purple-700 px-14 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex-1 max-w-[130px]")}
                                  >
                                    {getButtonContent(market.id, 'positive')}
                                  </button>
                                  <button
                                    onClick={handleButtonClick(market.id, 'negative', (e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      console.log('No button clicked for market:', market.id);
                                      Cookies.set('votingPreference', 'negative', { sameSite: 'lax', expires: 1 });
                                      Cookies.set('selectedMarketForVoting', market.id, { sameSite: 'lax', expires: 1 });
                                      // Visual feedback
                                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#eff6ff';
                                      (e.currentTarget as HTMLButtonElement).style.color = '#1d4ed8';
                                      // Navigate to market after brief visual feedback
                                      setTimeout(() => {
                                        handleMarketClick(market.id);
                                      }, 300);
                                    })}
                                    className={getButtonStyles(market.id, 'negative', "bg-blue-50 hover:bg-purple-200 text-blue-700 px-14 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 flex-1 max-w-[130px]")}
                                  >
                                    {getButtonContent(market.id, 'negative')}
                                  </button>
                                </div>
                              );
                            } else {
                              // Non-traditional layout: always show percentage layout with fallback to 0%
                              const percentages = predictionPercentages[market.tabId || market.id];

                              // Calculate percentages with fallback to 0%
                              let yesPercentage = 0;
                              let noPercentage = 0;

                              if (percentages) {
                                const totalVotes = percentages.totalPredictions ?? 0;
                                const positive = Math.round((percentages.positivePercentage ?? 0) / 100 * totalVotes);
                                const negative = totalVotes - positive;
                                yesPercentage = Math.round(((positive + 0.5) / (positive + negative + 1)) * 100);
                                noPercentage = 100 - yesPercentage;
                              }

                              return (
                                <div className="flex items-center justify-between mb-3">
                                  {/* Left side: Yes/No labels stacked */}
                                  <div className="flex flex-col gap-1">
                                    <div className="text-sm font-normal text-black">{t.higher}</div>
                                    <div className="text-sm font-normal text-black">{t.lower}</div>
                                  </div>

                                  {/* Right side: Percentages and buttons */}
                                  <div className="flex items-center gap-3">
                                    <div className="flex flex-col gap-1 text-right">
                                      <div className="text-lg font-bold text-gray-900">{yesPercentage}%</div>
                                      <div className="text-lg font-bold text-gray-900">{noPercentage}%</div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <button
                                        onClick={handleButtonClick(market.id, 'positive', (e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          console.log('Yes button clicked for market:', market.id);
                                          Cookies.set('votingPreference', 'positive', { sameSite: 'lax', expires: 1 });
                                          Cookies.set('selectedMarketForVoting', market.id, { sameSite: 'lax', expires: 1 });
                                          // Visual feedback
                                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#faf5ff';
                                          (e.currentTarget as HTMLButtonElement).style.color = '#7e22ce';
                                          // Navigate to market after brief visual feedback
                                          setTimeout(() => {
                                            handleMarketClick(market.id);
                                          }, 300);
                                        })}
                                        className={`${getButtonStyles(market.id, 'positive', "bg-purple-50 hover:bg-blue-200 text-purple-700 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 min-w-[35px]")}`}
                                      >
                                        {getButtonContent(market.id, 'positive')}
                                      </button>
                                      <button
                                        onClick={handleButtonClick(market.id, 'negative', (e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          console.log('No button clicked for market:', market.id);
                                          Cookies.set('votingPreference', 'negative', { sameSite: 'lax', expires: 1 });
                                          Cookies.set('selectedMarketForVoting', market.id, { sameSite: 'lax', expires: 1 });
                                          // Visual feedback
                                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#eff6ff';
                                          (e.currentTarget as HTMLButtonElement).style.color = '#1d4ed8';
                                          // Navigate to market after brief visual feedback
                                          setTimeout(() => {
                                            handleMarketClick(market.id);
                                          }, 300);
                                        })}
                                        className={`${getButtonStyles(market.id, 'negative', "bg-blue-50 hover:bg-purple-200 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 min-w-[35px]")}`}
                                      >
                                        {getButtonContent(market.id, 'negative')}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          })()}
                          </div>

                          {/* Entry Fee -> Pot Balance Display */}
                          <div className={`flex justify-center items-center ${(() => {
                              return !market.useTraditionalLayout ? '-translate-y-2' : 'py-1.5 translate-y-1';
                            })()}`} >
                            <div className="flex items-center gap-2 text-sm text-gray-700 opacity-100">
                              <span className= "font-bold opacity-50" style={{ fontFamily: '"SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif', fontWeight: '500' }}>{getEntryFeeDisplay(market.id)}</span>
                              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                              <span className="text-[#039905] font-bold" style={{ fontFamily: '"SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif', fontWeight: '500' }}>{market.potSize}</span>
                            </div>
                          </div>

                          {/* Stats Footer - Compact */}
                          {(() => {
                            const contractAddress = getContractAddress(market.id);
                            const userIsParticipant = contractAddress ? isUserParticipant(contractAddress) : false;

                            if (userIsParticipant) {
                              // USER IS PARTICIPANT: Show ONLY full-width "More Info" button
                              return (
                                <div className="pt-2">
                                  <button
                                    onClick={() => {
                                      handleMarketClick(market.id);
                                      setActiveSection('potInfo');
                                    }}
                                    className="w-full group relative overflow-hidden bg-black hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 hover:scale-[1.02]"
                                  >
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                      More Info
                                      <ArrowRight className="w-4 h-4 text-white" />
                                    </span>
                                  </button>
                                </div>
                              );
                            } else {
                              // USER IS NOT PARTICIPANT: Show two-column layout
                              return (
                                <div className={`flex justify-between items-center pt-2 ${(() => {
                                  return !market.useTraditionalLayout ? '' : '';
                                })()}`}>
                            <div className="text-sm font-medium text-gray-700 opacity-50 leading-none flex items-center gap-2 tracking-wide" style={{ fontFamily: '"SF Pro Display", "Segoe UI", system-ui, -apple-system, sans-serif', fontWeight: '500' }}>
                              {(() => {
                                const contractAddress = getContractAddress(market.id);
                                // Always show potTopic and daily/weekly info - no more timers in LandingPage
                                const isPenaltyExempt = contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress);
                                return (
                                  <>
                                    {market.potTopic || 'N/A'}
                                    <span className="font-medium text-gray-700 opacity-50" style={{ fontSize: '8px' }}>•</span>
                                    <RefreshCw className="w-3 h-3" />
                                    {isPenaltyExempt ? (t.weekly || 'Weekly') : (t.daily || 'Daily')}
                                  </>
                                );
                              })()}
                            </div>

                            <button
                              onClick={(e) => handleBookmarkToggle(market, e)}
                              disabled={bookmarkLoading === market.id}
                              className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                              style={{ opacity: 0.7 }}
                            >
                              {bookmarkLoading === market.id ? (
                                <div className="w-4 h-4 animate-spin rounded-full border-2 border-purple-700 border-t-transparent"></div>
                              ) : bookmarkedMarkets.has(market.id) ? (
                                <Bookmark
                                  className="w-4 h-4 transition-all duration-200 text-purple-700 fill-purple-700"
                                />
                              ) : (
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="11" strokeWidth={1.5} />
                                  <path d="M12 7v10M7 12h10" strokeWidth={2} strokeLinecap="round" />
                                </svg>
                              )}
                            </button>
                                </div>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Desktop Loading More Indicator - Hidden button */}
            {(() => {
              const allMarkets = marketOptions.length;
              const hasMoreMarkets = displayedMarketsCount < allMarkets && !searchQuery;

              return (
                <>
                  {isLoadingMore && (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-700"></div>
                      <span className="ml-4 text-gray-600 text-lg">Loading more pots...</span>
                    </div>
                  )}

                  {/* Button hidden with 'hidden' class */}
                  {hasMoreMarkets && !isLoadingMore && (
                    <div className="text-center py-8 hidden">
                      <button
                        onClick={loadMoreMarkets}
                        className="bg-purple-700 hover:bg-purple-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                      >
                        Load More Pots ({allMarkets - displayedMarketsCount} remaining)
                      </button>
                    </div>
                  )}
                </>
              );
            })()}

          </div>
        </section>

        {/* Thousands of Winners Section - Desktop */}
        <section className="relative z-10 py-16 hidden md:block">
          <div className="max-w-4xl mx-auto px-2 md:px-8 text-center">
            <div className="space-y-4 mb-12">
              <h2 className="text-4xl font-light text-gray-900 tracking-tight">
                <span className="text-purple-700 font-medium">{t.thousandsOfPlayers}</span>
              </h2>
              <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                {t.lastStandingQuestion}
              </h3>
            </div>

            {/* Minimalist Entry Button */}
            <button
              onClick={() => handleMarketClick('Trending')}
              className="group relative bg-black border-2 border-black text-white px-20 py-5 rounded-lg font-semibold text-xl tracking-[0.1em] uppercase transition-all duration-300 hover:bg-purple-700 hover:border-purple-700 hover:text-white overflow-hidden shadow-xl hover:shadow-purple-200"
            >
              <span className="relative z-10">Enter</span>

              {/* Sliding fill effect */}
              <div className="absolute inset-0 bg-purple-700 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"></div>

              {/* Subtle arrows that appear on hover */}
              <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0">
                <span className="text-white text-lg">→</span>
              </div>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <span className="text-white text-lg">←</span>
              </div>
            </button>
          </div>
        </section>

        {/* Sleek Call to Action - Mobile Only */}
        <section id="call-to-action" className="relative z-10 mt-16 mb-16 md:hidden">
          <div className="max-w-7xl mx-auto px-2 md:px-8 text-center">
            <h2 className="text-2xl font-light text-gray-900 mb-2 tracking-tight">
              <span className="text-purple-700 font-medium">{t.thousandsOfWinners}</span>
            </h2>
            <h3 className="text-xl font-black text-gray-900 mb-10 tracking-tight">
              {t.lastStandingQuestion}
            </h3>

            {/* Minimalist Entry Button - Mobile */}
            <button
              onClick={() => handleMarketClick('Trending')}
              className="group relative bg-white border-2 border-black text-black px-12 py-4 rounded-lg font-semibold text-base tracking-[0.1em] uppercase transition-all duration-300 hover:bg-purple-700 hover:border-purple-700 hover:text-white overflow-hidden mx-auto shadow-lg hover:shadow-purple-200"
            >
              <span className="relative z-10">Enter</span>

              {/* Sliding fill effect */}
              <div className="absolute inset-0 bg-purple-700 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out"></div>

              {/* Subtle arrows that appear on hover */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-2 group-hover:translate-x-0">
                <span className="text-white text-xs">→</span>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                <span className="text-white text-xs">←</span>
              </div>
            </button>
          </div>
        </section>

        <footer className="relative z-10 py-10 bg-white text-center text-purple-700 text-sm shadow-md">
          <div className="max-w-7xl mx-auto px-2 md:px-8">
            &copy; {new Date().getFullYear()} {t.footerText}
          </div>
        </footer>

        {/* Custom Alert */}
        <CustomAlert
          isOpen={alertState.isOpen}
          onClose={closeAlert}
          title={alertState.title}
          message={alertState.message}
          type={alertState.type}
          autoClose={alertState.autoClose}
        />

        {/* Tutorial Modal */}
        {showTutorial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 md:px-6 py-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  
                  <div>
                    <h2 className="text-sm md:text-lg font-semibold text-gray-900">
                      {t.howItWorksTitle || "How It Works"}
                    </h2>
                    <p className="text-xs md:text-sm text-gray-500">
                      Step {tutorialStep + 1} of {tutorialSteps.length}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Language dropdown in tutorial */}
                  <div className="relative " data-tutorial-language-dropdown>
                    <button
                      onClick={() => setIsTutorialLanguageDropdownOpen(!isTutorialLanguageDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 font-semibold rounded-md hover:bg-purple-800 hover:text-white transition-colors border border-purple-200"
                    >
                      <img
                        src={supportedLanguages.find(lang => lang.code === currentLanguage)?.flag}
                        alt="Current language"
                        className="object-cover rounded w-6 h-4"
                      />
                      <span className="text-sm font-medium">
                        {supportedLanguages.find(lang => lang.code === currentLanguage)?.name}
                      </span>
                      <svg
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isTutorialLanguageDropdownOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        strokeWidth="2"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Language dropdown menu */}
                    {isTutorialLanguageDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-[90]">
                        {supportedLanguages.map((language) => (
                          <button
                            key={language.code}
                            onClick={() => handleTutorialLanguageChange(language.code)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                              currentLanguage === language.code ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                            }`}
                          >
                            <img
                              src={language.flag}
                              alt={`${language.name} flag`}
                              className="w-4 h-3 object-cover rounded"
                            />
                            <span className="text-sm">{language.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={closeTutorial}
                    className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Close tutorial"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 p-6">
                {showTutorialEmailCollection ? (
                  /* Email Collection Step */
                  <EmailCollection
                    currentLanguage={currentLanguage}
                    onComplete={handleEmailCollectionComplete}
                    onSkip={handleEmailCollectionSkip}
                  />
                ) : (
                  /* Normal Tutorial Steps */
                  <>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-gray-900 mb-4">
                        {tutorialSteps[tutorialStep].title}
                      </h3>
                      <p className="text-gray-600 leading-relaxed">
                        {tutorialSteps[tutorialStep].content}
                      </p>
                    </div>

                    {/* Progress Dots */}
                    <div className="flex justify-center gap-2 mt-8">
                      {tutorialSteps.map((_, index) => (
                        <div
                          key={index}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === tutorialStep ? 'bg-purple-600' : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer - Only show navigation for tutorial steps, not email collection */}
              {!showTutorialEmailCollection && (
                <div className="border-t border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={prevTutorialStep}
                      disabled={tutorialStep === 0}
                      className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      {t.previous || "Previous"}
                    </button>

                    {tutorialStep === tutorialSteps.length - 1 ? (
                      <button
                        onClick={closeTutorial}
                        className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {t.startPlaying || "Get Started!"}
                      </button>
                    ) : (
                      <button
                        onClick={nextTutorialStep}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                      >
                        {t.next || "Next"}
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPage;