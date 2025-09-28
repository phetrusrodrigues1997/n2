'use client';

import React, { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import Cookies from 'js-cookie';
import { useAccount } from 'wagmi';
import { Language, getTranslation } from '../Languages/languages';
import { useContractData } from '../hooks/useContractData';
import EmailManagement from '../Components/EmailManagement';

interface DashboardProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  selectedMarket?: string;
  currentLanguage?: Language;
  showEmailManagement?: boolean;
}


const Dashboard = ({ activeSection, setActiveSection, selectedMarket, currentLanguage = 'en', showEmailManagement }: DashboardProps) => {
  // Email management state
  const [showEmailUI, setShowEmailUI] = useState<boolean>(false);


  const { address, isConnected } = useAccount();



  // Get translations
  const t = getTranslation(currentLanguage);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Handle routing - redirect to home if not managing email
  useEffect(() => {
    // If not doing email management and connected, redirect to home
    if (!showEmailManagement && isConnected) {
      console.log('🔄 TutorialBridge: Not managing email, redirecting to home');
      // Small delay to prevent immediate redirect flash
      setTimeout(() => {
        setActiveSection('home');
      }, 500);
    }
  }, [showEmailManagement, isConnected, setActiveSection]);

  // Show email management UI when requested from props
  useEffect(() => {
    if (showEmailManagement && isConnected) {
      console.log('🔧 Email management requested - showing email UI');
      setShowEmailUI(true);
    }
  }, [showEmailManagement, isConnected]);






  return (
    <div className="min-h-screen bg-white text-black w-full overflow-x-hidden">
      <div className="w-full mx-auto p-6">
        <div className="flex items-start justify-center pt-4 md:pt-8 min-h-screen">
          <div className="text-center w-full max-w-4xl">

            {/* Email Management UI */}
            {showEmailUI && isConnected && (
              <EmailManagement
                currentLanguage={currentLanguage}
                onClose={() => setActiveSection('profile')}
                onBack={() => setActiveSection('profile')}
                showBackButton={true}
              />
            )}

            {/* Connect Wallet UI - Show when wallet is not connected */}
            {!isConnected && (
              <div>
                <div className="w-full min-h-[70vh] flex items-center justify-center px-4 md:px-8">
                  <div className="relative max-w-lg mx-auto w-full">
                    {/* Clean Connect Wallet Container */}
                    <div className="bg-white border border-gray-200 rounded-xl p-8 md:p-10 text-center">
                      {/* Header Section */}
                      <div className="mb-8">
                        <h1 className="text-2xl md:text-3xl font-normal text-gray-900 mb-4 tracking-tight">
                          {t.connectWallet}
                        </h1>
                      </div>

                      {/* Instruction Text */}
                      <div className="mb-8">
                        <p className="text-gray-600 text-base leading-relaxed max-w-md mx-auto">
                          {t.clickSignInButton.split('Sign In').map((part, index) =>
                            index === 0 ? part :
                            <>
                              <span className="font-medium text-gray-900">Sign In</span>
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

            {/* Redirect Message - Show when connected and not managing email */}
            {!showEmailUI && isConnected && (
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300 mx-auto mb-4"></div>
                  <p className="text-base text-gray-600">
                    {currentLanguage === 'pt-BR' ? 'Redirecionando...' : 'Redirecting...'}
                  </p>
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