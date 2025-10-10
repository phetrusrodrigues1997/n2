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
          console.log('✅ Successfully found market data:', { name: market.name, question: market.question, icon: market.icon });
          return {
            name: market.name,
            question: market.question,
            icon: market.icon
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
      // Get live market data for cookies
      const liveData = getCurrentMarketData(bookmark.marketId, bookmark.marketCategory);
      const marketQuestion = liveData?.question || 'Market question not available';
      const marketIcon = liveData?.icon || '';

      // Set cookies for market navigation
      Cookies.set('selectedMarket', bookmark.contractAddress, {
        sameSite: 'lax',
        expires: 7
      });

      Cookies.set('selectedMarketQuestion', marketQuestion, {
        sameSite: 'lax',
        expires: 7
      });

      Cookies.set('selectedMarketIcon', marketIcon, {
        sameSite: 'lax',
        expires: 7
      });

      // Navigate to pot info page
      setTimeout(() => {
        setActiveSection('potInfo');
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
          <h2 className="text-lg font-medium text-gray-900 mb-2">{t.connectYourWallet}</h2>
          <p className="text-gray-500">{t.connectWalletBookmarks}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">{t.loadingBookmarks}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Header */}
      {/* <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <button
          onClick={() => setActiveSection('home')}
          className="text-gray-900 hover:text-gray-600 transition-colors"
        >
          <span className="text-xl">←</span>
        </button>
      </div> */}

      {/* Main Content */}
      <div className="flex flex-col min-h-[calc(100vh-73px)] px-6 md:px-9 lg:px-0 xl:px-0 lg:px-9 xl:px-9">
        <div className="flex-1 py-6">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-xl md:text-2xl font-medium text-gray-900 mb-2">{t.yourPots}</h1>
            <p className="text-sm text-gray-500">{t.potsBookmarkedEntered}</p>
          </div>

          {/* Simple Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab('entered')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'entered'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.enteredPots}
              {userPots.length > 0 && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {userPots.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'bookmarks'
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.bookmarked}
              {bookmarks.length > 0 && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                  {bookmarks.length}
                </span>
              )}
            </button>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'bookmarks' ? (
            bookmarks.length === 0 ? (
              <div className="text-center py-12">
                <h2 className="text-lg font-medium text-gray-900 mb-2">{t.noBookmarksYet}</h2>
                <p className="text-gray-500 mb-6">{t.startBookmarking}</p>
                <button
                  onClick={() => setActiveSection('home')}
                  className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  {t.explore}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            Current Question
                          </span>
                          <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded">
                            Bookmarked
                          </span>
                        </div>

                        <h3 className="font-medium text-gray-900 mb-1">
                          {(() => {
                            const liveData = getCurrentMarketData(bookmark.marketId, bookmark.marketCategory);
                            if (liveData?.question) {
                              return translateMarketQuestion(liveData.question, currentLanguage);
                            }
                            return t.marketNotAvailable;
                          })()}
                        </h3>

                        <p className="text-sm text-gray-500">
                          {(() => {
                            if (!bookmark.contractAddress) return bookmark.marketId;
                            const liveData = getCurrentMarketData(bookmark.marketId, bookmark.marketCategory);
                            if (liveData?.name) {
                              return getMarketDisplayName(liveData.name, currentLanguage);
                            }
                            return bookmark.marketId;
                          })()}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRemoveBookmark(bookmark.marketId)}
                        disabled={removing === bookmark.marketId}
                        className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 p-1"
                      >
                        {removing === bookmark.marketId ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-end">
                      <div className="flex items-center gap-3">
                        {bookmark.contractAddress && potBalances[bookmark.contractAddress] && (
                          <span className="text-xs text-gray-500">
                            {potBalances[bookmark.contractAddress]} {t.inPot}
                          </span>
                        )}
                        {bookmark.contractAddress && userPots.includes(bookmark.contractAddress) && (
                          <button
                            onClick={() => handleMarketClick(bookmark.contractAddress!)}
                            className="bg-green-600 text-white py-1.5 px-3 rounded-md hover:bg-green-700 transition-colors text-xs font-medium"
                          >
                            Entered
                          </button>
                        )}
                        <button
                          onClick={() => handleViewMarket(bookmark)}
                          className="bg-red-700 text-white py-2 px-4 rounded-md transition-colors text-sm font-semibold"
                        >
                          {t.view}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            userPots.length === 0 ? (
              <div className="text-center py-12">
                <h2 className="text-lg font-medium text-gray-900 mb-2">{t.noPotsEntered}</h2>
                <p className="text-gray-500 mb-6">{t.enterPredictionPots}</p>
                <button
                  onClick={() => setActiveSection('home')}
                  className="bg-gray-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  {t.findPotsToEnter}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {userPots.map((contractAddress) => {
                  const marketType = CONTRACT_TO_TABLE_MAPPING[contractAddress as keyof typeof CONTRACT_TO_TABLE_MAPPING];
                  const getLocalMarketDisplayName = (type: string) => {
                    return getMarketDisplayName(type, currentLanguage) || t.unknownMarket;
                  };
                  const marketName = getLocalMarketDisplayName(marketType);

                  // Get the current question for this contract
                  // Try multiple market categories to find the question
                  let market = null;
                  let currentQuestion = t.participatingInPot;

                  // First try the mapped market type
                  const markets = getMarkets(t, marketType);
                  market = markets.find(m => m.contractAddress === contractAddress);

                  // If not found and this is "Trending" type, try the "options" category
                  if (!market && (marketName === "All in One" || marketName.includes("Trending"))) {
                    const optionsMarkets = getMarkets(t, 'options');
                    market = optionsMarkets.find(m => m.contractAddress === contractAddress);
                  }

                  // If still not found, try all possible categories
                  if (!market) {
                    const allCategories = ['options', 'trending', 'sports', 'crypto', 'stocks', 'music', 'formula1'];
                    for (const category of allCategories) {
                      try {
                        const categoryMarkets = getMarkets(t, category);
                        market = categoryMarkets.find(m => m.contractAddress === contractAddress);
                        if (market) break;
                      } catch (error) {
                        // Category might not exist, continue
                      }
                    }
                  }

                  if (market?.question) {
                    currentQuestion = translateMarketQuestion(market.question, currentLanguage);
                  }

                  return (
                    <div
                      key={contractAddress}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              Current Question
                            </span>
                            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                              Entered
                            </span>
                          </div>

                          <h3 className="font-medium text-gray-900 mb-1">
                            {currentQuestion}
                          </h3>

                          <p className="text-sm text-gray-500">
                            {marketName === "Trending" ? "All in One" : marketName}
                          </p>

                          {hasEnoughParticipants(contractAddress) && contractTimers[contractAddress] && (
                            <p className="text-xs text-gray-400 translate-y-9">
                              {t.nextQuestion} {contractTimers[contractAddress]}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-end">
                        <div className="flex items-center gap-3">
                          {potBalances[contractAddress] && (
                            <span className="text-xs text-gray-500">
                              {potBalances[contractAddress]} {t.inPot}
                            </span>
                          )}
                          <button
                            onClick={() => handleMarketClick(contractAddress)}
                            className="bg-red-700 text-white py-2 px-4 rounded-md cursor-pointer transition-colors text-sm font-semibold"
                          >
                            {t.view}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default BookmarksPage;