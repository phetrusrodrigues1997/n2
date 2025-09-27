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
import { getPredictionPercentages, isEliminated, getEliminatedPlayersCount, getTomorrowsBet } from '../Database/actions';
import {
  Clock,
  ChevronDown,
 
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

        // Check if user has made a prediction for today using getTomorrowsBet
        console.log('🔍 PotInfoPage - Checking if user has predicted for today...');
        try {
          // Convert contract address to table type for getTomorrowsBet
          const tableType = CONTRACT_TO_TABLE_MAPPING[contractAddress as keyof typeof CONTRACT_TO_TABLE_MAPPING];
          if (!tableType) {
            console.error('❌ PotInfoPage - No table mapping found for contract:', contractAddress);
            setHasUserPredictedToday(false);
            return;
          }

          const userPrediction = await getTomorrowsBet(address, tableType);
          const hasPredicted = userPrediction !== null;
          console.log('🔍 PotInfoPage - User prediction check:', {
            tableType,
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">
            {!cookiesLoaded ? 'Loading tournament data...' :
             !contractAddress ? 'Getting market information...' :
             !market ? 'Finding tournament details...' :
             !dataLoadingComplete ? 'Loading predictions and stats...' :
             'Getting tournament information...'}
          </p>
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
      {/* <div className="flex items-center p-4">
        <button
          onClick={handleBack}
          className="text-gray-900 hover:text-gray-600 transition-colors"
        >
          <span className="text-xl">←</span>
        </button>
      </div> */}

      {/* Main Content */}
      <div className="flex flex-col">
        <div className="px-6 pt-6">
          {/* Clean Question Display */}
          <div className="mb-6">
            <div className="text-xs font-medium text-gray-500 mb-2 tracking-wide uppercase">
              {contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress)
                ? 'Question of the Week'
                : 'Question of the Day'
              }
            </div>
            <h1 className="text-xl md:text-2xl font-normal text-gray-900 leading-[1.3] tracking-tight">
              {marketQuestion || market?.question || 'Loading...'}
            </h1>
          </div>

          {/* Tournament Journey Flow */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="text-sm font-medium text-gray-600 mb-4 tracking-wide">Tournament Progress</div>

            <div className="relative flex items-center justify-between px-2 md:px-4 py-2">
              {/* Step 1: Join */}
              <div className="flex flex-col items-center relative z-10">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs font-medium mb-3 transition-all duration-200 ${
                  !isParticipant
                    ? 'bg-black text-white'
                    : isParticipant && !potInfo.hasStarted
                      ? 'bg-black text-white'
                    : isParticipant
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {!isParticipant ? '1' : '✓'}
                </div>
                <div className="text-xs font-medium text-gray-700 text-center">Join</div>
              </div>

              {/* Step 2: Predict */}
              <div className="flex flex-col items-center relative z-10">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs font-medium mb-3 transition-all duration-200 ${
                  isParticipant && !userEliminated && potInfo.hasStarted && hasUserPredictedToday === false
                    ? 'bg-black text-white'
                    : isParticipant && !userEliminated && hasUserPredictedToday === true
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {isParticipant && !userEliminated && hasUserPredictedToday === true ? '✓' : '2'}
                </div>
                <div className="text-xs font-medium text-gray-700 text-center">Predict</div>
              </div>

              {/* Step 3: Wait */}
              <div className="flex flex-col items-center relative z-10">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs font-medium mb-3 transition-all duration-200 ${
                  isParticipant && !userEliminated && hasUserPredictedToday === true && !potInfo.isFinalDay
                    ? 'bg-black text-white'
                    : isParticipant && !userEliminated && hasUserPredictedToday === true && potInfo.isFinalDay
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {isParticipant && !userEliminated && hasUserPredictedToday === true && potInfo.isFinalDay ? '✓' : '3'}
                </div>
                <div className="text-xs font-medium text-gray-700 text-center">Wait</div>
              </div>

              {/* Step 4: Last 5 */}
              <div className="flex flex-col items-center relative z-10">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs font-medium mb-3 transition-all duration-200 ${
                  isParticipant && !userEliminated && potInfo.isFinalDay
                    ? 'bg-black text-white'
                    : userEliminated
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {userEliminated ? '!' : '4'}
                </div>
                <div className="text-xs font-medium text-gray-700 text-center leading-tight">
                  {userEliminated ? 'Re-enter' : 'Last 5'}
                </div>
              </div>

              {/* Step 5: Win */}
              <div className="flex flex-col items-center relative z-10">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-500 mb-3 transition-all duration-200">
                  5
                </div>
                <div className="text-xs font-medium text-gray-700 text-center">Win</div>
              </div>

              {/* Clean Connecting Lines */}
              <div className="absolute top-6 md:top-7 left-0 right-0 flex items-center justify-between px-6 md:px-8">
                {/* Line 1->2 */}
                <div className="flex-1 h-px mx-2 bg-gray-200">
                  <div className={`h-full transition-all duration-300 ${
                    isParticipant ? 'bg-gray-400' : 'bg-gray-200'
                  }`} style={{ width: isParticipant ? '100%' : '0%' }}></div>
                </div>

                {/* Line 2->3 */}
                <div className="flex-1 h-px mx-2 bg-gray-200">
                  <div className={`h-full transition-all duration-300 ${
                    isParticipant && hasUserPredictedToday === true ? 'bg-gray-400' : 'bg-gray-200'
                  }`} style={{ width: isParticipant && hasUserPredictedToday === true ? '100%' : '0%' }}></div>
                </div>

                {/* Line 3->4 */}
                <div className="flex-1 h-px mx-2 bg-gray-200">
                  <div className={`h-full transition-all duration-300 ${
                    potInfo.isFinalDay ? 'bg-gray-400' : 'bg-gray-200'
                  }`} style={{ width: potInfo.isFinalDay ? '100%' : '0%' }}></div>
                </div>

                {/* Line 4->5 */}
                <div className="flex-1 h-px mx-2 bg-gray-200">
                  <div className="h-full bg-gray-200" style={{ width: '0%' }}></div>
                </div>
              </div>
            </div>

            {/* Next Question Timer - Only show if pot has started */}
            {potInfo.hasStarted && (
              <div className="mt-3 flex justify-center">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <Clock className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-600">Next question in</span>
                  <span className="font-medium text-gray-900 text-xs">
                    {currentTimer}
                  </span>
                </div>
              </div>
            )}
          </div>


          {/* Tournament Details - Simplified */}
          <div className="bg-white border border-gray-200 rounded-xl mb-6">
            <div
              onClick={() => setIsTournamentInfoCollapsed(!isTournamentInfoCollapsed)}
              className="cursor-pointer p-5 border-b border-gray-100"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-normal text-gray-900">Tournament Details</h3>
                  <p className="text-sm text-gray-500 mt-1">{tournamentType} format</p>
                </div>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isTournamentInfoCollapsed ? '' : 'rotate-180'}`} />
              </div>
            </div>

            {!isTournamentInfoCollapsed && (
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">{isParticipant ? 'Re-Entry' : 'Entry Fee'}</h4>
                    <p className="text-lg font-normal text-gray-900">${entryFee?.toFixed(2) || '0.00'}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Format</h4>
                    <p className="text-lg font-normal text-gray-900">
                      {isPenaltyExempt ? 'Weekly' : 'Daily'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Topic</h4>
                    <p className="text-lg font-normal text-gray-900">{market?.potTopic || 'General'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Section - Polymarket Style */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleReady}
            disabled={!isConnected || (isParticipant && userEliminated)}
            className="w-full bg-black text-white font-medium rounded-xl py-4 text-base transition-all duration-200 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
          >
            {!isConnected ? (
              'Connect Wallet'
            ) : isParticipant && userEliminated ? (
              'Eliminated'
            ) : isParticipant && potInfo.hasStarted && hasUserPredictedToday === false ? (
              'Make Prediction'
            ) : isParticipant ? (
              'View My Predictions'
            ) : (
              'Join Tournament'
            )}
          </button>

          <div className="text-center mt-4">
            <span className="text-sm text-gray-600">{getPlayerMessage()}</span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default PotInfoPage;