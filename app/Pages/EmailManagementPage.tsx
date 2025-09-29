'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getUserEmail } from '../Database/actions';
import { Language } from '../Languages/languages';
import EmailManagement from '../Components/EmailManagement';

interface EmailManagementPageProps {
  currentLanguage?: Language;
  setActiveSection: (section: string) => void;
}

const EmailManagementPage: React.FC<EmailManagementPageProps> = ({
  currentLanguage = 'en',
  setActiveSection
}) => {
  const [showModal, setShowModal] = useState(false);
  const [hasEmail, setHasEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { address, isConnected } = useAccount();

  // Check if user has email when page loads
  useEffect(() => {
    const checkEmail = async () => {
      if (isConnected && address) {
        console.log('🔍 EmailManagementPage: Checking if user has email...');
        setIsLoading(true);
        try {
          const userEmailData = await getUserEmail(address);
          console.log('🔍 EmailManagementPage: Email check result:', userEmailData);

          if (!userEmailData?.email) {
            console.log('⚠️ EmailManagementPage: No email found, showing modal');
            setHasEmail(false);
            setShowModal(true);
          } else {
            console.log('✅ EmailManagementPage: User has email, showing management page');
            setHasEmail(true);
            setShowModal(false);
          }
        } catch (error) {
          console.error('❌ EmailManagementPage: Error checking email:', error);
        }
        setIsLoading(false);
      }
    };

    checkEmail();
  }, [address, isConnected]);

  const handleCloseModal = () => {
    setShowModal(false);
    setActiveSection('profile');
  };

  const handleEmailSaved = () => {
    setHasEmail(true);
    setShowModal(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-8">
      {/* Show modal if user has no email */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4">
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <EmailManagement
              currentLanguage={currentLanguage}
              onClose={handleEmailSaved}
              showBackButton={false}
              isInitialCollection={true}
            />
          </div>
        </div>
      )}

      {/* Show full page email management if user has email */}
      {hasEmail && !showModal && (
        <EmailManagement
          currentLanguage={currentLanguage}
          onClose={() => setActiveSection('profile')}
          onBack={() => setActiveSection('profile')}
          showBackButton={true}
        />
      )}
    </div>
  );
};

export default EmailManagementPage;