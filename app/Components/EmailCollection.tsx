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
    <div className="w-full max-w-lg mx-auto px-4 py-6">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h3 className="text-2xl md:text-3xl font-light text-gray-900 tracking-tight mb-4">
          {t.readyToPlay}📩
        </h3>
        <p className="text-gray-600 text-base leading-relaxed font-light">
          {t.emailNotificationMessage}
        </p>
      </div>

      {/* Email Input Section */}
      <div className="space-y-6">
        <EmailInput
          email={email}
          onChange={setEmail}
          onSubmit={handleEmailSubmit}
          placeholder={t.enterEmailAddress}
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
              <p className="text-green-700 text-sm text-center">✓ Email saved successfully!</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={handleEmailSubmit}
            disabled={emailSubmitting || !email.trim()}
            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800
                       disabled:bg-black disabled:from-black disabled:to-black disabled:text-white
                       text-white font-medium py-4 px-8 rounded-2xl
                       transition-all duration-300 text-lg disabled:cursor-not-allowed transform hover:scale-[1.02]
                       active:scale-[0.98] tracking-wide shadow-lg hover:shadow-xl
                       disabled:opacity-100 disabled:shadow-lg"
          >
            {emailSubmitting ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                {t.joining}
              </span>
            ) : (
              t.joinCommunity
            )}
          </button>

          <button
            onClick={handleSkipEmail}
            className="w-full text-purple-600 hover:text-gray-700 font-light py-3 px-6 transition-all duration-200 text-base tracking-wide"
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