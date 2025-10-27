// App.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAccount, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import {  ChevronLeft, ChevronRight, Bell } from 'lucide-react';
import { getUnreadAnnouncements, getUserContractAnnouncements, updateUserLanguage } from './Database/actions';
import { filterUnreadAnnouncements, markAnnouncementsAsRead } from './utils/announcementCookies';
import PredictionPotTest from './Pages/PredictionPotTest';
import LandingPage from './Pages/LandingPage';
import MakePredicitions from './Pages/MakePredictionsPage';
import ProfilePage from './Pages/ProfilePage';
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
import IdeasPage from './Pages/IdeasPage';
import AdminEvidenceReviewPage from './Pages/AdminEvidenceReviewPage';
import ComingSoonPage from './Pages/ComingSoonPage';
import NewsPage from './Pages/NewsPage';
import PotInfoPage from './Pages/PotInfoPage';
import EmailManagementPage from './Pages/EmailManagementPage';
import { getMarkets } from './Constants/markets';
import { Language, getTranslation, supportedLanguages, getMarketDisplayName, getPersonalizedLabel } from './Languages/languages';
import { getPrice } from './Constants/getPrice';
import Cookies from 'js-cookie';


// Contract now uses ETH directly - no USDC needed
const LIVE_POT_ADDRESS = '0xDc6725F0E3D654c3Fde0480428b194ab19F20a9E';

// Coming Soon Mode - Set to true to show coming soon page

export default function App() {
  const { address, isConnected } = useAccount();
  const addressRef = useRef(address); // Ref to track current address
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
  const [isTutorialOpen, setIsTutorialOpen] = useState(false); // Track tutorial modal state
  const [enteredTournamentsCount, setEnteredTournamentsCount] = useState(0); // Track number of tournaments user has entered
  const [isAnnouncementsDropdownOpen, setIsAnnouncementsDropdownOpen] = useState(false); // Track announcements dropdown state
  const [announcements, setAnnouncements] = useState<any[]>([]); // Store announcements
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false); // Track announcements loading state

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
  const [showLeftArrowFilter, setShowLeftArrowFilter] = useState(false);
  const [showRightArrowFilter, setShowRightArrowFilter] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const carouselRef = useRef<HTMLDivElement>(null);
  const carousel2Ref = useRef<HTMLDivElement>(null);
  const filterCarouselRef = useRef<HTMLDivElement>(null);
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

  // Keep addressRef in sync with address
  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  // Listen for language change events from mobile menu and navigation menu
  useEffect(() => {
    const handleLanguageChangeEvent = (event: CustomEvent) => {
      const newLanguage = event.detail as Language;
      setCurrentLanguage(newLanguage);
      Cookies.set('language', newLanguage, { expires: 365 });

      // Save language preference to database if user is connected
      // Use ref to always get current address value
      if (addressRef.current) {
        updateUserLanguage(addressRef.current, newLanguage).catch(error =>
          console.error('Failed to save language preference:', error)
        );
      }
    };

    window.addEventListener('changeLanguage' as any, handleLanguageChangeEvent);
    return () => window.removeEventListener('changeLanguage' as any, handleLanguageChangeEvent);
  }, []); // No dependencies - listener stays the same, uses ref

  // Language switching function
  const handleLanguageChange = (language: Language) => {
    setCurrentLanguage(language);
    Cookies.set('language', language, { expires: 365 });
    setIsLanguageDropdownOpen(false);

    // Save language preference to database if user is connected
    if (address) {
      updateUserLanguage(address, language).catch(error =>
        console.error('Failed to save language preference:', error)
      );
    }
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

  // Close announcements dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isAnnouncementsDropdownOpen && !target.closest('[data-announcements-dropdown]')) {
        setIsAnnouncementsDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isAnnouncementsDropdownOpen]);

  // Load announcements when dropdown opens
  useEffect(() => {
    const loadAnnouncements = async () => {
      if (!isAnnouncementsDropdownOpen || !address) return;

      try {
        setLoadingAnnouncements(true);
        const allAnnouncements = await getUserContractAnnouncements(address);
        setAnnouncements(allAnnouncements);

        // Mark all as read when opening dropdown
        if (allAnnouncements.length > 0) {
          const announcementIds = allAnnouncements.map((a: any) => a.id);
          markAnnouncementsAsRead(announcementIds);
        }
      } catch (error) {
        console.error('Error loading announcements:', error);
      } finally {
        setLoadingAnnouncements(false);
      }
    };

    loadAnnouncements();
  }, [isAnnouncementsDropdownOpen, address]);



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
      console.log('🔔 checkUnreadAnnouncements: Total announcements:', allAnnouncements.length);

      // Filter using cookies to find truly unread ones
      const unreadAnnouncements = filterUnreadAnnouncements(allAnnouncements);
      console.log('🔔 checkUnreadAnnouncements: Unread announcements:', unreadAnnouncements.length);
      console.log('🔔 Setting hasUnreadAnnouncementsState to:', unreadAnnouncements.length > 0);

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

  const scrollLeftFilter = () => {
    const container = filterCarouselRef.current;
    if (container) {
      container.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRightFilter = () => {
    const container = filterCarouselRef.current;
    if (container) {
      container.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  const updateFilterArrowVisibility = () => {
    const container = filterCarouselRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      setShowLeftArrowFilter(scrollLeft > 0);
      setShowRightArrowFilter(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

 

  const handleScroll2 = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow2(scrollLeft > 0);
    setShowRightArrow2(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const handleScrollFilter = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrowFilter(scrollLeft > 0);
    setShowRightArrowFilter(scrollLeft < scrollWidth - clientWidth - 1);
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
      updateFilterArrowVisibility();
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

  // Filter carousel effects
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilterArrowVisibility();
    }, 200);
    return () => clearTimeout(timer);
  }, [isFilterDropdownOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilterArrowVisibility();
    }, 100);
    return () => clearTimeout(timer);
  }, [tournamentFilter]);


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
    <div className="min-h-screen bg-white text-white px-4 md:px-6">


      {/* Hide header and all content when LandingPage is loading or showing coming soon */}
      {!isLandingPageLoading && activeSection !== 'comingsoon' && (
        <header
  className={`z-50 bg-white sticky top-0`}
>
        <div className={`-mx-4 md:-mx-9 overflow-x-hidden ${(activeSection !== 'comingsoon') ? "border-b border-gray-200" : ""}`}>
          <div className="relative z-10 px-4 md:px-9 pt-0 md:pt-2 pb-0 md:pb-2">
            <div className={`flex flex-col ${isConnected ? '' : 'pb-3'}`}>
          {/* Top row with main header elements */}
          <div className="flex justify-between items-center mt-3 md:mt-0 ">
            <div className="flex items-center flex-1 gap-6">

              {/* Logo */}
              <div className="relative flex-shrink-0 translate-x-1">
                <div className="absolute -inset-1 rounded-full blur-md"></div>
                <ResponsiveLogo onClick={() => setActiveSection('home')} />
              </div>

              {/* Search Bar - Desktop only, right of logo */}
              <div className="hidden md:flex items-center gap-3 flex-1">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder={t.searchPotsPlaceholder}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-[530px] pl-10 pr-10 py-2.5 bg-gray-50 rounded-lg text-black placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-gray-300 transition-all duration-200 border border-gray-200"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <span className="text-gray-400 text-sm font-mono">/</span>
                  </div>
                </div>
                
                {/* How it works button - Next to search bar */}
                <button
                  onClick={() => setActiveSection('discord')}
                  className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors px-4 py-2 whitespace-nowrap min-w-fit hover:bg-gray-50 rounded-lg"
                >
                  {/* Smaller red circle with i */}
                  <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#010065] text-white text-[10px] font-bold">
                    i
                  </span>
                  <span className="text-gray-700">{t.howItWorks}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end flex-1">
              {/* Balance display removed - ETH balance handled by wallet */}

              {/* Right-side button group - adjust positioning based on connection status */}
              <div className="flex items-center gap-2 md:-mr-8 lg:-mr-10 xl:-mr-12">
                {/* Tight group: Mobile (Bell first) vs Desktop (Language first) */}
                <div className="flex items-center gap-0">
                  {/* Bell button - Mobile: leftmost, Desktop: rightmost */}
                  {isConnected && (
                    <div className={`relative ${isMobile ? 'order-1' : 'order-3'}`} data-announcements-dropdown>
                      <button
                        className="relative p-1 hover:bg-gray-100 rounded-full transition-colors z-40 translate-x-5 md:translate-x-12"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Bell button clicked');
                          setIsAnnouncementsDropdownOpen(!isAnnouncementsDropdownOpen);
                          if (!isAnnouncementsDropdownOpen) {
                            // Mark as read when opening
                            setHasUnreadAnnouncementsState(false);
                          }
                        }}
                        type="button"
                      >
                        <Bell className="w-5 h-5 text-gray-800 stroke-2 hover:text-black transition-colors" fill="white" />
                        {/* red dot indicator for unread announcements */}
                        {hasUnreadAnnouncementsState && (
                          <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 bg-[#010065] rounded-full border-2 border-white animate-pulse"></div>
                        )}
                      </button>

                      {/* Announcements Dropdown */}
                      {isAnnouncementsDropdownOpen && createPortal(
                        <div
                          className="fixed bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-[80] max-h-[500px] overflow-y-auto"
                          style={{
                            top: '60px',
                            right: isMobile ? '10px' : '20px',
                            width: isMobile ? 'calc(100vw - 20px)' : '384px',
                            maxWidth: '384px'
                          }}
                        >
                          {/* Header */}
                          <div className="border-b border-gray-200 p-4">
                            <h3 className="text-base font-medium text-gray-900">{t.notifications}</h3>
                          </div>

                          {/* Content */}
                          {loadingAnnouncements ? (
                            <div className="p-8 text-center">
                              <div className="text-sm text-gray-500">{t.loading}</div>
                            </div>
                          ) : announcements.length === 0 ? (
                            <div className="p-8 text-center">
                              <div className="text-sm text-gray-500">{t.noNotifications}</div>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-200">
                              {announcements.map((announcement) => (
                                <div key={announcement.id} className="p-4 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="text-xs font-medium text-gray-900">Prediwin</span>
                                    <span className="text-xs text-gray-500">
                                      {(() => {
                                        const date = new Date(announcement.datetime);
                                        const now = new Date();
                                        const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
                                        if (diffHours < 1) return t.justNow;
                                        if (diffHours < 24) return `${Math.floor(diffHours)}${t.hoursAgo}`;
                                        return `${Math.floor(diffHours / 24)}${t.daysAgo}`;
                                      })()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {currentLanguage === 'pt-BR' && announcement.messagePt
                                      ? announcement.messagePt
                                      : announcement.message}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>,
                        document.body
                      )}
                    </div>
                  )}

                  {/* Language dropdown - Mobile: middle, Desktop: leftmost - Always visible */}
                  <div className={`relative z-50 ${isMobile ? 'order-2' : 'order-1'}`} data-language-dropdown>
                    <button
                      className="hidden md:flex items-center gap-2 px-3 py-2 bg-white text-gray-700 font-medium hover:bg-gray-200 transition-colors"
                      onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                      type="button"
                    >
                      <img
                        src={supportedLanguages.find(lang => lang.code === currentLanguage)?.flag}
                        alt="Current language"
                        className="object-cover rounded w-6 h-4"
                      />
                      <span className="text-sm font-medium">
                        {supportedLanguages.find(lang => lang.code === currentLanguage)?.name}
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform duration-200 flex-shrink-0 ${
                          isLanguageDropdownOpen ? 'rotate-180' : 'rotate-0'
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    
                    {/* Language dropdown menu */}
                    {isLanguageDropdownOpen && createPortal(
                      <div className="absolute right-0 mt-1 w-52 md:w-44 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-[80]"
                           style={{
                             position: 'fixed',
                             top: '60px',
                             right: '20px'
                           }}>
                        {supportedLanguages.map((language) => (
                          <button
                            key={language.code}
                            onClick={() => handleLanguageChange(language.code)}
                            className={`w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors flex items-center gap-2  ${
                              currentLanguage === language.code ? 'bg-[#010065] text-white' : 'text-gray-700'
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
                      </div>,
                      document.body
                    )}
                  </div>

                  {/* Balance display - Mobile: rightmost, Desktop: middle */}
                  {isConnected && (
                    <button
                      onClick={() => setActiveSection('profile')}
                      className="hidden md:flex flex-col items-center bg-transparent text-gray-700 font-medium text-sm transition-colors duration-200 z-10 relative px-1 py-1 rounded-md min-w-fit hover:bg-gray-100 cursor-pointer order-2"
                  >
                    <div className="text-xs text-gray-600 font-medium whitespace-nowrap">{t.yourBalance}</div>
                    <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                      {ethBalance.data ? formatBalance(ethBalance.data.value) : '$0.00'}
                    </div>
                  </button>
                )}

                </div>

                {/* Wallet container with spacing */}
                {!isConnected && (
                  <Wallet>
                    <ConnectWallet
                      text={t.signIn}
                      className={`!bg-transparent  !shadow-none !p-0 [&>span]:!text-[#010062] hover:[&>span]:!text-black !font-medium ${currentLanguage === 'pt-BR' ? '!px-3 !py-1.5 md:translate-x-6 ' : '!px-3.5 !py-1.5 md:translate-x-12'} !min-w-0`}
                    />
                  </Wallet>
                )}
                <div className="wallet-container">
                <Wallet>
                  <ConnectWallet
                    text={t.signUp}
className={`${isConnected 
  ? '!bg-transparent !border-none !shadow-none !p-0 md:translate-x-4'
  : `${currentLanguage === 'pt-BR' ? 'md:-translate-x-8' : ''} ${isMobile 
      ? `bg-[#010065] hover:bg-black !min-w-0 !text-sm ${
          currentLanguage === 'pt-BR' ? '!px-3.5 !py-1.5' : '!px-3.5 !py-1.5'
        }` 
      : 'bg-[#010065] hover:bg-black !px-4 !py-2 !min-w-0 !whitespace-nowrap'
    }`
}`}
                  >
                    {isConnected && (
                      <div className="flex items-center gap-2">
                        {/* Show balance on mobile, navigation menu on desktop */}
                        {isMobile ? (
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setActiveSection('profile');
                            }}
                            className="flex flex-col items-center bg-transparent text-gray-700 font-medium text-xs hover:bg-gray-100 cursor-pointer px-2 py-1 rounded-md transition-colors duration-200 translate-x-4 md:translate-x-0"
                          >
                            <div className="text-xs text-gray-600 font-medium whitespace-nowrap">{t.yourBalance}</div>
                            <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                              {ethBalance.data ? formatBalance(ethBalance.data.value) : '$0.00'}
                            </div>
                          </div>
                        ) : (
                          <div onClick={(e) => e.stopPropagation()} className='md:translate-x-12'>
                            <NavigationMenu
                              activeSection={activeSection}
                              setActiveSection={setActiveSection}
                              onMenuToggle={setIsNavigationMenuOpen}
                              onTriggerWallet={navigateToWallet}
                              currentLanguage={currentLanguage}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </ConnectWallet>
                  {/* Only show WalletDropdown on mobile */}
                  {isMobile && (
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
                  )}
                </Wallet>
                </div>
              </div>
            </div>
          </div>

          </div>

          {/* Market Carousel - show on all sections except coming soon, on its own line */}
          {activeSection !== 'comingsoon' && (
            <div className={`mt-1 md:translate-y-2 pt-1 md:pt-0 `}>
              {/* Markets Container - Show first 13 on desktop, all on mobile */}
              <div className="flex gap-1.5 overflow-x-auto md:overflow-visible scrollbar-hide pb-1"
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
    // If not on home section, navigate to home
    if (activeSection !== 'home') {
      setActiveSection('home');
    }
  }}
  className={`
    flex-shrink-0 flex items-center px-1.5 py-0.5 cursor-pointer whitespace-nowrap
    transition-opacity duration-200
    ${selectedMarket === market.id && activeCarousel === 'first'
      ? 'text-[rgba(0,0,0,0.9)] font-semibold opacity-100'
      : 'text-[rgba(0,0,0,0.9)] font-medium opacity-70 hover:font-semibold hover:opacity-100'
    }
  `}
  style={{
    fontSize: '15.5px',
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
        </div>
        </header>
      )}

      {/* Mobile Search Bar - Below Header - Always show on mobile when home */}
      {!isLandingPageLoading && activeSection !== 'comingsoon' && activeSection === 'home' && (
      <div className="md:hidden bg-white py-4">
        <div className="flex items-center gap-3">
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
            className="w-full pl-10 pr-4 py-2 bg-transparent border border-gray-200 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:bg-white focus:border-[#010065] transition-colors duration-200"
          />
        </div>

        {/* Filter Symbol */}
        <button
          className={`flex items-center justify-center w-10 h-10 bg-transparent rounded-lg transition-colors duration-200 ${
            isFilterDropdownOpen ? 'bg-[#010065] border border-[#010065]' : 'hover:bg-gray-100'
          }`}
          onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
        >
          <svg className={`w-5 h-5 transition-colors duration-200 ${
            isFilterDropdownOpen ? 'text-white' : 'text-black'
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
      </div>
      )}

      {/* Second Carousel - Personalized Labels (Below mobile search bar) */}
      {!isLandingPageLoading && activeSection !== 'comingsoon' && activeSection === 'home' && (
        <section className="relative z-10 md:py-3 bg-white overflow-hidden">
          <div className="">
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
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-black placeholder-gray-500 focus:outline-none focus:bg-white focus:border-2 focus:border-[#010065] transition-colors duration-200"
                  />
                </div>

                {/* Filter Symbol */}
                <div className="relative" data-filter-dropdown>
                  <button
                    onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                    className={`flex items-center justify-center w-9 h-9 bg-white rounded-lg transition-colors duration-200 ${
                      isFilterDropdownOpen ? 'bg-[#010065] border border-[#010065]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <svg className={`w-5 h-5 transition-colors duration-200 ${
                      isFilterDropdownOpen ? 'text-white' : 'text-black'
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
                /* Tournament Filter Carousel */
                <div className="relative flex-1 md:flex-1 min-w-0 overflow-hidden" data-filter-dropdown>
                  {/* Left Arrow for filter carousel */}
                  {showLeftArrowFilter && (
                    <button
                      onClick={scrollLeftFilter}
                      className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-lg rounded-full items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-600" />
                    </button>
                  )}

                  {/* Right Arrow for filter carousel */}
                  {showRightArrowFilter && (
                    <button
                      onClick={scrollRightFilter}
                      className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white shadow-lg rounded-full items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </button>
                  )}

                  <div
                    ref={filterCarouselRef}
                    className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 max-w-full "
                    onScroll={handleScrollFilter}
                    style={{
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      maxWidth: '100%'
                    }}
                  >
                    <button
                      onClick={() => setTournamentFilter('all')}
                      className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        tournamentFilter === 'all'
                          ? 'bg-[#010065] text-white rounded-md'
                          : 'bg-white text-gray-600 hover:text-gray-800 rounded-full'
                      }`}
                    >
                      {t.allTournaments}
                    </button>
                    <button
                      onClick={() => setTournamentFilter('daily')}
                      className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        tournamentFilter === 'daily'
                          ? 'bg-[#010065] text-white rounded-md'
                          : 'bg-white text-gray-600 hover:text-gray-800 rounded-full'
                      }`}
                    >
                      {t.dailyTournaments}
                    </button>
                    <button
                      onClick={() => setTournamentFilter('weekly')}
                      className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        tournamentFilter === 'weekly'
                          ? 'bg-[#010065] text-white rounded-md'
                          : 'bg-white text-gray-600 hover:text-gray-800 rounded-full'
                      }`}
                    >
                      {t.weeklyTournaments}
                    </button>
                    <button
                      onClick={() => setTournamentFilter('recently')}
                      className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                        tournamentFilter === 'recently'
                          ? 'bg-[#010065] text-white rounded-md'
                          : 'bg-white text-gray-600 hover:text-gray-800 rounded-full'
                      }`}
                    >
                      {t.recentlyStarted}
                    </button>
                    <button
                      onClick={() => {/* TODO: Implement trending filter */}}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap bg-white text-gray-600 hover:text-gray-800"
                    >
                      Trending
                    </button>
                    <button
                      onClick={() => {/* TODO: Implement hot filter */}}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap bg-white text-gray-600 hover:text-gray-800"
                    >
                      Hot
                    </button>
                    <button
                      onClick={() => {/* TODO: Implement ending soon filter */}}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap bg-white text-gray-600 hover:text-gray-800"
                    >
                      Ending Soon
                    </button>
                    <button
                      onClick={() => {/* TODO: Implement high prize filter */}}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap bg-white text-gray-600 hover:text-gray-800"
                    >
                      High Prize
                    </button>
                    <button
                      onClick={() => {/* TODO: Implement low entry filter */}}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap bg-white text-gray-600 hover:text-gray-800"
                    >
                      Low Entry
                    </button>
                    <button
                      onClick={() => {/* TODO: Implement new filter */}}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap bg-white text-gray-600 hover:text-gray-800"
                    >
                      New
                    </button>
                    <button
                      onClick={() => {/* TODO: Implement featured filter */}}
                      className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap bg-white text-gray-600 hover:text-gray-800"
                    >
                      Featured
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
                      ? 'text-white bg-[#010065] border border-[#010065] rounded-full'
                      : 'text-black border border-gray-200 rounded-full hover:text-gray-600'
                  }`}
                  style={{
                    fontWeight: ((selectedMarket === 'All' && activeCarousel === 'second') || (selectedMarket === 'Trending' && activeCarousel === 'first')) ? '500' : '500',
                    minWidth: 'fit-content',
                    height: 'auto',
                  }}
                >
                  <span className="text-sm whitespace-nowrap tracking-tight">
                    {t.personalizedForYou || 'For you'}
                  </span>
                </button>

                {shuffledMarkets.filter(market => market.name !== 'Trending').map((market) => (
                  <button
                    key={`personalized-${market.id}`}
                    onClick={() => {
                      setSelectedMarket(market.id);
                      setActiveCarousel('second');
                    }}
                    className={`group flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 transition-all duration-300 ${selectedMarket === market.id && activeCarousel === 'second'
                        ? 'text-white bg-[#010065] border border-[#010065] rounded-full'
                        : 'text-black border border-gray-200 rounded-full hover:bg-[#f2f2f2]'
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
        {activeSection === "receive" && <ReceiveSection activeSection={activeSection} setActiveSection={setActiveSection} currentLanguage={currentLanguage} />}
        {activeSection === "profile" && <ProfilePage activeSection={activeSection} setActiveSection={setActiveSection} currentLanguage={currentLanguage} />}
        {activeSection === "discord" && <HowItWorksSection setActiveSection={setActiveSection} currentLanguage={currentLanguage} />}
        {/* {activeSection === "notifications" && <CreateMessage />} */}
        {activeSection === "potInfo" && <PotInfoPage currentLanguage={currentLanguage} activeSection={activeSection} setActiveSection={setActiveSection} />}
        {activeSection === "emailManagement" && <EmailManagementPage currentLanguage={currentLanguage} setActiveSection={setActiveSection} />}
        {activeSection === "notReadyPage" && <NotReadyPage activeSection={activeSection} setActiveSection={setActiveSection} currentLanguage={currentLanguage} />}
        {activeSection === "bitcoinPot" && <PredictionPotTest activeSection={activeSection} setActiveSection={setActiveSection} currentLanguage={currentLanguage} />}
        {activeSection === "referralProgram" && <ReferralProgram activeSection={activeSection} setActiveSection={setActiveSection} />}
        {activeSection === "home" && <LandingPage activeSection={activeSection} setActiveSection={setActiveSection} isMobileSearchActive={isMobileSearchActive} searchQuery={searchQuery} selectedMarket={selectedMarket} setSelectedMarket={setSelectedMarket} onLoadingChange={handleLoadingChange} currentLanguage={currentLanguage} tournamentFilter={tournamentFilter} onTutorialStateChange={setIsTutorialOpen} onEnteredTournamentsCountChange={setEnteredTournamentsCount} />}
        {activeSection === "makePrediction" && <MakePredicitions activeSection={activeSection} setActiveSection={setActiveSection} currentLanguage={currentLanguage} />}
        {activeSection === "AI" && <GamesHub activeSection={activeSection} setActiveSection={setActiveSection} />}
        {activeSection === "createPot" && <CreatePotPage navigateToPrivatePot={navigateToPrivatePot} />}
        {activeSection === "ideas" && <IdeasPage activeSection={activeSection} setActiveSection={setActiveSection} />}
        {activeSection === "news" && <NewsPage onBack={() => setActiveSection('home')} />}
        {activeSection === "bookmarks" && <BookmarksPage activeSection={activeSection} setActiveSection={setActiveSection} currentLanguage={currentLanguage} />}
        {activeSection === "adminEvidenceReview" && <AdminEvidenceReviewPage activeSection={activeSection} setActiveSection={setActiveSection} currentLanguage={currentLanguage} />}
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
      {!isLandingPageLoading && activeSection !== 'comingsoon' && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white z-40 border-t border-gray-200">
          <div className="flex items-center justify-around py-2 px-1">
            <button
              onClick={(e) => {
                console.log('Mobile HOME button clicked');
                setActiveSection('home');
                setIsMobileSearchActive(false);
              }}
              className={`flex flex-col items-center justify-center min-w-[60px] py-0.5 px-3 transition-all duration-200 ${
                activeSection === 'home'
                  ? 'text-black'
                  : 'text-gray-400 hover:text-gray-600 active:scale-95'
              }`}
            >
              <div className="relative mb-1">
                <svg className={`w-5 h-5 transition-all duration-200 ${
                  (activeSection === 'home' || activeSection === 'bitcoinPot' || activeSection === 'notReadyPage')
                    ? 'text-black'
                    : 'text-gray-400'
                }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9,22 9,12 15,12 15,22"></polyline>
                </svg>
              </div>
              <span className={`text-xs transition-all duration-200 ${
                (activeSection === 'home' || activeSection === 'bitcoinPot' || activeSection === 'notReadyPage')
                  ? 'font-black text-black'
                  : 'font-medium text-gray-400'
              }`}>
                {t.bottomNavHome}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('receive')}
              className={`flex flex-col items-center justify-center min-w-[60px] py-0.5 px-3 transition-all duration-200 ${
                activeSection === 'receive'
                  ? 'text-black'
                  : 'text-gray-400 hover:text-gray-600 active:scale-95'
              }`}
            >
              <div className="relative mb-1">
                <svg className={`w-5 h-5 transition-all duration-200 ${
                  activeSection === 'receive'
                    ? 'text-black'
                    : 'text-gray-400'
                }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                </svg>
              </div>
              <span className={`text-xs transition-all duration-200 ${
                activeSection === 'receive'
                  ? 'font-black text-black'
                  : 'font-medium text-gray-400'
              }`}>
                {t.depositButton || 'Deposit'}
              </span>
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Mobile my markets button clicked - should navigate to bookmarks');
                setActiveSection('bookmarks');
              }}
              className={`flex flex-col items-center justify-center min-w-[60px] py-0.5 px-3 transition-all duration-200 ${
                activeSection === 'bookmarks'
                  ? 'text-black'
                  : 'text-gray-400 hover:text-gray-600 active:scale-95'
              }`}
            >
              <div className="relative mb-1">
                <svg className={`w-5 h-5 transition-all duration-200 ${
                  (activeSection === 'bookmarks' || activeSection === 'makePrediction' || activeSection === 'privatePot' || activeSection === 'createPot' || activeSection === 'profile')
                    ? 'text-black'
                    : 'text-gray-400'
                }`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                  <path d="M4 22h16"></path>
                  <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
                  <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
                  <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                </svg>
                {isConnected && enteredTournamentsCount > 0 && (
                  <div className="absolute -top-2 -right-3 w-4 h-4 bg-[#2a2a2a] rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">{enteredTournamentsCount}</span>
                  </div>
                )}
              </div>
              <span className={`text-xs transition-all duration-200 truncate max-w-[80px] ${
                (activeSection === 'bookmarks' || activeSection === 'makePrediction' || activeSection === 'privatePot' || activeSection === 'createPot' || activeSection === 'profile')
                  ? 'font-black text-black'
                  : 'font-medium text-gray-400'
              }`}>
                {t.bottomNavMyPots}
              </span>
            </button>

            <div className="flex flex-col items-center justify-center min-w-[60px] py-0.5 px-3">
              <div className="relative mb-1">
                <div className="flex items-center justify-center w-5 h-5">
                  <NavigationMenu
                    activeSection={activeSection}
                    setActiveSection={setActiveSection}
                    onMenuToggle={setIsNavigationMenuOpen}
                    onTriggerWallet={navigateToWallet}
                    currentLanguage={currentLanguage}
                  />
                </div>
              </div>
              <span className="text-xs font-medium text-gray-400">More</span>
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