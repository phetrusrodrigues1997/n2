'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { getMarkets } from '../Constants/markets';
import { Language, getTranslation } from '../Languages/languages';
import {
  PENALTY_EXEMPT_CONTRACTS,
  MIN_PLAYERS,
  MIN_PLAYERS2,
  calculateEntryFee,
  PENALTY_EXEMPT_ENTRY_FEE,
  getTimerDataForContract,
  formatTimerDisplay,
  CONTRACT_TO_TABLE_MAPPING
} from '../Database/config';
import { getEventDate } from '../Database/eventDates';
import { useContractData } from '../hooks/useContractData';
import { getPredictionPercentages, isEliminated, getEliminatedPlayersCount } from '../Database/actions';
import { getUserPrediction } from '../Database/actions2';
import {
  Clock,
  Target,
 
  X,
  Trophy,
  DollarSign,
 
  Info,
 
  ChevronDown,
  Crown,
  Wallet,
  Eye,
  ArrowRight
} from 'lucide-react';
import Cookies from 'js-cookie';

interface PotInfoPageProps {
  currentLanguage?: Language;
  activeSection?: string;
  setActiveSection?: (section: string) => void;
}

const PotInfoPage: React.FC<PotInfoPageProps> = ({
  currentLanguage = 'en',
  setActiveSection
}) => {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const t = getTranslation(currentLanguage);

  // State for tournament data
  const [predictionPercentages, setPredictionPercentages] = useState<{ positivePercentage: number; negativePercentage: number; totalPredictions: number } | null>(null);
  const [userEliminated, setUserEliminated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  const [questionCountLoading, setQuestionCountLoading] = useState(true);
  const [eliminatedCount, setEliminatedCount] = useState(0);
  const [currentTimer, setCurrentTimer] = useState<string>('');
  const [isTournamentInfoCollapsed, setIsTournamentInfoCollapsed] = useState<boolean>(true);
  const [cookiesLoaded, setCookiesLoaded] = useState(false);
  const [dataLoadingComplete, setDataLoadingComplete] = useState(false);
  const [hasUserPredictedToday, setHasUserPredictedToday] = useState<boolean | null>(null);

  // Tournament state from NotReadyPage logic
  const [potInfo, setPotInfo] = useState<{
    hasStarted: boolean;
    isFinalDay: boolean;
    startedOnDate: string | null;
  }>({
    hasStarted: false,
    isFinalDay: false,
    startedOnDate: null
  });

  // Get market data from cookies - with proper loading state
  const [contractAddress, setContractAddress] = useState<string | undefined>(undefined);
  const [marketQuestion, setMarketQuestion] = useState<string>('');
  const [marketIcon, setMarketIcon] = useState<string>('');

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Load cookies on mount with retry mechanism and timeout
  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10; // Max 5 seconds of retrying
    let timeoutId: NodeJS.Timeout;

    const loadCookies = () => {
      const contract = Cookies.get('selectedMarket');
      const question = Cookies.get('selectedMarketQuestion') || '';
      const icon = Cookies.get('selectedMarketIcon') || '';

      console.log('🍪 PotInfoPage - Loading cookies (attempt:', retryCount + 1, '):', {
        contract,
        question,
        icon,
        timestamp: new Date().toISOString()
      });

      if (contract) {
        setContractAddress(contract);
        setMarketQuestion(question);
        setMarketIcon(icon);
        setCookiesLoaded(true);
        console.log('✅ PotInfoPage - Cookies loaded successfully');
      } else {
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`⚠️ PotInfoPage - No contract cookie found, retrying... (${retryCount}/${maxRetries})`);
          timeoutId = setTimeout(loadCookies, 500);
        } else {
          console.error('❌ PotInfoPage - Failed to load cookies after maximum retries');
          // Set cookies loaded to true to avoid infinite loading
          setCookiesLoaded(true);
          setDataLoadingComplete(true);
          setIsLoading(false);
        }
      }
    };

    // Start loading cookies immediately
    loadCookies();

    // Cleanup timeout on unmount
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);


  // Find market by contract address - need to search all categories
  const findMarketByContract = (contractAddr: string) => {
    const categories = ['Trending', 'formula1', 'Crypto', 'stocks', 'music', 'politics', 'sports', 'elections', 'tvshows', 'popculture', 'technews', 'movies', 'space', 'fashion', 'celebs', 'health', 'gaming', 'weather', 'travel', 'xtrends'];

    for (const category of categories) {
      try {
        const markets = getMarkets(t, category);
        const market = markets.find(m => m.contractAddress === contractAddr);
        if (market) {
          return market;
        }
      } catch (error) {
        console.error(`Error searching category "${category}":`, error);
      }
    }

    return null;
  };

  const market = contractAddress ? findMarketByContract(contractAddress) : null;


  // Use contract data hook
  const { contractAddresses, participantsData, balancesData } = useContractData();

  // Find the index of our contract address in the contractAddresses array
  const contractIndex = contractAddresses.findIndex(addr => addr === contractAddress);
  const participants = contractIndex !== -1 ? participantsData[contractIndex] : undefined;
  // Calculate remaining players: unique participants - eliminated players
  const uniqueParticipants = participants ? Array.from(new Set(participants)).length : 0;
  const playerCount = Math.max(0, uniqueParticipants - eliminatedCount);
  const isParticipant = participants && address ? participants.includes(address as `0x${string}`) : false;

  // Check for special admin addresses (same as TutorialBridge)
  const SPECIAL_ADDRESSES = ['0xA90611B6AFcBdFa9DDFfCB2aa2014446297b6680', '0x8bc670d5339AEa659c8DAb19D39206d046a250f8'];
  const isSpecialUser = address && SPECIAL_ADDRESSES.map(addr => addr.toLowerCase()).includes(address.toLowerCase());

  


  // Player count logic from NotReadyPage
  const getParticipantCounts = () => {
    if (!contractAddress) {
      console.log('❌ getParticipantCounts: No contract address');
      return { current: 0, required: MIN_PLAYERS };
    }

    console.log('🔍 getParticipantCounts Debug:', {
      cookieContractAddress: contractAddress,
      contractAddresses: contractAddresses,
      contractAddressesLength: contractAddresses.length,
      participantsDataLength: participantsData.length,
      addressComparison: contractAddresses.map((addr, idx) => ({
        index: idx,
        address: addr,
        matches: addr === contractAddress,
        cookieAddr: contractAddress
      }))
    });

    const contractIndex = contractAddresses.findIndex(addr => addr === contractAddress);
    console.log('🎯 getParticipantCounts contractIndex:', contractIndex);

    if (contractIndex === -1) {
      console.log('❌ Contract not found in contractAddresses array:', {
        lookingFor: contractAddress,
        available: contractAddresses
      });
      return { current: 0, required: MIN_PLAYERS };
    }

    const participants = participantsData[contractIndex];
    const uniqueParticipants = participants && Array.isArray(participants) ? Array.from(new Set(participants)).length : 0;
    const requiredCount = contractIndex === 0 ? MIN_PLAYERS : MIN_PLAYERS2;

    // Calculate remaining players: unique participants - eliminated players
    const currentCount = Math.max(0, uniqueParticipants - eliminatedCount);

    console.log('📊 getParticipantCounts Result:', {
      contractIndex,
      participants: participants ? participants.length : 'null/undefined',
      uniqueParticipants,
      eliminatedCount,
      currentCount,
      requiredCount
    });

    return { current: currentCount, required: requiredCount };
  };

  const { current, required } = getParticipantCounts();

  // Penalty-exempt contract detection
  const isPenaltyExempt = contractAddress ? PENALTY_EXEMPT_CONTRACTS.includes(contractAddress) : false;

  // Tournament state determination (same as NotReadyPage)
  const hasEnoughPlayers = isPenaltyExempt ? true : current >= required;
  const isPotReady = hasEnoughPlayers && potInfo.hasStarted;

  // Helper function to get simplified player message
  const getPlayerMessage = () => {
    if (isLoading) return 'Loading...';

    if (userEliminated) return 'Eliminated';

    if (!isConnected) return 'Sign in to join';

    
      
    

    if (potInfo.hasStarted) {
      if (questionCountLoading) {
        return 'Loading...';
      }
      return `${current} players remaining`;
    } else {
      if (hasEnoughPlayers) {
        return `Starting soon`;
      }
      return `Waiting for more players`;
    }
  };

  // Load additional data - only after cookies are loaded
  useEffect(() => {
    if (!cookiesLoaded) {
      console.log('⏳ PotInfoPage - Waiting for cookies to load...');
      return;
    }

    console.log('🔄 PotInfoPage - useEffect triggered:', {
      contractAddress,
      address,
      cookiesLoaded,
      shouldLoad: !!(contractAddress && address)
    });

    const loadTournamentData = async () => {
      if (!contractAddress || !address) {
        console.log('⚠️ PotInfoPage - Skipping data load:', {
          missingContract: !contractAddress,
          missingAddress: !address
        });
        setDataLoadingComplete(true);
        setIsLoading(false);
        return;
      }

      console.log('📊 PotInfoPage - Loading tournament data for:', contractAddress);

      try {
        // Load prediction percentages
        console.log('📈 PotInfoPage - Loading prediction percentages...');
        const percentages = await getPredictionPercentages(contractAddress);
        console.log('📈 PotInfoPage - Prediction percentages loaded:', percentages);
        setPredictionPercentages(percentages);

        // Get question count (total predictions = current question number)
        if (percentages && percentages.totalPredictions > 0) {
          setQuestionCount(percentages.totalPredictions);
        } else {
          setQuestionCount(null);
        }
        setQuestionCountLoading(false);

        // Check if user is eliminated
        console.log('🔍 PotInfoPage - Checking if user is eliminated...');
        // Convert contract address to table type
        const tableType = CONTRACT_TO_TABLE_MAPPING[contractAddress as keyof typeof CONTRACT_TO_TABLE_MAPPING];
        const eliminated = await isEliminated(address, tableType);
        console.log('🔍 PotInfoPage - User elimination status:', eliminated);
        setUserEliminated(eliminated ? true : false);

        // Get eliminated players count
        console.log('🔍 PotInfoPage - Getting eliminated players count...');
        const eliminatedPlayersCount = await getEliminatedPlayersCount(tableType);
        console.log('🔍 PotInfoPage - Eliminated players count:', eliminatedPlayersCount);
        setEliminatedCount(eliminatedPlayersCount);

        // Check if user has made a prediction for today
        console.log('🔍 PotInfoPage - Checking if user has predicted for today...');
        try {
          // Get current UTC date for prediction check
          const today = new Date();
          const currentUTCDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format

          const userPrediction = await getUserPrediction(contractAddress, address, currentUTCDate);
          const hasPredicted = userPrediction !== null;
          console.log('🔍 PotInfoPage - User prediction check:', {
            currentUTCDate,
            userPrediction,
            hasPredicted
          });
          setHasUserPredictedToday(hasPredicted);
        } catch (error) {
          console.error('❌ PotInfoPage - Error checking user prediction:', error);
          setHasUserPredictedToday(false);
        }

        console.log('✅ PotInfoPage - All tournament data loaded successfully');
      } catch (error) {
        console.error('❌ PotInfoPage - Error loading tournament data:', error);
        setQuestionCountLoading(false);
      } finally {
        console.log('🏁 PotInfoPage - Setting data loading complete');
        setDataLoadingComplete(true);
        setIsLoading(false);
      }
    };

    loadTournamentData();
  }, [contractAddress, address, cookiesLoaded]);

  // Timer update effect
  useEffect(() => {
    if (!contractAddress) return;

    const updateTimer = () => {
      const timerData = getTimerDataForContract(contractAddress);
      const formattedTimer = formatTimerDisplay(timerData);
      setCurrentTimer(formattedTimer);
    };

    // Update immediately
    updateTimer();

    // Set up interval to update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [contractAddress]);

  // Debug logging effect
  useEffect(() => {
    console.log('🔍 Tournament Journey Debug:', {
      isParticipant,
      userEliminated,
      potInfo,
      questionCount,
      questionCountLoading,
      hasUserPredictedToday,
      predictStepCompleted: isParticipant && !questionCountLoading && questionCount !== null,
      shouldShowPredictButton: isParticipant && potInfo.hasStarted && !questionCountLoading && questionCount === null,
      newPredictStepLogic: isParticipant && hasUserPredictedToday === true
    });
  }, [isParticipant, userEliminated, potInfo, questionCount, questionCountLoading, hasUserPredictedToday]);

  // Fetch pot information (same logic as NotReadyPage)
  useEffect(() => {
    const fetchPotInfo = async () => {
      if (!contractAddress) return;

      try {
        const response = await fetch('/api/pot-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractAddress })
        });

        if (response.ok) {
          const data = await response.json();
          setPotInfo({
            hasStarted: data.hasStarted || false,
            isFinalDay: data.isFinalDay || false,
            startedOnDate: data.startedOnDate || null
          });
        }
      } catch (error) {
        console.error('Error fetching pot info:', error);
      }
    };

    if (contractAddress) {
      fetchPotInfo();
    }
  }, [contractAddress]);

  // Show loading screen while data is being fetched
  const showLoadingScreen = !cookiesLoaded || !contractAddress || !market || isLoading || !dataLoadingComplete;

  console.log('🖥️ PotInfoPage - Render Decision:', {
    showLoadingScreen,
    reasons: {
      cookiesNotLoaded: !cookiesLoaded,
      noContract: !contractAddress,
      noMarket: !market,
      isLoading,
      dataNotComplete: !dataLoadingComplete
    }
  });

  if (showLoadingScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 flex items-center justify-center relative">
        {/* Back button - always visible - Mobile optimized */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
          <button
            onClick={() => setActiveSection && setActiveSection('home')}
            className="flex items-center gap-1.5 md:gap-2 text-gray-600 hover:text-purple-600 transition-colors duration-200 font-medium text-sm tracking-wide bg-white/90 hover:bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-gray-200/60 hover:border-purple-300 backdrop-blur-sm shadow-sm"
          >
            <span className="text-base md:text-sm">←</span>
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>

        <div className="text-center max-w-sm md:max-w-md mx-auto px-4 md:px-6">
          {/* Enhanced loading animation */}
          <div className="relative mb-8">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-20 w-20 border-4 border-transparent border-r-purple-400 animate-spin mx-auto" style={{animationDuration: '3s', animationDirection: 'reverse'}}></div>
          </div>

          {/* Loading title with gradient */}
          <div className="mb-4">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-full px-4 py-2 mb-4">
              <div className="w-2 h-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-purple-700">Loading Tournament</span>
            </div>
          </div>

          <h3 className="text-2xl font-light text-gray-900 mb-3">Getting everything ready</h3>
          <p className="text-gray-600 leading-relaxed">
            {!cookiesLoaded ? 'Loading tournament data...' :
             !contractAddress ? 'Getting market information...' :
             !market ? 'Finding tournament details...' :
             !dataLoadingComplete ? 'Loading predictions and stats...' :
             'Getting tournament information...'}
          </p>

          {/* Loading progress indicators */}
          <div className="mt-8 flex justify-center space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1.2s'
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  console.log('🚀 PotInfoPage - Rendering main content with market:', market.id);

  // Tournament type detection
  const isWeeklyTournament = contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress as any);
  const tournamentType = isWeeklyTournament ? 'Weekly' : 'Daily';

  // Calculate entry fee
  const getEntryFee = () => {
    if (!contractAddress) return null;
    if (isPenaltyExempt) {
      return PENALTY_EXEMPT_ENTRY_FEE;
    }
    return calculateEntryFee(potInfo.hasStarted, potInfo.startedOnDate);
  };

  const entryFee = getEntryFee();

  // Get next question timing for penalty-exempt contracts
  const getNextQuestionInfo = () => {
    if (!contractAddress || !isPenaltyExempt) return null;

    const eventDate = getEventDate(contractAddress);
    if (!eventDate) return null;

    const eventDateTime = new Date(eventDate + 'T00:00:00Z');
    const now = new Date();

    if (eventDateTime > now) {
      return {
        type: 'event',
        date: eventDateTime,
        label: 'Event Date'
      };
    } else {
      // Event has passed, prediction deadline is at 23:59 of the same day
      const predictionDeadline = new Date(eventDate + 'T23:59:59Z');
      return {
        type: 'deadline',
        date: predictionDeadline,
        label: 'Prediction Deadline'
      };
    }
  };


  // Get days since tournament started
  const getDaysSinceStart = () => {
    if (!potInfo.hasStarted || !potInfo.startedOnDate) return null;

    const startDate = new Date(potInfo.startedOnDate);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff + 1; // +1 because start day is day 1
  };



  // Status determination (simplified since we don't have potInfo)
  const getStatus = () => {
    if (isLoading) return 'Loading...';
    if (playerCount > 0) return 'Active';
    // Note: If we add "Begins Soon" status later, it would go here
    return 'Open for Entry';
  };

  const getStatusColor = () => {
    const status = getStatus();
    if (status === 'Active') return 'text-green-600 bg-green-100';
    if (status === 'Loading...') return 'text-gray-600 bg-gray-100';
    // Note: If we add "Begins Soon" status later, it would get orange styling here
    return 'text-blue-600 bg-blue-100'; // For "Open for Entry"
  };

  const handleReady = () => {
    // Route based on participation status (same logic as TutorialBridge)
    if (!setActiveSection) return;

    if (!isConnected || !address) {
      // Not connected, send to pot entry page which will prompt for wallet connection
      console.log('User not connected - sending to predictionPotTest');
      setActiveSection('bitcoinPot');
      return;
    }

    console.log('🔍 PotInfoPage handleReady - Routing decision:', {
      isParticipant,
      isSpecialUser,
      contractAddress
    });

    if (isParticipant && !isSpecialUser) {
      console.log('User is already a participant, redirecting to makePrediction');
      setActiveSection('makePrediction');
    } else {
      console.log('User is not a participant, redirecting to predictionPotTest');
      setActiveSection('bitcoinPot');
    }
  };

  const handleBack = () => {
    // Navigate back to home
    if (setActiveSection) {
      setActiveSection('home');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Header */}
      <div className="flex items-center p-4">
        <button
          onClick={handleBack}
          className="text-gray-900 hover:text-gray-600 transition-colors"
        >
          <span className="text-xl">←</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col min-h-[calc(100vh-64px)]">
        <div className="flex-1 px-4">
          {/* Clean Question Display */}
          <div className="mb-6">
            <div className="text-sm text-gray-500 mb-2">
              {contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress)
                ? 'Question of the Week'
                : 'Question of the Day'
              }
            </div>
            <h1 className="text-xl md:text-2xl font-medium text-gray-900 leading-tight">
              {marketQuestion || market?.question || 'Loading...'}
            </h1>
          </div>

          {/* Tournament Journey Flow - Keep as is */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 md:p-4 mb-4">
            <div className="text-xs text-gray-500 mb-4 text-center">Your progress</div>

            <div className="relative flex items-center justify-between px-4 md:px-8 py-2">
              {/* Step 1: Join */}
              <div className="flex flex-col items-center relative z-10">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold mb-2 md:mb-3 transition-all duration-300 shadow-sm ${
                  !isParticipant
                    ? 'bg-purple-600 text-white border-2 border-purple-600 animate-pulse-soft shadow-purple-200'
                    : isParticipant && !potInfo.hasStarted
                      ? 'bg-purple-600 text-white border-2 border-purple-600 animate-pulse-soft shadow-purple-200'
                    : isParticipant
                      ? 'bg-gray-800 text-white border-2 border-gray-800 shadow-gray-200'
                      : 'bg-slate-200 text-slate-500 border-2 border-slate-200'
                }`}>
                  {!isParticipant ? '1' : isParticipant && !potInfo.hasStarted ? '✓' : '✓'}
                </div>
                <div className="text-xs font-medium text-slate-700 text-center">Join</div>
              </div>

              {/* Step 2: Predict */}
              <div className="flex flex-col items-center relative z-10">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold mb-2 md:mb-3 transition-all duration-300 shadow-sm ${
                  isParticipant && !userEliminated && potInfo.hasStarted && hasUserPredictedToday === false
                    ? 'bg-purple-600 text-white border-2 border-purple-600 animate-pulse-soft shadow-purple-200'
                    : isParticipant && !userEliminated && hasUserPredictedToday === true
                      ? 'bg-gray-800 text-white border-2 border-gray-800 shadow-gray-200'
                      : 'bg-slate-200 text-slate-500 border-2 border-slate-200'
                }`}>
                  {isParticipant && !userEliminated && hasUserPredictedToday === true ? '✓' : '2'}
                </div>
                <div className="text-xs font-medium text-slate-700 text-center">Predict</div>
              </div>

              {/* Step 3: Wait */}
              <div className="flex flex-col items-center relative z-10">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold mb-2 md:mb-3 transition-all duration-300 shadow-sm ${
                  isParticipant && !userEliminated && hasUserPredictedToday === true && !potInfo.isFinalDay
                    ? 'bg-purple-600 text-white border-2 border-purple-600 animate-pulse-soft shadow-purple-200'
                    : isParticipant && !userEliminated && hasUserPredictedToday === true && potInfo.isFinalDay
                      ? 'bg-gray-800 text-white border-2 border-gray-800 shadow-gray-200'
                      : 'bg-slate-200 text-slate-500 border-2 border-slate-200'
                }`}>
                  {isParticipant && !userEliminated && hasUserPredictedToday === true && potInfo.isFinalDay ? '✓' : '3'}
                </div>
                <div className="text-xs font-medium text-slate-700 text-center">Wait</div>
              </div>

              {/* Step 4: Last 5 */}
              <div className="flex flex-col items-center relative z-10">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold mb-2 md:mb-3 transition-all duration-300 shadow-sm ${
                  isParticipant && !userEliminated && potInfo.isFinalDay
                    ? 'bg-amber-500 text-white border-2 border-amber-500 animate-pulse-soft shadow-amber-200'
                    : userEliminated
                      ? 'bg-rose-500 text-white border-2 border-rose-500 animate-pulse-soft shadow-rose-200'
                      : 'bg-slate-200 text-slate-500 border-2 border-slate-200'
                }`}>
                  {userEliminated ? '!' : '4'}
                </div>
                <div className="text-xs font-medium text-slate-700 text-center leading-tight">
                  {userEliminated ? 'Re-enter' : 'Last 5'}
                </div>
              </div>

              {/* Step 5: Win */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-200 border-2 border-slate-200 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold text-slate-500 mb-2 md:mb-3 shadow-sm transition-all duration-300">
                  5
                </div>
                <div className="text-xs font-medium text-slate-700 text-center">Win</div>
              </div>

              {/* Enhanced Connecting Lines with Gradients - Responsive */}
              <div className="absolute top-5 md:top-6 left-0 right-0 flex items-center justify-between px-8 md:px-14">
                {/* Line 1->2 */}
                <div className="flex-1 h-0.5 md:h-1 mx-2 md:mx-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-700 ease-out rounded-full ${
                    isParticipant ? 'bg-gradient-to-r from-purple-600 to-purple-600' : 'bg-slate-300'
                  }`} style={{ width: isParticipant ? '100%' : '0%' }}></div>
                </div>

                {/* Line 2->3 */}
                <div className="flex-1 h-0.5 md:h-1 mx-2 md:mx-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-700 ease-out rounded-full ${
                    isParticipant && hasUserPredictedToday === true ? 'bg-gradient-to-r from-purple-600 to-purple-600' : 'bg-slate-300'
                  }`} style={{ width: isParticipant && hasUserPredictedToday === true ? '100%' : '0%' }}></div>
                </div>

                {/* Line 3->4 */}
                <div className="flex-1 h-0.5 md:h-1 mx-2 md:mx-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full transition-all duration-700 ease-out rounded-full ${
                    potInfo.isFinalDay ? 'bg-gradient-to-r from-purple-600 to-purple-600' : 'bg-slate-300'
                  }`} style={{ width: potInfo.isFinalDay ? '100%' : '0%' }}></div>
                </div>

                {/* Line 4->5 */}
                <div className="flex-1 h-0.5 md:h-1 mx-2 md:mx-3 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-300 rounded-full" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>

            {/* Next Question Timer - Only show if pot has started */}
            {potInfo.hasStarted && (
              <div className="mt-4 md:mt-6 flex justify-center">
                <div className="flex items-center gap-2 bg-gray-50 rounded-full px-3 py-2">
                  <div className="w-3 h-3 bg-gray-700 rounded-full flex items-center justify-center">
                    <Clock className="w-1.5 h-1.5 md:w-2 md:h-2 text-white" />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">Next question:</span>
                  <span className="font-black text-gray-900 text-xs md:text-sm tracking-wider">
                    {currentTimer}
                  </span>
                </div>
              </div>
            )}
          </div>


          {/* Tournament Details - Simplified */}
          <div className="bg-white border border-gray-200 rounded-lg mb-6">
            <div
              onClick={() => setIsTournamentInfoCollapsed(!isTournamentInfoCollapsed)}
              className="cursor-pointer p-4 border-b border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium text-gray-900">Tournament Details</h3>
                  <p className="text-sm text-gray-500 mt-1">{tournamentType} tournament</p>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isTournamentInfoCollapsed ? '' : 'rotate-180'}`} />
              </div>
            </div>

            {!isTournamentInfoCollapsed && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Entry Fee</h4>
                    <p className="text-sm text-gray-600 mt-1">${entryFee?.toFixed(2) || '0.00'}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Format</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {isPenaltyExempt ? 'Weekly elimination' : 'Daily elimination'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Topic</h4>
                    <p className="text-sm text-gray-600 mt-1">{market?.potTopic || 'General'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Section - Polymarket Style */}
        <div className="p-4 border-t border-gray-100">
          {/* Status */}
          <div className="text-center mb-3">
            <span className="text-sm text-gray-500">{getPlayerMessage()}</span>
          </div>

          {/* Action Button */}
          <button
            onClick={handleReady}
            disabled={!isConnected || (isParticipant && userEliminated)}
            className="w-full bg-gray-900 text-white font-medium rounded-lg py-3 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {!isConnected ? (
              'Connect Wallet'
            ) : isParticipant && userEliminated ? (
              'Eliminated'
            ) : isParticipant && potInfo.hasStarted && hasUserPredictedToday === false ? (
              'Make Prediction'
            ) : isParticipant ? (
              'My Predictions'
            ) : (
              'Join Tournament'
            )}
          </button>
        </div>
      </div>

      {/* Enhanced CSS for animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes pulse-soft {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 currentColor;
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
          }
        }

        @keyframes pulse-status {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 2px 4px rgba(147, 51, 234, 0.1);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 4px 12px rgba(147, 51, 234, 0.2);
          }
        }

        .animate-pulse-soft {
          animation: pulse-soft 2s ease-in-out infinite;
        }

        .animate-pulse-status {
          animation: pulse-status 2.5s ease-in-out infinite;
        }

      `}</style>
    </div>
  );
};

export default PotInfoPage;