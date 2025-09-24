'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getUserEmail, saveUserEmail } from '../Database/actions';
import { Language, getTranslation } from '../Languages/languages';
import EmailInput from './shared/EmailInput';

interface EmailManagementProps {
  currentLanguage?: Language;
  onClose?: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
}

const EmailManagement: React.FC<EmailManagementProps> = ({
  currentLanguage = 'en',
  onClose,
  onBack,
  showBackButton = false
}) => {
  const [email, setEmail] = useState<string>('');
  const [emailSubmitting, setEmailSubmitting] = useState<boolean>(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const { address, isConnected } = useAccount();
  const t = getTranslation(currentLanguage);

  // Load user's current email
  useEffect(() => {
    const loadUserEmail = async () => {
      if (isConnected && address) {
        setIsLoadingEmail(true);
        try {
          const userEmailData = await getUserEmail(address);
          if (userEmailData?.email) {
            setCurrentUserEmail(userEmailData.email);
            setEmail(userEmailData.email);
          }
        } catch (error) {
          console.error('Error loading user email:', error);
        }
        setIsLoadingEmail(false);
      }
    };

    loadUserEmail();
  }, [address, isConnected]);

  // Handle email submission
  const handleEmailSubmit = async () => {
    if (!email.trim() || !address) return;

    // Clear previous states
    setError('');
    setSuccess(false);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setEmailSubmitting(true);
    try {
      const result = await saveUserEmail(address, email.trim());
      if (result.success) {
        setSuccess(true);
        setError(''); // Clear any previous errors
        setCurrentUserEmail(email.trim());
        setIsEditingEmail(false);
        // Show success message briefly before closing
        setTimeout(() => {
          if (onClose) {
            onClose();
          }
        }, 2000);
      } else {
        setError(result.error || 'Failed to save email. Please try again.');
        setSuccess(false);
      }
    } catch (error) {
      console.error('Error saving email:', error);
      setError('Network error. Please check your connection and try again.');
      setSuccess(false);
    } finally {
      setEmailSubmitting(false);
    }
  };

  // Handle cancel editing
  const handleCancelEdit = () => {
    setIsEditingEmail(false);
    setEmail(currentUserEmail); // Reset to original email
    setError(''); // Clear any errors
    setSuccess(false);
  };

  // Show loading state
  if (isLoadingEmail) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[70vh] flex items-center justify-center px-4 md:px-8">
      <div className="relative max-w-xl mx-auto w-full animate-fade-in-up opacity-0" style={{
        animation: 'fadeInUp 0.6s ease-out 0.1s forwards'
      }}>
        {/* Top Navigation Bar */}
        <div className="mb-6 flex justify-between items-center">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors duration-200 font-medium text-sm tracking-wide bg-white hover:bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:border-purple-300"
            >
              <span>←</span>
              <span>{t.back}</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="text-purple-600 hover:text-gray-700 transition-colors duration-200 font-light text-sm tracking-wide"
            >
              {t.close || 'Close'}
            </button>
          )}
        </div>

        {/* Modern Sleek Container */}
        <div className="bg-white rounded-3xl border border-gray-200/60 shadow-lg p-10 md:p-12">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-6 flex-nowrap">
              <h1 className="text-2xl md:text-4xl font-light text-gray-900 tracking-tight flex-shrink-0">
                {currentUserEmail && !isEditingEmail ? t.yourEmail : t.updateEmailTitle || 'Update Email'}📩
              </h1>
            </div>

            {/* Show current email if exists and not editing */}
            {currentUserEmail && !isEditingEmail && (
              <div className="mb-6">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4">
                  <p className="text-green-800 font-medium">{currentUserEmail}</p>
                </div>
                <p className="text-sm text-gray-500 mb-4">{t.emailNotificationMessage}</p>
              </div>
            )}
          </div>

          {/* Input Section - Show when no email or editing */}
          {(!currentUserEmail || isEditingEmail) && (
            <div className="space-y-8">
              <EmailInput
                email={email}
                onChange={setEmail}
                onSubmit={handleEmailSubmit}
                placeholder={isEditingEmail ? t.updateEmailAddress : t.enterEmailAddress}
                disabled={emailSubmitting || success}
              />

              {/* Message Area - Fixed height to prevent layout shift */}
              <div className="min-h-[3rem] flex items-center justify-center">
                {error && (
                  <div className="w-full bg-red-50 border border-red-200 rounded-xl p-3 animate-fade-in">
                    <p className="text-red-700 text-sm text-center">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="w-full bg-green-50 border border-green-200 rounded-xl p-3 animate-fade-in">
                    <p className="text-green-700 text-sm text-center">✓ Email updated successfully!</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-center space-y-5">
                <button
                  onClick={handleEmailSubmit}
                  disabled={emailSubmitting || !email.trim()}
                  className="w-48 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800
                             disabled:bg-black disabled:from-black disabled:to-black disabled:text-white
                             text-white font-medium py-4 px-8 rounded-2xl
                             transition-all duration-300 text-lg disabled:cursor-not-allowed transform hover:scale-[1.02]
                             active:scale-[0.98] tracking-wide shadow-lg hover:shadow-xl
                             disabled:opacity-100 disabled:shadow-lg"
                >
                  {emailSubmitting ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      {t.updating}
                    </span>
                  ) : (
                    isEditingEmail ? t.updateEmail : t.saveEmail || 'Save Email'
                  )}
                </button>

                {/* Cancel button for editing */}
                {isEditingEmail && (
                  <button
                    onClick={handleCancelEdit}
                    className="w-full text-gray-500 hover:text-gray-700 font-light py-3 px-6 transition-all duration-200 text-base tracking-wide"
                  >
                    {t.cancel}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action buttons when email exists and not editing */}
          {currentUserEmail && !isEditingEmail && (
            <div className="flex flex-col items-center space-y-5">
              <button
                onClick={() => setIsEditingEmail(true)}
                className="w-48 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800
                           text-white font-medium py-4 px-8 rounded-2xl
                           transition-all duration-300 text-lg transform hover:scale-[1.02]
                           active:scale-[0.98] tracking-wide shadow-lg hover:shadow-xl"
              >
                {t.changeEmail}
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="w-full text-purple-600 hover:text-gray-700 font-light py-3 px-6 transition-all duration-200 text-base tracking-wide"
                >
                  {t.continueToTutorial || 'Continue'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Enhanced CSS for animations */}
        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(40px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }
        `}</style>
      </div>
    </div>
  );
};

export default EmailManagement;