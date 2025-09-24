'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { getMarkets } from '../Constants/markets';
import { Language, getTranslation } from '../Languages/languages';
import { PENALTY_EXEMPT_CONTRACTS, MIN_PLAYERS, MIN_PLAYERS2 } from '../Database/config';
import { useContractData } from '../hooks/useContractData';
import { getPredictionPercentages, isEliminated } from '../Database/actions';
import { Clock, Users, Target, TrendingUp, Activity, Zap, X, Trophy } from 'lucide-react';
import Cookies from 'js-cookie';
import Image from 'next/image';

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

  // Get market data from cookies (same as TutorialBridge)
  const contractAddress = Cookies.get('selectedMarket');
  const marketQuestion = Cookies.get('selectedMarketQuestion') || '';
  const marketIcon = Cookies.get('selectedMarketIcon') || '';


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
  const playerCount = participants ? participants.length : 0;
  const isParticipant = participants && address ? participants.includes(address as `0x${string}`) : false;


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
    const currentCount = participants && Array.isArray(participants) ? participants.length : 0;
    const requiredCount = contractIndex === 0 ? MIN_PLAYERS : MIN_PLAYERS2;

    console.log('📊 getParticipantCounts Result:', {
      contractIndex,
      participants: participants ? participants.length : 'null/undefined',
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

  // Helper function to get context-aware player information
  const getPlayerInfo = () => {
    if (isLoading) return { label: 'Loading...', count: '...', icon: Users };

    if (potInfo.hasStarted) {
      // Tournament has started - show active players
      return {
        label: 'Active Players',
        count: current.toString(),
        icon: Users
      };
    } else if (!hasEnoughPlayers) {
      // Not enough players - show waiting count
      const needed = required - current;
      return {
        label: `Waiting for ${needed} more`,
        count: needed > 1 ? 'players' : 'player',
        icon: Clock
      };
    } else {
      // Has enough players but hasn't started yet
      return {
        label: 'Players Ready',
        count: current.toString(),
        icon: Target
      };
    }
  };

  const playerInfo = getPlayerInfo();

  // Load additional data
  useEffect(() => {
    console.log('🔄 PotInfoPage - useEffect triggered:', {
      contractAddress,
      address,
      shouldLoad: !!(contractAddress && address)
    });

    const loadTournamentData = async () => {
      if (!contractAddress || !address) {
        console.log('⚠️ PotInfoPage - Skipping data load:', {
          missingContract: !contractAddress,
          missingAddress: !address
        });
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

        // Check if user is eliminated
        console.log('🔍 PotInfoPage - Checking if user is eliminated...');
        const eliminated = await isEliminated(address, contractAddress);
        console.log('🔍 PotInfoPage - User elimination status:', eliminated);
        setUserEliminated(eliminated ? true : false);

        console.log('✅ PotInfoPage - All tournament data loaded successfully');
      } catch (error) {
        console.error('❌ PotInfoPage - Error loading tournament data:', error);
      } finally {
        console.log('🏁 PotInfoPage - Setting isLoading to false');
        setIsLoading(false);
      }
    };

    loadTournamentData();
  }, [contractAddress, address]);

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
  const showLoadingScreen = !contractAddress || !market || isLoading;

  console.log('🖥️ PotInfoPage - Render Decision:', {
    showLoadingScreen,
    reasons: {
      noContract: !contractAddress,
      noMarket: !market,
      isLoading
    }
  });

  if (showLoadingScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30 flex items-center justify-center">
        <div className="text-center animate-fade-in-up opacity-0" style={{
          animation: 'fadeInUp 0.6s ease-out 0.2s forwards'
        }}>
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-6"></div>
          <h3 className="text-xl font-light text-gray-900 mb-2">Loading Tournament</h3>
          <p className="text-gray-600 mb-6">
            {!contractAddress ? 'Getting market information...' :
             !market ? 'Finding tournament details...' :
             'Loading predictions and stats...'}
          </p>

          {/* Back button - only show after some time to avoid accidental clicks */}
          <div className="animate-fade-in-up opacity-0" style={{
            animation: 'fadeInUp 0.6s ease-out 2s forwards'
          }}>
            <button
              onClick={() => setActiveSection && setActiveSection('home')}
              className="text-purple-600 hover:text-purple-800 underline text-sm transition-colors duration-200"
            >
              ← Back to markets
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('🚀 PotInfoPage - Rendering main content with market:', market.id);

  // Tournament type detection
  const isWeeklyTournament = contractAddress && PENALTY_EXEMPT_CONTRACTS.includes(contractAddress as any);
  const tournamentType = isWeeklyTournament ? 'Weekly' : 'Daily';


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
    // Navigate to TutorialBridge dashboard using setActiveSection
    if (setActiveSection) {
      setActiveSection('dashboard');
    }
  };

  const handleBack = () => {
    // Navigate back to home
    if (setActiveSection) {
      setActiveSection('home');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50/30">
      {/* Header with back button */}
      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors duration-200 font-medium text-sm tracking-wide bg-white/80 hover:bg-white px-4 py-2 rounded-full border border-gray-200/60 hover:border-purple-300 backdrop-blur-sm"
        >
          <span>←</span>
          <span>{t.back}</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col md:flex-row min-h-screen px-4 py-4 md:py-8">
        <div className="max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 md:gap-8">

          {/* Left Side - Image (35% on desktop) */}
          <div className="w-full md:w-[35%] flex flex-col">
            {/* Large Market Image */}
            <div className="relative w-full animate-fade-in-up opacity-0" style={{
              animation: 'fadeInUp 0.6s ease-out 0.2s forwards'
            }}>
              <div className="relative aspect-[24/9] md:aspect-[3.6/4] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-gray-200/60">
                <Image
                  src={market?.icon || '/placeholder-image.jpg'}
                  alt={marketQuestion || market?.question || 'Tournament Question'}
                  fill
                  className="object-cover"
                  priority
                />
                {/* Tournament Type Badge - Purple styling on top left */}
                <div className="absolute top-3 left-3 md:top-4 md:left-4">
                  <span className="inline-flex items-center px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium bg-purple-100 text-purple-700">
                    <Trophy className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                    {tournamentType}
                  </span>
                </div>

                {/* Topic Badge - Purple styling on top right */}
                <div className="absolute top-3 right-3 md:top-4 md:right-4">
                  <span className="inline-flex items-center px-2 py-1 md:px-3 md:py-1 rounded-full text-xs md:text-sm font-medium bg-green-100 text-green-700">
                    {market?.potTopic || 'General'}
                  </span>
                </div>

                {/* Gradient overlay for better text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
              </div>
            </div>
          </div>

          {/* Right Side - Content (65% on desktop) - Aligned to top */}
          <div className="w-full md:w-[65%] flex flex-col justify-start mt-4 md:mt-0">

            {/* Header Section - Ultra Compact */}
            <div className="mb-4 md:mb-5 animate-fade-in-up opacity-0" style={{
              animation: 'fadeInUp 0.6s ease-out 0.4s forwards'
            }}>
              {/* Market Question */}
              <h1 className="text-lg md:text-2xl lg:text-3xl font-light text-gray-900 tracking-tight leading-tight mb-2 md:mb-3">
                {marketQuestion || market?.question || 'Loading...'}
              </h1>

              {/* Market Description */}
              <p className="text-xs md:text-sm text-gray-600 font-light leading-relaxed">
                Join this {tournamentType.toLowerCase()} prediction tournament and compete with {playerCount} other players!
              </p>
            </div>

            {/* Tournament Statistics Grid - Ultra Compact */}
            <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4 animate-fade-in-up opacity-0" style={{
              animation: 'fadeInUp 0.6s ease-out 0.8s forwards'
            }}>
              {/* Dynamic Player Information */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-3 border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-center mb-1">
                  <playerInfo.icon className={`w-3 h-3 md:w-4 md:h-4 ${
                    potInfo.hasStarted
                      ? 'text-green-600'
                      : !hasEnoughPlayers
                        ? 'text-purple-600'
                        : 'text-blue-600'
                  }`} />
                </div>
                <div className="text-center">
                  <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wide mb-0.5">{playerInfo.label}</div>
                  <div className="text-sm md:text-base font-bold text-gray-900">
                    {playerInfo.count}
                  </div>
                </div>
              </div>

              {/* Tournament Status */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg md:rounded-xl p-2 md:p-3 border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-center mb-1">
                  <Clock className="w-3 h-3 md:w-4 md:h-4 text-purple-600" />
                </div>
                <div className="text-center">
                  <div className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wide mb-0.5">Status</div>
                  <div className="text-xs md:text-sm font-bold text-gray-900">
                    {getStatus()}
                  </div>
                </div>
              </div>
            </div>

            {/* Prediction Distribution - Ultra Compact */}
            {predictionPercentages && !isLoading && (
              <div className="bg-white/80 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4 border border-gray-200/60 shadow-lg mb-3 md:mb-4 animate-fade-in-up opacity-0" style={{
                animation: 'fadeInUp 0.6s ease-out 1.0s forwards'
              }}>
                <div className="flex items-center justify-center mb-2 md:mb-3">
                  <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-purple-600 mr-1.5" />
                  <h3 className="text-sm md:text-base font-semibold text-gray-900">Current Predictions</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* YES Predictions */}
                  <div className="text-center">
                    <div className="bg-green-100 rounded-lg md:rounded-xl p-2 md:p-3 mb-1.5">
                      <div className="text-base md:text-lg font-bold text-green-700 mb-0.5">
                        {predictionPercentages.positivePercentage}%
                      </div>
                      <div className="text-green-600 font-medium text-xs">YES</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1 md:h-1.5">
                      <div
                        className="bg-green-500 h-1 md:h-1.5 rounded-full transition-all duration-1000"
                        style={{ width: `${predictionPercentages.positivePercentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* NO Predictions */}
                  <div className="text-center">
                    <div className="bg-red-100 rounded-lg md:rounded-xl p-2 md:p-3 mb-1.5">
                      <div className="text-base md:text-lg font-bold text-red-700 mb-0.5">
                        {predictionPercentages.negativePercentage}%
                      </div>
                      <div className="text-red-600 font-medium text-xs">NO</div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1 md:h-1.5">
                      <div
                        className="bg-red-500 h-1 md:h-1.5 rounded-full transition-all duration-1000"
                        style={{ width: `${predictionPercentages.negativePercentage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Status & Action Section - Ultra Compact */}
            <div className="flex flex-col items-center animate-fade-in-up opacity-0" style={{
              animation: 'fadeInUp 0.6s ease-out 1.2s forwards'
            }}>
              {/* User Status Messages - Ultra Compact */}
              {isConnected && (
                <div className="mb-2 md:mb-3">
                  {isParticipant && !userEliminated && (
                    <div className="inline-flex items-center px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium mb-2">
                      <Target className="w-3 h-3 mr-1" />
                      You're already in this tournament!
                    </div>
                  )}
                  {isParticipant && userEliminated && (
                    <div className="inline-flex items-center px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium mb-2">
                      <X className="w-3 h-3 mr-1" />
                      You were eliminated from this tournament
                    </div>
                  )}
                  {!isParticipant && !isLoading && (
                    <div className="inline-flex items-center px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium mb-2">
                      <Zap className="w-3 h-3 mr-1" />
                      Ready to join and compete?
                    </div>
                  )}
                </div>
              )}

              {/* Ready Button - Ultra Compact */}
              <button
                onClick={handleReady}
                disabled={!isConnected || (isParticipant && userEliminated)}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700
                           disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-400
                           text-white font-medium py-2.5 md:py-3 px-5 md:px-6 rounded-lg md:rounded-xl
                           transition-all duration-300 text-sm md:text-base disabled:cursor-not-allowed transform hover:scale-[1.02]
                           active:scale-[0.98] tracking-wide shadow-xl hover:shadow-2xl
                           disabled:opacity-50 min-w-[140px] md:min-w-[160px]"
              >
                {!isConnected ? t.connectWallet :
                 isParticipant && userEliminated ? "Eliminated" :
                 isParticipant ? "View Tournament" :
                 "Join Tournament 🚀"}
              </button>

              {/* Connection Status */}
              {!isConnected && (
                <p className="text-xs text-gray-500 text-center max-w-md mx-auto leading-relaxed mt-2">
                  Connect your wallet to participate in this prediction tournament
                </p>
              )}
            </div>
          </div>
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
      `}</style>
    </div>
  );
};

export default PotInfoPage;