
import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { Wallet, Users } from 'lucide-react';
import { formatUnits, parseEther } from 'viem';
import Cookies from 'js-cookie';
import { Language, getTranslation, supportedLanguages } from '../Languages/languages';
import { getPrice } from '../Constants/getPrice';
import { setDailyOutcome, setDailyOutcomeWithStats, setProvisionalOutcome, getProvisionalOutcome, determineWinners, clearWrongPredictions, testDatabaseConnection, getUserStats, clearPotInformation } from '../Database/OwnerActions'; // Adjust path as needed
import { notifyMarketOutcome, notifyEliminatedUsers, notifyWinners, notifyPotDistributed, notifyMarketUpdate, notifyMinimumPlayersReached, notifyTournamentStarted, clearContractMessages } from '../Database/actions';
import { useQueryClient } from '@tanstack/react-query';
import { clearPotParticipationHistory } from '../Database/actions3';
import { CONTRACT_TO_TABLE_MAPPING, getMarketDisplayName, MIN_PLAYERS, MIN_PLAYERS2, PENALTY_EXEMPT_CONTRACTS } from '../Database/config';
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
  currentLanguage?: Language;
}


const PredictionPotTest =  ({ activeSection, setActiveSection, currentLanguage: propCurrentLanguage = 'en' }: PredictionPotProps) => {
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

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Debug: Track lastAction changes (only log actual changes, not initial state)
  useEffect(() => {
    if (lastAction !== 'none') {
      console.log("🎯 lastAction changed:", lastAction);
    }
  }, [lastAction]);
  const [selectedTableType, setSelectedTableType] = useState<TableType>('featured');
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState<boolean>(true);
  
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isSkeletonLoading, setIsSkeletonLoading] = useState<boolean>(false);
  

  // Track final day status from pot information
  const [isFinalDay, setIsFinalDay] = useState(false);
  

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

  // Use language from props (passed from parent component)
  const currentLanguage = propCurrentLanguage;
  
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
  
  // Load market question from cookies
  useEffect(() => {
    const savedQuestion = Cookies.get('selectedMarketQuestion');
    setMarketQuestion(savedQuestion || null);
  }, []);

  // Fetch pot information when contract address changes
  useEffect(() => {
    if (contractAddress) {
      fetchPotInfo(contractAddress);
    }
  }, [contractAddress]);


  // Track timing for proper loading sequence
  const [loadingStartTime] = useState<number>(Date.now());
  const [dataLoadCompleteTime, setDataLoadCompleteTime] = useState<number | null>(null);

  // Monitor when all essential data loading is complete
  useEffect(() => {
    if (!potInfoLoading && !isLoadingPrice) {
      setDataLoadCompleteTime(Date.now());
    }
  }, [potInfoLoading, isLoadingPrice]);

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
  const SPECIAL_ADDRESSES = ['0xA90611B6AFcBdFa9DDFfCB2aa2014446297b6680']; // Example special address (case insensitive)
  const isSpecialUser = address && (SPECIAL_ADDRESSES.map(addr => addr.toLowerCase()).includes(address.toLowerCase()));


  const { data: owner } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: PREDICTION_POT_ABI,
    functionName: 'owner',
    query: { enabled: !!contractAddress }
  }) as { data: string | undefined };

  
  
  // Get dynamic entry amount using the new pricing system
  // ETH balance is handled by the wallet - no need for contract reads


  const formatETH = (value: bigint): string => {
    try {
      const formatted = formatUnits(value, 18);
      return parseFloat(formatted).toFixed(4);
    } catch {
      return '0.0000';
    }
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


  // Removed handleReEntryApprove - not needed for ETH transactions



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
    
    if (lastAction === 'distributePot') {
      
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

  // Skeleton component for PredictionPotTest
  const PredictionPotSkeleton = () => (
    <div className="min-h-screen bg-invisible p-4">
      <div className="max-w-4xl mx-auto">
        {/* Back button skeleton */}
        <div className="mb-6">
          <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>

        {/* Main content skeleton */}
        <div className="bg-invisible rounded-lg p-6 mb-6">
          {/* Entry fee section skeleton */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6 animate-pulse">
            <div className="mb-6">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-32"></div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-32 mb-3"></div>
                  <div className="h-4 bg-gray-100 rounded w-28 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-40"></div>
                </div>
              </div>
            </div>

            {/* Referral dropdown skeleton */}
            <div className="mb-6">
              <div className="h-12 bg-gray-100 rounded-lg"></div>
            </div>

            {/* Action button skeleton */}
            <div className="h-12 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );

  // Show LoadingScreenAdvanced first
  if (isInitialLoading) {
    return (
      <LoadingScreenAdvanced
        subtitle={t.preparingYourPots || "Preparing your pots..."}
      />
    );
  }

  // Show skeleton loading second
  if (isSkeletonLoading) {
    return <PredictionPotSkeleton />;
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





          



          {/* Owner Actions */}


{(isOwner || isSpecialUser) && contractAddress && (
  <div className="mb-6">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-xl font-semibold text-[#cc0000]">Admin Actions</h2>
      
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
        <div className="text-sm font-semibold">
          <span className="text-cyan-400">
            {participants ? Array.from(new Set(participants)).length : 0} players left
          </span>
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-sm text-[#A0A0B0]">
          {participants?.length || 0} total entries
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

            // Get contract participants for penalty-exempt contracts
            let contractParticipants: string[] = [];
            if (contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress)) {
              console.log(`🔍 [PENALTY-EXEMPT] Using contract participants for: ${contractAddress}`);
              // Use the participants data already fetched from the smart contract
              contractParticipants = participants ? Array.from(new Set(participants)) : [];
              console.log(`📊 [PENALTY-EXEMPT] Found ${contractParticipants.length} unique participants:`, contractParticipants);
            }

            // Set daily outcome with statistics (this will add new wrong predictions to the table)
            // Note: Non-predictor penalties are now handled at the page level
            const questionName = marketQuestion || getMarketDisplayName(selectedTableType);
            const outcomeStats = await setDailyOutcomeWithStats(outcome as "positive" | "negative", selectedTableType, questionName, dateParam);
            
            // 🔔 Send notifications after successful outcome setting with REAL counts
            try {
              console.log("📢 Sending pot outcome notifications with accurate elimination counts...");
              
              // Notify market outcome with elimination summary
              const marketOutcomeResult = await notifyMarketOutcome(
                contractAddress,
                outcome as "positive" | "negative",
                selectedTableType,
                outcomeStats.eliminatedCount // ✅ Real count for elimination summary!
              );

              console.log(`✅ Combined notification sent - Market outcome with elimination summary: ${marketOutcomeResult.isDuplicate ? 'duplicate prevented' : 'sent'}`);
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

    {/* Distribute to Special Address */}
    <div className="bg-[#2C2C47] p-4 rounded-lg mb-4 border-2 border-pink-500">
      <h3 className="text-[#F5F5F5] font-medium mb-2">💸 Distribute to Special Address</h3>
      <p className="text-[#A0A0B0] text-sm mb-3">
        Distribute entire pot to 0xA90611B6AFcBdFa9DDFfCB2aa2014446297b6680 only.
      </p>
      <button
        onClick={async () => {
          const specialAddress = '0xA90611B6AFcBdFa9DDFfCB2aa2014446297b6680';

          setIsLoading(true);
          setLastAction('distributePot');

          try {
            showMessage(`Distributing pot to ${specialAddress}...`);
            setWinnerAddresses(specialAddress);

            // Distribute pot to special address only
            await writeContract({
              address: contractAddress as `0x${string}`,
              abi: PREDICTION_POT_ABI,
              functionName: 'distributePot',
              args: [[specialAddress]],
              gas: BigInt(300000)
            });

            showMessage("Pot distribution transaction submitted! Waiting for confirmation...");

          } catch (error) {
            console.error("Distribution failed:", error);
            showMessage("Failed to distribute pot to special address", true);
            setIsLoading(false);
            setLastAction('none');
          }
        }}
        disabled={isActuallyLoading}
        className="bg-pink-600 text-[#F5F5F5] px-6 py-3 rounded-md font-medium hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed w-full"
      >
        {isActuallyLoading && lastAction === "distributePot" ? "Processing..." : "💸 Distribute to Special Address"}
      </button>
    </div>

    {/* Send Tournament Started Announcement */}
    <div className="bg-[#2C2C47] p-4 rounded-lg mb-4 border-2 border-yellow-500">
      <h3 className="text-[#F5F5F5] font-medium mb-2">📢 Send Tournament Started Announcement</h3>
      <p className="text-[#A0A0B0] text-sm mb-3">
        Manually send announcement and email to pot participants that the tournament has officially begun. Includes info about daily predictions, 24-hour windows, and re-entry.
      </p>
      <button
        onClick={async () => {
          if (!contractAddress || !participants) {
            showMessage('No contract or participants data available', true);
            return;
          }

          setIsLoading(true);
          try {
            const contractAddresses = Object.keys(CONTRACT_TO_TABLE_MAPPING);
            const contractIndex = contractAddresses.indexOf(contractAddress);
            const minPlayersRequired = contractIndex === 0 ? MIN_PLAYERS : MIN_PLAYERS2;
            const currentParticipants = participants.length;

            if (currentParticipants < minPlayersRequired) {
              showMessage(`Not enough players yet: ${currentParticipants}/${minPlayersRequired}`, true);
              setIsLoading(false);
              return;
            }

            console.log(`📢 Sending tournament started notification for contract ${contractAddress}...`);
            const notificationResult = await notifyTournamentStarted(
              contractAddress,
              currentParticipants,
              selectedTableType || 'market',
              participants
            );

            if (notificationResult.success) {
              showMessage(`Tournament started announcement and emails sent to ${participants.length} participants!`);
            } else {
              showMessage('Failed to send tournament started notification', true);
            }
            console.log('✅ Tournament started notification result:', notificationResult);
          } catch (error) {
            console.error('❌ Failed to send tournament started notification:', error);
            showMessage('Failed to send tournament started announcement', true);
          } finally {
            setIsLoading(false);
          }
        }}
        disabled={isActuallyLoading}
        className="bg-yellow-600 text-[#F5F5F5] px-6 py-3 rounded-md font-medium hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed w-full"
      >
        {isActuallyLoading ? "Sending..." : "📢 Send Tournament Started Announcement"}
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
            await clearContractMessages(contractAddress);
            showMessage('Pot data reset successfully! Pot information, user prediction history, and contract messages cleared.');
            
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
