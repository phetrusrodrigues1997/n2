'use client';

import React, { useState, useMemo } from 'react';
import { Mail, AlertCircle, Check } from 'lucide-react';

interface EmailInputProps {
  email: string;
  onChange: (email: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const EmailInput: React.FC<EmailInputProps> = ({
  email,
  onChange,
  onSubmit,
  placeholder = "Enter your email address",
  disabled = false,
  className = ""
}) => {
  const [isFocused, setIsFocused] = useState(false);

  // Email validation
  const emailValidation = useMemo(() => {
    if (!email.trim()) {
      return { isValid: false, error: null };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(email.trim());

    return {
      isValid,
      error: isValid ? null : 'Please enter a valid email address'
    };
  }, [email]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled && emailValidation.isValid) {
      onSubmit();
    }
  };

  const handleChange = (value: string) => {
    onChange(value);
  };

  const getBorderColor = () => {
    if (disabled) return 'border-gray-200';
    if (!email.trim()) return 'border-gray-200 focus:border-purple-500';
    if (emailValidation.isValid) return 'border-green-300 focus:border-green-500';
    return 'border-red-300 focus:border-red-500';
  };

  const getRingColor = () => {
    if (disabled) return 'focus:ring-purple-100';
    if (!email.trim() || emailValidation.isValid) return 'focus:ring-purple-100';
    return 'focus:ring-red-100';
  };

  const getIconColor = () => {
    if (disabled) return 'text-gray-400';
    if (!email.trim()) return 'text-gray-400';
    if (emailValidation.isValid) return 'text-green-500';
    return 'text-red-500';
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Email Input */}
      <div className="relative">
        <input
          type="email"
          value={email}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-6 py-3 md:px-7 md:py-5 pr-12
                     text-lg bg-gray-50/80 border-2 ${getBorderColor()} rounded-2xl
                     focus:bg-white focus:ring-4 ${getRingColor()} focus:outline-none
                     transition-all duration-300 ease-out placeholder-gray-400 font-normal
                     tracking-normal text-center hover:border-gray-300 hover:bg-white
                     hover:shadow-sm focus:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed`}
          onKeyPress={handleKeyPress}
        />

        {/* Icon */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
          {email.trim() ? (
            emailValidation.isValid ? (
              <Check className={`w-5 h-5 ${getIconColor()}`} />
            ) : (
              <AlertCircle className={`w-5 h-5 ${getIconColor()}`} />
            )
          ) : (
            <Mail className={`w-5 h-5 ${getIconColor()}`} />
          )}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
      </div>

      {/* Error message */}
      {email.trim() && emailValidation.error && (isFocused || email.length > 5) && (
        <div className="mt-2 text-sm text-red-600 text-center animate-fade-in">
          {emailValidation.error}
        </div>
      )}

      {/* Success message */}
      {email.trim() && emailValidation.isValid && (
        <div className="mt-2 text-sm text-green-600 text-center animate-fade-in">
          Valid email address ✓
        </div>
      )}

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

export default EmailInput;