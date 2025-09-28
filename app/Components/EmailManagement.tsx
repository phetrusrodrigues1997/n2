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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[70vh] flex items-center justify-center px-4 md:px-8">
      <div className="relative max-w-xl mx-auto w-full">
        {/* Top Navigation Bar */}
        <div className="mb-6 flex justify-between items-center">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors duration-200 font-medium text-sm bg-white hover:bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:border-gray-300"
            >
              <span>←</span>
              <span>{t.back}</span>
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 transition-colors duration-200 font-medium text-sm"
            >
              Close
            </button>
          )}
        </div>

        {/* Clean Container */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 md:p-10">
          {/* Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-normal text-gray-900 tracking-tight">
              {currentUserEmail && !isEditingEmail ? t.yourEmail : t.updateEmailTitle || 'Update Email'}
            </h1>
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
          {(!currentUserEmail || isEditingEmail) && (
            <div className="space-y-6">
              <EmailInput
                email={email}
                onChange={setEmail}
                onSubmit={handleEmailSubmit}
                placeholder={isEditingEmail ? t.updateEmailAddress : t.enterEmailAddress}
                disabled={emailSubmitting || success}
              />

              {/* Message Area - Fixed height to prevent layout shift */}
              <div className="min-h-[2rem] flex items-center justify-center">
                {error && (
                  <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-red-700 text-sm text-center">{error}</p>
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
                  className="bg-black hover:bg-gray-800 disabled:bg-gray-300
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