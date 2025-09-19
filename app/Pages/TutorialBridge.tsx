'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, Mail, X, ChevronLeft, ChevronRight, TrendingUp, DollarSign, Users, Trophy, Target, Calendar } from 'lucide-react';
import Cookies from 'js-cookie';
import { useAccount } from 'wagmi';
import { CONTRACT_TO_TABLE_MAPPING, getMarketDisplayName, MIN_PLAYERS, MIN_PLAYERS2, PENALTY_EXEMPT_CONTRACTS } from '../Database/config';
import { getEventDate } from '../Database/eventDates';
import { getUserEmail, saveUserEmail } from '../Database/actions';
import { Language, getTranslation } from '../Languages/languages';
import { useContractData } from '../hooks/useContractData';

interface DashboardProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  selectedMarket?: string;
  currentLanguage?: Language;
  showEmailManagement?: boolean;
}


const Dashboard = ({ activeSection, setActiveSection, selectedMarket, currentLanguage = 'en', showEmailManagement = false }: DashboardProps) => {
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
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);

  // Carousel state
  const [currentStep, setCurrentStep] = useState<number>(0);

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

  // Use centralized contract data hook
  const { contractAddresses, participantsData } = useContractData();

  // Check if current contract is penalty-exempt (tournament)
  const isPenaltyExempt = useMemo(() => {
    const selectedMarketAddress = Cookies.get('selectedMarket');
    if (!selectedMarketAddress && contractAddresses.length === 0) return false;
    const contractToCheck = selectedMarketAddress || contractAddresses[0];
    return PENALTY_EXEMPT_CONTRACTS.includes(contractToCheck);
  }, [contractAddresses]);

  // Get tournament start date (one week before event date)
  const getTournamentStartDate = useMemo(() => {
    const selectedMarketAddress = Cookies.get('selectedMarket');
    if (!selectedMarketAddress && contractAddresses.length === 0) return null;
    const contractToCheck = selectedMarketAddress || contractAddresses[0];
    const eventDate = getEventDate(contractToCheck);
    if (eventDate) {
      const eventDateObj = new Date(eventDate);
      const startDate = new Date(eventDateObj);
      startDate.setDate(eventDateObj.getDate() - 7); // One week before
      return startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return null;
  }, [contractAddresses]);


  // Get translations
  const t = getTranslation(currentLanguage);

  // Define tutorial steps with visual enhancements
  const tutorialSteps = useMemo(() => {
    if (isPenaltyExempt) {
      return [
        {
          title: t.detailedTournamentStep1Title,
          description: t.detailedTournamentStep1Description,
          icon: Trophy,
          color: 'from-yellow-500 to-orange-500',
          highlights: ['Tournament Format', 'Weekly Competition']
        },
        {
          title: t.detailedTournamentStep2Title,
          description: t.detailedTournamentStep2Description,
          icon: Calendar,
          color: 'from-blue-500 to-indigo-500',
          highlights: ['One Week Duration', 'Event-Based Timing']
        },
        {
          title: t.detailedTournamentStep3Title,
          description: t.detailedTournamentStep3Description,
          icon: Target,
          color: 'from-green-500 to-emerald-500',
          highlights: ['Daily Predictions', 'Strategic Choices']
        },
        {
          title: t.detailedTournamentStep4Title,
          description: t.detailedTournamentStep4Description,
          icon: DollarSign,
          color: 'from-purple-500 to-violet-500',
          highlights: ['Fixed Entry Fee', 'Fair Competition']
        },
        {
          title: t.detailedTournamentStep5Title,
          description: t.detailedTournamentStep5Description,
          icon: Users,
          color: 'from-cyan-500 to-blue-500',
          highlights: ['Community Driven', 'Global Participation']
        },
        {
          title: t.detailedTournamentStep6Title,
          description: t.detailedTournamentStep6Description,
          icon: TrendingUp,
          color: 'from-emerald-500 to-teal-500',
          highlights: ['Winner Takes All', 'Skill-Based Rewards']
        }
      ];
    } else {
      return [
        {
          title: t.detailedStep1Title,
          description: t.detailedStep1Description,
          icon: Users,
          color: 'from-blue-500 to-indigo-500',
          highlights: ['Global Competition', 'Community Building']
        },
        {
          title: t.detailedStep2Title,
          description: t.detailedStep2Description,
          icon: Calendar,
          color: 'from-green-500 to-emerald-500',
          highlights: ['Daily Predictions', 'Midnight Deadline']
        },
        {
          title: t.detailedStep3Title,
          description: t.detailedStep3Description,
          icon: TrendingUp,
          color: 'from-orange-500 to-red-500',
          highlights: ['Market Analysis', 'Yes/No Predictions']
        },
        {
          title: t.detailedStep4Title,
          description: t.detailedStep4Description,
          icon: DollarSign,
          color: 'from-purple-500 to-violet-500',
          highlights: ['Dynamic Pricing', 'Early Entry Advantage']
        },
        {
          title: t.detailedStep5Title,
          description: t.detailedStep5Description,
          icon: Target,
          color: 'from-cyan-500 to-blue-500',
          highlights: ['Second Chances', 'Strategic Comebacks']
        },
        {
          title: t.detailedStep6Title,
          description: t.detailedStep6Description,
          icon: Trophy,
          color: 'from-yellow-500 to-orange-500',
          highlights: ['Prize Pool', 'Winner Rewards']
        }
      ];
    }
  }, [isPenaltyExempt, t]);

  // Navigation functions
  const nextStep = () => {
    setCurrentStep(prev => (prev + 1) % tutorialSteps.length);
  };

  const prevStep = () => {
    setCurrentStep(prev => (prev - 1 + tutorialSteps.length) % tutorialSteps.length);
  };

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

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
            console.log('✅ User has email', showEmailManagement ? '- showing email management UI' : '- showing tutorial');
            setHasUserEmail(true);
            setCurrentUserEmail(userEmailData.email);
            setEmail(userEmailData.email); // Pre-fill for editing
            // Only hide email collection if not explicitly requested for management
            setShowEmailCollection(showEmailManagement ? true : false);
          } else {
            console.log('❌ User has no email, showing email collection');
            setHasUserEmail(false);
            setCurrentUserEmail('');
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

  // Show email management UI when requested from external navigation
  // This should run after the email check to override the default behavior
  useEffect(() => {
    if (showEmailManagement && isConnected) {
      console.log('🔧 Email management requested - forcing email UI to show');
      setShowEmailCollection(true);
    }
  }, [showEmailManagement, isConnected, hasUserEmail]); // Added hasUserEmail to dependency array to run after email check

  // Check user participation in pots and redirect if already participating
  useEffect(() => {
    if (!isConnected || !address) {
      setUserPots([]);
      return;
    }

    // Check if user is participant in the selected market
    const selectedMarketAddress = Cookies.get('selectedMarket');
    const participatingPots: string[] = [];

    console.log('🔍 TutorialBridge Participant Check:');
    console.log('  - selectedMarketAddress:', selectedMarketAddress);
    console.log('  - contractAddresses:', contractAddresses);
    console.log('  - participantsData:', participantsData);

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

    setUserPots(participatingPots);
    const isParticipantInSelected = participatingPots.includes(selectedMarketAddress || '');

    // Check if user is special user (admin)
    const SPECIAL_ADDRESS = '0xA90611B6AFcBdFa9DDFfCB2aa2014446297b6680';
    const isSpecialUser = address && address.toLowerCase() === SPECIAL_ADDRESS.toLowerCase();

    // If user is already a participant and not admin, redirect to MakePredictionsPage
    if (isParticipantInSelected && !isSpecialUser && contractAddresses.length > 0) {
      console.log('User is already a participant, redirecting to makePrediction');
      setActiveSection('makePrediction');
    }
  }, [address, isConnected, participantsData, contractAddresses, setActiveSection]);

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
  }, [contractAddresses]); // Only trigger when contractAddresses changes

  // Removed automatic tutorial redirect - users should be able to access tutorial and email management anytime

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

      // Check if the selected market address exists in our contracts
      if (selectedMarketAddress && selectedMarketAddress in CONTRACT_TO_TABLE_MAPPING) {
        const marketType = CONTRACT_TO_TABLE_MAPPING[selectedMarketAddress as keyof typeof CONTRACT_TO_TABLE_MAPPING];
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
        setCurrentUserEmail(email.trim());
        setShowEmailCollection(false);
        setIsEditingEmail(false);
        // Don't clear email anymore since we want to show it
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
                          {currentUserEmail && !isEditingEmail ? t.yourEmail : t.readyToPlay}📩
                        </h1>
                        
                      </div>

                      {/* Show current email if exists and not editing */}
                      {currentUserEmail && !isEditingEmail && (
                        <div className="mb-6">
                          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
                            <p className="text-green-800 font-medium">{currentUserEmail}</p>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">{t.emailNotificationMessage}</p>
                        </div>
                      )}
                    </div>

                    {/* Input Section - Show when no email or editing */}
                    {(!currentUserEmail || isEditingEmail) && (
                      <div className="space-y-8">
                        <div className="relative group">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={isEditingEmail ? t.updateEmailAddress : t.enterEmailAddress}
                            className="w-full px-6 py-3 md:px-7 md:py-5
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
           disabled:bg-black disabled:from-black disabled:to-black disabled:text-white
           text-white font-medium py-4 px-8 rounded-2xl
           transition-all duration-300 text-lg disabled:cursor-not-allowed transform hover:scale-[1.02]
           active:scale-[0.98] tracking-wide shadow-lg hover:shadow-xl
           disabled:opacity-100 disabled:shadow-lg"

                        >
                          {emailSubmitting ? (
                            <span className="flex items-center justify-center">
                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                              {isEditingEmail ? t.updating : t.joining}
                            </span>
                          ) : (
                            isEditingEmail ? t.updateEmail : t.joinCommunity
                          )}
                        </button>

                        {/* Cancel button for editing */}
                        {isEditingEmail && (
                          <button
                            onClick={() => {
                              setIsEditingEmail(false);
                              setEmail(currentUserEmail); // Reset to original email
                            }}
                            className="w-full text-gray-500 hover:text-gray-700 font-light py-3 px-6 transition-all duration-200 text-base tracking-wide"
                          >
                            {t.cancel}
                          </button>
                        )}

                        {/* Skip button for new users */}
                        {!currentUserEmail && (
                          <button
                            onClick={handleSkipEmail}
                            className="w-full md:hidden text-purple-600 hover:text-gray-700 font-light py-3 px-6 transition-all duration-200 text-base tracking-wide"
                          >
                            {t.skipForNow}
                          </button>
                        )}
                      </div>
                      </div>
                    )}

                    {/* Action buttons when email exists and not editing */}
                    {currentUserEmail && !isEditingEmail && (
                      <div className="flex flex-col items-center space-y-5">
                        <button
                          onClick={() => setIsEditingEmail(true)}
                          className="w-48 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800
                           text-white font-medium py-4 px-8 rounded-2xl
                           transition-all duration-300 text-lg transform hover:scale-[1.02]
                           active:scale-[0.98] tracking-wide shadow-lg hover:shadow-xl"
                        >
                          {t.changeEmail}
                        </button>

                        <button
                          onClick={() => setShowEmailCollection(false)}
                          className="w-full text-purple-600 hover:text-gray-700 font-light py-3 px-6 transition-all duration-200 text-base tracking-wide"
                        >
                          {t.continueToTutorial}
                        </button>
                      </div>
                    )}

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
              <div className="max-w-5xl mx-auto opacity-100 px-0 md:px-4">
                {/* Back to Email Collection Button
                <div className="mb-6 px-4 md:px-0">
                  <button
                    onClick={() => setShowEmailCollection(true)}
                    className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors duration-200 font-light text-sm tracking-wide"
                  >
                    <span>←</span>
                    <span>{currentUserEmail ? t.manageEmail : t.emailCollection}</span>
                  </button>
                </div> */}

                {/* Tutorial Content */}
                <div className="bg-white rounded-none md:rounded-3xl border-0 p-0 md:p-6 md:mb-8 mb-16">
                  {/* Header - Desktop with skip button, Mobile without */}
                  <div className="hidden md:flex items-center justify-between mb-12">
                    <h2 className="text-4xl font-light text-gray-900 tracking-tight">
                      {t.howItWorksTitle}
                    </h2>
                    <button
                      onClick={handleSkipClick}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-3 rounded-2xl transition-all duration-300 font-medium text-base transform hover:scale-[1.02] active:scale-[0.98] tracking-wide shadow-lg hover:shadow-xl"
                    >
                      {currentStep === tutorialSteps.length - 1 ? 'Continue' : t.skipButton}
                    </button>
                  </div>

                  {/* Mobile Header - Just title */}
                  <div className="md:hidden mb-4 px-4">
                    <h2 className="text-xl font-light text-gray-900 tracking-tight text-center">
                      {t.howItWorksTitle}
                    </h2>
                  </div>

                  {/* Carousel Container */}
                  <div className="relative mb-8 mx-0 md:mx-0 md:px-0">
                    {/* Mobile Navigation Arrows - Top positioned */}
                    <div className="md:hidden flex justify-between items-center mb-4 px-4">
                      <button
                        onClick={prevStep}
                        className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={nextStep}
                        className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>

                    {/* Current Step Display */}
                    <div className="bg-white border-0 md:border border-gray-200/60 rounded-none md:rounded-2xl p-4 md:p-8 shadow-none md:shadow-sm min-h-[280px] md:min-h-[320px] flex items-center overflow-hidden mx-0 md:mx-0">
                      <div className="flex flex-col items-center md:items-start gap-4 md:gap-6 w-full">
                        {/* Icon and Step Number */}
                        <div className="flex items-center gap-4 w-full justify-center md:justify-start">
                          <div className={`bg-gradient-to-br ${tutorialSteps[currentStep]?.color} text-white rounded-xl w-12 h-12 md:w-16 md:h-16 flex items-center justify-center flex-shrink-0 shadow-lg`}>
                            {tutorialSteps[currentStep]?.icon &&
                              React.createElement(tutorialSteps[currentStep].icon, {
                                className: "w-6 h-6 md:w-8 md:h-8"
                              })
                            }
                          </div>
                          {/* <div className="bg-gray-100 text-gray-700 rounded-lg w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-semibold text-sm md:text-base flex-shrink-0">
                            {currentStep + 1}
                          </div> */}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1 text-center md:text-left w-full">
                          <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 break-words leading-tight">
                            {tutorialSteps[currentStep]?.title}
                          </h3>

                          {/* Key Highlights */}
                          <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                            {tutorialSteps[currentStep]?.highlights.map((highlight, index) => (
                              <span
                                key={index}
                                className={`px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${tutorialSteps[currentStep]?.color} shadow-sm`}
                              >
                                {highlight}
                              </span>
                            ))}
                          </div>

                          {/* Description with better formatting */}
                          <div className="text-sm md:text-base text-gray-600 leading-relaxed space-y-3">
                            {tutorialSteps[currentStep]?.description.split('. ').map((sentence, index, array) => {
                              if (!sentence.trim()) return null;
                              return (
                                <p key={index} className="text-left md:text-left">
                                  <span className="inline-flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                    <span>{sentence}{index < array.length - 1 ? '.' : ''}</span>
                                  </span>
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Navigation Arrows - Side positioned */}
                    <div className="hidden md:block absolute top-1/2 -translate-y-1/2 -left-6">
                      <button
                        onClick={prevStep}
                        className="w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <ChevronLeft className="w-6 h-6 text-gray-600" />
                      </button>
                    </div>
                    <div className="hidden md:block absolute top-1/2 -translate-y-1/2 -right-6">
                      <button
                        onClick={nextStep}
                        className="w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <ChevronRight className="w-6 h-6 text-gray-600" />
                      </button>
                    </div>

                    {/* Step Indicators */}
                    <div className="flex justify-center gap-2 mt-6">
                      {tutorialSteps.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToStep(index)}
                          className={`w-3 h-3 rounded-full transition-all duration-200 ${
                            index === currentStep
                              ? 'bg-purple-600 scale-110'
                              : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Step Counter */}
                    <div className="text-center mt-4">
                      <span className="text-sm text-gray-500 font-medium">
                        {currentStep + 1} {currentLanguage === 'pt-BR' ? 'de' : 'of'} {tutorialSteps.length}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Skip Button - Below carousel */}
                  <div className="md:hidden mt-6 px-4">
                    <button
                      onClick={handleSkipClick}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-2xl transition-all duration-300 font-medium text-base transform hover:scale-[1.02] active:scale-[0.98] tracking-wide shadow-lg hover:shadow-xl w-full"
                    >
                      {currentStep === tutorialSteps.length - 1 ? 'Continue' : t.skipButton}
                    </button>
                  </div>

                  <div className="mt-8 md:mt-12 p-4 md:p-8 bg-gradient-to-r from-purple-50/80 to-blue-50/80 rounded-3xl border-0">
                    <p className="text-center text-base md:text-xl text-gray-800 font-light leading-relaxed break-words">
                      {isPenaltyExempt ? (
                        <>🏆 <span className="font-medium text-[#0000aa]">{currentLanguage === 'pt-BR' ? 'Seu Objetivo:' : 'Your Goal:'}</span> {t.yourGoalTournament}</>
                      ) : (
                        <>🎯 <span className="font-medium text-[#0000aa]">{t.yourGoal}</span> {t.tutorialGoal}</>
                      )}
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