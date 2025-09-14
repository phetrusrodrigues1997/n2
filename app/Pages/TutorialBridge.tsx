'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, Mail, X } from 'lucide-react';
import Cookies from 'js-cookie';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_TO_TABLE_MAPPING, getMarketDisplayName, MIN_PLAYERS, MIN_PLAYERS2 } from '../Database/config';
import { getUserEmail, saveUserEmail } from '../Database/actions';
import { Language, getTranslation } from '../Languages/languages';

interface DashboardProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  selectedMarket?: string;
  currentLanguage?: Language;
}

// Use centralized contract mapping from config
const CONTRACT_ADDRESSES = CONTRACT_TO_TABLE_MAPPING;

// Prediction Pot ABI
const PREDICTION_POT_ABI = [
  {
    "inputs": [],
    "name": "getParticipants",
    "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "creator",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "participant", "type": "address" }],
    "name": "removeParticipant",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

const Dashboard = ({ activeSection, setActiveSection, selectedMarket, currentLanguage = 'en' }: DashboardProps) => {
  const [marketInfo, setMarketInfo] = useState({ name: '', section: '', address: '' });
  const [userPots, setUserPots] = useState<string[]>([]);
  const [selectedMarketAddress, setSelectedMarketAddress] = useState<string>('');
  const [selectedQuestion, setSelectedQuestion] = useState<string>('Tomorrow\'s Predictions');
  const [selectedIcon, setSelectedIcon] = useState<string>('');
  const [potBalance, setPotBalance] = useState<string>('');

  // Email collection states
  const [showEmailCollection, setShowEmailCollection] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [emailSubmitting, setEmailSubmitting] = useState<boolean>(false);
  const [hasUserEmail, setHasUserEmail] = useState<boolean | null>(null);
  const [isLoadingEmail, setIsLoadingEmail] = useState<boolean>(true);

  // Pot info state
  const [potInfo, setPotInfo] = useState<{
    hasStarted: boolean;
    isFinalDay: boolean;
    startedOnDate: string | null;
  }>({
    hasStarted: false,
    isFinalDay: false,
    startedOnDate: null
  });
  const [potInfoLoaded, setPotInfoLoaded] = useState<boolean>(false);

  const { address, isConnected } = useAccount();


  // Get translations
  const t = getTranslation(currentLanguage);

  // Check if user has email when wallet connects
  useEffect(() => {
    const checkUserEmail = async () => {
      console.log('🔍 TutorialBridge - Checking user email. Connected:', isConnected, 'Address:', address);
      if (isConnected && address) {
        setIsLoadingEmail(true);
        console.log('📧 Loading email data...');
        try {
          const userEmailData = await getUserEmail(address);
          console.log('📧 Email data received:', userEmailData);
          if (userEmailData?.email) {
            console.log('✅ User has email, showing tutorial');
            setHasUserEmail(true);
            setShowEmailCollection(false);
          } else {
            console.log('❌ User has no email, showing email collection');
            setHasUserEmail(false);
            setShowEmailCollection(true);
          }
        } catch (error) {
          console.error('Error checking user email:', error);
          setHasUserEmail(false);
          setShowEmailCollection(true);
        }
        setIsLoadingEmail(false);
        console.log('📧 Loading complete');
      } else {
        console.log('🔌 Not connected or no address');
        setHasUserEmail(null);
        setShowEmailCollection(false);
        setIsLoadingEmail(false);
      }
    };

    checkUserEmail();
  }, [address, isConnected]);


  // Check user participation in pots
  useEffect(() => {
    if (!isConnected || !address) {
      setUserPots([]);
    }
  }, [address, isConnected]);

  // Get contract addresses array
  const contractAddresses = Object.keys(CONTRACT_ADDRESSES) as Array<keyof typeof CONTRACT_ADDRESSES>;

  // Read participants from all contracts - hooks must be called at top level
  const { data: participants1 } = useReadContract({
    address: contractAddresses[0] as `0x${string}`,
    abi: PREDICTION_POT_ABI,
    functionName: 'getParticipants',
    query: { enabled: isConnected && !!address }
  });

  const { data: participants2 } = useReadContract({
    address: contractAddresses[1] as `0x${string}`,
    abi: PREDICTION_POT_ABI,
    functionName: 'getParticipants',
    query: { enabled: isConnected && !!address }
  });

  const { data: participants3 } = useReadContract({
    address: contractAddresses[2] as `0x${string}`,
    abi: PREDICTION_POT_ABI,
    functionName: 'getParticipants',
    query: { enabled: isConnected && !!address && contractAddresses.length > 2 }
  });

  const { data: participants4 } = useReadContract({
    address: contractAddresses[3] as `0x${string}`,
    abi: PREDICTION_POT_ABI,
    functionName: 'getParticipants',
    query: { enabled: isConnected && !!address && contractAddresses.length > 3 }
  });

  const participantsData = useMemo(() => [
    participants1,
    participants2,
    contractAddresses.length > 2 ? participants3 : undefined,
    contractAddresses.length > 3 ? participants4 : undefined
  ].filter(data => data !== undefined), [participants1, participants2, participants3, participants4, contractAddresses.length]);

  // Load pot info for selected market
  useEffect(() => {
    const fetchPotInfo = async () => {
      const savedContract = Cookies.get('selectedMarket');
      const contractAddress = savedContract || contractAddresses[0];

      if (!contractAddress) {
        console.log('🔍 TutorialBridge: No contract address available for pot info');
        return;
      }

      console.log('🔍 TutorialBridge: Fetching pot info for:', contractAddress);
      setPotInfoLoaded(false);

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
          console.log('✅ TutorialBridge: Pot info loaded:', data);
        } else {
          console.error('❌ TutorialBridge: Failed to fetch pot info');
        }
      } catch (error) {
        console.error('❌ TutorialBridge: Error fetching pot info:', error);
      }

      setPotInfoLoaded(true);
    };

    if (contractAddresses.length > 0) {
      fetchPotInfo();
    }
  }, [contractAddresses]);

  // Check if user has already seen the tutorial and redirect automatically
  useEffect(() => {
    const hasSeenTutorial = Cookies.get('tutorialBridgeSeen');
    
    if (hasSeenTutorial) {
      console.log('User has already seen tutorial, performing smart routing...');

      if (!isConnected || !address) {
        // Not connected, send to pot entry page which will prompt for wallet connection
        console.log('Not connected - redirecting to bitcoinPot');
        setActiveSection('bitcoinPot');
        return;
      }

      // Wait for pot info to load before making routing decisions
      if (!potInfoLoaded) {
        console.log('Pot info not loaded yet, waiting before routing...');
        return;
      }

      // Check if user is participant in the selected market (same logic as handleSkipClick)
      const selectedMarketAddress = Cookies.get('selectedMarket');
      const participatingPots: string[] = [];

      // Check all contracts
      participantsData.forEach((participants, index) => {
        if (participants && Array.isArray(participants)) {
          const isParticipant = participants.some(
            (participant: string) => participant.toLowerCase() === address.toLowerCase()
          );
          if (isParticipant) {
            participatingPots.push(contractAddresses[index]);
          }
        }
      });

      const isParticipantInSelected = participatingPots.includes(selectedMarketAddress || '');
      
      // Check if user is special user (admin)
      const SPECIAL_ADDRESS = '0xA90611B6AFcBdFa9DDFfCB2aa2014446297b6680';
      const isSpecialUser = address && address.toLowerCase() === SPECIAL_ADDRESS.toLowerCase();
      
      if (isParticipantInSelected && !isSpecialUser) {
        // User is a participant, but check if pot has started before redirecting
        if (potInfoLoaded && potInfo.hasStarted) {
          console.log('User is participant and pot has started, redirecting to makePrediction');
          setActiveSection('makePrediction');
        } else if (potInfoLoaded && !potInfo.hasStarted) {
          console.log('User is participant but pot has not started, redirecting to notReadyPage');
          setActiveSection('notReadyPage');
        } else {
          console.log('User is participant but pot info not loaded yet, redirecting to notReadyPage for safety');
          setActiveSection('notReadyPage');
        }
      } else {
        console.log('User is not a participant, redirecting to bitcoinPot');
        setActiveSection('bitcoinPot');
      }
    }
  }, [setActiveSection, isConnected, address, participantsData, contractAddresses, potInfoLoaded, potInfo.hasStarted]);

  // Set up the selected market address and question from cookies
  useEffect(() => {
    const savedMarket = Cookies.get('selectedMarket');
    if (savedMarket) {
      setSelectedMarketAddress(savedMarket);
    }

    const savedQuestion = Cookies.get('selectedMarketQuestion');
    if (savedQuestion) {
      setSelectedQuestion(savedQuestion);
    }

    const savedIcon = Cookies.get('selectedMarketIcon');
    if (savedIcon) {
      setSelectedIcon(savedIcon);
    }

    // Load pot balance from cookies
    const savedPotBalances = Cookies.get('potBalances');
    if (savedPotBalances) {
      try {
        const potBalances = JSON.parse(savedPotBalances);
        const marketType = CONTRACT_TO_TABLE_MAPPING[savedMarket as keyof typeof CONTRACT_TO_TABLE_MAPPING];
        const marketName = getMarketDisplayName(marketType);
        if (potBalances[marketName]) {
          setPotBalance(potBalances[marketName]);
        }
      } catch (error) {
        console.error('Error parsing pot balances from cookies:', error);
      }
    }
  }, []);

  // Update userPots when participant data changes
  // useEffect(() => {
  //   if (!isConnected || !address) return;

  //   const participatingPots: string[] = [];

  //   // Check all contracts
  //   participantsData.forEach((participants, index) => {
  //     if (participants && Array.isArray(participants)) {
  //       const isParticipant = participants.some(
  //         (participant: string) => participant.toLowerCase() === address.toLowerCase()
  //       );
  //       if (isParticipant) {
  //         participatingPots.push(contractAddresses[index]);
  //       }
  //     }
  //   });

  //   setUserPots(participatingPots);
  // }, [participantsData, address, isConnected]);

  // Get selected market from cookie - separate useEffect to avoid infinite loops
  useEffect(() => {
    const getSelectedMarket = () => {
      const selectedMarketAddress = Cookies.get('selectedMarket');
      console.log('Selected pot address from cookie:', selectedMarketAddress);

      // Check if the selected market address exists in our CONTRACT_ADDRESSES
      if (selectedMarketAddress && selectedMarketAddress in CONTRACT_ADDRESSES) {
        const marketType = CONTRACT_ADDRESSES[selectedMarketAddress as keyof typeof CONTRACT_ADDRESSES];
        setMarketInfo({
          name: getMarketDisplayName(marketType),
          section: 'bitcoinPot',  // Both markets use the same section, PredictionPotTest handles the difference
          address: selectedMarketAddress
        });
      } else {
        // Default to first market if no cookie or unknown address
        const defaultAddress = contractAddresses[0];
        setMarketInfo({
          name: 'Trending',
          section: 'bitcoinPot',
          address: defaultAddress
        });
      }
    };

    getSelectedMarket();
  }, []); // Only run once on mount

  // Handle email submission
  const handleEmailSubmit = async () => {
    if (!email.trim() || !address) return;

    setEmailSubmitting(true);
    try {
      const result = await saveUserEmail(address, email.trim());
      if (result.success) {
        setHasUserEmail(true);
        setShowEmailCollection(false);
        setEmail('');
      } else {
        console.error('Failed to save email:', result.error);
        // Could show error message here
      }
    } catch (error) {
      console.error('Error saving email:', error);
    }
    setEmailSubmitting(false);
  };

  // Handle skip email
  const handleSkipEmail = () => {
    setShowEmailCollection(false);
    setHasUserEmail(true); // Prevent showing again this session
  };

  // Handle skip button click - smart routing based on participation status
  const handleSkipClick = () => {
    // Set cookie to remember user has seen the tutorial (expires in 1 week)
    Cookies.set('tutorialBridgeSeen', 'true', { expires: 7 });
    
    if (!isConnected || !address) {
      // Not connected, send to pot entry page which will prompt for wallet connection
      console.log('Skip clicked but user not connected - sending to predictionPotTest');
      setActiveSection('bitcoinPot');
      return;
    }

    // Check if user is participant in the selected market
    const selectedMarketAddress = Cookies.get('selectedMarket');
    const participatingPots: string[] = [];

    console.log('🔍 TutorialBridge Debug - handleSkipClick:');
    console.log('  - selectedMarketAddress:', selectedMarketAddress);
    console.log('  - contractAddresses:', contractAddresses);
    console.log('  - participantsData:', participantsData);

    // Check all contracts
    participantsData.forEach((participants, index) => {
      console.log(`  - Contract ${index} (${contractAddresses[index]}):`, participants);
      if (participants && Array.isArray(participants)) {
        const isParticipant = participants.some(
          (participant: string) => participant.toLowerCase() === address.toLowerCase()
        );
        console.log(`    - User ${address} is participant:`, isParticipant);
        if (isParticipant) {
          participatingPots.push(contractAddresses[index]);
        }
      }
    });

    console.log('  - participatingPots:', participatingPots);
    setUserPots(participatingPots);
    const isParticipantInSelected = participatingPots.includes(selectedMarketAddress || '');
    console.log('  - isParticipantInSelected:', isParticipantInSelected);
    
    // Check if user is special user (admin)
    const SPECIAL_ADDRESS = '0xA90611B6AFcBdFa9DDFfCB2aa2014446297b6680';
    const isSpecialUser = address && address.toLowerCase() === SPECIAL_ADDRESS.toLowerCase();
    
    if (isParticipantInSelected && !isSpecialUser) {
      console.log('User is already a participant, redirecting to makePrediction');
      setActiveSection('makePrediction');
    } else {
      console.log('User is not a participant, redirecting to predictionPotTest');
      setActiveSection('bitcoinPot');
    }
  };

  // Debug logging for render conditions
  React.useEffect(() => {
    console.log('🎨 TutorialBridge Render - States:');
    console.log('  - isLoadingEmail:', isLoadingEmail);
    console.log('  - showEmailCollection:', showEmailCollection);
    console.log('  - isConnected:', isConnected);
    console.log('  - hasUserEmail:', hasUserEmail);
    console.log('  - address:', address);
    console.log('  - Connect Wallet condition (!isConnected):', !isConnected);
    console.log('  - Loading condition (isLoadingEmail && isConnected):', isLoadingEmail && isConnected);
    console.log('  - Email collection condition (!isLoadingEmail && showEmailCollection && isConnected):', !isLoadingEmail && showEmailCollection && isConnected);
    console.log('  - Tutorial condition (!isLoadingEmail && !showEmailCollection && isConnected):', !isLoadingEmail && !showEmailCollection && isConnected);
  }, [isLoadingEmail, showEmailCollection, isConnected, hasUserEmail, address]);

  return (
    <div className="min-h-screen bg-white text-black w-full overflow-x-hidden">
      <div className="w-full mx-auto p-6">
        <div className="flex items-start justify-center pt-4 md:pt-8 min-h-screen">
          <div className="text-center w-full max-w-4xl">
            {/* Loading State */}
            {isLoadingEmail && isConnected && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            )}

            {/* Modern Professional Email Collection UI */}
            {!isLoadingEmail && showEmailCollection && isConnected && (
              <div className="w-full min-h-[70vh] flex items-center justify-center px-4 md:px-8">
                <div className="relative max-w-xl mx-auto w-full animate-fade-in-up opacity-0" style={{
                  animation: 'fadeInUp 0.6s ease-out 0.1s forwards'
                }}>
                  {/* Top Navigation Bar */}
                  <div className="mb-6 flex justify-between items-center">
                    <button
                      onClick={() => setActiveSection('home')}
                      className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors duration-200 font-light text-sm tracking-wide"
                    >
                      <span>←</span>
                      <span>{t.back}</span>
                    </button>
                    
                    {/* Desktop Skip Button - Top Right */}
                    <button
                      onClick={handleSkipEmail}
                      className="hidden md:block text-purple-600 hover:text-gray-700 transition-colors duration-200 font-light text-sm tracking-wide"
                    >
                      {t.skipForNow}
                    </button>
                  </div>

                  {/* Modern Sleek Container */}
                  <div className="bg-white rounded-3xl border border-gray-200/60 shadow-lg p-10 md:p-12">
                    {/* Header Section */}
                    <div className="text-center mb-12">
                      <div className="flex items-center justify-center gap-3 mb-6 flex-nowrap">
                        <h1 className="text-2xl md:text-4xl font-light text-gray-900 tracking-tight flex-shrink-0">
                          {t.readyToPlay}
                        </h1>
                        <img
                          src="/ghostienobg.png"
                          alt="Ghostie"
                          className="w-7 h-7 md:w-11 md:h-11 flex-shrink-0"
                        />
                      </div>
                      <p className="text-gray-600 text-lg font-light leading-relaxed max-w-md mx-auto">
                        {t.joinGlobalCommunity}
                      </p>
                    </div>

                    {/* Input Section */}
                    <div className="space-y-8">
                      <div className="relative group">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t.enterEmailAddress}
                          className="w-full px-6 py-5 md:px-7 md:py-5
                           text-lg bg-gray-50/80 border-2 border-gray-200 rounded-2xl focus:border-purple-500
                           focus:bg-white focus:ring-4 focus:ring-purple-100 focus:outline-none 
                           transition-all duration-300 ease-out placeholder-gray-400 font-normal 
                           tracking-normal text-center hover:border-gray-300 hover:bg-white
                           hover:shadow-sm focus:shadow-lg"
                          onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit()}
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col items-center space-y-5">
                        <button
                          onClick={handleEmailSubmit}
                          disabled={emailSubmitting || !email.trim()}
                          className="w-48 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 
                           disabled:from-gray-300 disabled:to-gray-400 text-white font-medium py-4 px-8 rounded-2xl 
                           transition-all duration-300 text-lg disabled:cursor-not-allowed transform hover:scale-[1.02] 
                           active:scale-[0.98] tracking-wide shadow-lg hover:shadow-xl"
                        >
                          {emailSubmitting ? (
                            <span className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                              {t.joining}
                            </span>
                          ) : (
                            t.joinCommunity
                          )}
                        </button>

                        <button
                          onClick={handleSkipEmail}
                          className="w-full md:hidden text-purple-600 hover:text-gray-700 font-light py-3 px-6 transition-all duration-200 text-base tracking-wide"
                        >
                          {t.skipForNow}
                        </button>
                      </div>

                    </div>

                    {/* Bottom Note */}
                    {/* <div className="mt-10 pt-8 border-t border-gray-100">
                      <p className="text-sm text-gray-400 text-center font-light tracking-wide">
                        We respect your privacy. No spam, ever. 🔒
                      </p>
                    </div> */}
                  </div>

                </div>

                {/* Enhanced CSS for animations */}
                <style>{`
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
                `}</style>
              </div>
            )}

            {/* Connect Wallet UI - Show when wallet is not connected */}
            {!isConnected && (
              <div>
                <div className="w-full min-h-[70vh] flex items-center justify-center px-4 md:px-8">
                  <div className="relative max-w-lg mx-auto w-full">{/* Removed animation for debugging */}
                    {/* Modern Connect Wallet Container */}
                    <div className="bg-white rounded-3xl border-0 p-8 md:p-10 text-center">
                      {/* Wallet Icon */}
                      <div className="mb-8">
                        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                          <Wallet className="w-10 h-10 text-white" />
                        </div>
                      </div>

                      {/* Header Section */}
                      <div className="mb-10">
                        <h1 className="text-3xl md:text-4xl font-light text-gray-900 mb-4 tracking-tight">
                          {t.connectWallet}
                        </h1>

                      </div>

                      {/* Instruction Text */}
                      <div className="mb-8">
                        <p className="text-gray-600 text-lg leading-relaxed font-light">
                          {t.clickSignInButton.split('Sign In').map((part, index) => 
                            index === 0 ? part : 
                            <>
                              <span className="font-medium text-purple-600">Sign In</span>
                              {part}
                            </>
                          )}
                        </p>
                      </div>

                      {/* Bottom Note */}
                      <div className="pt-6 border-t border-gray-100">
                        <p className="text-sm text-gray-400 text-center font-light tracking-wide">
                          Secure connection powered by Coinbase
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tutorial Screen - Show when email is collected or skipped */}
            {!isLoadingEmail && !showEmailCollection && isConnected && (
              <div className="max-w-5xl mx-auto opacity-100 px-4">
                {/* Back to Email Collection Button */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowEmailCollection(true)}
                    className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors duration-200 font-light text-sm tracking-wide"
                  >
                    <span>←</span>
                    <span>{t.emailCollection}</span>
                  </button>
                </div>

                {/* Tutorial Content */}
                <div className="bg-white rounded-3xl border-0 p-6 md:p-16 mb-8">
                  <div className="flex items-center justify-between mb-12 relative">
                    <h2 className="text-2xl md:text-4xl font-light text-gray-900 tracking-tight">
                      {t.howItWorksTitle}
                    </h2>
                    <button
                      onClick={handleSkipClick}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 md:px-8 md:py-3 rounded-2xl transition-all duration-300 font-medium text-sm md:text-base transform hover:scale-[1.02] active:scale-[0.98] tracking-wide shadow-lg hover:shadow-xl"
                    >
                      {t.skipButton}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12">
                    <div className="flex items-start gap-3 md:gap-4 p-4 md:p-6 bg-white border border-gray-200/60 rounded-2xl hover:border-gray-300/80 hover:shadow-lg transition-all duration-300 shadow-sm">
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-medium text-sm md:text-lg flex-shrink-0">
                        1
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base md:text-xl font-medium text-gray-900 mb-1 md:mb-2">{t.globalCompetition}</h3>
                        <p className="text-sm md:text-base text-gray-600 font-light leading-relaxed">
                          {t.globalCompetitionDesc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 md:gap-4 p-4 md:p-6 bg-white border border-gray-200/60 rounded-2xl hover:border-gray-300/80 hover:shadow-lg transition-all duration-300 shadow-sm">
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-medium text-sm md:text-lg flex-shrink-0">
                        2
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base md:text-xl font-medium text-gray-900 mb-1 md:mb-2">{t.dailyPredictions}</h3>
                        <p className="text-sm md:text-base text-gray-600 font-light leading-relaxed">
                          {t.dailyPredictionsDesc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 md:gap-4 p-4 md:p-6 bg-white border border-gray-200/60 rounded-2xl hover:border-gray-300/80 hover:shadow-lg transition-all duration-300 shadow-sm">
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-medium text-sm md:text-lg flex-shrink-0">
                        3
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base md:text-xl font-medium text-gray-900 mb-1 md:mb-2">{t.dynamicPricing}</h3>
                        <p className="text-sm md:text-base text-gray-600 font-light leading-relaxed">
                          {t.dynamicPricingDesc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 md:gap-4 p-4 md:p-6 bg-white border border-gray-200/60 rounded-2xl hover:border-gray-300/80 hover:shadow-lg transition-all duration-300 shadow-sm">
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-medium text-sm md:text-lg flex-shrink-0">
                        4
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base md:text-xl font-medium text-gray-900 mb-1 md:mb-2">{t.secondChances}</h3>
                        <p className="text-sm md:text-base text-gray-600 font-light leading-relaxed">
                          {t.secondChancesDesc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 md:gap-4 p-4 md:p-6 bg-white border border-gray-200/60 rounded-2xl hover:border-gray-300/80 hover:shadow-lg transition-all duration-300 shadow-sm">
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-medium text-sm md:text-lg flex-shrink-0">
                        5
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base md:text-xl font-medium text-gray-900 mb-1 md:mb-2">{t.finalShowdown}</h3>
                        <p className="text-sm md:text-base text-gray-600 font-light leading-relaxed">
                          {t.finalShowdownDesc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 md:gap-4 p-4 md:p-6 bg-white border border-gray-200/60 rounded-2xl hover:border-gray-300/80 hover:shadow-lg transition-all duration-300 shadow-sm">
                      <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-medium text-sm md:text-lg flex-shrink-0">
                        6
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base md:text-xl font-medium text-gray-900 mb-1 md:mb-2">{t.liveStats}</h3>
                        <p className="text-sm md:text-base text-gray-600 font-light leading-relaxed">
                          {t.liveStatsDesc}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 p-8 bg-gradient-to-r from-purple-50/80 to-blue-50/80 rounded-3xl border-0">
                    <p className="text-center text-lg md:text-xl text-gray-800 font-light leading-relaxed">
                      🎯 <span className="font-medium text-[#0000aa]">{t.yourGoal}</span> {t.tutorialGoal}
                    </p>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;