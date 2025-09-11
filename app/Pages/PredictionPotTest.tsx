
import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { Wallet } from 'lucide-react';
import { formatUnits, parseEther } from 'viem';
import Cookies from 'js-cookie';
import { Language, getTranslation, supportedLanguages } from '../Languages/languages';
import { getPrice } from '../Constants/getPrice';
import { setDailyOutcome, setDailyOutcomeWithStats, setProvisionalOutcome, getProvisionalOutcome, determineWinners, clearWrongPredictions, testDatabaseConnection, getUserStats, clearPotInformation } from '../Database/OwnerActions'; // Adjust path as needed
import { notifyMarketOutcome, notifyEliminatedUsers, notifyWinners, notifyPotDistributed, notifyMarketUpdate, notifyMinimumPlayersReached } from '../Database/actions';
import { useQueryClient } from '@tanstack/react-query';
import { 
  recordReferral, 
  confirmReferralPotEntry, 
  getAvailableFreeEntries, 
  consumeFreeEntry, 
  getReEntryFee,
  processReEntry,
  debugWrongPredictions,
  removeBookmark,
} from '../Database/actions';
import { recordPotEntry,clearPotParticipationHistory } from '../Database/actions3';
import { CONTRACT_TO_TABLE_MAPPING, getMarketDisplayName, MIN_PLAYERS, MIN_PLAYERS2, calculateEntryFee, getMinimumPlayersForContract, checkMinimumPlayersThreshold, loadWrongPredictionsData } from '../Database/config';
import { updateWinnerStats } from '../Database/OwnerActions';
import { clear } from 'console';
import LoadingScreenAdvanced from '../Components/LoadingScreenAdvanced';


// Use centralized table mapping from config
const tableMapping = CONTRACT_TO_TABLE_MAPPING;
type TableType = typeof tableMapping[keyof typeof tableMapping];
// Updated Contract ABI for SimplePredictionPot (ETH-based)
const PREDICTION_POT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "enterPot",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "participant", "type": "address"}],
    "name": "enterPotFree",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address[]", "name": "winners", "type": "address[]"}],
    "name": "distributePot",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  
  {
    "inputs": [],
    "name": "getParticipants",
    "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Contract now uses ETH directly - no USDC ABI needed

interface PredictionPotProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}


const PredictionPotTest =  ({ activeSection, setActiveSection }: PredictionPotProps) => {
  const { address, isConnected } = useAccount();
  const { writeContract, data: txHash, isPending } = useWriteContract();
  
  // Get ETH balance
  const ethBalance = useBalance({
    address,
    chainId: 8453
  });
  
  const [outcomeInput, setOutcomeInput] = useState<string>('');
  const [provisionalOutcomeInput, setProvisionalOutcomeInput] = useState<string>('');
  // Contract addresses
  const [contractAddress, setContractAddress] = useState<string>('');
  // Removed usdcAddress - now using ETH directly
  
  // Pot information state
  const [potInfo, setPotInfo] = useState<{
    hasStarted: boolean;
    isFinalDay: boolean;
    startedOnDate: string | null;
    lastDayDate: string | null;
  }>({
    hasStarted: false,
    isFinalDay: false,
    startedOnDate: null,
    lastDayDate: null
  });

  // Loading state for pot info to prevent showing UI before we know final day status
  const [potInfoLoading, setPotInfoLoading] = useState<boolean>(true); 
  

  // State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [winnerAddresses, setWinnerAddresses] = useState<string>('empty');
  
  // Debug: Track winnerAddresses changes (only log actual changes, not initial state)
  useEffect(() => {
    if (winnerAddresses !== 'empty') {
      console.log("🔍 winnerAddresses changed:", winnerAddresses);
    }
  }, [winnerAddresses]);
  const [lastAction, setLastAction] = useState<string>('none');
  
  // Debug: Track lastAction changes (only log actual changes, not initial state)
  useEffect(() => {
    if (lastAction !== 'none') {
      console.log("🎯 lastAction changed:", lastAction);
    }
  }, [lastAction]);
  const [selectedTableType, setSelectedTableType] = useState<TableType>('featured');
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(true);
  
  // Referral system state (simplified for navigation button)
  const [inputReferralCode, setInputReferralCode] = useState<string>('');
  const [freeEntriesAvailable, setFreeEntriesAvailable] = useState<number>(0);
  const [reEntryFee, setReEntryFee] = useState<number | null>(null);
  const [allReEntryFees, setAllReEntryFees] = useState<{market: string, fee: number}[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [wrongPredictionsAddresses, setWrongPredictionsAddresses] = useState<string[]>([]);
  
  
  // Note: Countdown states kept for potential future use
  const [timeUntilReopening, setTimeUntilReopening] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Pot entry deadline countdown state
  const [timeUntilDeadline, setTimeUntilDeadline] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  // Track successful pot entry for enhanced UI feedback
  const [justEnteredPot, setJustEnteredPot] = useState(false);
  const [postEntryLoading, setPostEntryLoading] = useState(false);

  // Track final day status from pot information
  const [isFinalDay, setIsFinalDay] = useState(false);
  const [usedDiscountedEntry, setUsedDiscountedEntry] = useState(false);
  

  // Wait for transaction receipt with error handling
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isError, error: receiptError } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Debug transaction receipt states
  useEffect(() => {
    if (txHash) {
      console.log("🧾 Transaction receipt state changed:", {
        txHash,
        isPending,
        isConfirming,
        isConfirmed,
        isError,
        error: receiptError?.message || 'none',
        lastAction,
        timestamp: new Date().toISOString()
      });
      
      // Log transaction failure immediately
      if (isError && receiptError) {
        console.log("❌ Transaction failed:", {
          error: receiptError.message,
          txHash,
          lastAction
        });
        showMessage(`Transaction failed: ${receiptError.message}`, true);
      }
    }
  }, [txHash, isPending, isConfirming, isConfirmed, isError, receiptError, lastAction]);

  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    const savedLang = Cookies.get('language');
    if (savedLang && supportedLanguages.some(lang => lang.code === savedLang)) {
      return savedLang as Language;
    }
    return 'en';
  });
  
  // Update cookie when language changes
  useEffect(() => {
    Cookies.set('language', currentLanguage, { sameSite: 'lax' });
  }, [currentLanguage]);
  
  const t = getTranslation(currentLanguage);

 // Add useEffect to handle cookie retrieval
  useEffect(() => {
    const savedContract = Cookies.get('selectedMarket');
    
    // Validate contract address is in our allowed list
    if (savedContract && tableMapping[savedContract as keyof typeof tableMapping]) {
      setContractAddress(savedContract);
      const tableType = tableMapping[savedContract as keyof typeof tableMapping];
      setSelectedTableType(tableType);

    } else {
      // Fallback to default contract if no valid cookie is found
      setContractAddress('0x4Ff2bBB26CC30EaD90251dd224b641989Fa24e22');
      setSelectedTableType('featured');
    }
  }, []);

  // Add state for voting preference
  const [votingPreference, setVotingPreference] = useState<string | null>(null);
  const [selectedMarketForVoting, setSelectedMarketForVoting] = useState<string | null>(null);
  const [marketQuestion, setMarketQuestion] = useState<string | null>(null);

  // Functions for pot information management
  const fetchPotInfo = async (contractAddr: string) => {
    setPotInfoLoading(true);
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
        setIsFinalDay(data.isFinalDay || false);
        setPotInfo({
          hasStarted: data.hasStarted || false,
          isFinalDay: data.isFinalDay || false,
          startedOnDate: data.startedOnDate || null,
          lastDayDate: data.lastDayDate || null
        });
        console.log(`📅 Fetched final day status for ${contractAddr}: ${data.isFinalDay}`);
      } else {
        console.error('Failed to fetch pot info:', response.statusText);
        setIsFinalDay(false); // Default to non-final day on error
      }
    } catch (error) {
      console.error('Failed to fetch pot info:', error);
    } finally {
      setPotInfoLoading(false);
    }
  };

  const updatePotInfo = async (contractAddr: string, hasStarted: boolean, isFinalDay: boolean, startedOnDate: string | null, lastDayDate: string | null = null) => {
    const response = await fetch('/api/update-pot-info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        contractAddress: contractAddr,
        hasStarted,
        isFinalDay,
        startedOnDate,
        lastDayDate
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update pot information');
    }
    
    return response.json();
  };
  
  // Load voting preference from cookies
  useEffect(() => {
    const preference = Cookies.get('votingPreference');
    const marketForVoting = Cookies.get('selectedMarketForVoting');
    const savedQuestion = Cookies.get('selectedMarketQuestion');
    setVotingPreference(preference || null);
    setSelectedMarketForVoting(marketForVoting || null);
    setMarketQuestion(savedQuestion || null);
  }, []);

  // Fetch pot information when contract address changes
  useEffect(() => {
    if (contractAddress) {
      fetchPotInfo(contractAddress);
    }
  }, [contractAddress]);

  // Load referral data when wallet connects or market changes
  useEffect(() => {
    if (address && selectedTableType) {
      loadReferralData();
    }
  }, [address, selectedTableType]);

  // Load wrong predictions data when table type changes
  useEffect(() => {
    if (selectedTableType) {
      const loadData = async () => {
        const addresses = await loadWrongPredictionsData(selectedTableType);
        setWrongPredictionsAddresses(addresses);
      };
      loadData();
    }
  }, [selectedTableType]);

  // Initial loading screen effect with progressive steps
  useEffect(() => {
    // Complete loading after 4 seconds (same duration as LoadingScreenAdvanced)
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  // Fetch ETH price
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const price = await getPrice('ETH');
        setEthPrice(price);
        setIsLoadingPrice(false);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        setEthPrice(3000); // Fallback price
        setIsLoadingPrice(false);
      }
    };

    fetchEthPrice();
    
    // Refresh price every 5 minutes
    const interval = setInterval(fetchEthPrice, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Note: Removed hardcoded countdown timer effects
  // Final day timing is now owner-controlled, not schedule-based

  const loadReferralData = async () => {
    if (!address) return;
    
    try {
      
      
      // Debug wrong predictions tables
      await debugWrongPredictions(address);
      
      // Load available free entries
      const freeEntries = await getAvailableFreeEntries(address);
      setFreeEntriesAvailable(freeEntries);
      
      // Check if user needs to pay re-entry fee for current market
      const reEntryAmount = await getReEntryFee(address, selectedTableType);
      setReEntryFee(reEntryAmount);
      
      // Note: getAllReEntryFees was removed since we now use dynamic pricing
      setAllReEntryFees([]);
      
      // Load wrong predictions addresses for current table type
      const addresses = await loadWrongPredictionsData(selectedTableType);
      setWrongPredictionsAddresses(addresses);
      
    } catch (error) {
      console.error("Error loading referral data:", error);
    }
  };


  

  // Simple transaction reset - only if truly stuck - with better conditions
  useEffect(() => {
    // Only set timeout if we've been in loading state for a reasonable time without any transaction activity
    if (!isPending && !isConfirming && !isConfirmed && lastAction && lastAction !== 'none' && isLoading) {
      console.log("⏰ Transaction state check:", {
        isPending,
        isConfirming,
        isConfirmed,
        lastAction,
        isLoading,
        txHash: txHash || 'none',
        timestamp: new Date().toISOString()
      });
      
      // Add a delay before setting up timeout to avoid premature resets
      const delayTimeout = setTimeout(() => {
        if (!isPending && !isConfirming && !isConfirmed && lastAction && lastAction !== 'none' && isLoading) {
          console.log("⏰ Setting up transaction timeout after delay...");
          const mainTimeout = setTimeout(() => {
            // Double check conditions before resetting
            if (!isPending && !isConfirming && !isConfirmed && isLoading && !txHash) {
              console.log("🔄 Transaction timeout reset - no transaction hash detected");
              setIsLoading(false);
              setLastAction('none');
              showMessage("Transaction timeout. Please try again.", true);
            } else {
              console.log("⏰ Timeout avoided - transaction activity detected:", {
                isPending,
                isConfirming,
                isConfirmed,
                txHash: !!txHash
              });
            }
          }, 120000); // 2 minutes
          
          return () => clearTimeout(mainTimeout);
        }
      }, 5000); // 5 second delay before setting up main timeout
      
      return () => clearTimeout(delayTimeout);
    }
  }, [isPending, isConfirming, isConfirmed, lastAction, isLoading, txHash]);


  // Read contract data
  const { data: participants } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: PREDICTION_POT_ABI,
    functionName: 'getParticipants',
    query: { enabled: !!contractAddress }
  }) as { data: string[] | undefined };

  const { data: potBalance } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: PREDICTION_POT_ABI,
    functionName: 'getBalance',
    query: { enabled: !!contractAddress }
  }) as { data: bigint | undefined };

  // Check if the user is a participant
  const isParticipant = address && participants && Array.isArray(participants) 
    ? participants.some(participant => participant.toLowerCase() === address.toLowerCase())
    : false;

  // Helper function to check if there are enough participants for the pot
  const hasEnoughParticipants = (): boolean => {
    if (!participants || !Array.isArray(participants)) return false;
    
    // Determine which contract index this is to get correct min players requirement
    const contractAddresses = Object.keys(CONTRACT_TO_TABLE_MAPPING);
    const contractIndex = contractAddresses.indexOf(contractAddress);
    const minPlayersRequired = contractIndex === 0 ? MIN_PLAYERS : MIN_PLAYERS2;
    
    return participants.length >= minPlayersRequired;
  };

  // Check if user has the special wallet address
  const SPECIAL_ADDRESS = '0xA90611B6AFcBdFa9DDFfCB2aa2014446297b6680';
  const isSpecialUser = address && address.toLowerCase() === SPECIAL_ADDRESS.toLowerCase();


  const { data: owner } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: PREDICTION_POT_ABI,
    functionName: 'owner',
    query: { enabled: !!contractAddress }
  }) as { data: string | undefined };

  
  
  // Get dynamic entry amount using the new pricing system
  const getEntryAmount = (): bigint => {
    const entryFeeUsd = calculateEntryFee(potInfo.hasStarted, potInfo.startedOnDate);
    return usdToEth(entryFeeUsd);
  };
  
  // Helper function to convert USD to ETH
  const usdToEth = (usdAmount: number): bigint => {
    const fallbackEthPrice = 4700; // Fallback price if ETH price not loaded
    const currentEthPrice = ethPrice || fallbackEthPrice;
    const ethAmount = usdAmount / currentEthPrice;
    return parseEther(ethAmount.toString());
  };

  // Current entry amount based on pot status and free entries
  const baseEntryAmount = getEntryAmount();
  const entryAmount = freeEntriesAvailable > 0 ? usdToEth(0.02) : baseEntryAmount; // Fixed $0.02 if using free entry, otherwise dynamic price

  // ETH balance is handled by the wallet - no need for contract reads


  const formatETH = (value: bigint): string => {
    try {
      const formatted = formatUnits(value, 18);
      return parseFloat(formatted).toFixed(4);
    } catch {
      return '0.0000';
    }
  };

  // Helper to get USD equivalent of ETH amount
  const getUsdEquivalent = (ethAmount: bigint): string => {
    if (!ethPrice) return '~$?.??';
    const ethValue = Number(formatUnits(ethAmount, 18));
    const usdValue = ethValue * ethPrice;
    return `~$${usdValue.toFixed(4)}`;
  };

  // Helper to get the current USD entry price
  const getCurrentUsdPrice = (): string => {
    const entryFeeUsd = calculateEntryFee(potInfo.hasStarted, potInfo.startedOnDate);
    return `$${entryFeeUsd.toFixed(2)}`;
  };



  // Note: Removed isPotEntryBlocked() function - now using isFinalDay directly

  // Note: Removed hardcoded Saturday/Sunday countdown functions
  // Final day timing is now controlled dynamically by the pot owner

  
    const ethToUsd = (ethAmount: bigint): number => {
        const fallbackEthPrice = 4700;
        const currentEthPrice = ethPrice || fallbackEthPrice;
        const ethValue = Number(formatUnits(ethAmount, 18));
        return ethValue * currentEthPrice;
      };

  // Check if user has sufficient balance (at least $0.01 USD worth of ETH)
  const hasInsufficientBalance = isConnected && ethBalance.data && ethToUsd(ethBalance.data.value) < 0.01;

  // Note: Removed updateCountdown function - no longer needed with owner-controlled final day

  // Note: Removed updateDeadlineCountdown function - no longer needed with owner-controlled final day

  const showMessage = (msg: string, isError = false) => {
    setMessage(msg);
    if (!isError) {
      setTimeout(() => setMessage(''), 8000);
    } else {
      setTimeout(() => setMessage(''), 5000);
    }
  };

  // Removed handleApprove - not needed for ETH transactions

  const handleEnterPot = async (useDiscounted: boolean = false) => {
    if (!contractAddress) return;
    
    setIsLoading(true);
    setLastAction('enterPot');
    setUsedDiscountedEntry(useDiscounted); // Track if discounted entry was attempted
    
    try {
      // Don't consume free entry yet - wait for transaction confirmation
      if (useDiscounted && freeEntriesAvailable === 0) {
        showMessage('No discounted entries available', true);
        setIsLoading(false);
        setLastAction('');
        return;
      }
      
      // Handle referral code if provided for paid entries (run in background)
      if (inputReferralCode.trim()) {
        // Don't await this - run in background to avoid blocking pot entry
        recordReferral(inputReferralCode.trim().toUpperCase(), address!)
          .then(() => {
          })
          .catch(() => {
            // Silently fail - don't let referral issues affect main app flow
          });
      }
      
      // Always use the regular enterPot function with ETH value
      await writeContract({
        address: contractAddress as `0x${string}`,
        abi: PREDICTION_POT_ABI,
        functionName: 'enterPot',
        args: [], // No args needed - ETH sent via value
        value: entryAmount, // Send ETH as value
      });
      
      const message = useDiscounted 
        ? 'Discounted entry submitted! Waiting for confirmation...'
        : 'Enter pot transaction submitted! Waiting for confirmation...';
      showMessage(message);
    } catch (error) {
      console.error('Enter pot failed:', error);
      showMessage('Enter pot failed. Check console for details.', true);
      setLastAction('');
      setIsLoading(false);
      setUsedDiscountedEntry(false); // Reset flag on error
    }
  };

  // Removed handleReEntryApprove - not needed for ETH transactions

  const handleReEntry = async () => {
    if (!contractAddress || !reEntryFee) return;
    
    setIsLoading(true);
    setLastAction('reEntry');
    
    try {
      // Process re-entry payment using the same logic as normal pot entry
      await writeContract({
        address: contractAddress as `0x${string}`,
        abi: PREDICTION_POT_ABI,
        functionName: 'enterPot',
        args: [],
        value: entryAmount, // Use same entry amount as normal pot entry
      });
      
      showMessage('Re-entry payment submitted! Waiting for confirmation...');
    } catch (error) {
      console.error('Re-entry payment failed:', error);
      showMessage('Re-entry payment failed. Check console for details.', true);
      setLastAction('');
      setIsLoading(false);
    }
  };


  const isActuallyLoading = isLoading || isPending || isConfirming;
  
  const isOwner = address && owner && address.toLowerCase() === owner.toLowerCase();
    

  const queryClient = useQueryClient();
useEffect(() => {
  console.log("🔄 Transaction confirmation useEffect triggered:", { 
    isConfirmed, 
    isConfirming, 
    isPending,
    lastAction, 
    winnerAddresses: winnerAddresses || 'empty',
    potBalance: potBalance?.toString() || 'none',
    txHash: txHash || 'no hash'
  });
  
  if (isConfirmed) {
    console.log("✅ Transaction confirmed successfully! Details:", {
      lastAction,
      txHash,
      timestamp: new Date().toISOString(),
      contractAddress,
      selectedTableType
    });
    
    if (lastAction === 'enterPot') {
      // Keep loading state active while background processes complete
      setIsLoading(false); // Clear transaction loading
      setPostEntryLoading(true); // Start post-entry loading
      setJustEnteredPot(true);
      
      // Record the pot entry in participation history
      if (address) {
        recordPotEntry(address, contractAddress, selectedTableType, 'entry').catch(() => {
          // Silently handle pot entry recording errors
          console.warn('Failed to record pot entry in participation history');
        });
        
        // Remove bookmark for this market since user has now entered the pot
        const marketId = getMarketDisplayName(selectedTableType);
        removeBookmark(address, marketId).catch(() => {});
      }
      
      // Now consume the free entry after successful transaction
      if (usedDiscountedEntry && address) {
        consumeFreeEntry(address).catch(() => {
          // Silently handle free entry consumption errors
        });
      }
      
      showMessage('Successfully entered the pot! Welcome to the prediction game!');
      
      // Refresh contract data
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
      
      
      // Clear post-entry loading state after a reasonable delay
      setTimeout(() => {
        setPostEntryLoading(false);
        console.log(`🔄 Additional contract data refresh after pot entry`);
        queryClient.invalidateQueries({ queryKey: ['readContract'] });
        queryClient.invalidateQueries({ queryKey: ['balance'] });
      }, 2000);
      
      // Clear the "just entered" state after showing success for a while
      setTimeout(() => {
        setJustEnteredPot(false);
        setUsedDiscountedEntry(false); // Reset discounted entry flag
      }, 8000); // Extended to 8 seconds for better visibility
      
      // Reload free entries and handle referral confirmation in background
      if (address) {
        setTimeout(async () => {
          try {
            const updatedFreeEntries = await getAvailableFreeEntries(address);
            setFreeEntriesAvailable(updatedFreeEntries);
            
            // Handle referral confirmation
            await confirmReferralPotEntry(address);
            loadReferralData();
          } catch (error) {
            // Silently handle background task errors
          }
        }, 3000);
      }
      
      
      // Always redirect to make prediction section after entry (regardless of participant count)
      setActiveSection('makePrediction');
      setLastAction('');
      
    } else if (lastAction === 'reEntry') {
      // Handle re-entry confirmation
      const completeReEntry = async () => {
        try {
          // Remove user from wrong predictions table
          const success = await processReEntry(address!, selectedTableType);
          if (success) {
            // Record the re-entry in participation history
            recordPotEntry(address!, contractAddress, selectedTableType, 're-entry').catch(() => {
              // Silently handle pot entry recording errors
              console.warn('Failed to record re-entry in participation history');
            });
            
            // Remove bookmark for this market since user has re-entered the pot
            const marketId = getMarketDisplayName(selectedTableType);
            removeBookmark(address!, marketId).catch(() => {});
            
            setIsLoading(false);
            showMessage('Re-entry successful! You can now predict again.');
            setReEntryFee(null); // Clear re-entry fee
            
            // Refresh contract data and referral data
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ['readContract'] });
              loadReferralData();
            }, 1000);
            
            // 🔔 Check for minimum players threshold reached (same logic as regular entry)
            setTimeout(async () => {
              try {
                // Force refresh contract data first
                await queryClient.invalidateQueries({ queryKey: ['readContract'] });
                await queryClient.invalidateQueries({ queryKey: ['balance'] });
                
                // Wait for refresh to complete
                setTimeout(async () => {
                  try {
                    // Use the same logic as hasEnoughParticipants() function
                    const currentParticipants = participants ? participants.length : 0;
                    const contractAddresses = Object.keys(CONTRACT_TO_TABLE_MAPPING);
                    const contractIndex = contractAddresses.indexOf(contractAddress);
                    const minPlayersRequired = contractIndex === 0 ? MIN_PLAYERS : MIN_PLAYERS2;
                    
                    console.log(`📊 Checking minimum players after re-entry (using same logic as redirect):`, {
                      contractAddress,
                      currentParticipants,
                      minPlayersRequired,
                      hasEnoughNow: currentParticipants >= minPlayersRequired,
                      selectedTableType
                    });
                    
                    // Check if we just reached minimum players
                    if (currentParticipants >= minPlayersRequired && currentParticipants === minPlayersRequired) {
                      console.log(`🎯 Minimum players threshold reached via re-entry! Sending notification...`);
                      
                      const notificationResult = await notifyMinimumPlayersReached(
                        contractAddress, 
                        currentParticipants, 
                        selectedTableType,
                        participants || []
                      );
                      
                      console.log(`✅ Re-entry minimum players notification result:`, notificationResult);
                    } else {
                      console.log(`📊 Re-entry minimum players status: ${currentParticipants}/${minPlayersRequired} - ${currentParticipants >= minPlayersRequired ? 'sufficient' : 'insufficient'}`);
                    }
                  } catch (innerError) {
                    console.error("❌ Error in re-entry inner notification check:", innerError);
                  }
                }, 2000); // Additional 2s wait after refresh
              } catch (notificationError) {
                console.error("❌ Error checking/sending minimum players notification after re-entry:", notificationError);
              }
            }, 4000); // Initial 4s delay for re-entry check
          } else {
            setIsLoading(false);
            showMessage('Re-entry payment processed but database update failed. Please contact support.', true);
          }
        } catch (error) {
          setIsLoading(false);
          showMessage('Re-entry payment processed but database update failed. Please contact support.', true);
        }
      };
      
      completeReEntry();
      setLastAction('');
      return; // Don't execute common cleanup below
    } else if (lastAction === 'distributePot') {
      
      console.log("📊 Transaction confirmation details:", {
        txHash,
        isConfirmed,
        lastAction,
        winnerAddresses: winnerAddresses || 'undefined',
        potBalance: potBalance?.toString() || 'null',
        contractAddress,
        selectedTableType,
        participantCount: participants?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      // SAFETY CHECK: Don't proceed if winnerAddresses is empty or at initial state
      if (!winnerAddresses || winnerAddresses.trim() === '' || winnerAddresses === 'empty') {
        console.log("⚠️ =========================");
        console.log("⚠️ SAFETY CHECK FAILED");
        console.log("⚠️ =========================");
        console.log("⚠️ Distribution confirmed but winnerAddresses is empty - skipping cleanup");
        console.log("📊 Problematic state:", {
          winnerAddresses: winnerAddresses || 'undefined',
          winnerAddressesTrimmed: winnerAddresses?.trim() || 'undefined',
          lastAction,
          isConfirmed,
          potBalance: potBalance?.toString() || 'null'
        });
        showMessage("Distribution confirmed but winner data lost. Check console for details.", true);
        setIsLoading(false);
        setLastAction('none');
        return; // Don't proceed with cleanup
      }
      
      console.log("✅ SAFETY CHECK PASSED - proceeding with cleanup");
      console.log("🎯 Pot distribution confirmed! Starting post-distribution cleanup...");
      console.log("📊 Distribution confirmation state:", {
        winnerAddresses,
        potBalance: potBalance?.toString(),
        contractAddress,
        selectedTableType,
        participantCount: participants?.length || 0
      });
      
      // Handle pot distribution completion - update winner stats and clear wrong predictions
      const finishDistribution = async () => {
        console.log("🏁 =========================");
        console.log("🏁 STARTING FINISH DISTRIBUTION");
        console.log("🏁 =========================");
        try {
          console.log("🔍 Starting finishDistribution process");
          console.log("🧮 Distribution completion - checking conditions:");
          console.log("- winnerAddresses:", winnerAddresses);
          console.log("- winnerAddresses.trim():", winnerAddresses?.trim());
          console.log("- potBalance:", potBalance?.toString());
          console.log("- potBalance > BigInt(0):", potBalance ? potBalance > BigInt(0) : false);
          console.log("- selectedTableType:", selectedTableType);
          console.log("- participants:", participants);
          
          // Update winner statistics if we have pot balance - re-determine winners instead of relying on state
          if (potBalance && potBalance > BigInt(0)) {
            console.log("✅ Pot balance available, re-determining winners for stats update...");
            showMessage("Pot distributed successfully! Updating winner statistics...");
            
            // Re-determine winners to avoid state dependency issues
            const winnersString = await determineWinners(selectedTableType, participants || []);
            const addresses = winnersString.split(',').map(addr => addr.trim()).filter(addr => addr);
            console.log("📍 Re-determined addresses for stats:", addresses);
            
            if (addresses.length > 0) {
              const amountPerWinnerWei = potBalance / BigInt(addresses.length);
              const amountPerWinnerETH = Number(amountPerWinnerWei) / 1000000000000000000;
              
              try {
                await updateWinnerStats(addresses, amountPerWinnerWei);
                showMessage(`Updated stats for ${addresses.length} winner(s) with ${amountPerWinnerETH.toFixed(6)} ETH each`);
                
                // Debug: Check if the first user's stats were actually updated
                if (addresses.length > 0) {
                  console.log("🔍 Verifying winner stats update...");
                  const firstWinnerStats = await getUserStats(addresses[0]);
                  console.log("📊 First winner stats after update:", firstWinnerStats);
                }
              } catch (statsError) {
                console.error("❌ updateWinnerStats error:", statsError);
                showMessage("Pot distributed but failed to update winner statistics.", true);
              }
            }
          } else {
            console.log("❌ Conditions failed for updating winner stats");
            console.log("- potBalance is falsy:", !potBalance);
            console.log("- potBalance <= 0:", potBalance ? potBalance <= BigInt(0) : 'potBalance is null');
          }
          
          // 🔔 Send winner and pot distribution notifications
          try {
            console.log("📢 Sending winner notifications...");
            
            if (potBalance && potBalance > BigInt(0)) {
              // Re-determine winners for notifications (same as above for consistency)
              const winnersString = await determineWinners(selectedTableType, participants || []);
              const addresses = winnersString.split(',').map(addr => addr.trim()).filter(addr => addr);
              
              if (addresses.length > 0) {
                // Send winner notification with duplicate prevention
                const winnerResult = await notifyWinners(contractAddress, addresses);
                
                // Send pot distribution notification with duplicate prevention
                const totalAmountETH = (Number(potBalance) / 1000000000000000000).toFixed(6);
                const distributionResult = await notifyPotDistributed(contractAddress, totalAmountETH, addresses.length);
                
                console.log(`✅ Distribution notifications - Winners: ${winnerResult.isDuplicate ? 'duplicate prevented' : 'sent'}, Distribution: ${distributionResult.isDuplicate ? 'duplicate prevented' : 'sent'}`);
              }
            }
          } catch (notificationError) {
            console.error("❌ Winner notification failed (distribution still succeeded):", notificationError);
            // Don't show error to user - notifications are supplementary
          }
          
          // Clear wrong predictions for next round
          console.log("🧹 Clearing wrong predictions...");
          showMessage("Clearing wrong predictions...");
          await clearWrongPredictions(selectedTableType);
          console.log("✅ Wrong predictions cleared successfully");
          showMessage("🎉 Pot distributed successfully! Participants automatically cleared by contract.");
          
        } catch (error) {
          console.log("❌ =========================");
          console.log("❌ FINISH DISTRIBUTION ERROR");
          console.log("❌ =========================");
          console.error("❌ finishDistribution error:", error);
          showMessage("Pot distributed but cleanup tasks failed.", true);
        } finally {
          console.log("🏁 =========================");
          console.log("🏁 FINISH DISTRIBUTION COMPLETE");
          console.log("🏁 =========================");
          setIsLoading(false);
          console.log("🔄 Clearing lastAction after distributePot completion");
          setLastAction('none');
          console.log("📊 Final state:", {
            isLoading: false,
            lastAction: 'none',
            winnerAddresses,
            potBalance: potBalance?.toString() || 'null'
          });
          // Refresh contract data
          setTimeout(() => {
            console.log("🔄 Invalidating contract queries for refresh");
            queryClient.invalidateQueries({ queryKey: ['readContract'] });
          }, 1000);
        }
      };
      
      finishDistribution();
      clearPotParticipationHistory(contractAddress)
      return;
    }
    
    // Only clear lastAction if transaction was actually confirmed and processed
    // Don't clear it just because useEffect ran
    console.log("🔄 End of transaction confirmation useEffect - NOT clearing lastAction automatically");
  }
}, [isConfirmed, lastAction]);

  // Show loading screen for initial load or during post-entry processing
  if (isInitialLoading || postEntryLoading) {
    return (
      <LoadingScreenAdvanced 
        subtitle={postEntryLoading ? (t.processingYourEntry || "Processing your entry...") : (t.preparingYourPots || "Preparing your pots...")} 
      />
    );
  }

  // If user has insufficient ETH balance, show funding message
  if (hasInsufficientBalance) {
    return (
      <div className="min-h-screen bg-white text-black p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="bg-white rounded-xl border-2 border-gray-200 p-8 text-center shadow-lg max-w-md">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wallet className="w-8 h-8 text-orange-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{t.fundYourAccount || 'Fund Your Account'}</h2>
              <p className="text-gray-600 mb-6">
                {t.fundAccountMessage || 'You need at least $0.01 worth of ETH to participate in prediction pots.'} 
                Current balance: <span className="font-semibold text-red-500">
                  ${ethBalance.data ? ethToUsd(ethBalance.data.value).toFixed(4) : '$0.00'}
                </span>
              </p>
              <button
                onClick={() => setActiveSection('receive')}
                className="w-full bg-purple-700 text-white px-6 py-3 rounded-lg hover:bg-black transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
              >
                {t.letsFundAccount || "Let's fund your account →"}
              </button>
              <div className="mt-4">
                <button 
                  onClick={() => setActiveSection('home')}
                  className="text-sm text-gray-500 hover:text-black transition-colors"
                >
                  {t.backToHome || '← Back to Home'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-invisible p-4">
      <div className="max-w-4xl mx-auto">
        {/* See More Markets Button */}
        <div className="mb-6">
          <button
            onClick={() => setActiveSection('home')}
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors duration-200 font-light text-sm tracking-wide"
          >
            <span>←</span>
            <span>{t.back || 'Back'}</span>
          </button>
        </div>

        <div className="bg-invisible rounded-lg p-6 mb-6">
          {/* <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">
              {t.bitcoinPotTitle || 'The ₿itcoin Pot'}
            </h1>
             <div className="w-60 h-1.5 bg-gradient-to-r from-gray-900 via-gray-600 to-gray-900 mx-auto rounded-full shadow-sm"></div>
          </div> */}

          {!isConnected && (
            <div className="text-center text-bold text-[#111111] mb-6">
              {t.connectWalletPrompt || 'Please connect your wallet to interact with the contract.'}
            </div>
          )}

          {/* Contract Info */}
          {contractAddress && (
            <div className="mb-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-4">
                <div className="relative">
                  {/* Referral link - visible on mobile only - above the box */}
                  {isConnected && address && (
                    <button
                      onClick={() => setActiveSection('referralProgram')}
                      className="absolute top-5 md:top-1 right-0 text-xs text-gray-600 hover:text-gray-800 md:hidden z-10"
                    >
{t.referralProgram || 'Referrals'} →
                    </button>
                  )}
                  
                </div>
                <div className="relative">
                  {/* Referral link - visible on desktop only - above the box */}
                  {isConnected && address && (
                    <button
                      onClick={() => setActiveSection('referralProgram')}
                      className="absolute top-5  md:top-1 right-0 text-xs text-gray-600 hover:text-gray-800 hidden md:block z-10"
                    >
{t.referralProgram || 'Referrals'} →
                    </button>
                  )}
                  {/* <div className="bg-[#ffffff] p-4 rounded-lg border border-[#dedede]">
                    <div className="text-sm text-[#111111] font-semibold">{t.amountBalance || 'Balance'}</div>
                    <div className="text-[#666666] font-semibold text-lg">
                      ${ethToUsd(potBalance ?? BigInt(0)).toFixed(2)} USD
                    </div>
                    <div className="text-xs text-[#888888] mt-1">
                      Total pool amount
                    </div>
                  </div> */}
                </div>
              </div>
            </div>
          )}

          {/* Transaction Status */}
          {(isPending || isConfirming) && (
            <div className="mb-6">
              <div className="bg-[#2C2C47] p-4 rounded-lg border border-[#d3c81a]">
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#d3c81a]"></div>
                  <div className="text-[#F5F5F5]">
                    {isPending && (t.waitingWalletConfirmation || 'Waiting for wallet confirmation...')}
                    {isConfirming && (t.transactionConfirming || 'Transaction confirming on blockchain...')}
                  </div>
                </div>
                {txHash && (
                  <div className="text-center mt-2">
                    <a
                      href={`https://basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#d3c81a] text-sm hover:underline"
                    >
                      {t.viewOnBasescan || 'View on BaseScan →'}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Re-entry Payment Section - Show if user has re-entry fee */}
          {isConnected && contractAddress && reEntryFee && (
            <div className="mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-8 hover:border-gray-300 transition-all duration-300 text-center">
                <div className="text-2xl font-light text-gray-900 mb-3">
                  {t.reEntryRequired || '⚠️ Re-entry Required'}
                </div>
                <div className="text-gray-600 font-light mb-4 leading-relaxed">
                  {t.reEntryDescription || `You made a wrong prediction in ${selectedTableType === 'featured' ? 'Trending' : 'Crypto'} and need to pay today's entry fee to re-enter this specific pot.`}
                </div>
                
                
                
                <div className="text-gray-500 text-sm mb-6 font-light">
                  {t.payReEntryFee || 'Pay the re-entry fee to resume predicting in this pot'}
                </div>
                
                <button
                  onClick={handleReEntry}
                  disabled={isActuallyLoading}
                  className="px-8 py-3 bg-gray-900 text-white font-light rounded-lg hover:bg-gray-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isActuallyLoading && lastAction === 'reEntry'
                    ? (t.processingReEntry || 'Processing Re-entry...')
                    : (t.payToReEnter || `Pay ${ethToUsd(entryAmount ?? BigInt(0)).toFixed(2)} USD to Re-enter`)}
                </button>
                
                
              </div>
            </div>
          )}

          {/* User will be automatically redirected to MakePredictionsPage if already a participant */}


          {/* Voting Preference Display */}
          {isConnected && contractAddress && !isParticipant && !reEntryFee && votingPreference && selectedMarketForVoting && hasEnoughParticipants() && (
            <div className="mb-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-2xl">🎯</span>
                  <h3 className="text-lg font-semibold text-gray-900">Your Prediction Ready</h3>
                </div>
                <p className="text-gray-700">
                  You are about to vote for: <span className="font-bold text-purple-700">
                    {votingPreference === 'positive' ? 'Yes' : 'No'}
                  </span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  This will be automatically submitted when you make predictions
                </p>
              </div>
            </div>
          )}

          {/* User Actions - Show countdown or pot entry based on day */}
          {isConnected && contractAddress && !isParticipant && !reEntryFee && (
            <div className="mb-6">
              {isFinalDay ? (
                /* Final Day - Results */
                <div className="bg-white rounded-xl border-2 border-gray-900 p-6 text-center">
                  <div className="mb-4">
                    <h2 className="text-2xl font-black text-gray-900 mb-3">
                      Final Predictions
                    </h2>
                    <div className="text-gray-600">
                      <p className="font-medium mb-2">
                        🏆 Today <span className='text-purple-700'>{potInfo.lastDayDate ? `${new Date(potInfo.lastDayDate).toLocaleDateString()}` : ''}</span> is the last prediction day
                      </p>
                      <p className="text-sm">
                        Winners will be determined <span className='text-purple-700'>tomorrow at midnight</span>{' '}
                        {potInfo.lastDayDate ? (
                          (() => {
                            const nextDay = new Date(potInfo.lastDayDate);
                            nextDay.setDate(nextDay.getDate() + 1);
                            return `(end of ${nextDay.toLocaleDateString()})`;
                          })()
                        ) : (
                          ''
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Regular pot entry - Tournament active */
                <div className="space-y-4">
                  
                  {/* Loading state for pot info */}
                  {potInfoLoading && (
                    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                          <span className="text-gray-400 text-lg">⏳</span>
                        </div>
                        <div>
                          <h3 className="text-gray-600 font-medium text-lg">{t.loadingTournamentInfo || 'Loading Tournament Info...'}</h3>
                          <p className="text-gray-400 text-sm">{t.checkingTournamentStatus || 'Checking tournament status'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  
                  
                  {/* Free Entry Option - Only show if not loading and not final day */}
                  {freeEntriesAvailable > 0 && !potInfoLoading && !potInfo.isFinalDay && (
                    <div className="relative bg-gradient-to-br from-emerald-50 to-green-50 p-6 rounded-2xl border-2 border-emerald-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
                      {/* Decorative background elements */}
                      <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100/50 rounded-full blur-xl"></div>
                      <div className="absolute bottom-0 left-0 w-16 h-16 bg-green-100/50 rounded-full blur-lg"></div>
                      
                      <div className="relative z-10">
                        {/* Header with icon */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white text-lg font-bold">✨</span>
                          </div>
                          <div>
                            <h3 className="text-emerald-900 text-lg font-bold leading-tight">{t.specialDiscountAvailable || 'Special Discount Available'}</h3>
                            <p className="text-emerald-700/80 text-sm">{t.congratulations || 'Congratulations!!!'}</p>
                          </div>
                        </div>
                        
                        {/* Pricing comparison */}
                        <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl mb-4 border border-emerald-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-gray-500 text-sm line-through">{t.regularPrice || 'Regular'}: ${(Number(baseEntryAmount) / 1000000).toFixed(2)} ({formatETH(usdToEth(Number(baseEntryAmount) / 1000000))} ETH)</span>
                              <div className="text-emerald-800 text-xl font-bold">
                                {t.yourPrice || 'Your Price'}: ${(Number(entryAmount) / 1000000).toFixed(2)} ({formatETH(usdToEth(Number(entryAmount) / 1000000))} ETH)
                              </div>
                            </div>
                            <div className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                              {t.saveAmount || 'SAVE'} ${((Number(baseEntryAmount) - Number(entryAmount)) / 1000000).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        
                       
                        
                        {/* Action buttons */}
                        <div className="space-y-3">
                          <button
                            onClick={() => handleEnterPot(true)}
                            disabled={isActuallyLoading}
                            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                          >
                            {isActuallyLoading && lastAction === 'enterPot'
                              ? (
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  {t.usingDiscount || 'Using Discount...'}
                                </div>
                              )
                              : (t.payToEnter || `Pay ${ethToUsd(entryAmount ?? BigInt(0)).toFixed(2)} USD to Enter`)}
                          </button>
                          
                        </div>
                      </div>
                    </div>
                  )}
                  

                  {/* Enter Pot - Only show if no free entries available and not loading and not final day */}
                  {freeEntriesAvailable === 0 && !potInfoLoading && !potInfo.isFinalDay && (
                    <div className="bg-white border-2 border-black rounded-xl p-6 shadow-lg ">
                      {/* Header with icon */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-700 rounded-xl flex items-center justify-center">
                          <span className="text-white text-lg">🎯</span>
                        </div>
                        <div>
                          <h3 className="text-black font-bold text-lg">{t.joinPredictionsTournament || 'Join Predictions Tournament'}</h3>
                          <p className="text-black text-sm">{t.competeForPot || 'Compete for the pot'}</p>
                        </div>
                      </div>
                      
                      {/* Entry price highlight */}
                      <div className="bg-black p-4 rounded-lg mb-4 border border-black">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-xl">💰</span>
                            <div>
                              <div className="text-white font-bold text-lg">
                                ${ethToUsd(entryAmount ?? BigInt(0)).toFixed(2)}
                              </div>
                              <div className="text-green-400 text-sm">
                              {t.dynamicPricing || 'Dynamic Pricing'} ⚡
                              </div>
                            </div>
                          </div>
                          
                        </div>
                      </div>
                        
                      {/* Referral Code Input */}
                      <div className="mb-4">
                        <label className="text-black text-sm mb-2 block flex items-center gap-2">
                          <span>🎁</span>
{t.referralCode || 'Referral Code (Optional)'}
                        </label>
                        <input
                          type="text"
                          placeholder={t.enterCode || 'Enter code...'}
                          value={inputReferralCode}
                          onChange={(e) => setInputReferralCode(e.target.value.toUpperCase())}
                          className="w-full px-4 py-3 bg-white border-2 border-black rounded-lg text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-700 focus:border-purple-700 transition-all duration-200"
                          maxLength={8}
                        />
                      </div>
                        
                      {/* Action button */}
                      <button
                        onClick={() => handleEnterPot(false)}
                        disabled={isActuallyLoading}
                        className="w-full bg-purple-700 hover:bg-black text-white px-6 py-4 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
                      >
                        {isActuallyLoading && lastAction === 'enterPot'
                          ? (
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              {t.processingYourEntry || 'Processing...'}
                            </div>
                          )
                          : (
                            <>
                              <span>🚀</span>
                              {t.enterButton || 'Enter'}
                            </>
                          )}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Owner Actions */}
          {/* Replace your entire Owner Actions section with this combined version */}

{isOwner && contractAddress && (
  <div className="mb-6">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-semibold text-[#cc0000]">Owner Actions</h2>
      
      {/* Pot Status Toggles */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-[#F5F5F5]">
          <input
            type="checkbox"
            checked={potInfo.hasStarted}
            onChange={async (e) => {
              const newValue = e.target.checked;
              const startedOnDate = newValue ? new Date().toISOString().split('T')[0] : null;
              
              try {
                // Update pot information in database
                await updatePotInfo(contractAddress, newValue, potInfo.isFinalDay, startedOnDate);
                setPotInfo(prev => ({ ...prev, hasStarted: newValue, startedOnDate }));
                showMessage(`Pot ${newValue ? 'started' : 'stopped'} successfully!`);
              } catch (error) {
                showMessage(`Failed to update pot status`, true);
                e.target.checked = potInfo.hasStarted; // Revert checkbox
              }
            }}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            disabled={potInfo.hasStarted} // Can't untoggle once started
          />
          <span className="text-sm text-[#cc0000]">Has Started</span>
        </label>
        
        <label className="flex items-center gap-2 text-[#F5F5F5]">
          <input
            type="checkbox"
            checked={potInfo.isFinalDay}
            onChange={async (e) => {
              const newValue = e.target.checked;
              
              try {
                // Get today's date when enabling final day
                const todayDate = newValue ? new Date().toISOString().split('T')[0] : null; // YYYY-MM-DD format
                
                // Update pot information in database
                await updatePotInfo(contractAddress, potInfo.hasStarted, newValue, potInfo.startedOnDate, todayDate);
                setPotInfo(prev => ({ ...prev, isFinalDay: newValue }));
                showMessage(`Final day status ${newValue ? 'enabled' : 'disabled'} successfully!`);
                
                if (newValue && todayDate) {
                  console.log(`📅 Final day enabled for ${contractAddress} on ${todayDate}`);
                }
              } catch (error) {
                showMessage(`Failed to update final day status`, true);
                e.target.checked = potInfo.isFinalDay; // Revert checkbox
              }
            }}
            className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-[#cc0000]">Is Final Day</span>
        </label>
      </div>
    </div>
    
    {/* Participants Dropdown */}
    <div className="bg-[#2C2C47] p-4 rounded-lg mb-4 border-2 border-cyan-500">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[#F5F5F5] font-medium">👥 Pot Participants</h3>
        <div className="text-sm font-semibold space-x-3">
          <span className="text-red-500">
            {participants ? Array.from(new Set(participants)).length : 0} unique
          </span>
          <span className="text-green-500">
            {participants ? 
              Array.from(new Set(participants)).filter(addr => 
                !wrongPredictionsAddresses.includes(addr.toLowerCase())
              ).length : 0} eligible
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-sm text-[#A0A0B0]">
          {participants?.length || 0} total entries • {participants ? Array.from(new Set(participants)).length : 0} unique addresses • {participants ? 
            Array.from(new Set(participants)).filter(addr => 
              !wrongPredictionsAddresses.includes(addr.toLowerCase())
            ).length : 0} eligible to predict
        </div>
        {participants && participants.length > 0 ? (
          <select 
            className="w-full px-3 py-2 bg-black/50 border border-cyan-500 rounded-md text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-cyan-500"
            defaultValue=""
          >
            <option value="" disabled className="bg-black text-[#888888]">
              Select participant to view address
            </option>
            {Array.from(new Set(participants)).map((participant, index) => (
              <option key={participant} value={participant} className="bg-black text-[#F5F5F5]">
                Participant {index + 1}: {participant}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-[#888888] text-sm italic">No participants yet</div>
        )}
      </div>
    </div>
    
    {/* Pot Balance Display */}
    <div className="bg-[#2C2C47] p-4 rounded-lg mb-4 border-2 border-blue-500">
      <h3 className="text-[#F5F5F5] font-medium mb-2">💰 Current Pot Balance</h3>
      <div className="space-y-2">
        <div className="text-2xl font-bold text-blue-400">
          {potBalance ? formatETH(potBalance) : '0.0000'} ETH
        </div>
        <div className="text-[#A0A0B0] text-sm">
          ~${potBalance ? ethToUsd(potBalance).toFixed(2) : '0.00'} USD
        </div>
        <div className="text-xs text-[#888888]">
          {participants?.length || 0} participant{(participants?.length || 0) !== 1 ? 's' : ''}
        </div>
      </div>
    </div>

    {/* Set Provisional Outcome (NEW) */}
    <div className="bg-[#2C2C47] p-4 rounded-lg mb-4 border-2 border-orange-500">
      <h3 className="text-[#F5F5F5] font-medium mb-2">🟡 Set Provisional Outcome</h3>
      <p className="text-[#A0A0B0] text-sm mb-3">
        Set the provisional outcome - starts 1-hour evidence window where users can dispute.
      </p>
      <input
        type="text"
        placeholder="positive or negative"
        value={provisionalOutcomeInput}
        onChange={(e) => setProvisionalOutcomeInput(e.target.value.toLowerCase())}
        className="w-full px-3 py-2 bg-black/50 border border-orange-500 rounded-md text-[#F5F5F5] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-3"
      />
      <button
        onClick={async () => {
          if (provisionalOutcomeInput !== "positive" && provisionalOutcomeInput !== "negative") {
            showMessage("Please enter 'positive' or 'negative'", true);
            return;
          }
          setIsLoading(true);
          try {
            console.log('🟡 Setting provisional outcome:', { outcome: provisionalOutcomeInput, tableType: selectedTableType });
            const questionName = marketQuestion || getMarketDisplayName(selectedTableType);
            await setProvisionalOutcome(provisionalOutcomeInput as "positive" | "negative", selectedTableType, questionName);
            showMessage("Provisional outcome set! Evidence window started (1 hour)");
            setProvisionalOutcomeInput("");
            console.log('✅ Provisional outcome set successfully');
          } catch (error) {
            console.error('❌ Provisional outcome setting failed:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            showMessage(`Failed to set provisional outcome: ${errorMessage}`, true);
          } finally {
            setIsLoading(false);
          }
        }}
        disabled={isActuallyLoading}
        className="bg-orange-500 text-white px-4 py-2 rounded-md font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isActuallyLoading ? "Processing..." : "Set Provisional Outcome (1hr Evidence Window)"}
      </button>
    </div>

    {/* Set Final Outcome (EXISTING - UPDATED) */}
    <div className="bg-[#2C2C47] p-4 rounded-lg mb-4">
      <h3 className="text-[#F5F5F5] font-medium mb-2">🔴 Set Final Outcome</h3>
      <p className="text-[#A0A0B0] text-sm mb-3">
        Set the final outcome - processes winners and distributes pot (no evidence window).
      </p>
      <select
        value={outcomeInput}
        onChange={(e) => setOutcomeInput(e.target.value)}
        className="w-full px-3 py-2 bg-black/50 border border-[#d3c81a] rounded-md text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#d3c81a] mb-3"
      >
        <option value="" disabled className="bg-black text-[#F5F5F5]">Select outcome and date</option>
        <option value={`positive ${new Date().toISOString().split('T')[0]}`} className="bg-black text-[#F5F5F5]">
          Positive {new Date().toISOString().split('T')[0]}
        </option>
        <option value={`negative ${new Date().toISOString().split('T')[0]}`} className="bg-black text-[#F5F5F5]">
          Negative {new Date().toISOString().split('T')[0]}
        </option>
        <option value={`positive ${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`} className="bg-black text-[#F5F5F5]">
          Positive {new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
        </option>
        <option value={`negative ${new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}`} className="bg-black text-[#F5F5F5]">
          Negative {new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
        </option>
      </select>
      <button
        onClick={async () => {
          // Parse input format: "positive 2025-09-01" or just "positive"
          const inputParts = outcomeInput.trim().split(' ');
          const outcome = inputParts[0];
          const dateParam = inputParts[1] || undefined; // Use undefined if no date provided
          
          // Validate outcome
          if (outcome !== "positive" && outcome !== "negative") {
            showMessage("Please enter format: 'positive 2025-09-01' or just 'positive'", true);
            return;
          }
          
          // Validate date format if provided (YYYY-MM-DD)
          if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
            showMessage("Date must be in YYYY-MM-DD format (e.g., 2025-09-01)", true);
            return;
          }
          
          setIsLoading(true);
          try {
            console.log('🔴 Setting daily outcome:', { outcome, dateParam, tableType: selectedTableType });
            
            // Set daily outcome with statistics (this will add new wrong predictions to the table)
            // Note: Non-predictor penalties are now handled at the page level
            const questionName = marketQuestion || getMarketDisplayName(selectedTableType);
            const outcomeStats = await setDailyOutcomeWithStats(outcome as "positive" | "negative", selectedTableType, questionName, dateParam);
            
            // 🔔 Send notifications after successful outcome setting with REAL counts
            try {
              console.log("📢 Sending pot outcome notifications with accurate elimination counts...");
              
              // Notify market outcome
              const marketOutcomeResult = await notifyMarketOutcome(
                contractAddress, 
                outcome as "positive" | "negative", 
                selectedTableType
              );
              
              // Send elimination notification with REAL count from database
              const eliminationResult = await notifyEliminatedUsers(
                contractAddress, 
                outcomeStats.eliminatedCount, // ✅ Real count instead of estimate!
                selectedTableType
              );
              
              console.log(`✅ Notifications sent - Market: ${marketOutcomeResult.isDuplicate ? 'duplicate prevented' : 'sent'}, Elimination: ${eliminationResult.isDuplicate ? 'duplicate prevented' : 'sent'}`);
              console.log(`📊 Real stats: ${outcomeStats.eliminatedCount} eliminated out of ${outcomeStats.totalParticipants} total participants`);
            } catch (notificationError) {
              console.error("❌ Notification failed (core operation still succeeded):", notificationError);
              // Don't show error to user - notifications are supplementary
            }
            
            showMessage("Final outcome set successfully!");
            setOutcomeInput("");
          } catch (error) {
            showMessage("Failed to set final outcome", true);
          } finally {
            setIsLoading(false);
          }
        }}
        disabled={isActuallyLoading}
        className="bg-purple-700 text-white px-4 py-2 rounded-md font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isActuallyLoading ? "Processing..." : "Set Final Outcome"}
      </button>
    </div>

    {/* Combined Winner Processing & Pot Distribution */}
    <div className="bg-[#2C2C47] p-4 rounded-lg mb-4">
      <h3 className="text-[#F5F5F5] font-medium mb-2">Process Winners & Distribute Pot</h3>
      <p className="text-[#A0A0B0] text-sm mb-3">
        This will automatically determine winners, distribute the pot equally among them, eliminate non-predictors, and clear wrong predictions for the next round.
      </p>
      <button
        onClick={async () => {
          setIsLoading(true);
          setLastAction('distributePot');
          
          try {
            // Step 1: Determine winners
            const winnersString = await determineWinners(selectedTableType, participants || []);
            
            if (!winnersString?.trim()) {
              showMessage("No winners found for this round", true);
              setIsLoading(false);
              setLastAction('none');
              return;
            }
            
            // Step 2: Parse and validate addresses
            const addresses = winnersString.split(',').map(addr => addr.trim()).filter(addr => addr);
            if (addresses.length === 0) {
              showMessage("No valid winner addresses found", true);
              setIsLoading(false);
              setLastAction('none');
              return;
            }
            
            showMessage(`Found ${addresses.length} winner(s). Distributing pot...`);
            setWinnerAddresses(winnersString);
            
            // Step 3: Distribute pot using blockchain contract
            await writeContract({
              address: contractAddress as `0x${string}`,
              abi: PREDICTION_POT_ABI,
              functionName: 'distributePot',
              args: [addresses],
              gas: BigInt(300000)
            });
            
            showMessage("Pot distribution transaction submitted! Waiting for confirmation...");
            
          } catch (error) {
            console.error("Distribution failed:", error);
            showMessage("Failed to process winners and distribute pot", true);
            setIsLoading(false);
            setLastAction('none');
          }
        }}
        disabled={isActuallyLoading}
        className="bg-green-600 text-[#F5F5F5] px-6 py-3 rounded-md font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed w-full"
      >
        {isActuallyLoading && lastAction === "distributePot" ? "Processing Winners..." : "🏆 Process Winners & Distribute Pot"}
      </button>
    </div>

    {/* Navigate to Make Predictions */}
    <div className="bg-[#2C2C47] p-4 rounded-lg mb-4 border-2 border-purple-1000">
      <h3 className="text-[#F5F5F5] font-medium mb-2">🎯 Make Predictions</h3>
      <p className="text-[#A0A0B0] text-sm mb-3">
        Go to the predictions page to make your own predictions.
      </p>
      <button
        onClick={() => setActiveSection('makePrediction')}
        className="bg-purple-600 text-[#F5F5F5] px-6 py-3 rounded-md font-medium hover:bg-purple-700 w-full"
      >
        📊 Go to Predictions Page
      </button>
    </div>

    {/* Navigate to Admin Evidence Review */}
    <div className="bg-[#2C2C47] p-4 rounded-lg mb-4 border-2 border-indigo-500">
      <h3 className="text-[#F5F5F5] font-medium mb-2">📋 Evidence Review</h3>
      <p className="text-[#A0A0B0] text-sm mb-3">
        Review evidence submissions and manage dispute resolution.
      </p>
      <button
        onClick={() => setActiveSection('adminEvidenceReview')}
        className="bg-indigo-600 text-[#F5F5F5] px-6 py-3 rounded-md font-medium hover:bg-indigo-700 w-full"
      >
        🔍 Admin Evidence Review Page
      </button>
    </div>

    {/* Clear Pot Information */}
    <div className="bg-[#2C2C47] p-4 rounded-lg mb-4 border-2 border-red-500">
      <h3 className="text-[#F5F5F5] font-medium mb-2">🗑️ Reset Pot Data</h3>
      <p className="text-[#A0A0B0] text-sm mb-3">
        Reset pot information and clear all user prediction history for this contract. This will reset pot status, timing data, and remove all prediction records.
      </p>
      <button
        onClick={async () => {
          if (!contractAddress) {
            showMessage('No contract address available', true);
            return;
          }
          
          const confirmClear = window.confirm(`Are you sure you want to reset pot data for contract ${contractAddress}? This will clear pot information AND all user prediction history. This action cannot be undone.`);
          if (!confirmClear) return;
          
          setIsLoading(true);
          try {
            await clearPotInformation(contractAddress);
            showMessage('Pot data reset successfully! Pot information and user prediction history cleared.');
            
            // Reset local pot info state
            setPotInfo({
              hasStarted: false,
              isFinalDay: false,
              startedOnDate: null,
              lastDayDate: null
            });
            setIsFinalDay(false);
          } catch (error) {
            console.error('Failed to clear pot information:', error);
            showMessage('Failed to reset pot data', true);
          } finally {
            setIsLoading(false);
          }
        }}
        disabled={isActuallyLoading}
        className="bg-red-600 text-[#F5F5F5] px-6 py-3 rounded-md font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed w-full"
      >
        {isActuallyLoading ? "Resetting..." : "🗑️ Reset Pot Data"}
      </button>
    </div>
    
  </div>
)}

          {/* Status Message */}
          {message && (
            <div className={`p-4 rounded-lg ${message.includes('failed') ? 'bg-purple-900/50 border border-purple-1000' : 'bg-green-900/50 border border-green-500'}`}>
              <p className="text-[#F5F5F5]">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PredictionPotTest;
