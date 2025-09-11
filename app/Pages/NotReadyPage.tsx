'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Users, Clock } from 'lucide-react';
import { useAccount } from 'wagmi';
import { saveUserEmail } from '../Database/actions';
import { useContractData } from '../hooks/useContractData';
import { CONTRACT_TO_TABLE_MAPPING, MIN_PLAYERS, MIN_PLAYERS2 } from '../Database/config';
import Cookies from 'js-cookie';

interface NotReadyPageProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const NotReadyPage = ({ activeSection, setActiveSection }: NotReadyPageProps) => {
  const [showEmailCollection, setShowEmailCollection] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [emailSubmitting, setEmailSubmitting] = useState<boolean>(false);
  const [isFinalDay, setIsFinalDay] = useState<boolean>(false);
  const [isEliminated, setIsEliminated] = useState<boolean>(false);
  const { address } = useAccount();
  const { contractAddresses, participantsData } = useContractData();

  // Pot information state (same as MakePredictionsPage)
  const [potInfo, setPotInfo] = useState<{
    hasStarted: boolean;
    isFinalDay: boolean;
    startedOnDate: string | null;
  }>({
    hasStarted: false,
    isFinalDay: false,
    startedOnDate: null
  });

  // Get current participant count and required minimum
  const getParticipantCounts = () => {
    // Get selected contract from cookies (same logic as other components)
    const savedContract = Cookies.get('selectedMarket');
    const contractAddress = savedContract || contractAddresses[0];
    
    if (!contractAddress) return { current: 0, required: MIN_PLAYERS };
    
    // Type guard to ensure contractAddress is a valid key
    if (!(contractAddress in CONTRACT_TO_TABLE_MAPPING)) {
      return { current: 0, required: MIN_PLAYERS };
    }
    
    const typedContractAddress = contractAddress as keyof typeof CONTRACT_TO_TABLE_MAPPING;
    const contractIndex = contractAddresses.indexOf(typedContractAddress);
    if (contractIndex === -1) return { current: 0, required: MIN_PLAYERS };
    
    const participants = participantsData[contractIndex];
    const currentCount = participants && Array.isArray(participants) ? participants.length : 0;
    const requiredCount = contractIndex === 0 ? MIN_PLAYERS : MIN_PLAYERS2;
    
    return { current: currentCount, required: requiredCount };
  };

  const { current, required } = getParticipantCounts();

  // Fetch pot information (same logic as MakePredictionsPage)
  useEffect(() => {
    const fetchPotInfo = async () => {
      const savedContract = Cookies.get('selectedMarket');
      const contractAddress = savedContract || contractAddresses[0];
      
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
    
    if (contractAddresses.length > 0) {
      fetchPotInfo();
    }
  }, [contractAddresses]);

  // Determine what state we're in
  const hasEnoughPlayers = current >= required;
  const isPotReady = hasEnoughPlayers && potInfo.hasStarted;
  
  // Debug logging (can be removed in production)
  // console.log('🔍 NotReadyPage Debug:', {
  //   current,
  //   required,
  //   hasEnoughPlayers,
  //   potInfoHasStarted: potInfo.hasStarted,
  //   isPotReady,
  //   isFinalDay,
  //   isEliminated
  // });

  if(Cookies.get('finalDayRedirect')){
    const eliminationStatus = Cookies.get('finalDayRedirect');
    if(eliminationStatus === 'true'){
      setIsFinalDay(true);
      setIsEliminated(true);
      Cookies.remove('finalDayRedirect');
    }
  }

  // Handle email submission
  const handleEmailSubmit = async () => {
    if (!email.trim() || !address) return;
    
    setEmailSubmitting(true);
    try {
      const result = await saveUserEmail(address, email.trim());
      if (result.success) {
        setShowEmailCollection(false);
        setEmail('');
      } else {
        console.error('Failed to save email:', result.error);
      }
    } catch (error) {
      console.error('Error saving email:', error);
    }
    setEmailSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white text-black w-full overflow-x-hidden">
      <div className="w-full mx-auto p-6">
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="text-center w-full max-w-4xl">
            {/* Email Collection Modal */}
            {showEmailCollection && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl p-8 max-w-md w-full">
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Mail className="w-8 h-8 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-3">
                      Get Notified
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      We'll email you when this pot has enough players to start
                    </p>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="w-full px-4 py-3 text-base bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-purple-400 focus:outline-none transition-all duration-300 placeholder-gray-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit()}
                    />

                    <div className="flex flex-col space-y-3">
                      <button
                        onClick={handleEmailSubmit}
                        disabled={emailSubmitting || !email.trim()}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-purple-300 disabled:to-purple-400 text-white font-medium py-3 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
                      >
                        {emailSubmitting ? 'Saving...' : 'Notify Me'}
                      </button>
                      <button
                        onClick={() => setShowEmailCollection(false)}
                        className="w-full text-gray-500 hover:text-gray-700 font-medium py-2 px-6 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Not Ready Message */}
            <div className="bg-white rounded-3xl border-0 p-8 md:p-12 text-center">
              <div className="flex flex-col items-center space-y-6">
                {/* Ghostie Image */}
                <img 
                  src="/ghostienobg.png" 
                  alt="Not ready yet" 
                  className="w-24 h-24 md:w-32 md:h-32 opacity-80"
                />
                
                {/* Main Message */}
                <div className="space-y-4">
                  <h1 className="text-2xl md:text-3xl font-light text-gray-900">
                    {isFinalDay && isEliminated 
                      ? "Tournament Complete - You Were Eliminated" 
                      : hasEnoughPlayers && potInfo.hasStarted
                        ? "Pot is Active! Ready to Predict"
                        : hasEnoughPlayers && !potInfo.hasStarted
                          ? "Pot is Ready! Starting Soon"
                          : "This pot isn't ready to begin yet"
                    }
                  </h1>
                  <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto font-light leading-relaxed">
                    {isFinalDay && isEliminated
                      ? "🏆 The final day has arrived and winners are being determined. Unfortunately, you were eliminated earlier in the tournament. Better luck next time!"
                      : hasEnoughPlayers && potInfo.hasStarted
                        ? "🚀 This pot is now live and accepting predictions! You shouldn't be seeing this page - try refreshing or navigating back."
                        : hasEnoughPlayers && !potInfo.hasStarted
                          ? "🎉 Great news! This pot has enough players and is ready to start. Predictions will begin in 24 hours when the pot officially opens!"
                          : "👻 Invite your friends! We'll notify you via email when there are enough players to start the predictions tournament!"
                    }
                  </p>
                </div>

                {/* Status Display - Only show if not eliminated on final day */}
                {!(isFinalDay && isEliminated) && (
                  <div className="flex justify-center">
                    {hasEnoughPlayers && potInfo.hasStarted ? (
                      // Pot is active
                      <div className="inline-flex items-center gap-2 md:gap-3 px-3 py-2 md:px-6 md:py-3 bg-blue-50 rounded-xl md:rounded-2xl border border-blue-200">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-blue-100 to-blue-50 rounded-full flex items-center justify-center">
                          <Users className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                          <span className="text-xs md:text-sm text-blue-700 font-medium">Pot is live with {current} players!</span>
                        </div>
                      </div>
                    ) : hasEnoughPlayers && !potInfo.hasStarted ? (
                      // Pot ready, waiting to start
                      <div className="inline-flex items-center gap-2 md:gap-3 px-3 py-2 md:px-6 md:py-3 bg-green-50 rounded-xl md:rounded-2xl border border-green-200">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-green-100 to-green-50 rounded-full flex items-center justify-center">
                          <Clock className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                          <span className="text-xs md:text-sm text-green-700 font-medium">Ready to start in 24 hours</span>
                        </div>
                      </div>
                    ) : (
                      // Waiting for more players
                      <div className="inline-flex items-center gap-2 md:gap-3 px-3 py-2 md:px-6 md:py-3 bg-gray-50 rounded-xl md:rounded-2xl border border-gray-200">
                        <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-purple-100 to-purple-50 rounded-full flex items-center justify-center">
                          <Users className="w-3 h-3 md:w-4 md:h-4 text-purple-600" />
                        </div>
                        <div className="flex items-center gap-1 md:gap-2">
                          <span className="text-lg md:text-2xl font-semibold text-gray-900">{current}</span>
                          <span className="text-gray-400 text-sm md:text-lg font-light">/</span>
                          <span className="text-md md:text-lg font-medium text-gray-600">{required}</span>
                          <span className="text-xs md:text-sm text-gray-500 ml-0.5 md:ml-1">Players</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Action Buttons - Only show email notification if not eliminated on final day */}
                {!(isFinalDay && isEliminated) && (
                  <div className="flex flex-col sm:flex-row gap-4  md:pt-4">
                    
                    <button
                      onClick={() => setShowEmailCollection(true)}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-2xl font-medium transition-colors duration-200 flex items-center gap-2 justify-center -translate-y-2"
                  >
                    <Mail className="w-4 h-4" />
                    Get Notified
                  </button>
                </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotReadyPage;