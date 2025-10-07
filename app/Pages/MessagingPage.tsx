'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import {
  createAnnouncement,
  getAllAnnouncements,
  getUserContractAnnouncements,
  getUnreadAnnouncements,
  markAnnouncementsAsRead
} from '../Database/actions';
import { markAnnouncementsAsRead as markAnnouncementsAsReadCookie } from '../utils/announcementCookies';
import { getTranslation, Language } from '../Languages/languages';
import LoadingScreen from '../Components/LoadingScreen';

interface Announcement {
  id: number;
  message: string;
  datetime: string;
  contractAddress?: string;
  isContractSpecific?: boolean;
}

interface MessagingPageProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  onAnnouncementsMarkedAsRead?: () => void;
  currentLanguage: Language;
}

const MessagingPage = ({ setActiveSection, onAnnouncementsMarkedAsRead, currentLanguage }: MessagingPageProps) => {
  const { address, isConnected } = useAccount();
  
  // Special admin wallet address
  const SPECIAL_ADDRESS = '0xA90611B6AFcBdFa9DDFfCB2aa2014446297b6680';
  const isSpecialUser = address && address.toLowerCase() === SPECIAL_ADDRESS.toLowerCase();

  // State for announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [status, setStatus] = useState<string>('');
  

  // Load announcements from database (both global and contract-specific)
  const loadAnnouncements = async () => {
    if (!address) return;

    try {
      setLoading(true);

      // Get both global and contract-specific announcements for this user
      console.log(`🔍 MessagingPage: Loading announcements for address: ${address}`);

      const allAnnouncements = await getUserContractAnnouncements(address);
      console.log(`🔍 MessagingPage: Found ${allAnnouncements.length} announcements for user`);

      if (allAnnouncements.length === 0) {
        console.log(`🔍 MessagingPage: No announcements found - the general solution may have an issue`);
      }

      // Convert database format to component format
      const formattedAnnouncements: Announcement[] = allAnnouncements.map(announcement => ({
        id: announcement.id,
        message: announcement.message,
        datetime: announcement.datetime,
        contractAddress: announcement.contractAddress || undefined,
        isContractSpecific: !!announcement.contractAddress,
      }));
      
      console.log(`🔍 MessagingPage: Formatted announcements:`, formattedAnnouncements);
      setAnnouncements(formattedAnnouncements);
    } catch (error) {
      console.error("Error loading announcements:", error);
      setStatus('Failed to load announcements');
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Mark announcements as read when user loads the page (now using cookies)
  const markAllAnnouncementsAsRead = () => {
    if (announcements.length === 0) return;
    
    try {
      const announcementIds = announcements.map(a => a.id);
      // Use cookie-based tracking instead of database
      markAnnouncementsAsReadCookie(announcementIds);
      
      // Notify parent component that announcements have been marked as read
      if (onAnnouncementsMarkedAsRead) {
        onAnnouncementsMarkedAsRead();
      }
      
      console.log('📖 Marked announcements as read and notified parent component');
    } catch (error) {
      console.error("Error marking announcements as read:", error);
    }
  };

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (address) {
      loadAnnouncements();
    }
  }, [address]);

  // Mark announcements as read immediately when they're loaded
  useEffect(() => {
    if (announcements.length > 0) {
      // Mark as read immediately to prevent flashing purple dot
      markAllAnnouncementsAsRead();
    }
  }, [announcements]);

  // Removed automatic scroll to bottom behavior

  const showStatus = (msg: string) => {
    setStatus(msg);
    setTimeout(() => setStatus(''), 3000);
  };

  const handleAddAnnouncement = async () => {
    if (!address || !newAnnouncement.trim()) return;
    
    if (!isSpecialUser) {
      showStatus('Unauthorized: Only admin can add announcements');
      return;
    }

    try {
      setLoading(true);
      
      // Create announcement in database
      await createAnnouncement(newAnnouncement.trim());
      
      // Reload announcements to get updated list
      await loadAnnouncements();
      
      setNewAnnouncement('');
      setShowAddForm(false);
      
      showStatus('Announcement posted successfully');
    } catch (error) {
      console.error("Error adding announcement:", error);
      showStatus('Failed to post announcement');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (datetime: string) => {
    const date = new Date(datetime);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      const hours = Math.floor(diffHours);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffHours / 24);
      return `${days}d ago`;
    }
  };

  // Function to translate announcement messages
  const translateAnnouncementMessage = (message: string): string => {
    console.log('🔍 [Translation] Input message:', message);
    console.log('🔍 [Translation] Current language:', currentLanguage);

    const t = getTranslation(currentLanguage);

    // NEW: Tournament announcement pattern (🏆)
    if (message.includes('🏆') && message.includes('tournament is now active')) {
      console.log('🔍 [Translation] Matched tournament pattern');
      const participantMatch = message.match(/We have (\d+) participants/);
      const marketMatch = message.match(/🏆 (.+?) tournament is now active/);
      const dateMatch = message.match(/officially begins on (.+?)\./);

      console.log('🔍 [Translation] Tournament matches:', { participantMatch, marketMatch, dateMatch });

      if (participantMatch && marketMatch && dateMatch) {
        const participants = participantMatch[1];
        const marketName = marketMatch[1];
        const startDate = dateMatch[1];

        if (currentLanguage === 'pt-BR') {
          const translated = `🏆 Torneio ${marketName} está ativo! Temos ${participants} participantes prontos para competir. O torneio começa oficialmente em ${startDate}. Hora de afiar suas habilidades de previsão! 🎯`;
          console.log('🔍 [Translation] Tournament translated to PT:', translated);
          return translated;
        }
        console.log('🔍 [Translation] Tournament keeping English');
        return message; // Keep English as default
      }
    }

    // NEW: Launch announcement pattern (🚀)
    if (message.includes('🚀 Let\'s go!') && message.includes('participants and is now live')) {
      const participantMatch = message.match(/reached (\d+) participants/);
      const dateMatch = message.match(/Daily predictions begin (.+?)\./);

      if (participantMatch && dateMatch) {
        const participants = participantMatch[1];
        const startDate = dateMatch[1];

        if (currentLanguage === 'pt-BR') {
          return `🚀 Vamos lá! Seu pote alcançou ${participants} participantes e está ativo! Previsões diárias começam ${startDate}. Que vença o melhor previsor! 🎯`;
        }
        return message; // Keep English as default
      }
    }

    // NEW: Market launch announcement pattern (🎉)
    if (message.includes('🎉') && message.includes('is officially live with') && message.includes('participants!')) {
      const marketMatch = message.match(/🎉 (.+?) is officially live/);
      const participantMatch = message.match(/live with (\d+) participants/);
      const dateMatch = message.match(/Daily challenges start (.+?)\./);

      if (marketMatch && participantMatch && dateMatch) {
        const marketName = marketMatch[1];
        const participants = participantMatch[1];
        const startDate = dateMatch[1];

        if (currentLanguage === 'pt-BR') {
          return `🎉 ${marketName} está oficialmente ativo com ${participants} participantes! Pronto para testar suas habilidades de previsão? Desafios diários começam ${startDate}. Boa sorte! 💪`;
        }
        return message; // Keep English as default
      }
    }

    // NEW: Outcome winner announcements (🎉 Fantastic!)
    if (message.includes('🎉 Fantastic! Users who predicted') && message.includes('challenge!')) {
      console.log('🔍 [Translation] Matched outcome winner pattern');
      const outcomeMatch = message.match(/predicted (POSITIVE|NEGATIVE) won/);
      const marketMatch = message.match(/won today's (.+?) challenge!/);

      console.log('🔍 [Translation] Outcome matches:', { outcomeMatch, marketMatch });

      if (outcomeMatch && marketMatch) {
        const outcome = outcomeMatch[1];
        const marketName = marketMatch[1];

        if (currentLanguage === 'pt-BR') {
          const translated = `🎉 Fantástico! Usuários que previram ${outcome === 'POSITIVE' ? 'POSITIVO' : 'NEGATIVO'} ganharam o desafio de ${marketName} de hoje!`;
          console.log('🔍 [Translation] Outcome translated to PT:', translated);
          return translated;
        }
        console.log('🔍 [Translation] Outcome keeping English');
        return message; // Keep English as default
      }
    }

    // LEGACY: Check for old-style outcome messages (Great news!)
    if (message.includes('Great news! Users who predicted') && (message.includes('correctly predicted') || message.includes('question'))) {
      console.log('🔍 [Translation] Matched LEGACY outcome pattern');
      const outcomeMatch = message.match(/predicted (POSITIVE|NEGATIVE)/);
      const marketMatch = message.match(/today's (.+?) (question|market)/);

      console.log('🔍 [Translation] Legacy outcome matches:', { outcomeMatch, marketMatch });

      if (outcomeMatch && marketMatch) {
        const outcome = outcomeMatch[1];
        const marketName = marketMatch[1];

        if (currentLanguage === 'pt-BR') {
          const translated = `🎉 Ótimas notícias! Usuários que previram ${outcome === 'POSITIVE' ? 'POSITIVO' : 'NEGATIVO'} acertaram a questão de ${marketName} de hoje!`;
          console.log('🔍 [Translation] Legacy outcome translated to PT:', translated);
          return translated;
        }
        console.log('🔍 [Translation] Legacy outcome keeping English');
        return message; // Keep English as default
      }
    }

    // NEW: Elimination messages (various emojis)
    if (message.includes('users were eliminated this round') || message.includes('Your prediction was off this time')) {
      console.log('🔍 [Translation] Matched elimination pattern');

      if (message.includes('Amazing! No one was eliminated')) {
        console.log('🔍 [Translation] Perfect round elimination');
        if (currentLanguage === 'pt-BR') {
          const translated = message.replace('Amazing! No one was eliminated this round - all predictions were spot on!', 'Incrível! Ninguém foi eliminado desta rodada - todas as previsões estavam certas!');
          console.log('🔍 [Translation] Perfect round translated to PT:', translated);
          return translated;
        }
      } else if (message.includes('Your prediction was off this time')) {
        console.log('🔍 [Translation] Single elimination');
        const marketMatch = message.match(/jump back into the (.+?) action!/);
        if (marketMatch && currentLanguage === 'pt-BR') {
          const marketName = marketMatch[1];
          const translated = `📉 Sua previsão estava errada desta vez. Pague a taxa de entrada de hoje para voltar à ação de ${marketName}!`;
          console.log('🔍 [Translation] Single elimination translated to PT:', translated);
          return translated;
        }
      } else if (message.includes('users were eliminated this round')) {
        console.log('🔍 [Translation] Multiple eliminations');
        const eliminatedMatch = message.match(/(\d+) users were eliminated/);
        console.log('🔍 [Translation] Elimination count match:', eliminatedMatch);
        if (eliminatedMatch && currentLanguage === 'pt-BR') {
          const count = eliminatedMatch[1];
          const translated = `😱 Rodada difícil! ${count} usuários foram eliminados. Se foi você, pague a taxa de entrada de hoje para voltar à competição!`;
          console.log('🔍 [Translation] Multiple eliminations translated to PT:', translated);
          return translated;
        }
      }
    }

    // LEGACY: Handle elimination text in combined messages
    if (message.includes('were eliminated. If that\'s you, pay today\'s entry fee to re-enter')) {
      console.log('🔍 [Translation] Matched LEGACY elimination in combined message');
      const eliminatedMatch = message.match(/(\d+) users were eliminated/);
      console.log('🔍 [Translation] Legacy elimination count match:', eliminatedMatch);

      if (eliminatedMatch && currentLanguage === 'pt-BR') {
        const count = eliminatedMatch[1];
        // Translate the elimination part
        const translated = message.replace(
          new RegExp(`${count} users were eliminated\\. If that's you, pay today's entry fee to re-enter.*$`),
          `${count} usuários foram eliminados. Se foi você, pague a taxa de entrada de hoje para voltar à competição!`
        );
        console.log('🔍 [Translation] Legacy elimination translated to PT:', translated);
        return translated;
      }
    }

    // LEGACY: Old-style pot ready announcements (🎉 Awesome!)
    if (message.includes('🎉 Awesome! Your') && message.includes('pot is ready with') && message.includes('participants!')) {
      console.log('🔍 [Translation] Matched LEGACY pot ready pattern');
      const marketMatch = message.match(/Your (.+?) pot is ready/);
      const participantMatch = message.match(/with (\d+) participants/);
      const dateMatch = message.match(/Starting on (.+?) when/);

      console.log('🔍 [Translation] Legacy pot ready matches:', { marketMatch, participantMatch, dateMatch });

      if (marketMatch && participantMatch && dateMatch) {
        const marketName = marketMatch[1];
        const participants = participantMatch[1];
        const startDate = dateMatch[1];

        if (currentLanguage === 'pt-BR') {
          // Use smart naming: "Trending" -> "All in One"
          const translatedMarketName = marketName === 'Trending' ? 'All in One' : marketName;
          const translated = `🎉 Incrível! Seu pote ${translatedMarketName} está pronto com ${participants} participantes! Começando em ${startDate} quando o pote oficialmente inicia.`;
          console.log('🔍 [Translation] Legacy pot ready translated to PT:', translated);
          return translated;
        }
        console.log('🔍 [Translation] Legacy pot ready keeping English');
        return message; // Keep English as default
      }
    }

    // Legacy patterns (for old messages that might still exist)
    if (message.includes('📝 Note: The') && message.includes('tournament will start one week before the event')) {
      console.log('🔍 [Translation] Matched legacy tournament pattern');
      if (currentLanguage === 'pt-BR') {
        // Basic Portuguese translation for legacy messages
        const translated = message.replace('Note:', 'Nota:')
                    .replace('tournament will start one week before the event', 'torneio começará uma semana antes do evento')
                    .replace('Tournament begins on', 'Torneio começa em')
                    .replace('Get ready to make your predictions!', 'Prepare-se para fazer suas previsões!');
        console.log('🔍 [Translation] Legacy tournament translated to PT:', translated);
        return translated;
      }
    }

    // Return original message if no pattern matches
    console.log('🔍 [Translation] No pattern matched, returning original message');
    return message;
  };

  // Show loading screen during initial load
  if (initialLoading && isConnected && address) {
    return (
      <LoadingScreen 
        title="Global Announcements"
        subtitle="Loading your latest updates and notifications..."
        showProgress={false}
      />
    );
  }

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md mx-auto">
          <h1 className="text-2xl font-medium text-gray-900 mb-3">
            Announcements
          </h1>
          <p className="text-gray-500 text-base">
            Connect your wallet to view updates
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-medium text-gray-900">Announcements</h1>

            {/* Add announcement button - only visible to admin */}
            {isSpecialUser && (
              <button
                onClick={() => setShowAddForm(true)}
                className="text-sm text-gray-700 hover:text-gray-900 border border-gray-300 px-4 py-1.5 rounded hover:border-gray-400 transition-colors"
              >
                New
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Add announcement form - only visible to admin */}
        {isSpecialUser && showAddForm && (
          <div className="bg-gray-50 border border-gray-200 rounded p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-900">New Announcement</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <textarea
                value={newAnnouncement}
                onChange={(e) => setNewAnnouncement(e.target.value)}
                placeholder="Enter announcement..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:border-gray-400 focus:outline-none resize-none text-black text-sm"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleAddAnnouncement}
                  disabled={loading || !newAnnouncement.trim()}
                  className="bg-gray-900 text-white text-sm px-4 py-2 rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Posting...' : 'Post'}
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-sm text-gray-700 px-4 py-2 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Announcements List */}
        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="text-base font-medium text-gray-900 mb-1">No announcements</h3>
              <p className="text-gray-500 text-sm">Check back later for updates</p>
            </div>
          ) : (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                className="border border-gray-200 rounded p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-medium text-gray-900">
                      PrediWin
                    </span>
                    {announcement.isContractSpecific && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        Tournament
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatTime(announcement.datetime)}
                  </span>
                </div>

                <p className="text-gray-700 text-sm leading-relaxed">
                  {translateAnnouncementMessage(announcement.message).split("\n").map((line, i) => (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
                  ))}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Status Message */}
      {status && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2 rounded">
          {status}
        </div>
      )}
    </div>
  );
};

export default MessagingPage;