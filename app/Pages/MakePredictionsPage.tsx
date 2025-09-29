import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseEther } from 'viem';
import { placeBitcoinBet, getTomorrowsBet, getTodaysBet, isEliminated, submitEvidence, getUserEvidenceSubmission, getAllEvidenceSubmissions, processReEntry, notifyMinimumPlayersReached, getPredictionPercentages } from '../Database/actions';
import { getUserPredictionsByContract, getUserPredictionsWithResults } from '../Database/actions3';
import { getProvisionalOutcome, } from '../Database/OwnerActions';
import { TrendingUp, TrendingDown, Shield, Zap, AlertTriangle, Clock, FileText, Upload, ChevronUp, ChevronDown, Eye, Trophy, Users } from 'lucide-react';
import Cookies from 'js-cookie';
import { getMarkets } from '../Constants/markets';
import { getTranslation, Language, translateMarketQuestion } from '../Languages/languages';
import { getPrice } from '../Constants/getPrice';
import { useQueryClient } from '@tanstack/react-query';
import { CONTRACT_TO_TABLE_MAPPING, getMarketDisplayName, getSmartMarketDisplayName, MIN_PLAYERS, MIN_PLAYERS2, BASE_ENTRY_FEE, calculateEntryFee, loadWrongPredictionsData, calculateParticipantStats, PENALTY_EXEMPT_CONTRACTS, PENALTY_EXEMPT_ENTRY_FEE, getFormattedTimerForContract, formatTimerDisplay, getTimerUrgency, getTimerDataForContract } from '../Database/config';
import { getEventDate } from '../Database/eventDates';
import LoadingScreenAdvanced from '../Components/LoadingScreenAdvanced';
import { FaClock, FaChartBar, FaDollarSign } from 'react-icons/fa'; // Font Awesome



// UTC timezone helper function for consistency with backend
const getUTCTime = (date: Date = new Date()): Date => {
  // Return the date as-is since Date objects are inherently UTC-based when using UTC methods
  return new Date(date.getTime());
};


// Use centralized table mapping from config
const tableMapping = CONTRACT_TO_TABLE_MAPPING;
type TableType = typeof tableMapping[keyof typeof tableMapping];

// Contract ABI for PredictionPot (includes both read and write functions)
const PREDICTION_POT_ABI = [
  {
    "inputs": [],
    "name": "getParticipants",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "enterPot",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

interface TodaysBet {
  id: number;
  walletAddress: string;
  prediction: string;
  betDate: string;
  createdAt: Date;
}

interface MarketOutcome {
  id: number;
  contractAddress: string;
  outcome: 'positive' | 'negative';
  setAt: Date;
  evidenceWindowExpires: Date;
  finalOutcome?: 'positive' | 'negative' | null;
  isDisputed: boolean;
}

interface EvidenceSubmission {
  id: number;
  walletAddress: string;
  contractAddress: string;
  evidence: string;
  submittedAt: Date;
  paymentTxHash: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface MakePredictionsProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  currentLanguage?: Language;
}

export default function MakePredictions({ activeSection, setActiveSection, currentLanguage = 'en' }: MakePredictionsProps) {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  const queryClient = useQueryClient();
  
  
  // Get translations for safe display strings only
  const t = getTranslation(currentLanguage);
  
  // TESTING TOGGLE - Set to false to test prediction logic on Saturdays
  const SHOW_RESULTS_DAY_INFO = false; // Toggle this on/off as needed
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isSkeletonLoading, setIsSkeletonLoading] = useState<boolean>(false);
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [tomorrowsBet, setTomorrowsBet] = useState<TodaysBet | null>(null);
  const [todaysBet, setTodaysBet] = useState<TodaysBet | null>(null);
  const [isBetLoading, setIsBetLoading] = useState<boolean>(true);
  const [contractAddress, setContractAddress] = useState<string>('');
  const [selectedTableType, setSelectedTableType] = useState<TableType | null>(null);
  const [reEntryFee, setReEntryFee] = useState<number | null>(null);
  const [allReEntryFees, setAllReEntryFees] = useState<{market: string, fee: number}[]>([]);
  const [marketQuestion, setMarketQuestion] = useState<string>(''); // Original English question for database operations
  const [displayQuestion, setDisplayQuestion] = useState<string>(''); // Translated question for display only
  const [isPenaltyExempt, setIsPenaltyExempt] = useState<boolean>(false);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [formattedEventDate, setFormattedEventDate] = useState<string>('');
  const [predictionPercentages, setPredictionPercentages] = useState<{ positivePercentage: number; negativePercentage: number; totalPredictions: number } | null>(null);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Effect to detect penalty-exempt contracts and set event dates
  useEffect(() => {
    if (contractAddress) {
      const isExempt = PENALTY_EXEMPT_CONTRACTS.includes(contractAddress);
      setIsPenaltyExempt(isExempt);

      if (isExempt) {
        const eventDateString = getEventDate(contractAddress);
        setEventDate(eventDateString);

        if (eventDateString) {
          // Format the event date for display
          const eventDateObj = new Date(eventDateString);
          const formatted = eventDateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          setFormattedEventDate(formatted);
        }
      } else {
        setEventDate(null);
        setFormattedEventDate('');
      }
    }
  }, [contractAddress]);

  // Pot information state
  const [potInfo, setPotInfo] = useState<{
    hasStarted: boolean;
    isFinalDay: boolean;
    startedOnDate: string | null;
  }>({
    hasStarted: false,
    isFinalDay: false,
    startedOnDate: null
  });
  
  const [potInfoLoaded, setPotInfoLoaded] = useState(false);

  // Functions for pot information management
  const fetchPotInfo = async (contractAddr: string) => {
    try {
      const response = await fetch('/api/pot-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractAddress: contractAddr }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setPotInfo({
          hasStarted: data.hasStarted || false,
          isFinalDay: data.isFinalDay || false,
          startedOnDate: data.startedOnDate || null
        });
        setPotInfoLoaded(true);
      }
    } catch (error) {
      console.error('Failed to fetch pot info:', error);
    }
  };

  // Track timing for proper loading sequence
  const [loadingStartTime] = useState<number>(Date.now());
  const [dataLoadCompleteTime, setDataLoadCompleteTime] = useState<number | null>(null);

  // Monitor when all data loading is complete
  useEffect(() => {
    if (isDataLoaded && !isBetLoading) {
      setDataLoadCompleteTime(Date.now());
    }
  }, [isDataLoaded, isBetLoading]);

  // Manage loading phases based on real data loading + minimum timing
  useEffect(() => {
    if (dataLoadCompleteTime === null) return; // Data not loaded yet

    const elapsedTime = dataLoadCompleteTime - loadingStartTime;
    const minLoadingScreenTime = 5000; // 5 seconds minimum for LoadingScreenAdvanced

    if (elapsedTime >= minLoadingScreenTime) {
      // Data loaded and minimum time met - proceed to skeleton
      setIsInitialLoading(false);
      setIsSkeletonLoading(true);

      // Show skeleton for 3 seconds then complete
      const skeletonTimer = setTimeout(() => {
        setIsSkeletonLoading(false);
      }, 3000);

      return () => clearTimeout(skeletonTimer);
    } else {
      // Data loaded quickly - wait for minimum time then proceed
      const remainingTime = minLoadingScreenTime - elapsedTime;

      const phase1Timer = setTimeout(() => {
        setIsInitialLoading(false);
        setIsSkeletonLoading(true);

        // Show skeleton for 3 seconds then complete
        const skeletonTimer = setTimeout(() => {
          setIsSkeletonLoading(false);
        }, 3000);

        return () => clearTimeout(skeletonTimer);
      }, remainingTime);

      return () => clearTimeout(phase1Timer);
    }
  }, [dataLoadCompleteTime, loadingStartTime]);

  // Show final day popup when it's the final day
  useEffect(() => {
    if (potInfo.isFinalDay && address && isConnected) {
      setShowFinalDayPopup(true);
    }
  }, [potInfo.isFinalDay, address, isConnected]);

  useEffect(() => {
  const checkFinalDayRedirect = async () => {
    if (potInfo.isFinalDay && address && selectedTableType) {
      const fee = await isEliminated(address, selectedTableType);
      if (fee && fee > 0) {
        console.log(`🚫 Final day detected with elimination - redirecting ${address} to NotReadyPage`);
        Cookies.set('finalDayRedirect', 'true', { expires: 1/24 });
        setActiveSection('notReadyPage');
      }
    }
  };

  checkFinalDayRedirect();
}, [potInfo.isFinalDay, address, selectedTableType, setActiveSection]);
  
  // Evidence submission system state
  const [marketOutcome, setMarketOutcome] = useState<MarketOutcome | null>(null);
  const [evidenceText, setEvidenceText] = useState<string>('');
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState<boolean>(false);
  const [userEvidenceSubmission, setUserEvidenceSubmission] = useState<EvidenceSubmission | null>(null);
  const [timeUntilEvidenceExpires, setTimeUntilEvidenceExpires] = useState<number>(0);
  const [isEvidenceSectionExpanded, setIsEvidenceSectionExpanded] = useState<boolean>(false);
  
  // Admin evidence review state
  const [allEvidenceSubmissions, setAllEvidenceSubmissions] = useState<any[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(false);
  const [isLoadingEvidence, setIsLoadingEvidence] = useState<boolean>(false);
  
  // Re-entry transaction state
  const [isReEntryLoading, setIsReEntryLoading] = useState<boolean>(false);
  const [ethPrice, setEthPrice] = useState<number | null>(null);

  // Announcement sending state to prevent race conditions
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState<boolean>(false);

  // Voting preference from cookies
  const [votingPreference, setVotingPreference] = useState<string | null>(null);
  const [selectedMarketForVoting, setSelectedMarketForVoting] = useState<string | null>(null);
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState<boolean>(false);

  // Timer state
  const [currentTimer, setCurrentTimer] = useState<string>('');
  
  // New state for collapsible sections and prediction history
  const [isMainSectionCollapsed, setIsMainSectionCollapsed] = useState<boolean>(false); // Start closed by default
  const [showFinalDayPopup, setShowFinalDayPopup] = useState<boolean>(false);
  const [isPredictionHistoryCollapsed, setIsPredictionHistoryCollapsed] = useState<boolean>(true); // Start closed by default
  const [predictionHistory, setPredictionHistory] = useState<Array<{
    questionName: string;
    prediction: 'positive' | 'negative';
    predictionDate: string;
    createdAt: Date;
    status: 'pending' | 'correct' | 'incorrect';
    actualOutcome?: string;
    isProvisional?: boolean;
  }>>([]);

  // Wrong predictions and participant statistics state
  const [wrongPredictionsAddresses, setWrongPredictionsAddresses] = useState<string[]>([]);
  const [participantStats, setParticipantStats] = useState({
    totalEntries: 0,
    uniqueAddresses: 0,
    eligibleParticipants: 0,
    uniqueParticipantsList: [] as string[],
    eligibleParticipantsList: [] as string[]
  });
  
  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });


  
  // Timer states using centralized logic
  const [timerData, setTimerData] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Check if betting is allowed (Sunday through Friday, unless testing toggle is off) - UK timezone
  const isBettingAllowed = (): boolean => {
    // First check if pot has started - this is a hard requirement
    if (!potInfo.hasStarted) {
      return false;
    }

    if (!SHOW_RESULTS_DAY_INFO) {
      return true; // Always allow betting when testing toggle is off (and pot has started)
    }
    const utcNow = getUTCTime();
    const day = utcNow.getUTCDay(); // 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
    return day !== 6; // All days except Saturday
  };

  // Check if today is Saturday (results day) - only when toggle is enabled - UK timezone
  const isResultsDay = (): boolean => {
    if (!SHOW_RESULTS_DAY_INFO) {
      return false; // Never show results day when testing toggle is off
    }
    const utcNow = getUTCTime();
    const day = utcNow.getUTCDay();
    return day === 6; // Saturday
  };

  // Check if outcome has been set for this market
  const hasOutcomeBeenSet = (): boolean => {
    return marketOutcome !== null;
  };

  // Check if evidence submission window is active (within 1 hour of outcome being set AND final outcome not yet set)
  const isEvidenceWindowActive = (): boolean => {
    if (!marketOutcome) return false;
    
    // If final outcome is already set, evidence window is closed
    if (marketOutcome.finalOutcome) return false;
    
    // Check if we're still within the time window
    const now = new Date();
    return now < marketOutcome.evidenceWindowExpires;
  };

  // Format time remaining in evidence window
  const formatTimeRemaining = (milliseconds: number): string => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get tonight's midnight (when new question becomes available) - UTC timezone
  const getTonightMidnight = (): Date => {
    const utcNow = getUTCTime();
    // Create tomorrow's midnight in UTC timezone
    const tomorrow = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate() + 1, 0, 0, 0, 0));
    return tomorrow;
  };

  // Get tomorrow's midnight (when previous prediction outcome will be revealed - 24 hours after next question) - UTC timezone
  const getTomorrowMidnight = (): Date => {
    const utcNow = getUTCTime();
    // Create day after tomorrow's midnight in UTC timezone
    const dayAfterTomorrow = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate() + 2, 0, 0, 0, 0));
    return dayAfterTomorrow;
  };

  // Get the deadline for predictions (23:59 of event date for penalty-exempt, or tomorrow midnight for regular)
  const getPredictionDeadline = (): Date => {
    if (isPenaltyExempt && eventDate) {
      // For penalty-exempt contracts, deadline is 23:59 of the event date
      // Parse the event date in UTC timezone for consistency
      const eventDateParts = eventDate.split('-');
      const year = parseInt(eventDateParts[0]);
      const month = parseInt(eventDateParts[1]) - 1; // Month is 0-indexed
      const day = parseInt(eventDateParts[2]);

      // Create date at 23:59:59 in UTC timezone
      const eventDateObj = new Date(Date.UTC(year, month, day, 23, 59, 59, 0));
      return eventDateObj;
    } else {
      // For regular contracts, use the standard tomorrow midnight logic
      return getTomorrowMidnight();
    }
  };

  // Update countdown timers using centralized logic
  const updateCountdowns = () => {
    if (contractAddress) {
      // Use centralized timer logic for contract-specific timers
      const data = getTimerDataForContract(contractAddress);
      setTimerData(data);
    }
  };


  // Check if user has already submitted evidence
  const hasUserSubmittedEvidence = (): boolean => {
    return userEvidenceSubmission !== null;
  };

  // Helper functions for ETH price and entry amount calculations
  const usdToEth = (usdAmount: number): bigint => {
    const fallbackEthPrice = 4700; // Fallback ETH price
    const currentEthPrice = ethPrice || fallbackEthPrice;
    const ethAmount = usdAmount / currentEthPrice;
    return parseEther(ethAmount.toString());
  };

  const ethToUsd = (ethAmount: bigint): number => {
    const fallbackEthPrice = 4700;
    const currentEthPrice = ethPrice || fallbackEthPrice;
    const ethValue = Number(formatUnits(ethAmount, 18));
    return ethValue * currentEthPrice;
  };

  


  // Get entry amount using dynamic pricing (same as new entries)
  const getEntryAmount = (): bigint => {
    // Check if this is a penalty-exempt contract
    if (contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress)) {
      // Use fixed fee for penalty-exempt contracts
      return usdToEth(PENALTY_EXEMPT_ENTRY_FEE);
    }

    // Re-entries use the same dynamic pricing as new entries for regular contracts
    const entryFeeUsd = calculateEntryFee(potInfo.hasStarted, potInfo.startedOnDate);
    return usdToEth(entryFeeUsd);
  };



  



  // Fetch ETH price
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const price = await getPrice('ETH');
        setEthPrice(price);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        setEthPrice(4700); // Fallback price
      }
    };

    fetchEthPrice();
    
    // Refresh price every 5 minutes
    const interval = setInterval(fetchEthPrice, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Add useEffect to handle cookie retrieval
  useEffect(() => {
    const savedContract = Cookies.get('selectedMarket');
    const savedQuestion = Cookies.get('selectedMarketQuestion');
    
    // Set the market question if available
    if (savedQuestion) {
      setMarketQuestion(savedQuestion); // Keep original English question for database operations
      // Create translated version for display with direct question mapping
      const translatedQuestion = translateMarketQuestion(savedQuestion, currentLanguage || 'en');
      setDisplayQuestion(translatedQuestion);
      console.log('Loaded pot question:', savedQuestion);
      console.log('Display question (translated):', translatedQuestion);
    }
    
    // Load voting preference from cookies
    const preference = Cookies.get('votingPreference');
    const marketForVoting = Cookies.get('selectedMarketForVoting');
    setVotingPreference(preference || null);
    setSelectedMarketForVoting(marketForVoting || null);
    console.log('Loaded voting preference:', preference, 'for market:', marketForVoting);
    
    console.log('🍪 MakePredictionsPage - Cookie initialization:', {
      savedContract,
      tableMapping,
      isValidContract: savedContract && tableMapping[savedContract as keyof typeof tableMapping]
    });

    // Validate contract address is in our allowed list
    if (savedContract && tableMapping[savedContract as keyof typeof tableMapping]) {
      setContractAddress(savedContract);
      const tableType = tableMapping[savedContract as keyof typeof tableMapping];
      setSelectedTableType(tableType);
      console.log('✅ Set selectedTableType from cookie:', tableType, 'for contract:', savedContract);
      // Fetch pot information for the contract
      fetchPotInfo(savedContract);
    } else {
      // Fallback to default contract if no valid cookie is found
      const defaultContract = '0x4Ff2bBB26CC30EaD90251dd224b641989Fa24e22';
      setContractAddress(defaultContract);
      setSelectedTableType('featured' as TableType);
      console.log('🔧 Set selectedTableType to default: featured for contract:', defaultContract);
      console.log('No valid contract cookie found, using default');
      // Fetch pot information for the default contract
      fetchPotInfo(defaultContract);
    }
  }, []);

  // Retranslate display question when language changes
  useEffect(() => {
    if (marketQuestion && currentLanguage) {
      const translatedQuestion = translateMarketQuestion(marketQuestion, currentLanguage);
      setDisplayQuestion(translatedQuestion);
      console.log('Language changed, retranslating question for', currentLanguage, ':', translatedQuestion);
    }
  }, [currentLanguage, marketQuestion]); // Retranslate when language or question changes

  // Countdown timer effect
  useEffect(() => {
    updateCountdowns(); // Initial update
    const interval = setInterval(updateCountdowns, 1000); // Update every second
    return () => clearInterval(interval);
  }, [contractAddress, isPenaltyExempt, eventDate]); // Update when contract address, penalty exempt status or event date changes

  // Timer update effect for display
  useEffect(() => {
    if (!contractAddress) return;

    const updateTimer = async () => {
      const { getFormattedTimerForContract } = await import('../Database/config');
      const formattedTimer = getFormattedTimerForContract(contractAddress);
      setCurrentTimer(formattedTimer);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [contractAddress]);

  // Read contract data to get participants
  const { data: participants } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: PREDICTION_POT_ABI,
    functionName: 'getParticipants',
    query: { enabled: !!contractAddress }
  }) as { data: string[] | undefined };

  // Check if the user is a participant
  const isParticipant = address && participants && Array.isArray(participants) 
    ? participants.some(participant => participant.toLowerCase() === address.toLowerCase())
    : false;

  // Redirect to NotReadyPage if user is participant but pot is not ready for predictions
  useEffect(() => {
    console.log(`🔍 MakePredictionsPage redirect check:`, {
      isParticipant,
      hasParticipants: !!participants,
      participantsIsArray: Array.isArray(participants),
      participantsLength: participants?.length,
      potInfoLoaded,
      contractAddress,
      potInfoHasStarted: potInfo.hasStarted,
      potInfoObject: potInfo
    });

    // Only run redirect logic after pot info is loaded to avoid race conditions
    if (isParticipant && participants && Array.isArray(participants) && potInfoLoaded) {
      let shouldRedirect: boolean;
      let redirectReason: string;

      // Check if this is a penalty-exempt contract
      if (contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress)) {
        // For penalty-exempt contracts (F1 tournaments), only check if pot has started
        // No minimum players requirement
        shouldRedirect = !potInfo.hasStarted;
        redirectReason = !potInfo.hasStarted ? 'pot not started' : 'none';

        console.log(`🔍 MakePredictionsPage redirect decision (penalty-exempt):`, {
          contractAddress,
          participantsLength: participants.length,
          potHasStarted: potInfo.hasStarted,
          shouldRedirect,
          redirectReason,
          isPenaltyExempt: true
        });
      } else {
        // For regular contracts, check both minimum players AND pot started
        const contractAddresses = Object.keys(CONTRACT_TO_TABLE_MAPPING);
        const contractIndex = contractAddresses.indexOf(contractAddress);
        const minPlayersRequired = contractIndex === 0 ? MIN_PLAYERS : MIN_PLAYERS2;

        shouldRedirect = participants.length < minPlayersRequired || !potInfo.hasStarted;
        redirectReason = participants.length < minPlayersRequired ? 'not enough players' : !potInfo.hasStarted ? 'pot not started' : 'none';

        console.log(`🔍 MakePredictionsPage redirect decision (regular):`, {
          participantsLength: participants.length,
          minPlayersRequired,
          hasEnoughPlayers: participants.length >= minPlayersRequired,
          potHasStarted: potInfo.hasStarted,
          shouldRedirect,
          redirectReason,
          isPenaltyExempt: false
        });
      }

      if (shouldRedirect) {
        console.log(`🚨 MakePredictionsPage: Redirecting to NotReadyPage (${redirectReason})`);
        setActiveSection('notReadyPage');
      } else {
        console.log(`✅ MakePredictionsPage: User can stay on predictions page`);
      }
    } else {
      console.log(`⏭️ MakePredictionsPage: Skipping redirect check - conditions not met`);
    }
  }, [isParticipant, participants, contractAddress, potInfo.hasStarted, potInfoLoaded, setActiveSection]);

  // Check for minimum players threshold and send notification
  useEffect(() => {
    const checkAndNotifyMinimumPlayers = async () => {
      if (!participants || !Array.isArray(participants) || !contractAddress) return;
      
      // Determine minimum players requirement
      const contractAddresses = Object.keys(CONTRACT_TO_TABLE_MAPPING);
      const contractIndex = contractAddresses.indexOf(contractAddress);
      const minPlayersRequired = contractIndex === 0 ? MIN_PLAYERS : MIN_PLAYERS2;
      const currentParticipants = participants.length;
      
      console.log(`🎯 MakePredictionsPage: Checking minimum players for contract ${contractAddress}:`, {
        currentParticipants,
        minPlayersRequired,
        hasEnoughNow: currentParticipants >= minPlayersRequired,
        tableType: CONTRACT_TO_TABLE_MAPPING[contractAddress as keyof typeof CONTRACT_TO_TABLE_MAPPING]
      });
      
      // Send notification if minimum players reached
      // The notification system has database-level deduplication to prevent spam
      if (currentParticipants >= minPlayersRequired && !isSendingAnnouncement) {
        try {
          console.log(`🎯 Minimum players reached! Sending notification from MakePredictionsPage...`);
          setIsSendingAnnouncement(true);
          
          const tableType = CONTRACT_TO_TABLE_MAPPING[contractAddress as keyof typeof CONTRACT_TO_TABLE_MAPPING];
          const notificationResult = await notifyMinimumPlayersReached(
            contractAddress,
            currentParticipants,
            tableType || 'market',
            participants
          );
          
          console.log(`✅ MakePredictionsPage notification result:`, notificationResult);
        } catch (error) {
          console.error(`❌ Error sending minimum players notification from MakePredictionsPage:`, error);
        } finally {
          setIsSendingAnnouncement(false);
        }
      } else {
        console.log(`📊 Not enough players yet: ${currentParticipants}/${minPlayersRequired} - no notification sent`);
      }
    };

    // Only run if we have fresh participant data
    if (participants && participants.length > 0) {
      checkAndNotifyMinimumPlayers();
    }
  }, [participants, contractAddress]); // Trigger when participants or contract changes

  // Auto-submission effect for voting preference
  useEffect(() => {
    const autoSubmitPrediction = async () => {
      // Only auto-submit if:
      // 1. User has a voting preference from landing page
      // 2. User is connected and is a participant
      // 3. User hasn't already made a prediction (no tomorrowsBet)
      // 4. Betting is allowed
      // 5. Haven't already auto-submitted
      // 6. Data is fully loaded
      // 7. There are enough participants in the pot
      
      // Check if there are enough participants before auto-submitting
      const contractAddresses = Object.keys(CONTRACT_TO_TABLE_MAPPING);
      const contractIndex = contractAddresses.indexOf(contractAddress);
      const minPlayersRequired = contractIndex === 0 ? MIN_PLAYERS : MIN_PLAYERS2;
      const hasEnoughParticipants = participants && Array.isArray(participants) && participants.length >= minPlayersRequired;
      
      if (
        votingPreference &&
        selectedMarketForVoting &&
        address &&
        isParticipant &&
        !tomorrowsBet &&
        isBettingAllowed() &&
        !hasAutoSubmitted &&
        isDataLoaded &&
        !isLoading &&
        hasEnoughParticipants
      ) {
        console.log('Auto-submitting prediction:', votingPreference, 'for market:', selectedMarketForVoting);
        setHasAutoSubmitted(true);
        
        // Clear cookies after auto-submission
        Cookies.remove('votingPreference');
        Cookies.remove('selectedMarketForVoting');
        
        // Auto-submit the prediction
        await handlePlaceBet(votingPreference as 'positive' | 'negative');
      } else if (votingPreference && !hasEnoughParticipants) {
        console.log('Auto-submission prevented: insufficient participants (', participants?.length || 0, '/', minPlayersRequired, ')');
      }
    };

    autoSubmitPrediction();
  }, [votingPreference, selectedMarketForVoting, address, isParticipant, tomorrowsBet, isDataLoaded, isLoading, hasAutoSubmitted, participants, contractAddress]);

  // Load wrong predictions data and calculate participant statistics
  useEffect(() => {
    console.log('🔍 MakePredictionsPage - useEffect triggered:', {
      selectedTableType,
      participants: participants?.length || 0,
      participantsArray: participants,
      contractAddress
    });

    const loadWrongPredictionsAndStats = async () => {
      if (!selectedTableType || !contractAddress) {
        console.log('❌ selectedTableType or contractAddress is null/undefined, skipping load:', {
          selectedTableType,
          contractAddress
        });
        return;
      }
      
      console.log('🔄 Loading wrong predictions data for:', selectedTableType);
      
      try {
        const addresses = await loadWrongPredictionsData(selectedTableType);
        setWrongPredictionsAddresses(addresses);
        
        console.log('✅ Wrong predictions loaded:', addresses);
        
        // Calculate participant statistics
        const stats = calculateParticipantStats(participants, addresses);
        setParticipantStats(stats);
        
        console.log(`📊 MakePredictionsPage - Participant Stats for ${selectedTableType}:`, {
          selectedTableType,
          participantsInput: participants,
          wrongPredictions: addresses.length,
          stats: {
            totalEntries: stats.totalEntries,
            uniqueAddresses: stats.uniqueAddresses,
            eligibleParticipants: stats.eligibleParticipants,
            uniqueParticipantsList: stats.uniqueParticipantsList,
            eligibleParticipantsList: stats.eligibleParticipantsList
          }
        });
      } catch (error) {
        console.error('❌ Error loading wrong predictions data:', error);
      }
    };

    loadWrongPredictionsAndStats();
  }, [selectedTableType, participants, contractAddress]);

  // Load user's evidence submission if any - now takes outcomeDate parameter to avoid race condition
  const loadUserEvidenceSubmission = useCallback(async (outcomeDate: string) => {
    if (!address || !selectedTableType) return null;
    
    try {
      const submission = await getUserEvidenceSubmission(
        address, 
        selectedTableType, 
        outcomeDate
      );
      
      const formattedSubmission = submission ? {
        id: submission.id,
        walletAddress: address,
        contractAddress,
        evidence: submission.evidence,
        submittedAt: submission.submittedAt,
        paymentTxHash: '', // Will be implemented with payment system
        status: submission.status as 'pending' | 'approved' | 'rejected'
      } : null;
      
      setUserEvidenceSubmission(formattedSubmission);
      console.log('Loading evidence submission for user:', address, formattedSubmission);
      return formattedSubmission;
    } catch (error) {
      console.error('Error loading evidence submission:', error);
      return null;
    }
  }, [address, selectedTableType, contractAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load market outcome for current contract
  const loadMarketOutcome = useCallback(async () => {
    if (!contractAddress || !selectedTableType) return;
    
    try {
      const questionName = marketQuestion || getMarketDisplayName(selectedTableType);
      const provisionalOutcomeData = await getProvisionalOutcome(selectedTableType, questionName);
      
      if (provisionalOutcomeData) {
        const marketOutcomeData = {
          id: 1,
          contractAddress,
          outcome: provisionalOutcomeData.outcome,
          setAt: new Date(provisionalOutcomeData.setAt),
          evidenceWindowExpires: new Date(provisionalOutcomeData.evidenceWindowExpires),
          finalOutcome: provisionalOutcomeData.finalOutcome,
          isDisputed: provisionalOutcomeData.isDisputed || false
        };
        
        setMarketOutcome(marketOutcomeData);
        
        // Calculate remaining time
        const now = new Date().getTime();
        const expiry = new Date(provisionalOutcomeData.evidenceWindowExpires).getTime();
        const remaining = Math.max(0, expiry - now);
        setTimeUntilEvidenceExpires(remaining);
        
        // Load evidence submission AFTER market outcome is set
        if (address) {
          const outcomeDate = marketOutcomeData.setAt.toISOString().split('T')[0];
          await loadUserEvidenceSubmission(outcomeDate);
        }
        
        console.log('Loaded provisional outcome:', provisionalOutcomeData);
      } else {
        setMarketOutcome(null);
        setUserEvidenceSubmission(null); // Clear evidence if no outcome
        console.log('No provisional outcome set yet');
      }
    } catch (error) {
      console.error('Error loading pot outcome:', error);
    }
  }, [contractAddress, selectedTableType, address, loadUserEvidenceSubmission]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadBets = useCallback(async () => {
    if (!address || !selectedTableType) return;

    setIsBetLoading(true);
    try {
      console.log(`🔍 MakePredictionsPage: Loading bets for wallet ${address}, table type: ${selectedTableType}`);
      
      // Load both tomorrow's bet (for betting interface) and today's bet (for results display)
      const [tomorrowBet, todayBet, reEntryAmount] = await Promise.all([
        getTomorrowsBet(address, selectedTableType),
        getTodaysBet(address, selectedTableType),
        isEliminated(address, selectedTableType)
      ]);
      
      console.log(`🔍 MakePredictionsPage: Re-entry fee result: ${reEntryAmount} for table type: ${selectedTableType}`);
      
      setTomorrowsBet(tomorrowBet);
      setTodaysBet(todayBet);
      setReEntryFee(reEntryAmount);
      // Remove problematic allReEntryFees dependency
    } catch (error) {
      console.error("Error loading bets:", error);
      setTomorrowsBet(null);
      setTodaysBet(null);
      setReEntryFee(null);
    } finally {
      setIsBetLoading(false);
    }
  }, [address, selectedTableType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load prediction history for the current contract and user with results
  const loadPredictionHistory = useCallback(async () => {
    if (!address || !contractAddress) return;

    try {
      const historyWithResults = await getUserPredictionsWithResults(address, contractAddress);
      setPredictionHistory(historyWithResults);
      console.log('📊 Loaded prediction history with results:', historyWithResults);
    } catch (error) {
      console.error('Error loading prediction history:', error);
    }
  }, [address, contractAddress]);

  // Load prediction percentages for the current contract
  const loadPredictionPercentages = useCallback(async () => {
    if (!contractAddress) return;

    try {
      const percentages = await getPredictionPercentages(contractAddress);
      setPredictionPercentages(percentages);
      console.log('📊 Loaded prediction percentages:', percentages);
    } catch (error) {
      console.error('Error loading prediction percentages:', error);
      setPredictionPercentages(null);
    }
  }, [contractAddress]);

  // Calculate Bayesian smoothed percentages (same formula as LandingPage.tsx)
  const getBayesianPercentages = () => {
    if (!predictionPercentages) return { yesPercentage: 50, noPercentage: 50 };

    const totalVotes = predictionPercentages.totalPredictions ?? 0;
    const positive = Math.round((predictionPercentages.positivePercentage ?? 0) / 100 * totalVotes);
    const negative = totalVotes - positive;

    // Bayesian smoothing: add 0.5 to positive and 1 to total
    const yesPercentage = Math.round(((positive + 0.5) / (positive + negative + 1)) * 100);
    const noPercentage = 100 - yesPercentage;

    return { yesPercentage, noPercentage };
  };

  // Load data on component mount and when key dependencies change
  useEffect(() => {
    const loadAllData = async () => {
      if (address && isParticipant && selectedTableType) {
        setIsDataLoaded(false);
        try {
          await Promise.all([
            loadBets(),
            loadMarketOutcome(), // This will also load evidence submission after outcome is loaded
            loadPredictionHistory(), // Load prediction history for the dashboard
            loadPredictionPercentages() // Load prediction percentages for button display
          ]);
        } finally {
          setIsDataLoaded(true);
        }
      } else {
        setIsDataLoaded(true); // Set to true even if we can't load data
      }
    };
    
    loadAllData();
  }, [address, isParticipant, selectedTableType, loadBets, loadMarketOutcome, loadPredictionHistory, loadPredictionPercentages]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && isReEntryLoading) {
      const completeReEntry = async () => {
        try {
          // Remove user from wrong predictions table
          if (!selectedTableType) {
            console.error('Cannot process re-entry: selectedTableType is null');
            return;
          }
          const success = await processReEntry(address!, selectedTableType);
          console.log('SELECTED TABLE TYPE FOR RE-ENTRY:', selectedTableType);
          if (success) {
            setIsReEntryLoading(false);
            showMessage('Re-entry successful! You can now predict again.');
            setReEntryFee(null); // Clear re-entry fee
            // Refresh contract data
            queryClient.invalidateQueries({ queryKey: ['readContract'] });
            // Reload bets to refresh UI
            await loadBets();
          } else {
            setIsReEntryLoading(false);
            showMessage('Re-entry payment processed but database update failed. Please contact support.');
          }
        } catch (error) {
          setIsReEntryLoading(false);
          showMessage('Re-entry payment processed but database update failed. Please contact support.');
        }
      };
      
      completeReEntry();
    }
  }, [isConfirmed, isReEntryLoading, address, selectedTableType, queryClient, loadBets]);

  // Timer effect for evidence window countdown
  useEffect(() => {
    if (!marketOutcome || !isEvidenceWindowActive()) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const expiry = marketOutcome.evidenceWindowExpires.getTime();
      const remaining = Math.max(0, expiry - now);
      
      if (remaining <= 0) {
        setTimeUntilEvidenceExpires(0);
        clearInterval(timer);
      } else {
        setTimeUntilEvidenceExpires(remaining);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [marketOutcome, isEvidenceWindowActive]); // eslint-disable-line react-hooks/exhaustive-deps

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  };

  const handlePlaceBet = async (prediction: 'positive' | 'negative') => {
    if (!address) return;

    // Check if pot has started before allowing predictions
    if (!potInfo.hasStarted) {
      showMessage('Predictions cannot be made until the pot has officially started.');
      return;
    }

    setIsLoading(true);
    try {
      // Pass the table type string instead of the table object, include the market question and contract address
      if (!selectedTableType) {
        console.error('Cannot place bet: selectedTableType is null');
        setIsLoading(false);
        return;
      }

      // Check if this is a penalty-exempt contract and if we're
      if (contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress)) {
        const eventDate = getEventDate(contractAddress);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        if (eventDate === today) {
          showMessage('Predictions are not allowed on the day of the event.');
          setIsLoading(false);
          return;
        }
      }

      // Immediately update the UI state for instant feedback
      const newBet: TodaysBet = {
        id: Date.now(), // Temporary ID
        walletAddress: address,
        prediction: prediction,
        betDate: new Date().toISOString(),
        createdAt: new Date()
      };
      setTomorrowsBet(newBet);

      // Submit to database in background
      await placeBitcoinBet(address, prediction, selectedTableType, marketQuestion, contractAddress);

      // Refresh data in background without blocking UI
      Promise.all([
        loadBets(),
        loadPredictionHistory(),
        loadPredictionPercentages()
      ]).catch(error => {
        console.error('Error refreshing data:', error);
      });

      // Auto-collapse after successful prediction for cleaner UX
      setTimeout(() => {
        setIsMainSectionCollapsed(true);
      }, 2000);
    } catch (error: unknown) {
      console.error('Error placing bet:', error);
      showMessage(error instanceof Error ? error.message : 'Failed to place bet. Please try again.');

      // Revert the optimistic update on error
      setTomorrowsBet(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle re-entry pot payment
  const handleReEntry = async () => {
    if (!contractAddress || !reEntryFee) return;
    
    setIsReEntryLoading(true);
    
    try {
      const entryAmount = getEntryAmount();
      
      // Use writeContract to enter the pot with ETH payment
      await writeContract({
        address: contractAddress as `0x${string}`,
        abi: PREDICTION_POT_ABI,
        functionName: 'enterPot',
        args: [],
        value: entryAmount, // Send ETH as value
      });
      
      showMessage('Re-entry payment submitted! Waiting for confirmation...');
    } catch (error) {
      console.error('Re-entry payment failed:', error);
      showMessage('Re-entry payment failed. Please try again.');
      setIsReEntryLoading(false);
    }
  };

  const handleEvidenceSubmission = async () => {
    if (!address || !evidenceText.trim() || !selectedTableType || !marketOutcome) return;
    
    setIsSubmittingEvidence(true);
    try {
      // Submit evidence to database (without payment for now)
      const outcomeDate = marketOutcome.setAt.toISOString().split('T')[0]; // Convert to YYYY-MM-DD
      const result = await submitEvidence(
        address,
        selectedTableType,
        outcomeDate,
        evidenceText.trim()
        // paymentTxHash will be added when payment system is implemented
      );
      
      if (result.success) {
        showMessage('Evidence submitted successfully! Awaiting admin review.');
        setEvidenceText('');
        // Reload evidence submission with proper parameters
        await loadUserEvidenceSubmission(outcomeDate);
      } else {
        showMessage(result.error || 'Failed to submit evidence. Please try again.');
      }
    } catch (error: unknown) {
      console.error('Error submitting evidence:', error);
      showMessage(error instanceof Error ? error.message : 'Failed to submit evidence. Please try again.');
    } finally {
      setIsSubmittingEvidence(false);
    }
  };

  // Load all evidence submissions for admin review
  const loadAllEvidenceSubmissions = async () => {
    if (!marketOutcome || !selectedTableType) return;
    
    setIsLoadingEvidence(true);
    try {
      const outcomeDate = marketOutcome.setAt.toISOString().split('T')[0];
      const submissions = await getAllEvidenceSubmissions(selectedTableType, outcomeDate);
      setAllEvidenceSubmissions(submissions);
      console.log('Loaded all evidence submissions:', submissions);
    } catch (error) {
      console.error('Error loading evidence submissions:', error);
      showMessage('Failed to load evidence submissions');
    } finally {
      setIsLoadingEvidence(false);
    }
  };

  // Toggle admin panel and load evidence if opening
  const toggleAdminPanel = async () => {
    if (!showAdminPanel) {
      await loadAllEvidenceSubmissions();
    }
    setShowAdminPanel(!showAdminPanel);
  };

  // Reload market outcome data (useful for refreshing after admin sets provisional outcome)
  const refreshMarketData = async () => {
    try {
      await loadMarketOutcome();
      showMessage('Pot data refreshed');
    } catch (error) {
      console.error('Error refreshing pot data:', error);
      showMessage('Failed to refresh pot data');
    }
  };

  // Check if user is admin/owner (for main prediction markets)
  // In a real app, this would check against a list of admin addresses
  const isAdmin = () => {
    if (!address || !isConnected) return false;
    
    // Add specific admin wallet addresses here
    const adminAddresses: string[] = [
      // Add your admin wallet addresses here (lowercase)
      // '0x1234567890123456789012345678901234567890'
    ];
    
    // Check if current user is in admin list
    const normalizedAddress = address.toLowerCase();
    return adminAddresses.includes(normalizedAddress);
  };

  // Rest of your component remains the same...
  // If wallet is not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 flex items-center justify-center relative overflow-hidden translate-y-8">
        {/* Subtle animated background elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gray-900 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gray-700 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        <div className="max-w-md mx-auto text-center relative z-10">
          <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-10 shadow-2xl shadow-gray-900/10 relative">
            {/* Floating Bitcoin icon with glassmorphism */}
            <div className="w-24 h-24 bg-gradient-to-br from-gray-900 via-gray-800 to-black rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-gray-900/25 transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <span className="text-4xl font-black text-white drop-shadow-lg">₿</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">{t.connectWalletTitle || "Connect Wallet"}</h1>
            <p className="text-gray-600 text-lg">{t.connectToStartPredicting || "Connect to start predicting"}</p>
            
            {/* Subtle pulse indicator */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-gray-500 rounded-full animate-ping"></div>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-gray-600 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Skeleton component for MakePredictionsPage
  const PredictionsSkeleton = () => (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Back button skeleton */}
        <div className="mb-6">
          <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>

        {/* Header skeleton */}
        <div className="text-center mb-8 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-100 rounded w-48 mx-auto"></div>
        </div>

        {/* Info cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-24"></div>
            </div>
          ))}
        </div>

        {/* Main prediction card skeleton */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm animate-pulse">
          <div className="text-center mb-8">
            <div className="h-6 bg-gray-200 rounded w-72 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-100 rounded w-48 mx-auto"></div>
          </div>

          {/* Timer skeleton */}
          <div className="text-center mb-8">
            <div className="h-12 bg-gray-200 rounded w-32 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-24 mx-auto"></div>
          </div>

          {/* Prediction buttons skeleton */}
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );

  // Show LoadingScreenAdvanced first
  if (isInitialLoading) {
    return <LoadingScreenAdvanced subtitle={t.loadingPredictions || "Loading your predictions..."} />;
  }

  // Show skeleton loading second
  if (isSkeletonLoading) {
    return <PredictionsSkeleton />;
  }

  // If user is not a participant in the pot
  if (!isParticipant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 flex items-center justify-center relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-gray-900 rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-md mx-auto text-center relative z-10">
          <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-10 shadow-2xl shadow-gray-900/10">
            <div className="w-24 h-24 bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl">
              <Shield className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">{t.accessRequired || "Access Required"}</h1>
            <p className="text-gray-600 mb-8 text-lg">{t.mustJoinPotFirst || "You must join the pot first"}</p>
            <button className="bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-105 transform duration-300">
              {t.enterPot || "Enter Pot"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  

  return (
    <>
      {/* Final Day Popup Modal */}
      {showFinalDayPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full mx-4 text-center shadow-2xl">
            {/* Ghostie Logo */}
            <div className="flex justify-center mb-6">
              {/* <img
                src="/ghostienobg.png"
                alt="Ghostie"
                className="w-20 h-20 md:w-24 md:h-24 opacity-90"
              /> */}
            </div>
            
            {/* Header */}
            <h2 className="text-3xl font-black text-gray-700 mb-4">{t.finalPredictions || "Final Predictions"}</h2>
            
            {/* Subheading */}
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              {t.congratulationsFinal10 || "Congratulations! You are down to the last 5. Make your predictions as you normally would and if you win we will notify you."}
            </p>
            
            {/* Close Button */}
            <button
              onClick={() => setShowFinalDayPopup(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {t.gotIt || "Got it! 🎯"}
            </button>
          </div>
        </div>
      )}
      
      <div className="min-h-screen bg-white">
        {/* Minimal Header */}
        {/* <div className="flex items-center p-4">
          <button
            onClick={() => setActiveSection('home')}
            className="text-gray-900 hover:text-gray-600 transition-colors"
          >
            <span className="text-xl">←</span>
          </button>
        </div> */}

     
      
        {/* Main Content */}
        <div className="flex flex-col py-12 px-7 md:px-10">
          <div className="flex-1">
            {/* Page Header */}
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-normal text-gray-900 tracking-tight mb-2">
                Predictions Hub
              </h1>
              <p className="text-gray-600 text-sm">
                Make your predictions and track your tournament progress
              </p>
            </div>
            
            {(isBetLoading || !isDataLoaded) ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-3 text-gray-600">
                  <div className="w-5 h-5 border border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                  <span className="text-sm">{t.loadingYourBet || "Loading your prediction..."}</span>
                </div>
              </div>

            ) : reEntryFee && reEntryFee > 0 && !potInfo.isFinalDay ? (
              <div className="text-center py-8">
                <h2 className="text-lg font-medium text-gray-900 mb-2">{t.reentryRequired || "Re-entry Required"}</h2>
                <p className="text-gray-600 text-sm mb-6">
                  {t.wrongPredictionIn || "Wrong prediction in"} {selectedTableType ? getSmartMarketDisplayName(selectedTableType) : 'this market'}. {t.payTodaysEntryFee || "Pay today's entry fee to continue."}
                </p>
                <button
                  onClick={handleReEntry}
                  disabled={isReEntryLoading || isPending || isConfirming}
                  className="bg-gray-900 text-white font-medium py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReEntryLoading || isPending || isConfirming ? (
                    `${t.processing || "Processing..."}`
                  ) : (
                    `${t.enterPot || 'Enter Pot'} (${ethToUsd(getEntryAmount()).toFixed(2)} USD)`
                  )}
                </button>
              </div>
            ) : (
              <>
                {/* Question and Context - Always Visible */}
                <div className="border border-gray-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs md:text-sm text-gray-500">
                      {contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress)
                        ? "This week's question"
                        : "Today's question"
                      }
                    </div>
                    {/* Timer positioned at top right */}
                    {currentTimer && (
                      <div className="flex flex-col items-center bg-gray-100 text-gray-600 text-[10px] md:text-xs px-2 py-0.5 md:px-2.5 md:py-1 rounded-full font-medium">
                        <span className="text-[10px] md:text-xs text-gray-600">Next question</span>
                        <span className="font-medium text-gray-900 text-[10px] md:text-xs">
                          {currentTimer}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-base text-gray-900 mb-3">
                    {displayQuestion || marketQuestion || 'Loading question...'}
                  </div>

                  {/* Context info - Always Visible */}
                  {contractAddress && (
                    <div className="flex items-center gap-4 text-xs md:text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <FaChartBar className="text-gray-400" /> {participantStats.eligibleParticipants} players remaining
                      </span>
                      <span className="flex items-center gap-1">
                        <FaDollarSign className="text-gray-400" /> ${ethToUsd(getEntryAmount()).toFixed(2)} Re-entry
                      </span>
                    </div>
                  )}
                </div>

                

                {/* Single Set of Prediction Buttons */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() => handlePlaceBet('positive')}
                    disabled={isLoading || !isBettingAllowed()}
                    className={`p-4 rounded-lg border transition-colors ${
                      tomorrowsBet && (tomorrowsBet as TodaysBet).prediction === 'positive'
                        ? 'bg-blue-700 border-blue-700 text-white hover:text-blue-700 shadow-lg'
                        : tomorrowsBet && (tomorrowsBet as TodaysBet).prediction === 'negative'
                        ? 'bg-white border-blue-700 text-blue-700 hover:bg-blue-500'
                        : 'bg-blue-500 border-blue-200 text-white hover:border-blue-700 hover:text-blue-700 hover:bg-blue-100'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {/* Only show symbol if this button is selected */}
                      {tomorrowsBet && (tomorrowsBet as TodaysBet).prediction === 'positive' && <span>✓</span>}
                      {tomorrowsBet && (tomorrowsBet as TodaysBet).prediction === 'positive' ? (
                        predictionPercentages && (
                          <span className="font-medium">
                            {getBayesianPercentages().yesPercentage}%
                          </span>
                        )
                      ) : (
                        <>
                          <span className="font-medium">Tap for Yes</span>
                          {predictionPercentages && (
                            <span className="text-xs">
                              {getBayesianPercentages().yesPercentage}%
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => handlePlaceBet('negative')}
                    disabled={isLoading || !isBettingAllowed()}
                    className={`p-4 rounded-lg border transition-colors ${
                      tomorrowsBet && (tomorrowsBet as TodaysBet).prediction === 'negative'
                        ? 'bg-purple-700 border-purple-700 text-white hover:text-purple-700 shadow-lg'
                        : tomorrowsBet && (tomorrowsBet as TodaysBet).prediction === 'positive'
                        ? 'bg-white border-purple-700 text-purple-700 hover:bg-purple-500'
                        : 'bg-purple-500 border-purple-200 text-white hover:text-purple-700 hover:border-purple-700 hover:bg-purple-100'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {/* Only show symbol if this button is selected */}
                      {tomorrowsBet && (tomorrowsBet as TodaysBet).prediction === 'negative' && <span>✗</span>}
                      {tomorrowsBet && (tomorrowsBet as TodaysBet).prediction === 'negative' ? (
                        predictionPercentages && (
                          <span className="font-medium">
                            {getBayesianPercentages().noPercentage}%
                          </span>
                        )
                      ) : (
                        <>
                          <span className="font-medium">Tap for No</span>
                          {predictionPercentages && (
                            <span className="text-xs">
                              {getBayesianPercentages().noPercentage}%
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </button>
                </div>

                

                {/* Loading State */}
                {isLoading && (
                  <div className="text-center py-4">
                    <div className="inline-flex items-center gap-2 text-gray-600">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      <span className="text-sm">
                        {tomorrowsBet ? 'Updating prediction...' : 'Placing prediction...'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Prediction History */}
                {predictionHistory.length > 0 && (
                  <div className="border border-gray-200 rounded-lg mb-6">
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setIsPredictionHistoryCollapsed(!isPredictionHistoryCollapsed)}
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{t.predictionHistory}</h3>
                        <span className="text-gray-400">
                          {isPredictionHistoryCollapsed ? <ChevronDown></ChevronDown>: <ChevronUp></ChevronUp>}
                        </span>
                      </div>
                    </div>

                    {!isPredictionHistoryCollapsed && (
                      <div className="border-t border-gray-200 p-4 space-y-3">
                        {predictionHistory.slice(0, 5).map((prediction, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div>
                              <span className={`font-medium flex items-center gap-1 ${
                                prediction.status === 'correct' ? 'text-blue-600' :
                                prediction.status === 'incorrect' ? 'text-purple-600' :
                                prediction.prediction === 'positive' ? 'text-blue-600' : 'text-purple-600'
                              }`}>
                                <span className="text-sm">
                                  {prediction.prediction === 'positive' ? '✓' : '✗'}
                                </span>
                                {prediction.prediction === 'positive' ? 'YES' : 'NO'}
                              </span>
                              <span className="text-gray-500 ml-2">
                                {new Date(prediction.predictionDate).toLocaleDateString()}
                              </span>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              prediction.status === 'correct' ? 'bg-blue-100 text-blue-700' :
                              prediction.status === 'incorrect' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {prediction.status === 'pending' ? 'Pending' :
                               prediction.status === 'correct' ? 'Correct' : 'Incorrect'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className="fixed bottom-4 left-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg z-50">
          {message}
        </div>
      )}
    </>
  );
}
