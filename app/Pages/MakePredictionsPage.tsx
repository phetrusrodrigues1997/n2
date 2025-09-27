import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseEther } from 'viem';
import { placeBitcoinBet, getTomorrowsBet, getTodaysBet, isEliminated, submitEvidence, getUserEvidenceSubmission, getAllEvidenceSubmissions, processReEntry, notifyMinimumPlayersReached } from '../Database/actions';
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

  // Load data on component mount and when key dependencies change
  useEffect(() => {
    const loadAllData = async () => {
      if (address && isParticipant && selectedTableType) {
        setIsDataLoaded(false);
        try {
          await Promise.all([
            loadBets(),
            loadMarketOutcome(), // This will also load evidence submission after outcome is loaded
            loadPredictionHistory() // Load prediction history for the dashboard
          ]);
        } finally {
          setIsDataLoaded(true);
        }
      } else {
        setIsDataLoaded(true); // Set to true even if we can't load data
      }
    };
    
    loadAllData();
  }, [address, isParticipant, selectedTableType, loadBets, loadMarketOutcome, loadPredictionHistory]);

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

      await placeBitcoinBet(address, prediction, selectedTableType, marketQuestion, contractAddress);
      
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowFormatted = tomorrow.toLocaleDateString();
      // showMessage(`Pre placed successfully for ${tomorrowFormatted}!`);
      await loadBets(); // Reload to show the new bet
      await loadPredictionHistory(); // Reload prediction history
      
      // Auto-collapse after successful prediction for cleaner UX
      setTimeout(() => {
        setIsMainSectionCollapsed(true);
      }, 2000);
    } catch (error: unknown) {
      console.error('Error placing bet:', error);
      showMessage(error instanceof Error ? error.message : 'Failed to place bet. Please try again.');
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4 flex items-center justify-center relative overflow-hidden">
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
      
      <div className="min-h-screen bg-white p-4 relative overflow-hidden">
        {/* Back Button - Always visible for all UI states */}
        <div className="mb-6 relative z-10">
          <button
            onClick={() => setActiveSection('home')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-700 transition-colors duration-200 font-medium text-sm tracking-wide bg-white hover:bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300"
          >
            <span>←</span>
            <span>{t.backToMarkets || 'Back to Markets'}</span>
          </button>
        </div>

      {/* Dynamic background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-1/6 w-64 h-64 bg-gray-900 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/6 w-48 h-48 bg-gray-700 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-2/3 left-1/2 w-32 h-32 bg-gray-600 rounded-full blur-2xl animate-pulse delay-1000"></div>
      </div>

     
      
      <div className="max-w-lg mx-auto pt-12 relative z-10">
        {(isBetLoading || !isDataLoaded) ? (
           <div className="relative bg-white/80 backdrop-blur-xl border border-gray-200/40 rounded-3xl p-10 mb-8
  shadow-2xl shadow-gray-900/20 text-center overflow-hidden">

  {/* Subtle gradient glow border */}
  <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-gray-500/20 via-gray-300/10 to-gray-500/20 blur-2xl"></div>

  <div className="relative inline-flex items-center gap-3 text-gray-700">
    {/* Loader: dual ring spinner */}
    <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin"></div>
    
    {/* Animated text */}
    <span className="font-semibold tracking-wide text-sm animate-pulse">
      {t.loadingYourBet || "Loading your prediction..."}
    </span>
  </div>
</div>

        ) : reEntryFee && reEntryFee > 0 && !potInfo.isFinalDay ? (
          // Re-entry Required Message
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 shadow-sm">
            <div className="text-center">
              <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{t.reentryRequired || "Re-entry Required"}</h2>
              <p className="text-gray-600 text-sm mb-6">
{t.wrongPredictionIn || "Wrong prediction in"} {selectedTableType ? getSmartMarketDisplayName(selectedTableType) : 'this market'}. {t.payTodaysEntryFee || "Pay today's entry fee to continue."}
              </p>
              
              <button
                onClick={handleReEntry}
                disabled={isReEntryLoading || isPending || isConfirming}
                className="w-full bg-black text-white font-medium py-3 px-6 rounded-lg hover:bg-gray-800 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReEntryLoading || isPending || isConfirming ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {t.processing || "Processing..."}
                  </>
                ) : (
                  `${t.enterPot || 'Enter Pot'} (${ethToUsd(getEntryAmount()).toFixed(2)} USD)`
                )}
              </button>
            </div>
          </div>
        ) : (
          <>

            {/* Tomorrow's Bet Interface */}
            {(hasOutcomeBeenSet() && marketOutcome && isEvidenceWindowActive()) ? (
              // PRIORITY: Evidence submission interface when window is active
              <div className="space-y-6">
                {/* Market Outcome Display - Compressed */}
                <div className={`bg-gradient-to-br backdrop-blur-xl border-2 rounded-2xl p-6 mb-6 mt-16 shadow-xl relative overflow-hidden ${
                  marketOutcome?.outcome === 'positive'
                    ? 'from-green-50 via-white to-green-50 border-green-200 shadow-green-900/10'
                    : 'from-gray-100 via-white to-gray-100 border-gray-200 shadow-gray-900/10'
                }`}>
                  <div className="flex items-center justify-center gap-6">
                    <div className={`w-16 h-16 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-lg ${
                      marketOutcome?.outcome === 'positive' 
                        ? 'from-green-500 to-green-600' 
                        : 'from-gray-600 to-gray-700'
                    }`}>
                      {marketOutcome?.outcome === 'positive' ? (
                        <TrendingUp className="w-8 h-8 text-white" />
                      ) : (
                        <TrendingDown className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <div className="text-center">
                      <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">{t.dailyOutcomeSet || "Daily Outcome Set"}</h2>
                      <div className={`inline-flex items-center px-6 py-2 rounded-xl bg-gradient-to-br backdrop-blur-sm border shadow-md ${
                        marketOutcome?.outcome === 'positive' 
                          ? 'from-green-50/80 to-white/80 border-green-200/30' 
                          : 'from-gray-100/80 to-white/80 border-gray-200/30'
                      }`}>
                        <div className={`text-2xl font-black tracking-tight ${
                          marketOutcome?.outcome === 'positive' ? 'text-green-700' : 'text-gray-700'
                        }`}>
                          {marketOutcome?.outcome === 'positive' ? getTranslation(currentLanguage).higher : getTranslation(currentLanguage).lower}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {marketOutcome?.finalOutcome && marketOutcome.finalOutcome !== marketOutcome.outcome && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mt-4">
                      <p className="text-yellow-800 font-semibold text-sm text-center">
                        ⚠️ Outcome disputed and updated to: <span className="font-bold">
                          {marketOutcome.finalOutcome === 'positive' ? getTranslation(currentLanguage).higher : getTranslation(currentLanguage).lower}
                        </span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Evidence Submission Interface - Collapsible */}
                {isEvidenceWindowActive() && !hasUserSubmittedEvidence() && (
                  <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 backdrop-blur-xl border-2 border-gray-300 rounded-3xl p-8 mb-8 shadow-2xl shadow-gray-900/20 relative overflow-hidden">
                    {/* Collapsible Header */}
                    <div 
                      className="cursor-pointer hover:bg-gray-50/50 rounded-2xl p-2 -m-2 transition-colors duration-200"
                      onClick={() => setIsEvidenceSectionExpanded(!isEvidenceSectionExpanded)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-gray-600 to-gray-700 rounded-2xl flex items-center justify-center shadow-lg">
                            <AlertTriangle className="w-8 h-8 text-white" />
                          </div>
                          <div className="text-left">
                            <h3 className="text-xl font-black text-gray-900 mb-1 tracking-tight">{t.disputeOutcome || "Dispute the Outcome?"}</h3>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-600" />
                              <p className="text-gray-800 font-bold text-sm">
                                {formatTimeRemaining(timeUntilEvidenceExpires)} remaining
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="text-sm font-medium">
                            {isEvidenceSectionExpanded ? 'Collapse' : 'Expand'}
                          </span>
                          {isEvidenceSectionExpanded ?
                            <ChevronDown className="w-5 h-5" /> :
                            <ChevronUp className="w-5 h-5" />
                          }
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    {isEvidenceSectionExpanded && (
                      <div className="mt-8 space-y-6">
                        <div className="bg-gray-100 rounded-2xl p-4 border border-gray-200">
                          <p className="text-gray-800 text-sm text-center font-medium">
                            Submit evidence against this outcome within the time limit
                          </p>
                        </div>

                        <div>
                          <label className="block text-gray-900 font-bold mb-3">
                            Evidence Against Outcome
                          </label>
                          <textarea
                            value={evidenceText}
                            onChange={(e) => setEvidenceText(e.target.value)}
                            placeholder={t.evidencePlaceholder || "Provide detailed evidence why this outcome is incorrect. Include links, sources, or explanations..."}
                            className="w-full text-black h-32 p-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500 resize-none transition-all duration-200"
                            disabled={isSubmittingEvidence}
                          />
                        </div>

                        <div className="bg-gradient-to-r from-black to-gray-900 border border-gray-700 rounded-2xl p-6">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                            <div className="text-white">
                              <p className="font-bold mb-2 text-gray-300">{t.evidenceSubmissionTerms || "Evidence Submission Terms:"}</p>
                              <ul className="text-sm space-y-1 text-gray-300">
                                <li>• Submit detailed evidence to dispute the outcome</li>
                                <li>• Include sources, links, or clear explanations</li>
                                <li>• Admin will review within 24 hours</li>
                                <li>• One submission per outcome per user</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleEvidenceSubmission}
                          disabled={!evidenceText.trim() || isSubmittingEvidence}
                          className="w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl flex items-center justify-center gap-3"
                        >
                          {isSubmittingEvidence ? (
                            <>
                              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              {t.submittingEvidence || "Submitting Evidence..."}
                            </>
                          ) : (
                            <>
                              <Upload className="w-6 h-6" />
                              {t.submitEvidence || "Submit Evidence"}
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Evidence Submitted Status */}
                {hasUserSubmittedEvidence() && (
                  <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 backdrop-blur-xl border-2 border-gray-200 rounded-3xl p-10 mb-8 shadow-2xl shadow-gray-900/10">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                        <FileText className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">{t.evidenceSubmitted || "Evidence Submitted"}</h3>
                      <div className="bg-gray-100 rounded-2xl p-6 border border-gray-200 mb-6">
                        <p className="text-gray-800 font-bold mb-2">{t.status || "Status:"} {userEvidenceSubmission?.status === 'pending' ? (t.underReview || 'Under Review') : userEvidenceSubmission?.status}</p>
                        <p className="text-gray-700 text-sm">
                          Admin will review your evidence within 24 hours
                        </p>
                      </div>
                      <div className="text-gray-600 text-sm">
                        <p className="mb-1">📄 {t.evidenceSubmittedAt || "Evidence submitted:"} {userEvidenceSubmission?.submittedAt.toLocaleString()}</p>
                        <p>⏳ {t.status || "Status:"} {userEvidenceSubmission?.status === 'pending' ? (t.underReview || 'Under Review') : userEvidenceSubmission?.status}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Evidence Window Expired */}
                {!isEvidenceWindowActive() && !hasUserSubmittedEvidence() && (
                  <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 backdrop-blur-xl border-2 border-gray-200 rounded-3xl p-10 mb-8 shadow-2xl shadow-gray-900/10">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                        <Clock className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">{t.evidenceWindowClosed || "Evidence Window Closed"}</h3>
                      <p className="text-gray-600 text-lg mb-6">
                        The 1-hour evidence submission window has expired
                      </p>
                      <div className="bg-gray-100 rounded-2xl p-6 border border-gray-200">
                        <p className="text-gray-700 font-medium">
                          The pot outcome is now final and pot distribution will proceed
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : tomorrowsBet ? (
              <div className="bg-white border-2 border-black rounded-3xl shadow-2xl overflow-hidden relative">
                {/* Header Section */}
                <div className="bg-black text-white px-6 py-4 text-center">
                  <h2 className="text-2xl font-bold tracking-tight">{t.youChose || "You Chose"}</h2>
                  {/* <p className="text-gray-300 text-sm mt-1">
                    {t.for || "For:"} <span className="text-gray-700">{t.tomorrow || "tomorrow"}</span>
                  </p> */}
                </div>

                {/* Main Prediction Display */}
                <div className="p-4 text-center">
                  <div className="flex items-center justify-center gap-6 mb-6">
                    <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
                      (tomorrowsBet as TodaysBet).prediction === 'positive' 
                        ? 'bg-black' 
                        : 'bg-gray-700'
                    }`}>
                      {(tomorrowsBet as TodaysBet).prediction === 'positive' ? (
                        <TrendingUp className="w-10 h-10 text-white" />
                      ) : (
                        <TrendingDown className="w-10 h-10 text-white" />
                      )}
                    </div>
                    
                    <div className="text-left">
                      <div className="text-5xl font-black text-black tracking-tight mb-2">
                        {(tomorrowsBet as TodaysBet).prediction === 'positive' ? getTranslation(currentLanguage).higher : getTranslation(currentLanguage).lower}
                      </div>
                      {/* <div className="text-gray-600 text-sm font-medium">
                        Set at {new Date(tomorrowsBet.createdAt).toLocaleTimeString('en-GB', {
                          timeZone: 'Europe/London',
                          hour: '2-digit', 
                          minute: '2-digit'
                        })}
                      </div> */}
                    </div>
                  </div>

                  {/* Market Question */}
                  {/* {marketQuestion && (
                    <div className="bg-black rounded-2xl p-6 mb-8 text-center">
                      <p className="text-white font-semibold text-lg leading-relaxed">
                        {marketQuestion}
                      </p>
                    </div>
                  )} */}

                  {/* Tiny Timer */}
                  <div className="flex justify-center mb-4">
                    <div className="bg-white border border-gray-300 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-600 rounded-full flex items-center justify-center">
                          <Clock className="w-1.5 h-1.5 text-white" />
                        </div>
                        <span className="text-gray-700 font-medium text-xs">
                          {isPenaltyExempt ? "Race Day" : (t.nextQuestion || "Next Question")}
                        </span>
                        <span className="font-black text-gray-900 text-xs tracking-wider">
                          {formatTimerDisplay(timerData)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            ) : isResultsDay() ? (
              // Saturday - Results Day message (when no outcome set yet)
              <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 backdrop-blur-xl border-2 border-gray-200 rounded-3xl p-10 mb-8 shadow-2xl shadow-gray-900/10 relative overflow-hidden">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                    <Zap className="w-12 h-12 text-white animate-pulse" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">{t.resultsDay || "Results Day! 🎉"}</h2>
                  
                  <div className="bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl p-6 border border-gray-200 mb-6">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <div className="w-3 h-3 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-3 h-3 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                      <div className="w-3 h-3 bg-gray-500 rounded-full animate-bounce delay-200"></div>
                    </div>
                    <p className="text-gray-800 font-bold text-lg">
                      Outcome will be set soon!
                    </p>
                    <p className="text-gray-600 text-sm mt-2">
                      You&apos;ll have 1 hour to submit evidence if you disagree
                    </p>
                  </div>
                  <div className="text-gray-600 text-sm">
                    <p className="mb-1">📊 Your predictions are locked in</p>
                    <p>⚖️ Evidence submission window opens after outcome is set</p>
                  </div>
                  
                  {/* Refresh button to check for new outcomes */}
                  <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                    <button
                      onClick={refreshMarketData}
                      className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      🔄 Check for Outcome Updates
                    </button>
                  </div>
                </div>
              </div>
            ) : !isBettingAllowed() ? (
              // This case should never happen now since betting is only closed on Saturday (which is Results Day)
              // But keeping this as a fallback
              <div className="bg-white/70 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-10 mb-8 shadow-2xl shadow-gray-900/10 relative overflow-hidden">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg">
                    <Shield className="w-12 h-12 text-gray-600" />
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">{t.predictionsClosed || "Predictions Closed"}</h2>
                  <p className="text-gray-600 text-lg mb-6">
                    Predictions can be placed Sunday through Friday
                  </p>
                  <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                    <p className="text-gray-700 font-medium mb-2">Prediction Schedule:</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Sunday - Friday:</span>
                        <span className="text-green-600 font-bold">✓ Predictions Open</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Saturday:</span>
                        <span className="text-gray-700 font-bold">✗ Results Day</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Combined Collapsible Voting and Timer Interface
              <div className="relative">
                {/* Compact timer above dropdown when closed */}
                <div className={`flex justify-end mb-2 ${isMainSectionCollapsed ? 'block' : 'hidden'}`}>
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-600 rounded-full flex items-center justify-center">
                        <Clock className="w-1.5 h-1.5 text-white" />
                      </div>
                      <span className="text-gray-700 font-medium text-xs">
                        {isPenaltyExempt ? "Race Day" : (t.nextQuestion || "Next Question")}
                      </span>
                      <span className="font-black text-gray-900 text-xs tracking-wider">
                        {formatTimerDisplay(timerData)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-white via-gray-50/30 to-white border border-gray-200/50 rounded-3xl mb-8 shadow-2xl shadow-gray-900/5 relative overflow-hidden">
                {/* Header with collapse toggle - Improved mobile layout */}
                <div 
                  onClick={() => setIsMainSectionCollapsed(!isMainSectionCollapsed)}
                  className="cursor-pointer hover:bg-gray-50/20 transition-all duration-200 border-b border-gray-100/50"
                >
                  {/* Top section with question */}
                  <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight leading-tight mb-1">
                          {tomorrowsBet ? (t.activePrediction || 'Active Prediction') : (displayQuestion || (t.makePrediction || 'Make Prediction'))}
                        </h2>
                        <p className="text-gray-500 text-xs sm:text-sm font-medium">
                          {tomorrowsBet
                            ? (t.managePrediction || "Manage your current prediction")
                            : <><span className="text-gray-700"></span></>
                          }
                        </p>
                      </div>
                      <div className={`p-2 rounded-lg transition-colors duration-200 flex-shrink-0 ${
                        isMainSectionCollapsed ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-100 hover:bg-gray-200'
                      }`}>
                        {isMainSectionCollapsed ? (
                          <ChevronUp className="w-4 h-4 text-gray-700" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-gray-700" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom section with buttons - only show when collapsed */}
                  {isMainSectionCollapsed && (
                    <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2">
                      <div className="flex items-center justify-center gap-3">
                        {tomorrowsBet ? (
                          <div className={`px-4 py-2 rounded-full text-sm font-black shadow-sm ${
                            (tomorrowsBet as TodaysBet).prediction === 'positive' 
                              ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-200' 
                              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-200'
                          }`}>
                            {(tomorrowsBet as TodaysBet).prediction === 'positive' ? getTranslation(currentLanguage).higher : getTranslation(currentLanguage).lower}
                          </div>
                        ) : (
                          // Show YES/NO buttons when collapsed and no active prediction
                          isBettingAllowed() && (
                            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handlePlaceBet('positive')}
                                disabled={isLoading}
                                className="bg-[#000000] hover:bg-[#009900] disabled:opacity-50 text-white px-6 py-3 rounded-xl font-black text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                              >
                                {t.yesButton || "YES"}
                              </button>
                              <button
                                onClick={() => handlePlaceBet('negative')}
                                disabled={isLoading}
                                className="bg-[#bb0000] hover:bg-[#990000] disabled:opacity-50 text-white px-6 py-3 rounded-xl font-black text-sm transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                              >
                                {t.noButton || "NO"}
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Collapsible Content */}
                {!isMainSectionCollapsed && (
                  <div className="px-4 sm:px-6 pb-6">
                    
                    {/* Prediction Date Information */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-50 border border-gray-200/50 rounded-2xl p-4 mb-6 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <h4 className="text-sm font-black text-gray-900">{t.predictingForTomorrow || "Predicting for Tomorrow"}</h4>
                      </div>
                      <p className="text-gray-700 font-semibold text-base sm:text-lg">
                        {(() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          // Use appropriate locale based on current language
                          const locale = currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-US';
                          return tomorrow.toLocaleDateString(locale, { 
                            weekday: 'long',
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          });
                        })()}
                      </p>
                      
                    </div>

                    {/* Auto-submission status */}
                    {votingPreference && !tomorrowsBet && (
                      <div className="mb-6 text-center">
                        <h3 className="text-xl font-black text-gray-700 mb-3 tracking-tight">
                          {t.autoSubmittingChoice || "Auto-Submitting Your Choice"}
                        </h3>
                        <div className="bg-gradient-to-r from-gray-50/80 to-white border border-gray-200/50 rounded-2xl p-4 max-w-sm mx-auto">
                          <p className="text-gray-700 text-sm font-medium">
                            Submitting: <span className="font-black text-gray-700">
                              {votingPreference === 'positive' ? getTranslation(currentLanguage).higher : getTranslation(currentLanguage).lower}
                            </span>
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Yes/No Buttons - Moved much higher, no padding */}
                    <div className="mb-8">
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {/* YES Button - Black */}
                        <button
                          onClick={() => handlePlaceBet('positive')}
                          disabled={isLoading || !isBettingAllowed()}
                          className="group relative bg-gradient-to-br from-gray-900 to-black hover:from-gray-800 hover:to-black disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 sm:p-5 rounded-2xl font-black text-lg transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-xl border border-gray-800 hover:border-gray-700"
                        >
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-2 bg-white/10 rounded-lg mb-2 flex items-center justify-center">
                              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="tracking-wide">{t.yesButton || "YES"}</div>
                          </div>
                        </button>

                        {/* NO Button - White */}
                        <button
                          onClick={() => handlePlaceBet('negative')}
                          disabled={isLoading || !isBettingAllowed()}
                          className="group relative bg-white hover:bg-gray-50 border-2 border-gray-900 hover:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 hover:text-gray-700 p-4 sm:p-5 rounded-2xl font-black text-lg transition-all duration-200 hover:scale-[1.02] shadow-lg hover:shadow-xl"
                        >
                          <div className="flex flex-col items-center justify-center">
                            <div className="p-2 bg-gray-900/10 group-hover:bg-gray-700/10 rounded-lg mb-2 flex items-center justify-center transition-colors duration-200">
                              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="tracking-wide">{t.noButton || "NO"}</div>
                          </div>
                        </button>
                      </div>

                      {isLoading && (
                        <div className="text-center mt-6">
                          <div className="inline-flex items-center gap-3 text-gray-700 bg-gray-50 border border-gray-200 px-6 py-3 rounded-2xl shadow-lg">
                            <div className="relative">
                              <Zap className="w-5 h-5 text-gray-700" />
                              <div className="absolute inset-0 animate-ping">
                                <Zap className="w-5 h-5 text-gray-700 opacity-30" />
                              </div>
                            </div>
                            <span className="font-bold text-sm">Placing prediction...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timer Section */}
                    <div className="border-t border-gray-100 pt-6">
                      <h4 className="text-lg font-black text-gray-900 text-center mb-6">{t.importantTimers || "Important Timers"}</h4>
                      <div className="space-y-3">
                      
                      {/* New Question Timer */}
                      <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div className="text-gray-700 font-semibold text-sm">
                            {isPenaltyExempt ? "Race Day" : (t.nextQuestion || "Next Question")}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                              <Clock className="w-3 h-3 text-white" />
                            </div>
                            <span className="font-black text-gray-900 text-lg tracking-wider">
                              {formatTimerDisplay(timerData)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Next Elimination Timer - Hidden for penalty-exempt contracts */}
                      {!isPenaltyExempt && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="text-gray-700 font-semibold text-sm">{t.resultsReveal || "Results Reveal"}</div>
                            <div className="flex items-center gap-3">
                             <span className='text-gray-700 font-semibold'>{t.tomorrowAtMidnight || "Tomorrow at Midnight"}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </div>
            )}
          </>
        )}

        {/* Enhanced Status Message */}
        {message && (
          <div className={`p-6 rounded-2xl mb-8 text-center border shadow-lg transform animate-in fade-in duration-500 ${
            message.includes('Failed') || message.includes('Error') 
              ? 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 text-gray-800' 
              : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200 text-gray-800'
          }`}>
            <p className="font-black text-base">{message}</p>
          </div>
        )}

        {/* Prediction History Dashboard - Collapsible */}
        {predictionHistory && predictionHistory.length > 0 && (
          <div className="bg-gradient-to-br from-white via-gray-50/20 to-white border border-gray-200/50 rounded-3xl mb-8 shadow-lg overflow-hidden">
            {/* Collapsible Header */}
            <div 
              className="cursor-pointer hover:bg-gray-50/50 p-6 transition-colors duration-200"
              onClick={() => setIsPredictionHistoryCollapsed(!isPredictionHistoryCollapsed)}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{t.predictionHistory || 'Prediction History'}</h3>
                <div className="flex items-center gap-2">
                  {/* <span className="text-sm text-gray-500 font-medium">
                    {predictionHistory.length} {predictionHistory.length === 1 ? (currentLanguage === 'pt-BR' ? 'previsão' : 'prediction') : (t.predictions || 'predictions')}
                  </span> */}
                  {isPredictionHistoryCollapsed ?
                    <ChevronUp className="w-5 h-5 text-gray-400" /> :
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  }
                </div>
              </div>
            </div>
            
            {/* Collapsible Content */}
            {!isPredictionHistoryCollapsed && (
              <div className="px-6 pb-6">
                <div className="space-y-3">
                  {predictionHistory.slice(0, 5).map((prediction, index) => (
                    <div 
                      key={index}
                      className="bg-white border border-gray-100 rounded-2xl p-4 hover:border-gray-200 hover:shadow-md transition-all duration-200"
                    >
                      <div className="flex items-center gap-4">
                        {/* Prediction Icon */}
                        <div className={`p-2 rounded-xl ${
                          prediction.prediction === 'positive' 
                            ? 'bg-gradient-to-br from-gray-600 to-gray-700' 
                            : 'bg-gradient-to-br from-gray-600 to-gray-700'
                        }`}>
                          {prediction.prediction === 'positive' ? (
                            <TrendingUp className="w-4 h-4 text-white" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-white" />
                          )}
                        </div>
                        
                        {/* Prediction Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <span className={`font-black text-base ${
                              prediction.prediction === 'positive' ? 'text-gray-700' : 'text-gray-700'
                            }`}>
                              {prediction.prediction === 'positive' ? getTranslation(currentLanguage).higher : getTranslation(currentLanguage).lower}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full font-medium">
                              {new Date(prediction.predictionDate).toLocaleDateString(currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-US', { 
                                month: 'short', 
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm font-medium line-clamp-1 mb-1">
                            {translateMarketQuestion(prediction.questionName, currentLanguage || 'en')}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {new Date(prediction.createdAt).toLocaleDateString(currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-US')} • {' '}
                            {new Date(prediction.createdAt).toLocaleTimeString(currentLanguage === 'pt-BR' ? 'pt-BR' : 'en-GB', {
                              hour: '2-digit', 
                              minute: '2-digit'
                            })}
                          </p>
                        </div>

                        {/* Result Status */}
                        <div className="flex-shrink-0">
                          {prediction.status === 'correct' && (
                            <div className="bg-black-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <span>✓</span> Correct
                              {prediction.isProvisional && (
                                <span className="text-green-600 ml-1">*</span>
                              )}
                            </div>
                          )}
                          {prediction.status === 'incorrect' && (
                            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <span>✗</span> Wrong
                              {prediction.isProvisional && (
                                <span className="text-red-600 ml-1">*</span>
                              )}
                            </div>
                          )}
                          {prediction.status === 'pending' && (
                            <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Pending
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Result Details */}
                      {prediction.actualOutcome && prediction.status !== 'pending' && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            Actual result: <span className="font-medium text-gray-700">
                              {prediction.actualOutcome === 'positive' ? 'Positive' : 'Negative'}
                            </span>
                            {prediction.isProvisional && (
                              <span className="text-gray-400 ml-1">(provisional)</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {predictionHistory.length > 5 && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                    <p className="text-gray-500 text-xs font-medium">
                      {t.showingLatest || 'Showing latest 5 of'} {predictionHistory.length} {t.predictions || 'predictions'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}


        {/* Premium Rules Section - Only show when no provisional outcome is set */}
        {false && !hasOutcomeBeenSet() && (
          <div className="bg-gradient-to-r from-gray-50/80 via-white/80 to-gray-50/80 backdrop-blur-xl border border-gray-200/50 rounded-2xl p-6 text-center shadow-xl shadow-gray-900/5 relative overflow-hidden">
            {/* Subtle pattern */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-900/10 via-transparent to-gray-900/10"></div>
            </div>
            
            
          </div>
        )}


        {/* Admin Evidence Review Panel - Removed - Now available on dedicated admin page */}
        {false && isAdmin() && hasOutcomeBeenSet() && marketOutcome && (
          <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 backdrop-blur-xl border-2 border-gray-200 rounded-3xl p-8 mt-8 shadow-2xl shadow-gray-900/10 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Admin Panel</h3>
                  <p className="text-gray-700 font-medium">Review Evidence Submissions</p>
                </div>
              </div>
              <button
                onClick={toggleAdminPanel}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {showAdminPanel ? (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Show Evidence ({allEvidenceSubmissions.length})
                  </>
                )}
              </button>
            </div>

            {/* Evidence List */}
            {showAdminPanel && (
              <div className="space-y-4">
                {isLoadingEvidence ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center gap-3 text-gray-600">
                      <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                      <span className="font-medium">Loading evidence submissions...</span>
                    </div>
                  </div>
                ) : allEvidenceSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium">No evidence submissions yet</p>
                    <p className="text-gray-500 text-sm">Evidence will appear here when users dispute the outcome</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-100 rounded-xl p-4 mb-4">
                      <h4 className="font-bold text-gray-900 mb-2">📋 Evidence Summary</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="font-bold text-gray-800">{allEvidenceSubmissions.length}</div>
                          <div className="text-gray-600">Total</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-orange-800">{allEvidenceSubmissions.filter(e => e.status === 'pending').length}</div>
                          <div className="text-orange-600">Pending</div>
                        </div>
                        <div className="text-center">
                          <div className="font-bold text-green-800">{allEvidenceSubmissions.filter(e => e.status === 'approved').length}</div>
                          <div className="text-green-600">Approved</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {allEvidenceSubmissions.map((submission, index) => (
                        <div key={submission.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h5 className="font-bold text-gray-900">Evidence #{index + 1}</h5>
                              <p className="text-sm text-gray-600">
                                From: {submission.walletAddress.slice(0, 6)}...{submission.walletAddress.slice(-4)}
                              </p>
                              <p className="text-xs text-gray-500">
                                Submitted: {new Date(submission.submittedAt).toLocaleString()}
                              </p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                              submission.status === 'pending' 
                                ? 'bg-orange-100 text-orange-800'
                                : submission.status === 'approved'
                                ? 'bg-black-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {submission.status.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h6 className="font-semibold text-gray-700 mb-2">Evidence:</h6>
                            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                              {submission.evidence}
                            </p>
                          </div>

                          {submission.reviewNotes && (
                            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <h6 className="font-semibold text-gray-700 mb-1">Admin Review:</h6>
                              <p className="text-gray-800 text-sm">{submission.reviewNotes}</p>
                              {submission.reviewedAt && (
                                <p className="text-gray-600 text-xs mt-1">
                                  Reviewed: {new Date(submission.reviewedAt).toLocaleString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  );
}