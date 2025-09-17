// App.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useReadContract, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { User, ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import { getUnreadAnnouncements } from './Database/actions';
import { filterUnreadAnnouncements } from './utils/announcementCookies';
import PredictionPotTest from './Pages/PredictionPotTest';
import LandingPage from './Pages/LandingPage';
import MakePredicitions from './Pages/MakePredictionsPage';
import ProfilePage from './Pages/ProfilePage';
import TutorialBridge from './Pages/TutorialBridge';
import NotReadyPage from './Pages/NotReadyPage';
import ReferralProgram from './Pages/ReferralProgram';
import ReceiveSection from "./Pages/ReceivePage";
import NavigationMenu from "./Sections/NavigationMenu";
import ResponsiveLogo from './Sections/ResponsiveLogo';
import HowItWorksSection from './Pages/Discord';
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownLink, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Address, Avatar, Name, Identity, EthBalance } from '@coinbase/onchainkit/identity';
import GamesHub from './Pages/AIPage';
import CreatePotPage from './Pages/CreatePotPage';
import PrivatePotInterface from './Pages/PrivatePotInterface';
import BookmarksPage from './Pages/BookmarksPage';
import FifteenMinuteQuestions from './Sections/FifteenMinuteQuestions';
import LiveMarketPotEntry from './Pages/LiveMarketPotEntry';
import MessagingPage from './Pages/MessagingPage';
import IdeasPage from './Pages/IdeasPage';
import AdminEvidenceReviewPage from './Pages/AdminEvidenceReviewPage';
import ComingSoonPage from './Pages/ComingSoonPage';
import NewsPage from './Pages/NewsPage';
import { getMarkets } from './Constants/markets';
import { Language, getTranslation, supportedLanguages, getMarketDisplayName, getPersonalizedLabel } from './Languages/languages';
import { getPrice } from './Constants/getPrice';
import Cookies from 'js-cookie';






// Contract now uses ETH directly - no USDC needed
const LIVE_POT_ADDRESS = '0xDc6725F0E3D654c3Fde0480428b194ab19F20a9E';

// Coming Soon Mode - Set to true to show coming soon page

export default function App() {
  const { address, isConnected } = useAccount();
  const [activeSection, setActiveSection] = useState('home'); // Default section 
  const [privatePotAddress, setPrivatePotAddress] = useState<string>(''); // For routing to private pots
  const [hasEnteredLivePot, setHasEnteredLivePot] = useState(false); // Track live pot entry
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false); // Track mobile search state
  const [searchQuery, setSearchQuery] = useState(''); // Search functionality
  const [isLandingPageLoading, setIsLandingPageLoading] = useState(activeSection === 'home'); // Track LandingPage loading state
  const [hasUnreadAnnouncementsState, setHasUnreadAnnouncementsState] = useState(false); // Track unread announcements
  const [isNavigationMenuOpen, setIsNavigationMenuOpen] = useState(false); // Track navigation menu state
  const [ethPrice, setEthPrice] = useState<number | null>(null); // ETH price in USD
  const [isMobile, setIsMobile] = useState(false); // Track if device is mobile
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false); // Track language dropdown state
  const [tournamentFilter, setTournamentFilter] = useState<'all' | 'daily' | 'weekly' | 'recently'>('all'); // Filter for daily/weekly/recently started tournaments
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false); // Track filter dropdown state
  const [showHowItWorksPopup, setShowHowItWorksPopup] = useState(false); // Track how it works popup
  const [isTutorialOpen, setIsTutorialOpen] = useState(false); // Track tutorial modal state

  // Get ETH balance
  const ethBalance = useBalance({
    address,
    chainId: 8453
  });

  // Carousel state
  const [selectedMarket, setSelectedMarket] = useState('Trending');
  const [activeCarousel, setActiveCarousel] = useState<'first' | 'second'>('first'); // Track which carousel was last used
  const [isMoreDropdownOpen, setIsMoreDropdownOpen] = useState(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showLeftArrow2, setShowLeftArrow2] = useState(false);
  const [showRightArrow2, setShowRightArrow2] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const carouselRef = useRef<HTMLDivElement>(null);
  const carousel2Ref = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  // Get market options for carousels
  const t = getTranslation(currentLanguage);
  const marketOptions = getMarkets(t, 'options');

  // Mobile detection
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 787px)').matches);
    };
  
    // Initial check
    checkIfMobile();
  
    // Listen for window resize events
    window.addEventListener('resize', checkIfMobile);
  
    // Clean up
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // Initialize language from cookies
  useEffect(() => {
    const savedLang = Cookies.get('language') as Language | undefined;
    if (savedLang && supportedLanguages.some(lang => lang.code === savedLang)) {
      setCurrentLanguage(savedLang);
    }
  }, []);

  // Listen for language change events from mobile menu
  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      const newLanguage = event.detail as Language;
      setCurrentLanguage(newLanguage);
      Cookies.set('language', newLanguage, { expires: 365 });
    };

    window.addEventListener('changeLanguage' as any, handleLanguageChange);
    return () => window.removeEventListener('changeLanguage' as any, handleLanguageChange);
  }, []);

  // Language switching function
  const handleLanguageChange = (language: Language) => {
    setCurrentLanguage(language);
    Cookies.set('language', language, { expires: 365 });
    setIsLanguageDropdownOpen(false);
  };

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isLanguageDropdownOpen && !target.closest('[data-language-dropdown]')) {
        setIsLanguageDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isLanguageDropdownOpen]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isFilterDropdownOpen && !target.closest('[data-filter-dropdown]')) {
        setIsFilterDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isFilterDropdownOpen]);

  // Show "How it works" popup after 2 seconds on home page (but not when tutorial is open)
  useEffect(() => {
    if (activeSection === 'home' && !isLandingPageLoading && !isTutorialOpen) {
      const timer = setTimeout(() => {
        setShowHowItWorksPopup(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [activeSection, isLandingPageLoading, isTutorialOpen]);

  // Close "How it works" popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showHowItWorksPopup && !target.closest('[data-how-it-works-popup]')) {
        setShowHowItWorksPopup(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showHowItWorksPopup]);

  // Fetch ETH price
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const price = await getPrice('ETH');
        setEthPrice(price);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        setEthPrice(4700); // Fallback price
      }
    };

    fetchEthPrice();
    
    // Refresh price every 5 minutes
    const interval = setInterval(fetchEthPrice, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Helper function to convert ETH to USD
  const ethToUsd = (ethAmount: bigint): number => {
    const fallbackEthPrice = 4700;
    const currentEthPrice = ethPrice || fallbackEthPrice;
    const ethValue = Number(formatUnits(ethAmount, 18));
    return ethValue * currentEthPrice;
  };

  // Helper function to format balance with conditional decimals
  const formatBalance = (ethAmount: bigint): string => {
    const usdValue = ethToUsd(ethAmount);
    if (usdValue > 10) {
      return `$${Math.round(usdValue)}`;
    } else {
      return `$${usdValue.toFixed(2)}`;
    }
  };

  // State for shuffled markets to avoid hydration mismatch
  const [shuffledMarkets, setShuffledMarkets] = useState(marketOptions);

  // Shuffle function
  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Shuffle markets on client side only, keeping Trending first
  useEffect(() => {
    const trendingMarket = marketOptions.find(market => market.name === 'Trending');
    const otherMarkets = marketOptions.filter(market => market.name !== 'Trending');
    const shuffledOthers = shuffleArray(otherMarkets);

    if (trendingMarket) {
      setShuffledMarkets([trendingMarket, ...shuffledOthers]);
    } else {
      setShuffledMarkets(shuffleArray(marketOptions));
    }
  }, []);


  // Function to navigate to a private pot
  const navigateToPrivatePot = (contractAddress: string) => {
    setPrivatePotAddress(contractAddress);
    setActiveSection('privatePot');
  };

  // Function to handle successful live pot entry
  const handleLivePotEntry = () => {
    setHasEnteredLivePot(true);
  };

  // Function to check for unread announcements
  const checkUnreadAnnouncements = async () => {
    if (!address) {
      setHasUnreadAnnouncementsState(false);
      return;
    }
    
    try {
      // Get all announcements for the user
      const allAnnouncements = await getUnreadAnnouncements(address);
      // Filter using cookies to find truly unread ones
      const unreadAnnouncements = filterUnreadAnnouncements(allAnnouncements);
      setHasUnreadAnnouncementsState(unreadAnnouncements.length > 0);
    } catch (error) {
      console.error('Error checking unread announcements:', error);
      setHasUnreadAnnouncementsState(false);
    }
  };

  // Check for unread announcements when user connects/disconnects
  useEffect(() => {
    if (isConnected && address) {
      checkUnreadAnnouncements();
      
      // Set up periodic check every 30 seconds
      const interval = setInterval(checkUnreadAnnouncements, 30000);
      return () => clearInterval(interval);
    } else {
      setHasUnreadAnnouncementsState(false);
    }
  }, [isConnected, address]);

  // Function for MessagingPage to notify when announcements are marked as read
  const onAnnouncementsMarkedAsRead = () => {
    setHasUnreadAnnouncementsState(false);
    console.log('📖 Announcements marked as read - clearing notification dot');
  };

  // Clear unread state when user visits announcements page (immediate UI feedback)
  useEffect(() => {
    if (activeSection === 'messagesPage') {
      setHasUnreadAnnouncementsState(false);
    }
  }, [activeSection]);


  // Search functionality
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setActiveSection('home'); // Navigate to home when searching
  };

  // Carousel functions
  const updateArrowVisibility = () => {
    const container = carouselRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const updateArrowVisibility2 = () => {
    const container = carousel2Ref.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftArrow2(scrollLeft > 0);
      setShowRightArrow2(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  const scrollLeft = () => {
    const container = carouselRef.current;
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    const container = carouselRef.current;
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const scrollLeft2 = () => {
    const container = carousel2Ref.current;
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight2 = () => {
    const container = carousel2Ref.current;
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const handleScroll2 = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow2(scrollLeft > 0);
    setShowRightArrow2(scrollLeft < scrollWidth - clientWidth - 1);
  };

  // Reset live pot entry state when switching sections
  useEffect(() => {
    if (activeSection !== 'liveMarkets') {
      setHasEnteredLivePot(false);
    }
  }, [activeSection]);

  // Reset mobile search state when switching away from home
  useEffect(() => {
    if (activeSection !== 'home') {
      setIsMobileSearchActive(false);
    }
  }, [activeSection]);

  // Scroll to top when activeSection changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeSection]);



  // Check for market parameter in URL on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const potAddress = urlParams.get('market');

    if (potAddress && potAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      navigateToPrivatePot(potAddress);

      // Clean up URL without refreshing the page
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  const [toastMessage] = useState('');
  const [showToast] = useState(false);
  // Removed unused state variables for cleaner code

  // Click outside handler for More dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setIsMoreDropdownOpen(false);
      }
    };

    if (isMoreDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreDropdownOpen]);

  // Carousel effects
  useEffect(() => {
    const timer = setTimeout(() => {
      updateArrowVisibility();
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateArrowVisibility();
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedMarket]);

  // Force arrow visibility check when marketOptions change
  useEffect(() => {
    const timer = setTimeout(() => {
      updateArrowVisibility();
      updateArrowVisibility2();
    }, 300);
    return () => clearTimeout(timer);
  }, [marketOptions]);

  // Second carousel effects
  useEffect(() => {
    const timer = setTimeout(() => {
      updateArrowVisibility2();
    }, 200);
    return () => clearTimeout(timer);
  }, [shuffledMarkets]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateArrowVisibility2();
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedMarket]);













  // if (!isMounted) {
  //   return (
  //     <div className="flex flex-col items-center justify-center h-screen bg-invisible text-white">
  //       <div className="p-8 bg-invisible rounded-lg shadow-2xl border border-[#fefefe] max-w-md w-full">
  //         <div className="text-center mb-6">
  //           <h2 className="text-xl font-medium mb-2">Loading Application</h2>
  //           <p className="text-[#d3c81a]">Please wait while we initialize the interface</p>
  //         </div>
  //         <div className="flex justify-center">
  //           <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#fefefe]"></div>
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // Handle loading change from LandingPage
  const handleLoadingChange = (isLoading: boolean) => {
    setIsLandingPageLoading(isLoading);
  };

  // Function to navigate to wallet management
  const navigateToWallet = () => {
    // Open Coinbase wallet management in a new tab, same as WalletDropdownLink
    window.open('https://keys.coinbase.com', '_blank', 'noopener,noreferrer');
  };

  // Set loading state when navigating to home section
  useEffect(() => {
    if (activeSection === 'home') {
      setIsLandingPageLoading(true);
    } else {
      setIsLandingPageLoading(false);
    }
  }, [activeSection]);


  return (
    <div className="min-h-screen bg-white text-white">


      {/* Hide header and all content when LandingPage is loading or showing coming soon */}
      {!isLandingPageLoading && activeSection !== 'comingsoon' && (
        <header
  className={`z-50 bg-white px-4 md:py-2 sticky top-0 ${
    (activeSection === "home") ? "border-b border-gray-200" : ""
  }`}
>
        <div className="w-full mx-auto flex flex-col">
          {/* Top row with main header elements */}
          <div className="flex justify-between items-center mt-3 md:mt-0">
            <div className="flex items-center flex-1">
              {/* Hamburger menu - shows on both desktop and mobile at left edge */}
              <div className="ml-1.5 md:ml-0">
                <NavigationMenu 
                  activeSection={activeSection} 
                  setActiveSection={setActiveSection} 
                  onMenuToggle={setIsNavigationMenuOpen}
                  onTriggerWallet={navigateToWallet}
                  currentLanguage={currentLanguage}
                />
              </div>

              {/* Logo */}
              <div className="relative -ml-2">
                <div className="absolute -inset-1 rounded-full blur-md"></div>
                <ResponsiveLogo onClick={() => setActiveSection('home')} />
              </div>

              {/* Search Bar - Desktop only, right of logo */}
              <div className="hidden md:flex items-center gap-3 ml-6 flex-1">
                <div className="relative">
                  <div className="absolute left-1 top-1/2 transform -translate-y-1/2">
                    <svg className="w-9 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder={t.searchPotsPlaceholder}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-[530px] pl-10 pr-10 py-2 bg-gray-100 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:bg-white focus:border-2 focus:border-purple-700 transition-colors duration-200"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-gray-500 text-sm font-mono">/</span>
                  </div>
                </div>
                
                {/* How it works button - Next to search bar */}
                <button
                  onClick={() => setActiveSection('discord')}
                  className="inline-flex items-center gap-2 text-purple-700 hover:text-purple-700 font-semibold transition-colors px-4 py-2 whitespace-nowrap min-w-fit"
                >
                  {/* Smaller red circle with i */}
                  <span className="flex items-center justify-center w-3 h-3 rounded-full bg-purple-700 text-white text-[9px] font-bold">
                    i
                  </span>
                  {/* Text */}
                  <span className="text-purple-700">{t.howItWorks}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end flex-1">
              {/* Balance display removed - ETH balance handled by wallet */}

              {/* Right-side button group - adjust positioning based on connection status */}
              <div className={`flex items-center ml-auto ${isConnected ? '-mr-4 md:-mr-12' : '-mr-2 md:-mr-4'}`}>
                {/* Tight group: Mobile (Bell first) vs Desktop (Language first) */}
                <div className="flex items-center gap-0">
                  {/* Bell button - Mobile: leftmost, Desktop: rightmost */}
                  {isConnected && (
                    <button
                      className={`relative p-1 hover:bg-gray-100 rounded-full transition-colors z-40 translate-x-4 md:translate-x-0 md:-mr-6 ${isMobile ? 'order-1 ' : 'order-3'}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Bell button clicked');
                        setActiveSection('messagesPage');
                      }}
                      type="button"
                    >
                      <Bell className="w-5 h-5 text-gray-600 hover:text-gray-800 transition-colors" />
                      {/* Purple dot indicator for unread announcements */}
                      {hasUnreadAnnouncementsState && (
                        <div className="absolute top-1 right-1 w-3 h-3 bg-purple-700 rounded-full border-2 border-white animate-pulse"></div>
                      )}
                    </button>
                  )}

                  {/* Language dropdown - Mobile: middle, Desktop: leftmost - Always visible */}
                  <div className={`relative z-50 ${isMobile ? 'order-2' : (isConnected ? 'order-1' : 'order-1 -ml-4')}`} data-language-dropdown>
                    <button
                      className="hidden md:flex flex-col items-center bg-transparent text-gray-700 font-medium text-sm transition-colors duration-200 z-10 relative px-1 py-1 rounded-md min-w-fit hover:bg-gray-100 cursor-pointer gap-0"
                      onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                      type="button"
                    >
                      <div className="text-xs text-gray-500 whitespace-nowrap opacity-70 flex items-center gap-1">
                        Language
                        <svg
                          className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${
                            isLanguageDropdownOpen ? 'rotate-180' : 'rotate-0'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          strokeWidth="2.5"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <div className="text-sm font-semibold text-purple-700 whitespace-nowrap">
                        {currentLanguage === 'en' ? 'en-US' : 'pt-BR'}
                      </div>
                    </button>
                    
                    
                    {/* Language dropdown menu */}
                    {isLanguageDropdownOpen && (
                      <div className="absolute right-0 mt-1 w-52 md:w-44 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-[80]">
                        {supportedLanguages.map((language) => (
                          <button
                            key={language.code}
                            onClick={() => handleLanguageChange(language.code)}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2  ${
                              currentLanguage === language.code ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                            }`}
                          >
                            <img
                              src={language.flag}
                              alt={`${language.name} flag`}
                              className="w-5 h-3 object-cover rounded flex-shrink-0"
                            />
                            <span className="text-sm font-medium">{language.name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Balance display - Mobile: rightmost, Desktop: middle */}
                  {isConnected && (
                    <button
                      onClick={() => setActiveSection('receive')}
                      className={`hidden md:flex flex-col items-center bg-transparent text-gray-700 font-medium text-sm transition-colors duration-200 z-10 relative px-1 py-1 rounded-md min-w-fit hover:bg-gray-100 cursor-pointer order-2`}
                  >
                    <div className="text-xs text-gray-500 whitespace-nowrap opacity-70">{isMobile ? t.yourBalanceMobile : t.yourBalance}</div>
                    <div className="text-sm font-semibold text-purple-700 whitespace-nowrap">
                      {ethBalance.data ? formatBalance(ethBalance.data.value) : '$0.00'}
                    </div>
                  </button>
                )}

                </div>

                {/* Wallet container with spacing */}
                <div className="wallet-container translate-x-0">
                <Wallet>
                  <ConnectWallet
                    text={isMobile ? "Sign In" : "Sign In"}
                    className={`${isConnected ? '!bg-transparent !border-none !shadow-none !p-0' : ''} ${isMobile ? 'bg-purple-700 hover:bg-black !px-4 !py-2 !min-w-0' : 'bg-purple-700 hover:bg-black !px-4 !py-2 !min-w-0 !w-24 !whitespace-nowrap'}`}
                  >
                    {isConnected && (
                      <div className="flex items-center gap-2">
                        {/* Show balance on mobile, colorful circle on desktop */}
                        {isMobile ? (
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveSection('receive');
                            }}
                            className="flex flex-col items-center bg-transparent text-gray-700 font-medium text-xs hover:bg-gray-100 cursor-pointer px-2 py-1 rounded-md transition-colors duration-200"
                          >
                            <div className="text-xs text-gray-500 whitespace-nowrap opacity-70">{isMobile ? t.yourBalanceMobile : t.yourBalance}</div>
                            <div className="text-sm font-semibold text-purple-700 whitespace-nowrap">
                              {ethBalance.data ? formatBalance(ethBalance.data.value) : '$0.00'}
                            </div>
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-700 via-purple-900 to-black hover:from-indigo-300 hover:via-violet-400 hover:via-fuchsia-400 hover:via-rose-400 hover:via-amber-300 hover:to-teal-400 transition-all duration-200 hover:shadow-xl hover:scale-105"></div>
                        )}
                      </div>
                    )}
                  </ConnectWallet>
                  <WalletDropdown>
                    <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                      <Avatar />
                      <Name />
                      <Address />
                      <EthBalance />
                    </Identity>
                    <WalletDropdownLink
                      icon="wallet"
                      href="https://keys.coinbase.com"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Wallet
                    </WalletDropdownLink>
                    <WalletDropdownDisconnect />
                  </WalletDropdown>
                </Wallet>
                </div>
              </div>
            </div>
          </div>

          {/* Market Carousel - only show on home and dashboard sections, on its own line */}
          {(activeSection === 'home') && (
            <div className="mt-4 md:mt-1 md:translate-y-2 pt-1 md:pt-0 ">
              {/* Markets Container - Show first 13 on desktop, all on mobile */}
              <div className="flex overflow-x-auto md:overflow-visible scrollbar-hide pb-1"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                {/* Show first 13 items on desktop, all on mobile */}
                {(isMobile ? marketOptions : marketOptions.slice(0, 14)).map((market) => (
                  <button
  key={market.id}
  onClick={() => {
    setSelectedMarket(market.id);
    setActiveCarousel('first');
  }}
  className={`
    flex-shrink-0 flex items-center px-1.5 py-0.5 cursor-pointer whitespace-nowrap
    transition-opacity duration-200
    ${selectedMarket === market.id && activeCarousel === 'first'
      ? 'text-[rgba(0,0,0,0.9)] font-semibold opacity-100'
      : 'text-[rgba(0,0,0,0.9)] font-medium opacity-70 hover:opacity-85'
    }
  `}
  style={{
    fontSize: '15px',
    lineHeight: '24px',
    letterSpacing: '0.15px',
    fontFeatureSettings: '"cv09", "cv01", "cv08", "case"',
    minWidth: 'fit-content',
  }}
>
  {getMarketDisplayName(market.name, currentLanguage)}
</button>

                ))}
                

              </div>
            </div>
          )}
        </div>
        </header>
      )}

      {/* Mobile Search Bar - Below Header - Always show on mobile when home */}
      {!isLandingPageLoading && activeSection !== 'comingsoon' && activeSection === 'home' && (
      <div className="md:hidden bg-white px-4 py-4 flex items-center gap-3">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder={t.searchPotsPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-transparent border border-gray-200 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:bg-white focus:border-purple-700 transition-colors duration-200"
          />
        </div>

        {/* Filter Symbol */}
        <button
          className={`flex items-center justify-center w-10 h-10 bg-transparent rounded-lg transition-colors duration-200 ${
            isFilterDropdownOpen ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-100'
          }`}
          onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
        >
          <svg className={`w-5 h-5 transition-colors duration-200 ${
            isFilterDropdownOpen ? 'text-purple-700' : 'text-black'
          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
        </button>

        {/* Bookmark/Save Symbol */}
        <button 
          className="flex items-center justify-center w-10 h-10 bg-transparent rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Mobile search bar bookmark button clicked');
            setActiveSection('bookmarks');
          }}
          type="button"
        >
          <svg className="w-5 h-5 text-black pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>
      </div>
      )}

      {/* Second Carousel - Personalized Labels (Below mobile search bar) */}
      {!isLandingPageLoading && activeSection !== 'comingsoon' && activeSection === 'home' && (
        <section className="relative z-10 px-4 md:py-3 bg-white overflow-hidden">
          <div className="w-full mx-auto">
            <div className="flex items-center gap-4 w-full max-w-full">
              {/* Desktop Search Bar - Left side */}
              <div className="hidden md:flex items-center gap-1">
                <div className="relative w-56">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder={t.search}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:bg-white focus:border-2 focus:border-purple-700 transition-colors duration-200"
                  />
                </div>

                {/* Filter Symbol */}
                <div className="relative" data-filter-dropdown>
                  <button
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className={`flex items-center justify-center w-9 h-9 bg-white rounded-lg transition-colors duration-200 ${
                      isFilterDropdownOpen ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <svg className={`w-5 h-5 transition-colors duration-200 ${
                      isFilterDropdownOpen ? 'text-purple-700' : 'text-black'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>
                </div>

                {/* Bookmark/Save Symbol */}
                <button
                  className="flex items-center justify-center w-10 h-10 bg-white rounded-lg cursor-pointer hover:bg-gray-200 transition-colors z-20 relative"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Bookmark button clicked - should navigate to bookmarks');
                    setActiveSection('bookmarks');
                  }}
                  type="button"
                >
                  <svg
                    className="w-5 h-5 text-black pointer-events-none"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                </button>

              </div>


              {/* Conditional: Show Filter Bar when filter dropdown is open, otherwise show Carousel */}
              {isFilterDropdownOpen ? (
                /* Tournament Filter Bar */
                <div className="flex items-center gap-2 flex-1 md:flex-1 min-w-0" data-filter-dropdown>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setTournamentFilter('all')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                        tournamentFilter === 'all'
                          ? 'bg-white text-purple-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {t.allTournaments}
                    </button>
                    <button
                      onClick={() => setTournamentFilter('daily')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                        tournamentFilter === 'daily'
                          ? 'bg-white text-purple-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {t.dailyTournaments}
                    </button>
                    <button
                      onClick={() => setTournamentFilter('weekly')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                        tournamentFilter === 'weekly'
                          ? 'bg-white text-purple-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {t.weeklyTournaments}
                    </button>
                    <button
                      onClick={() => setTournamentFilter('recently')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                        tournamentFilter === 'recently'
                          ? 'bg-white text-purple-700 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {t.recentlyStarted}
                    </button>
                  </div>
                </div>
              ) : (
                /* Original Carousel - Right side on desktop, full width on mobile */
                <div className="relative flex-1 md:flex-1 min-w-0 overflow-hidden">
                  {/* Left Arrow for second carousel - Hidden on mobile */}
                  <button
                    onClick={scrollLeft2}
                    className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-lg rounded-full items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
                    style={{ display: showLeftArrow2 ? 'flex' : 'none' }}
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-600" />
                  </button>

                  {/* Right Arrow for second carousel - Hidden on mobile */}
                  {showRightArrow2 && (
                    <button
                      onClick={scrollRight2}
                      className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-lg rounded-full items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  )}

                  <div
                    ref={carousel2Ref}
                    className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 max-w-full"
                    onScroll={handleScroll2}
                    style={{
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      maxWidth: '100%'
                    }}
                  >
                    {/* All button - appears selected initially, gets deselected when other buttons are clicked */}
                <button
                  key="all-button"
                  onClick={() => {
                    // Do nothing functionally, but update states to show All as selected
                    setSelectedMarket('All');
                    setActiveCarousel('second');
                  }}
                  className={`group flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 transition-all duration-300 ${
                    (selectedMarket === 'All' && activeCarousel === 'second') || (selectedMarket === 'Trending' && activeCarousel === 'first')
                      ? 'text-purple-700 bg-purple-100 border border-purple-200 rounded-full'
                      : 'text-black border border-gray-200 rounded-full hover:text-gray-600'
                  }`}
                  style={{
                    fontWeight: ((selectedMarket === 'All' && activeCarousel === 'second') || (selectedMarket === 'Trending' && activeCarousel === 'first')) ? '500' : '500',
                    minWidth: 'fit-content',
                    height: 'auto',
                  }}
                >
                  <span className="text-sm whitespace-nowrap tracking-tight">
                    For you
                  </span>
                </button>

                {shuffledMarkets.map((market) => (
                  <button
                    key={`personalized-${market.id}`}
                    onClick={() => {
                      setSelectedMarket(market.id);
                      setActiveCarousel('second');
                    }}
                    className={`group flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 transition-all duration-300 ${selectedMarket === market.id && activeCarousel === 'second'
                        ? 'text-purple-700 bg-purple-100 border border-purple-200 rounded-full'
                        : 'text-black border border-gray-200 rounded-full hover:text-gray-600'
                      }`}
                    style={{
                      fontWeight: selectedMarket === market.id && activeCarousel === 'second' ? '500' : '500',
                      minWidth: 'fit-content',
                      height: 'auto',
                      // fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
                    }}
                  >
                    <span className="text-sm whitespace-nowrap tracking-tight">
                      {getPersonalizedLabel(market.name, currentLanguage)}
                    </span>
                  </button>
                ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <main className="flex-grow bg-white pb-16 md:pb-0">



        {activeSection === "comingsoon" && <ComingSoonPage />} 
        {activeSection === "receive" && <ReceiveSection activeSection={activeSection} setActiveSection={setActiveSection} />}
        {activeSection === "profile" && <ProfilePage activeSection={activeSection} setActiveSection={setActiveSection} />}
        {activeSection === "messagesPage" && <MessagingPage activeSection={activeSection} setActiveSection={setActiveSection} onAnnouncementsMarkedAsRead={onAnnouncementsMarkedAsRead} currentLanguage={currentLanguage} />}
        {activeSection === "discord" && <HowItWorksSection setActiveSection={setActiveSection} currentLanguage={currentLanguage} />}
        {/* {activeSection === "notifications" && <CreateMessage />} */}
        {activeSection === "dashboard" && <TutorialBridge key={currentLanguage} activeSection={activeSection} setActiveSection={setActiveSection} currentLanguage={currentLanguage} />}
        {activeSection === "notReadyPage" && <NotReadyPage activeSection={activeSection} setActiveSection={setActiveSection} />}
        {activeSection === "bitcoinPot" && <PredictionPotTest activeSection={activeSection} setActiveSection={setActiveSection} />}
        {activeSection === "referralProgram" && <ReferralProgram activeSection={activeSection} setActiveSection={setActiveSection} />}
        {activeSection === "home" && <LandingPage activeSection={activeSection} setActiveSection={setActiveSection} isMobileSearchActive={isMobileSearchActive} searchQuery={searchQuery} selectedMarket={selectedMarket} setSelectedMarket={setSelectedMarket} onLoadingChange={handleLoadingChange} currentLanguage={currentLanguage} tournamentFilter={tournamentFilter} onTutorialStateChange={setIsTutorialOpen} />}
        {activeSection === "makePrediction" && <MakePredicitions activeSection={activeSection} setActiveSection={setActiveSection} currentLanguage={currentLanguage} />}
        {activeSection === "AI" && <GamesHub activeSection={activeSection} setActiveSection={setActiveSection} />}
        {activeSection === "createPot" && <CreatePotPage navigateToPrivatePot={navigateToPrivatePot} />}
        {activeSection === "ideas" && <IdeasPage activeSection={activeSection} setActiveSection={setActiveSection} />}
        {activeSection === "news" && <NewsPage onBack={() => setActiveSection('home')} />}
        {activeSection === "bookmarks" && <BookmarksPage activeSection={activeSection} setActiveSection={setActiveSection} currentLanguage={currentLanguage} />}
        {activeSection === "adminEvidenceReview" && <AdminEvidenceReviewPage activeSection={activeSection} setActiveSection={setActiveSection} />}
        {activeSection === "privatePot" && privatePotAddress && (
          <PrivatePotInterface
            contractAddress={privatePotAddress}
            activeSection={activeSection}
            onBack={() => {
              setActiveSection('home');
              setPrivatePotAddress('');
            }}
          />
        )}
        {activeSection === "liveMarkets" && (
          hasEnteredLivePot ? (
            <FifteenMinuteQuestions className="mt-20" setActiveSection={setActiveSection} />
          ) : (
            <LiveMarketPotEntry
              contractAddress={LIVE_POT_ADDRESS}
              onPotEntered={handleLivePotEntry}
            />
          )
        )}
        {/* Add more sections as needed */}

      </main>

      {/* Mobile Bottom Navigation */}
      {!isLandingPageLoading && activeSection !== 'comingsoon' && activeSection !== 'AI' && activeSection !== 'receive' && activeSection !== 'ideas' && activeSection !== 'bitcoinPot' && activeSection !== 'dashboard' && activeSection !== 'discord' && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white z-40 border-t border-gray-200">
        <div className="flex items-center justify-around py-1">
          <button
            onClick={(e) => {
              console.log('Mobile HOME button clicked');
              setActiveSection('home');
              setIsMobileSearchActive(false);
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all duration-200 ${(activeSection === 'home' || activeSection === 'dashboard' || activeSection === 'bitcoinPot') ? 'text-slate-900 opacity-100' : 'text-gray-500 opacity-70'
              }`}
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center mb-0.5 transition-all duration-200 ${(activeSection === 'home' || activeSection === 'dashboard' || activeSection === 'bitcoinPot') ? 'bg-transparent' : ''
              }`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9,22 9,12 15,12 15,22"></polyline>
              </svg>
            </div>
            <span className="text-[13px] font-medium">{t.bottomNavHome}</span>
          </button>

          <button
            onClick={() => setActiveSection('liveMarkets')}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all duration-200 ${activeSection === 'liveMarkets' ? 'text-slate-900 opacity-100' : 'text-gray-500 opacity-70'
              }`}
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center mb-0.5 transition-all duration-200 ${activeSection === 'liveMarkets' ? 'bg-transparent' : ''
              }`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                <path d="M3.05 3.05a7 7 0 0 0 0 9.9.5.5 0 0 1-.707.707 8 8 0 0 1 0-11.314.5.5 0 0 1 .707.707m2.122 2.122a4 4 0 0 0 0 5.656.5.5 0 1 1-.708.708 5 5 0 0 1 0-7.072.5.5 0 0 1 .708.708m5.656-.708a.5.5 0 0 1 .708 0 5 5 0 0 1 0 7.072.5.5 0 1 1-.708-.708 4 4 0 0 0 0-5.656.5.5 0 0 1 0-.708m2.122-2.12a.5.5 0 0 1 .707 0 8 8 0 0 1 0 11.313.5.5 0 0 1-.707-.707 7 7 0 0 0 0-9.9.5.5 0 0 1 0-.707zM10 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0"/>
              </svg>
            </div>
            <span className="text-[13px] font-medium">{t.bottomNavLive}</span>
          </button>

              <button
            onClick={() => {
              console.log('Mobile NEWS button clicked');
              setActiveSection('news');
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all duration-200 ${activeSection === 'news' ? 'text-slate-900 opacity-100' : 'text-gray-500 opacity-70'}`}
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center mb-0.5 transition-all duration-200 ${activeSection === 'news' ? 'bg-transparent' : ''}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
                <path d="M18 14h-8"/>
                <path d="M15 18h-5"/>
                <path d="M10 6h8v4h-8V6z"/>
              </svg>
            </div>
            <span className="text-[13px] font-medium">News</span>
          </button>
          
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Mobile my markets button clicked - should navigate to bookmarks');
              setActiveSection('bookmarks');
            }}
            className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg transition-all duration-200 ${(activeSection === 'bookmarks' || activeSection === 'makePrediction' || activeSection === 'privatePot' || activeSection === 'createPot' || activeSection === 'profile') ? 'text-slate-900 opacity-100' : 'text-gray-500 opacity-70'
              }`}
          >
            <div className={`w-4 h-4 rounded-full flex items-center justify-center mb-0.5 transition-all duration-200 ${(activeSection === 'bookmarks' || activeSection === 'makePrediction' || activeSection === 'privatePot' || activeSection === 'createPot' || activeSection === 'profile') ? 'bg-transparent' : ''
              }`}>
              <svg className="w-4 h-4 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <span className="text-[13px] font-medium truncate max-w-[60px]">
               {t.bottomNavMyPots}
            </span>
          </button>
        </div>
        </div>
      )}

      {/* How it works popup - extension of bottom navigation */}
      {!isLandingPageLoading && activeSection === 'home' && showHowItWorksPopup && !isTutorialOpen && (
        <div className="fixed left-0 right-0 md:hidden bg-white z-50" data-how-it-works-popup style={{ bottom: '54px' }}>
          <div
            className="bg-white border-t border-gray-200 rounded-t-lg px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => {
              setActiveSection('discord');
              setShowHowItWorksPopup(false);
            }}
          >
            <div className="flex items-center justify-center relative">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-purple-600">{t.howItWorks}</h3>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowHowItWorksPopup(false);
                }}
                className="absolute right-0 text-purple-500 hover:text-purple-700 p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {!isLandingPageLoading && activeSection !== 'comingsoon' && showToast && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 md:bottom-6 bg-black/80 text-white px-4 py-2 rounded-md shadow-lg border border-[#004400] transition-all duration-200 flex items-center z-50">
          <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          {toastMessage}
        </div>
      )}
    </div>

  );

}