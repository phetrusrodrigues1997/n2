import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X, Wallet, Gamepad2, User } from 'lucide-react';
import { useAccount, useDisconnect } from 'wagmi';
import { FaDiscord } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { getTranslation, Language, supportedLanguages } from '../Languages/languages';

interface NavigationMenuProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  onMenuToggle?: (isOpen: boolean) => void;
  onTriggerWallet?: () => void;
  currentLanguage?: Language;
}

const NavigationMenu = ({ activeSection, setActiveSection, onMenuToggle, onTriggerWallet, currentLanguage = 'en' }: NavigationMenuProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  
  // Get translations
  const t = getTranslation(currentLanguage);

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

  // Notify parent when menu state changes
  useEffect(() => {
    if (onMenuToggle) {
      onMenuToggle(isMenuOpen);
    }
  }, [isMenuOpen, onMenuToggle]);

  // Menu items - testing translations one by one
  const mobileMenuItems = [
    { id: 'home', label: t.home || 'Home' },
    { id: 'createPot', label: t.privateMarkets || 'Private Pots' },
    { id: 'receive', label: t.fundAccount || 'Fund Account' },
    { id: 'profile', label: t.statsRankings || 'Stats & Rankings' },
    { id: 'AI', label: t.games || 'Games' },
    { id: 'discord', label: t.howItWorksTitle || 'How It Works' },
    { id: 'ideas', label: t.ideas || 'Ideas' },
  ];

  const desktopMenuItems = [
    { id: 'home', label: t.home || 'Home' },
    { id: 'createPot', label: t.privateMarkets || 'Private Pots' },
    { id: 'liveMarkets', label: t.liveMarkets || 'Live Markets' },
    { id: 'news', label: 'News' },
    { id: 'bookmarks', label: t.myTournaments || 'My Pots' },
    { id: 'ideas', label: t.ideas || 'Ideas' },
  ];

  return (
    <nav className="relative">
      {/* Hamburger menu button - now shown on both desktop and mobile */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsMenuOpen(!isMenuOpen);
        }}
        className="py-2 rounded-lg"
        aria-label="Toggle menu"
      >
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Menu dropdown/overlay - different styles for mobile and desktop */}
      {isMenuOpen && (
        <>
          {isMobile ? (
            createPortal(
              <>
                {/* Backdrop to prevent clicks on background elements */}
                <div
                  className="fixed inset-0 bg-black bg-opacity-50 z-[200]"
                  onClick={() => setIsMenuOpen(false)}
                  style={{ touchAction: 'none' }}
                />
                {/* Mobile overlay */}
                <div
                  id="mobile-menu-overlay"
                  className="fixed top-0 left-0 w-4/5 h-full bg-white z-[250] flex flex-col shadow-lg"
                onClick={(e) => e.stopPropagation()}
                style={{
                  transform: 'translateX(0)',
                  transition: 'transform 0.3s ease-in-out'
                }}
              >
              {/* Header with close button */}
              <div className="flex justify-end p-4">
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-lg"
                  aria-label="Close menu"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Language dropdown positioned absolutely to not affect menu layout */}
              <div className="absolute top-4 right-6 z-10">
                <div className="relative">
                  <button
                    onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 font-semibold rounded-md hover:bg-[#f4f4f4] hover:text-white transition-colors border border-gray-200"
                  >
                    <img
                      src={supportedLanguages.find(lang => lang.code === currentLanguage)?.flag}
                      alt="Current language"
                      className=" object-cover rounded w-6 h-4"
                    />
                    <span className="text-sm font-medium">
                      {supportedLanguages.find(lang => lang.code === currentLanguage)?.name}
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-600 hover:text-white transition-transform duration-200 ${
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
                  {isLanguageDropdownOpen && (
                    <div className="absolute top-full right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                      {supportedLanguages.map((language) => (
                        <button
                          key={language.code}
                          onClick={() => {
                            const event = new CustomEvent('changeLanguage', { detail: language.code });
                            window.dispatchEvent(event);
                            setIsLanguageDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                            currentLanguage === language.code ? 'bg-white text-[#D00048]' : 'text-gray-700'
                          }`}
                        >
                          <img
                            src={language.flag}
                            alt={`${language.name} flag`}
                            className="w-4 h-3 object-cover rounded"
                          />
                          <span className="text-sm">{language.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Menu items */}
              <div className="flex flex-col justify-start px-6 -mt-16">
                {mobileMenuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveSection(item.id);
                      setIsMenuOpen(false);
                    }}
                    className={`block w-full text-left py-4 text-lg ${
                      activeSection === item.id
                        ? 'text-[#000070] font-medium'
                        : 'text-black hover:text-[#000070]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                
                {/* Wallet option - only show on mobile when wallet is connected */}
                {isConnected && (
                  <button
                    onClick={() => {
                      if (onTriggerWallet) {
                        onTriggerWallet();
                      }
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left py-4 text-lg text-[#D00048] hover:text-[#D00048] border-t border-gray-100 mt-2"
                  >
                    {t.wallet || "Wallet"}
                  </button>
                )}
                
                {/* Log out option - only show on mobile when wallet is connected */}
                {isConnected && (
                  <button
                    onClick={() => {
                      disconnect();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left py-4 text-lg text-[#D00048] hover:text-[#D00048] border-t border-gray-100 mt-2"
                  >
                    {t.logOut || "Log out"}
                  </button>
                )}
              </div>
              
              {/* Social media buttons */}
              <div className="px-4 py-6 border-t border-gray-100 mt-auto">
                <div className="flex flex-col space-y-3">
                  <a
                    href="https://discord.gg/8H9Hxc4Y"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-[#5865F2] text-white rounded-lg hover:bg-[#4752C4] transition-colors text-sm"
                  >
                    <FaDiscord size={16} />
                    <span>{t.discordSupportNav || "Discord Support"}</span>
                  </a>
                  <a
                    href="https://x.com/Prediwin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
                  >
                    <FaXTwitter size={16} />
                    <span>{t.followOnXNav || "Follow on X"}</span>
                  </a>
                </div>
              </div>
            </div>
            </>,
            document.body
            )
          ) : (
            // Desktop dropdown with portal
            createPortal(
              <div className="fixed bg-white top-12 z-[60] w-64 mt-2 rounded-lg shadow-xl right-4 border border-gray-200">
                {/* Header section with icon shortcuts */}
                <div className="border-b border-gray-100 p-4">
                  <div className="flex items-center justify-around">
                    {/* Deposit Icon */}
                    <button
                      onClick={() => {
                        setActiveSection('receive');
                        setIsMenuOpen(false);
                      }}
                      className="flex flex-col items-center gap-1 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Wallet className="w-6 h-6 text-gray-700" />
                      <span className="text-xs text-gray-600 font-medium">Deposit</span>
                    </button>

                    {/* Games Icon */}
                    <button
                      onClick={() => {
                        setActiveSection('AI');
                        setIsMenuOpen(false);
                      }}
                      className="flex flex-col items-center gap-1 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Gamepad2 className="w-6 h-6 text-gray-700" />
                      <span className="text-xs text-gray-600 font-medium">Games</span>
                    </button>

                    {/* Profile Icon */}
                    <button
                      onClick={() => {
                        setActiveSection('profile');
                        setIsMenuOpen(false);
                      }}
                      className="flex flex-col items-center gap-1 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <User className="w-6 h-6 text-gray-700" />
                      <span className="text-xs text-gray-600 font-medium">Profile</span>
                    </button>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-2">
                  {desktopMenuItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveSection(item.id);
                        setIsMenuOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 ${
                        activeSection === item.id
                          ? 'bg-gray-100 text-[#000070]'
                          : 'text-black hover:bg-gray-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}

                  {/* Wallet and Logout options for desktop when connected */}
                  {isConnected && (
                    <>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={() => {
                          if (onTriggerWallet) {
                            onTriggerWallet();
                          }
                          setIsMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-[#D00048] hover:bg-gray-50 hover:text-[#D00048]"
                      >
                        {t.wallet || "Wallet"}
                      </button>
                      <button
                        onClick={() => {
                          disconnect();
                          setIsMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-[#D00048] hover:bg-gray-50 hover:text-[#D00048]"
                      >
                        {t.logOut || "Log out"}
                      </button>
                    </>
                  )}
                </div>
              </div>,
              document.body
            )
          )}
        </>
      )}
    </nav>
  );
};

export default NavigationMenu;