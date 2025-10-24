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
  isInitialCollection?: boolean; // True when collecting email for first time
}

const EmailManagement: React.FC<EmailManagementProps> = ({
  currentLanguage = 'en',
  onClose,
  onBack,
  showBackButton = false,
  isInitialCollection = false
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
        console.log('🔍 EmailManagement: Loading email for address:', address);
        setIsLoadingEmail(true);
        try {
          const userEmailData = await getUserEmail(address);
          console.log('🔍 EmailManagement: getUserEmail returned:', userEmailData);
          if (userEmailData?.email) {
            console.log('✅ EmailManagement: Setting email to:', userEmailData.email);
            setCurrentUserEmail(userEmailData.email);
            setEmail(userEmailData.email);
          } else {
            console.log('⚠️ EmailManagement: No email found for user');
          }
        } catch (error) {
          console.error('❌ EmailManagement: Error loading user email:', error);
        }
        setIsLoadingEmail(false);
      } else {
        console.log('⚠️ EmailManagement: Not loading email - isConnected:', isConnected, 'address:', address);
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
    console.log('🔄 EmailManagement: Rendering loading state');
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  console.log('🎨 EmailManagement: Rendering main view - currentUserEmail:', currentUserEmail, 'isEditingEmail:', isEditingEmail);

  return (
    <div className="w-full">
      <div className="relative max-w-xl mx-auto w-full">
        {/* Clean Container */}
        <div className="bg-white rounded-xl p-8 md:p-10">
          {/* Header Section */}
          <div className="text-center mb-8">
            {isInitialCollection ? (
              <>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 tracking-tight mb-3">
                  Get Notified!
                </h1>
                <p className="text-base text-gray-600 max-w-md mx-auto">
                  Get notified when your favourite tournaments begin.
                </p>
              </>
            ) : (
              <h1 className="text-2xl md:text-3xl font-normal text-gray-900 tracking-tight">
                {currentUserEmail && !isEditingEmail
                  ? t.updateEmailAddress || 'Update Your Email Address'
                  : currentUserEmail && isEditingEmail
                    ? t.updateEmailTitle || 'Update Email'
                    : t.manageEmail || 'Enter Your Email'}
              </h1>
            )}
          </div>

          {/* Show current email if exists and not editing */}
          {currentUserEmail && !isEditingEmail && (
            <div className="mb-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <p className="text-gray-900 font-medium">{currentUserEmail}</p>
              </div>
              <p className="text-sm text-gray-600 mb-4">{t.emailNotificationMessage}</p>
            </div>
          )}

          {/* Input Section - Show when no email or editing */}
          {(() => {
            const shouldShowInput = !currentUserEmail || isEditingEmail;
            console.log('🎨 EmailManagement: Should show input?', shouldShowInput, '- currentUserEmail:', currentUserEmail, 'isEditingEmail:', isEditingEmail);
            return shouldShowInput;
          })() && (
            <div className="space-y-6">
              <EmailInput
                email={email}
                onChange={setEmail}
                onSubmit={handleEmailSubmit}
                placeholder={
                  isInitialCollection
                    ? t.yourEmail
                    : isEditingEmail
                      ? t.updateEmailAddress
                      : t.enterEmailAddress
                }
                disabled={emailSubmitting || success}
              />

              {/* Message Area - Fixed height to prevent layout shift */}
              <div className="min-h-[2rem] flex items-center justify-center">
                {error && (
                  <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-[#D00048] text-sm text-center">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="w-full bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-700 text-sm text-center">✓ Email updated successfully!</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col items-center space-y-4">
                <button
                  onClick={handleEmailSubmit}
                  disabled={emailSubmitting || !email.trim()}
                  className="bg-black hover:bg-gray-800 disabled:bg-red-300
                             text-white font-medium py-3 px-6 rounded-lg
                             transition-colors duration-200 disabled:cursor-not-allowed"
                >
                  {emailSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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
                    className="text-gray-500 hover:text-gray-700 font-medium py-2 px-4 transition-colors duration-200"
                  >
                    {t.cancel}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Action buttons when email exists and not editing */}
          {currentUserEmail && !isEditingEmail && (
            <div className="flex flex-col items-center space-y-4">
              <button
                onClick={() => setIsEditingEmail(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 px-6 rounded-lg
                           transition-colors duration-200"
              >
                {t.changeEmail}
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 font-medium py-2 px-4 transition-colors duration-200"
                >
                  Close
                </button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default EmailManagement;