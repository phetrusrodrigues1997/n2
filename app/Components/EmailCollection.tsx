'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { getUserEmail, saveUserEmail } from '../Database/actions';
import { Language, getTranslation } from '../Languages/languages';
import EmailInput from './shared/EmailInput';

interface EmailCollectionProps {
  currentLanguage?: Language;
  onComplete: (hasEmail: boolean) => void;
  onSkip: () => void;
}

const EmailCollection: React.FC<EmailCollectionProps> = ({
  currentLanguage = 'en',
  onComplete,
  onSkip
}) => {
  const [email, setEmail] = useState<string>('');
  const [emailSubmitting, setEmailSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const { address, isConnected } = useAccount();
  const t = getTranslation(currentLanguage);

  // Handle email submission
  const handleEmailSubmit = async () => {
    if (!email.trim() || !address) return;

    // Clear previous errors
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
        // Add a small delay to show success state
        setTimeout(() => {
          onComplete(true);
        }, 1000);
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

  // Handle skip email
  const handleSkipEmail = () => {
    onSkip();
  };

  return (
    <div className="w-full max-w-md mx-auto px-6 py-8">
      {/* Header Section - Polymarket Style */}
      <div className="text-center mb-8">
        <h3 className="text-2xl font-medium text-gray-900 mb-4">
          {t.readyToPlay?.replace('📩', '') || 'Ready to Play?'}
        </h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          {t.emailNotificationMessage}
        </p>
      </div>

      {/* Email Input Section - Clean Layout */}
      <div className="space-y-6">
        <EmailInput
          email={email}
          onChange={setEmail}
          onSubmit={handleEmailSubmit}
          placeholder={t.enterEmailAddress}
          disabled={emailSubmitting || success}
        />

        {/* Message Area - Clean Alerts */}
        <div className="min-h-[2rem] flex items-center justify-center">
          {error && (
            <div className="w-full bg-red-50 border border-red-200 rounded-lg p-3 animate-fade-in">
              <p className="text-red-700 text-sm text-center">{error}</p>
            </div>
          )}
          {success && (
            <div className="w-full bg-green-50 border border-green-200 rounded-lg p-3 animate-fade-in">
              <p className="text-green-700 text-sm text-center">✓ Email saved successfully!</p>
            </div>
          )}
        </div>

        {/* Action Buttons - Polymarket Style */}
        <div className="space-y-3">
          <button
            onClick={handleEmailSubmit}
            disabled={emailSubmitting || !email.trim()}
            className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400
                       text-white font-medium py-3 px-6 rounded-lg
                       transition-colors duration-200 disabled:cursor-not-allowed"
          >
            {emailSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                {t.joining}
              </span>
            ) : (
              t.joinCommunity
            )}
          </button>

          <button
            onClick={handleSkipEmail}
            className="w-full text-gray-500 hover:text-gray-700 font-medium py-3 px-6 transition-colors duration-200 text-sm"
          >
            {t.skipForNow}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default EmailCollection;