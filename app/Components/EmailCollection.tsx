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
    <div className="text-center space-y-6">
      <h3 className="text-2xl font-medium text-gray-900">
        {t.readyToPlay?.replace('📩', '') || 'Ready to Play?'}
      </h3>
      <p className="text-gray-600 leading-relaxed text-base max-w-md mx-auto">
        {t.emailNotificationMessage}
      </p>

      <div className="space-y-4 max-w-sm mx-auto">
        <EmailInput
          email={email}
          onChange={setEmail}
          onSubmit={handleEmailSubmit}
          placeholder={t.enterEmailAddress}
          disabled={emailSubmitting || success}
        />

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}
        {success && (
          <p className="text-green-600 text-sm">✓ Email saved successfully!</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleEmailSubmit}
            disabled={emailSubmitting || !email.trim()}
            className="flex-1 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300
                       text-white font-medium py-2.5 px-4 rounded-lg
                       transition-all duration-200 disabled:cursor-not-allowed text-sm
                       shadow-sm hover:shadow-md disabled:shadow-none"
          >
            {emailSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                {t.joining}
              </span>
            ) : (
              t.joinCommunity
            )}
          </button>

          <button
            onClick={handleSkipEmail}
            className="flex-1 text-gray-600 hover:text-gray-800 font-medium py-2.5 px-4
                       transition-all duration-200 text-sm border border-gray-200 rounded-lg
                       hover:bg-gray-50 hover:border-gray-300 bg-white"
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