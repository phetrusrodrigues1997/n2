'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Users, Clock } from 'lucide-react';
import { useAccount } from 'wagmi';
import { saveUserEmail, notifyMinimumPlayersReached } from '../Database/actions';
import { useContractData } from '../hooks/useContractData';
import { CONTRACT_TO_TABLE_MAPPING, MIN_PLAYERS, MIN_PLAYERS2, PENALTY_EXEMPT_CONTRACTS } from '../Database/config';
import { getEventDate } from '../Database/eventDates';
import { Language, getTranslation } from '../Languages/languages';
import Cookies from 'js-cookie';

interface NotReadyPageProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  currentLanguage?: Language;
}

const NotReadyPage = ({ activeSection, setActiveSection, currentLanguage = 'en' }: NotReadyPageProps) => {
  const [showEmailCollection, setShowEmailCollection] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [emailSubmitting, setEmailSubmitting] = useState<boolean>(false);
  const [isFinalDay, setIsFinalDay] = useState<boolean>(false);
  const [isEliminated, setIsEliminated] = useState<boolean>(false);
  const [isSendingNotification, setIsSendingNotification] = useState<boolean>(false);
  const [isPenaltyExempt, setIsPenaltyExempt] = useState<boolean>(false);
  const [eventDate, setEventDate] = useState<string | null>(null);
  const { address } = useAccount();
  const { contractAddresses, participantsData } = useContractData();

  // Function to get next calendar day in UTC
  const getNextCalendarDayUTC = (): string => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(now.getUTCDate() + 1);

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    };

    return tomorrow.toLocaleDateString('en-US', options);
  };

  // Function to get tournament start date (1 week before event date)
  const getTournamentStartDate = (eventDateString: string): string => {
    try {
      const eventDateParts = eventDateString.split('-');
      if (eventDateParts.length === 3) {
        const year = parseInt(eventDateParts[0]);
        const month = parseInt(eventDateParts[1]) - 1; // Month is 0-indexed
        const day = parseInt(eventDateParts[2]);

        const eventDate = new Date(year, month, day);
        const tournamentStart = new Date(eventDate);
        tournamentStart.setDate(eventDate.getDate() - 7); // 1 week before

        const options: Intl.DateTimeFormatOptions = {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        };

        return tournamentStart.toLocaleDateString('en-US', options);
      }
    } catch (error) {
      console.error('Error parsing tournament start date:', error);
    }
    return 'soon'; // Fallback
  };


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

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Penalty-exempt contract detection
  useEffect(() => {
    const savedContract = Cookies.get('selectedMarket');
    const contractAddress = savedContract || contractAddresses[0];

    if (contractAddress) {
      const isExempt = PENALTY_EXEMPT_CONTRACTS.includes(contractAddress);
      setIsPenaltyExempt(isExempt);

      if (isExempt) {
        const eventDateString = getEventDate(contractAddress);
        setEventDate(eventDateString);
        console.log(`🏁 NotReadyPage: Penalty-exempt contract detected`, {
          contractAddress,
          eventDate: eventDateString,
          isPenaltyExempt: true
        });
      } else {
        setEventDate(null);
      }
    }
  }, [contractAddresses]);

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

  // Get translations
  const t = getTranslation(currentLanguage);

  // Helper function to format waiting message with purple styling
  const getWaitingMessage = (count: number): React.ReactNode => {
    const plural = count !== 1 ? (currentLanguage === 'pt-BR' ? 'es' : 's') : '';

    if (currentLanguage === 'pt-BR') {
      // Portuguese: "Aguardando mais X jogador(es)" -> "Aguardando mais" + "X jogador(es)"
      return (
        <>
          Aguardando mais{' '}
          <span className="text-purple-600 font-semibold">
            {count} jogador{plural}
          </span>
        </>
      );
    } else {
      // English: "Waiting for X more player(s)" -> "Waiting for" + "X more player(s)"
      return (
        <>
          Waiting for{' '}
          <span className="text-purple-600 font-semibold">
            {count} more player{plural}
          </span>
        </>
      );
    }
  };

  // Helper function to format dynamic messages
  const formatMessage = (template: string | undefined, replacements: Record<string, string>): string => {
    if (!template) return '';
    let result = template;
    Object.entries(replacements).forEach(([key, value]) => {
      result = result.replace(`{${key}}`, value);
    });
    return result;
  };

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
  }, [contractAddresses]); // Only trigger when contractAddresses changes

  // Determine what state we're in
  // For penalty-exempt contracts, we don't require minimum players
  const hasEnoughPlayers = isPenaltyExempt ? true : current >= required;
  const isPotReady = hasEnoughPlayers && potInfo.hasStarted;
  
  // Send notification if minimum players threshold is reached
  useEffect(() => {
    const triggerMinimumPlayersNotification = async () => {
      console.log(`🔍 NotReadyPage notification check:`, {
        hasEnoughPlayers,
        current,
        required,
        contractAddressesLength: contractAddresses.length,
        isSendingNotification,
        address: address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'null',
        participantsDataLength: participantsData.length
      });

      // Only trigger if:
      // 1. We have enough players
      // 2. We have valid contract data
      // 3. We're not already sending a notification
      // 4. User is connected (to ensure we have participant data)
      if (hasEnoughPlayers && contractAddresses.length > 0 && !isSendingNotification && address) {
        const savedContract = Cookies.get('selectedMarket');
        const contractAddress = savedContract || contractAddresses[0];

        console.log(`🔍 Contract details:`, {
          savedContract,
          contractAddress,
          isValidContract: contractAddress in CONTRACT_TO_TABLE_MAPPING
        });

        if (!contractAddress || !(contractAddress in CONTRACT_TO_TABLE_MAPPING)) {
          console.log(`❌ Invalid contract address: ${contractAddress}`);
          return;
        }

        try {
          console.log(`🎯 NotReadyPage detected minimum players threshold reached! Sending notification...`);
          setIsSendingNotification(true);

          const typedContractAddress = contractAddress as keyof typeof CONTRACT_TO_TABLE_MAPPING;
          const contractIndex = contractAddresses.indexOf(typedContractAddress);
          const participants = participantsData[contractIndex];
          const tableType = CONTRACT_TO_TABLE_MAPPING[typedContractAddress];

          console.log(`🔍 Notification data:`, {
            contractAddress,
            contractIndex,
            participantsCount: participants?.length || 0,
            tableType,
            current
          });

          const notificationResult = await notifyMinimumPlayersReached(
            contractAddress,
            current,
            tableType || 'market',
            participants ? [...participants] : []
          );

          console.log(`✅ NotReadyPage notification result:`, notificationResult);

          if (!notificationResult.isDuplicate) {
            console.log(`🎉 New minimum players notification sent successfully from NotReadyPage`);
          } else {
            console.log(`🔄 Notification already sent previously - no duplicate created`);
          }

        } catch (error) {
          console.error(`❌ Error sending minimum players notification from NotReadyPage:`, error);
        } finally {
          setIsSendingNotification(false);
        }
      } else {
        console.log(`⏭️ Skipping notification trigger:`, {
          hasEnoughPlayers,
          hasContractData: contractAddresses.length > 0,
          notCurrentlySending: !isSendingNotification,
          hasAddress: !!address
        });
      }
    };

    // Trigger the notification check
    triggerMinimumPlayersNotification();
  }, [hasEnoughPlayers, current, contractAddresses.length, participantsData.length, address]);

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
        {/* Back Button - Always visible for all UI states
        <div className="mb-6 relative z-10">
          <button
            onClick={() => setActiveSection('home')}
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors duration-200 font-medium text-sm tracking-wide bg-white hover:bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:border-purple-300"
          >
            <span>←</span>
            <span>{t.backToMarkets || 'Back to Markets'}</span>
          </button>
        </div> */}

        <div className="flex items-center justify-center">
          <div className="text-center w-full max-w-2xl">
            {/* Email Collection Modal */}
            {showEmailCollection && (
              <div className="fixed inset-0 bg-red-700/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full">
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-medium text-gray-900 mb-3">
                      {t.getNotified || 'Get Notified'}
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {t.emailWhenReady || 'We\'ll email you when this pot has enough players to start'}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.enterEmailAddress || 'Enter your email address'}
                      className="w-full px-4 py-3 text-base bg-white border border-gray-200 rounded-lg focus:border-gray-400 focus:outline-none transition-all duration-200 placeholder-gray-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit()}
                    />

                    <div className="flex flex-col space-y-3">
                      <button
                        onClick={handleEmailSubmit}
                        disabled={emailSubmitting || !email.trim()}
                        className="w-full bg-red-700 hover:bg-gray-800 disabled:bg-red-300 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
                      >
                        {emailSubmitting ? (t.saving || 'Saving...') : (t.notifyMe || 'Notify Me')}
                      </button>
                      <button
                        onClick={() => setShowEmailCollection(false)}
                        className="w-full text-gray-500 hover:text-gray-700 font-medium py-2 px-6 transition-colors duration-200"
                      >
                        {t.cancel || 'Cancel'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Main Not Ready Message */}
            <div className="bg-gray-50 rounded-xl p-8 md:p-12 text-center mt-6 md:mt-10">
              <div className="space-y-8">
                {/* Main Message */}
                <div className="space-y-6">
                  {/* Content */}
                  <div className="space-y-4">
                      <h1 className="text-2xl md:text-3xl font-normal text-gray-900 leading-tight tracking-tight">
                        {isFinalDay && isEliminated
                          ? (t.tournamentComplete || "Tournament Complete - You Were Eliminated")
                          : hasEnoughPlayers && potInfo.hasStarted
                            ? (t.potIsActive || "Pot is Active! Ready to Predict")
                            : hasEnoughPlayers && !potInfo.hasStarted
                              ? isPenaltyExempt ? (t.tournamentStartingSoon || "Tournament Starting Soon!") : (t.potIsReady || "Pot is Ready! Starting Soon")
                              : isPenaltyExempt
                                ? (t.tournamentStartingSoon || "Tournament Starting Soon!")
                                : (t.notReadyYet || "This pot isn't ready to begin yet")
                        }
                      </h1>

                      <p className="text-base text-gray-600 leading-relaxed max-w-lg mx-auto">
                        {isFinalDay && isEliminated
                          ? (t.finalDayEliminated || "The final day has arrived and winners are being determined. Unfortunately, you were eliminated earlier in the tournament.")
                          : hasEnoughPlayers && potInfo.hasStarted
                            ? (t.potIsLive || "This pot is now live and accepting predictions! Try refreshing or navigating back.")
                            : hasEnoughPlayers && !potInfo.hasStarted
                              ? isPenaltyExempt && eventDate
                                ? formatMessage(t.tournamentWillBegin || "Tournament begins on {startDate} - one week before the event ({eventDate})!", {
                                    startDate: getTournamentStartDate(eventDate),
                                    eventDate: eventDate
                                  })
                                : formatMessage(t.potReadyToStart || "Great news! This pot has enough players and will start on {date}!", {
                                    date: getNextCalendarDayUTC()
                                  })
                              : isPenaltyExempt && eventDate
                                ? formatMessage(t.tournamentWillBegin || "Tournament begins on {startDate} - one week before the event ({eventDate})!", {
                                    startDate: getTournamentStartDate(eventDate),
                                    eventDate: eventDate
                                  })
                                : (t.inviteFriends || "Invite your friends! We'll notify you when there are enough players.")
                        }
                      </p>
                  </div>
                </div>
                {/* Status Display - Only show if not eliminated on final day */}
                {!(isFinalDay && isEliminated) && (
                  <div className="flex justify-center">
                    {hasEnoughPlayers && potInfo.hasStarted ? (
                      // Pot is active
                      <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3">
                        <span className="text-sm text-gray-700 font-medium">
                          {formatMessage(t.potLiveWithPlayers || 'Pot is live with {count} players!', { count: current.toString() })}
                        </span>
                      </div>
                    ) : hasEnoughPlayers && !potInfo.hasStarted ? (
                      // Pot ready, waiting to start
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                        <span className="text-sm text-gray-700 font-medium">
                          {formatMessage(t.starts || 'Starts {date}', {
                            date: isPenaltyExempt && eventDate ? getTournamentStartDate(eventDate) : getNextCalendarDayUTC()
                          })}
                        </span>
                      </div>
                    ) : (
                      // Waiting for more players
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                        <span className="text-sm text-gray-700 font-medium">
                          {getWaitingMessage(required - current)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Action Button */}
                {!(isFinalDay && isEliminated) && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowEmailCollection(true)}
                      className="bg-red-700 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" />
                      {t.getNotified || 'Get Notified'}
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