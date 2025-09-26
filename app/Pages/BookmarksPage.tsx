'use client';

import React, { useState, useEffect, useRef } from 'react';
import { formatUnits } from 'viem';
import Cookies from 'js-cookie';
import { Bookmark, X, Trophy, Users, TrendingUp } from 'lucide-react';
import { getUserBookmarks, removeBookmark } from '../Database/actions';
import { CONTRACT_TO_TABLE_MAPPING, MIN_PLAYERS, MIN_PLAYERS2 } from '../Database/config';
import { getMarkets } from '../Constants/markets';
import { getTranslation, Language, getMarketDisplayName, translateMarketQuestion } from '../Languages/languages';
import { useContractData } from '../hooks/useContractData';
import LoadingScreen from '../Components/LoadingScreen';


interface BookmarksPageProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  currentLanguage?: Language;
}

interface BookmarkItem {
  id: number;
  walletAddress: string;
  marketId: string;
  marketCategory: string;
  contractAddress?: string | null;
  // Note: marketName and marketQuestion are no longer fetched from database - we use live data from markets.ts
}

const BookmarksPage = ({ activeSection, setActiveSection, currentLanguage = 'en' }: BookmarksPageProps) => {
  const { contractAddresses, participantsData, balancesData, isConnected, address } = useContractData();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  
  // Contract-specific timer mapping using the centralized logic
  const [contractTimers, setContractTimers] = useState<Record<string, string>>({});
  
  // Markets you've entered functionality
  const [userPots, setUserPots] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'entered'>('entered');
  
  // ETH price and pot balances state
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [potBalances, setPotBalances] = useState<Record<string, string>>({});
  const balanceCalculatedRef = useRef<boolean>(false);

  // Get translation instance for market data
  const t = getTranslation(currentLanguage);

  // Function to get current market data from markets.ts
  const getCurrentMarketData = (marketId: string, marketCategory: string) => {
    console.log('🔍 getCurrentMarketData called with:', { marketId, marketCategory });
    
    // Try different category name variations since bookmarks might store different formats
    const categoryVariations = [
      marketCategory,                    // Original category as stored
      marketCategory.toLowerCase(),      // lowercase version
      marketId,                          // Sometimes the marketId matches the category (e.g., 'stocks', 'music')
      marketId.toLowerCase(),            // lowercase marketId
    ];
    
    for (const category of categoryVariations) {
      try {
        console.log('🔍 Trying category variation:', category);
        const markets = getMarkets(t, category);
        console.log('🔍 Retrieved markets for category:', category, 'Count:', markets.length);
        
        const market = markets.find(m => m.id === marketId);
        console.log('🔍 Looking for marketId:', marketId, 'Found market:', market);
        
        if (market) {
          console.log('✅ Successfully found market data:', { name: market.name, question: market.question });
          return {
            name: market.name,
            question: market.question
          };
        }
      } catch (error) {
        console.log('❌ Error with category variation:', category, error);
      }
    }
    
    console.log('❌ Could not find live market data for:', marketId, marketCategory, 'after trying all variations');
    return null;
  };

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Update userPots when participant data changes
  useEffect(() => {
    if (!isConnected || !address) {
      setUserPots([]);
      return;
    }

    const participatingPots: string[] = [];
    
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
  }, [address, isConnected]); // Remove unstable array dependencies

  // Contract-specific timer logic (same as LandingPage.tsx)
  useEffect(() => {
    const updateAllTimers = async () => {
      if (contractAddresses.length === 0) return;

      const { getFormattedTimerForContract } = await import('../Database/config');
      const newTimers: Record<string, string> = {};

      for (const contractAddress of contractAddresses) {
        newTimers[contractAddress] = getFormattedTimerForContract(contractAddress);
      }

      setContractTimers(newTimers);
    };

    updateAllTimers();

    const interval = setInterval(updateAllTimers, 1000);
    return () => clearInterval(interval);
  }, [contractAddresses]);

  // Helper function to get pot number from contract address
  const getPotNumber = (contractAddress: string): number => {
    const markets = getMarkets(t, 'options');
    const market = markets.find(m => m.contractAddress === contractAddress);
    return market?.potNumber || 0;
  };

  // Helper function to check if there are enough participants for a contract
  const hasEnoughParticipants = (contractAddress: string): boolean => {
    const contractIndex = contractAddresses.findIndex(addr => addr === contractAddress);
    if (contractIndex === -1) return false;

    const participants = participantsData[contractIndex];
    if (!participants || !Array.isArray(participants)) return false;

    // Determine minimum players based on contract index
    const minPlayersRequired = contractIndex === 0 ? MIN_PLAYERS : MIN_PLAYERS2;
    return participants.length >= minPlayersRequired;
  };

  // Load bookmarks when component mounts or address changes
  useEffect(() => {
    const loadBookmarks = async () => {
      if (!isConnected || !address) {
        setBookmarks([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('📑 Loading bookmarks for:', address);
        
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Database query took too long')), 10000) // 10 second timeout
        );
        
        const bookmarksPromise = getUserBookmarks(address);
        
        const userBookmarks = await Promise.race([bookmarksPromise, timeoutPromise]);
        setBookmarks(userBookmarks as any);
        console.log('📑 Bookmarks loaded successfully, count:', (userBookmarks as any).length);
      } catch (error) {
        console.error('Error loading bookmarks:', error);
        // Set empty bookmarks on error so page still loads
        setBookmarks([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookmarks();
  }, [address, isConnected]);

  // Set fallback ETH price to avoid CORS issues (use same as other components)
  useEffect(() => {
    setEthPrice(4700); // Use fallback price consistently
  }, []);

  // Helper function to convert ETH to USD (same as in other components)
  const ethToUsd = (ethAmount: bigint): number => {
    const fallbackEthPrice = 4700;
    const currentEthPrice = ethPrice || fallbackEthPrice;
    const ethValue = Number(formatUnits(ethAmount, 18));
    return ethValue * currentEthPrice;
  };

  // Calculate balances once when data is available
  useEffect(() => {
    // Only calculate once when we have eth price and haven't calculated yet
    if (!ethPrice || balanceCalculatedRef.current) return;
    
    // Check if we have balance data
    if (!balancesData || balancesData.length === 0 || !contractAddresses || contractAddresses.length === 0) {
      return;
    }

    console.log('💰 BookmarksPage - Calculating balances once...');
    balanceCalculatedRef.current = true;

    const newPotBalances: Record<string, string> = {};
    
    // Calculate balances for each contract
    balancesData.forEach((balance, index) => {
      const contractAddress = contractAddresses[index];
      
      if (balance?.value) {
        const usdAmount = ethToUsd(balance.value);
        
        // Show 2 decimal places if under $10, otherwise round to nearest dollar
        const formattedAmount = usdAmount < 10 ? usdAmount.toFixed(2) : usdAmount.toFixed(0);
        newPotBalances[contractAddress] = `$${formattedAmount}`;
        console.log(`💰 BookmarksPage - Contract ${contractAddress}: ${formatUnits(balance.value, 18)} ETH = $${formattedAmount}`);
      } else if (balance !== undefined) {
        // Balance loaded but is 0
        newPotBalances[contractAddress] = '$0';
        console.log(`💰 BookmarksPage - Contract ${contractAddress}: $0`);
      }
    });

    setPotBalances(newPotBalances);
    console.log('💰 BookmarksPage - Updated pot balances:', newPotBalances);
  }, [ethPrice]); // Only depend on ethPrice

  const handleRemoveBookmark = async (marketId: string) => {
    if (!address) return;

    try {
      setRemoving(marketId);
      const result = await removeBookmark(address, marketId);
      
      if (result.success) {
        // Remove from local state
        setBookmarks(prev => prev.filter(bookmark => bookmark.marketId !== marketId));
      } else {
        console.error('Failed to remove bookmark:', result.message);
      }
    } catch (error) {
      console.error('Error removing bookmark:', error);
    } finally {
      setRemoving(null);
    }
  };


  const handleViewMarket = (bookmark: BookmarkItem) => {
    if (bookmark.contractAddress) {
      // Set cookies for market navigation if contract address is available
      Cookies.set('selectedMarket', bookmark.contractAddress, { 
        sameSite: 'lax',
        expires: 7 
      });
      
      // Get live market question for cookie
      const liveData = getCurrentMarketData(bookmark.marketId, bookmark.marketCategory);
      const marketQuestion = liveData?.question || 'Market question not available';
      
      Cookies.set('selectedMarketQuestion', marketQuestion, { 
        sameSite: 'lax',
        expires: 7 
      });

      // Navigate to dashboard/prediction page
      setTimeout(() => {
        setActiveSection('dashboard');
      }, 200);
    } else {
      // Fallback: navigate to home and show the market category
      setActiveSection('home');
      // Could potentially set the selected market category here if needed
    }
  };

  const handleMarketClick = (contractAddress: string) => {
    Cookies.set('selectedMarket', contractAddress);
    // Set selectedMarketQuestion cookie with appropriate question
    const marketType = CONTRACT_TO_TABLE_MAPPING[contractAddress as keyof typeof CONTRACT_TO_TABLE_MAPPING];
    const markets = getMarkets(t, marketType);
    const market = markets.find(m => m.contractAddress === contractAddress);
    if (market?.question) {
      Cookies.set('selectedMarketQuestion', market.question, { 
        sameSite: 'lax',
        expires: 7 
      });
    }
    setActiveSection('makePrediction');
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Bookmark className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.connectYourWallet}</h2>
          <p className="text-gray-600">{t.connectWalletBookmarks}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingScreen title="Prediwin" subtitle={t.loadingBookmarks} />;
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Bookmark className="w-8 h-8 text-gray-700" />
            <h1 className="text-3xl font-bold text-gray-900">{t.yourPots}</h1>
          </div>
          <p className="text-gray-600">{t.potsBookmarkedEntered}</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('entered')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-colors ${
              activeTab === 'entered'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Trophy className="w-5 h-5" />
            {t.enteredPots}
            {userPots.length > 0 && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                activeTab === 'entered' ? 'bg-gray-100' : 'bg-gray-200'
              }`}>
                {userPots.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium transition-colors ${
              activeTab === 'bookmarks'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bookmark className="w-5 h-5" />
            {t.bookmarked}
            {bookmarks.length > 0 && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                activeTab === 'bookmarks' ? 'bg-gray-100' : 'bg-gray-200'
              }`}>
                {bookmarks.length}
              </span>
            )}
          </button>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'bookmarks' ? (
          /* Bookmarks Tab Content */
          bookmarks.length === 0 ? (
            <div className="text-center py-16">
              <Bookmark className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.noBookmarksYet}</h2>
              <p className="text-gray-600 mb-6">{t.startBookmarking}</p>
              <button
                onClick={() => setActiveSection('home')}
                className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {t.explore}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 group"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Category Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {bookmark.marketCategory}
                        </span>
                      </div>

                      {/* Market Question */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {(() => {
                          const liveData = getCurrentMarketData(bookmark.marketId, bookmark.marketCategory);
                          if (liveData?.question) {
                            return translateMarketQuestion(liveData.question, currentLanguage);
                          }
                          return t.marketNotAvailable;
                        })()}
                      </h3>

                      {/* Market Name / Pot Number */}
                      <p className="text-gray-600 text-sm">
                        {(() => {
                          if (!bookmark.contractAddress) return bookmark.marketId;

                          const potNumber = getPotNumber(bookmark.contractAddress);
                          if (potNumber === 1) return 'Pot #1';

                          const liveData = getCurrentMarketData(bookmark.marketId, bookmark.marketCategory);
                          if (liveData?.name) {
                            return getMarketDisplayName(liveData.name, currentLanguage);
                          }
                          return bookmark.marketId;
                        })()}
                      </p>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => handleRemoveBookmark(bookmark.marketId)}
                      disabled={removing === bookmark.marketId}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                      title={t.removeBookmark}
                    >
                      {removing === bookmark.marketId ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700"></div>
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleViewMarket(bookmark)}
                      className="bg-gray-50 hover:bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {bookmark.contractAddress ? t.viewPot : t.goToCategory}
                    </button>
                    {bookmark.contractAddress && (
                      <div className="flex items-center gap-2">
                       
                        
                        {/* Show balance if available, otherwise show loading */}
                        {potBalances[bookmark.contractAddress] !== undefined ? (
                          <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-full self-center">
                            {potBalances[bookmark.contractAddress]} {t.inPot}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full self-center">
                            $0
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Entered Markets Tab Content */
          userPots.length === 0 ? (
            <div className="text-center py-16">
              <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.noPotsEntered}</h2>
              <p className="text-gray-600 mb-6">{t.enterPredictionPots}</p>
              <button
                onClick={() => setActiveSection('home')}
                className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {t.findPotsToEnter}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-6 h-6 text-gray-600" />
                <h2 className="text-xl font-bold text-gray-900">{t.potsYouEntered}</h2>
                {/* <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">
                  {userPots.length} Active
                </span> */}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userPots.map((contractAddress) => {
                  const marketType = CONTRACT_TO_TABLE_MAPPING[contractAddress as keyof typeof CONTRACT_TO_TABLE_MAPPING];
                  // Get proper market display name using translations
                  const getLocalMarketDisplayName = (type: string) => {
                    return getMarketDisplayName(type, currentLanguage) || t.unknownMarket;
                  };
                  const marketName = getLocalMarketDisplayName(marketType);
                  
                  return (
                    <button 
                      key={contractAddress}
                      onClick={() => handleMarketClick(contractAddress)}
                      className="text-left p-6 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-lg transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                          <TrendingUp className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 group-hover:text-gray-700 transition-colors">
                            {getPotNumber(contractAddress) === 1 ? 'Pot #1' : marketName}
                          </h3>
                          <div className="flex items-center gap-2">
                            {hasEnoughParticipants(contractAddress) && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                               {t.nextQuestion} {contractTimers[contractAddress] || ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-3">
                        {t.participatingInPot}
                      </div>
                      
                     <div className="flex items-center">
  {potBalances[contractAddress] && (
    <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
      {potBalances[contractAddress]} {t.inPot}
    </div>
  )}
  <div className="ml-auto px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors cursor-pointer shadow-sm">
  {t.view}
</div>

</div>

                    </button>
                  );
                })}
              </div>
              
              <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Trophy className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">{t.yourActivePots}</h4>
                    <p className="text-gray-700 text-sm">
                      {t.currentlyParticipatingIn} {userPots.length} {userPots.length !== 1 ? t.pots : t.pot}. 
                      {t.clickAnyPotAbove}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default BookmarksPage;