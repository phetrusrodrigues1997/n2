import { useState, useEffect } from 'react';
import { getTimeUntilMidnight, getFormattedTimerForContract } from '../Database/config';

// Updated hook that accepts contract address for penalty-exempt logic
export const useCountdownTimer = (contractAddress?: string) => {
  const [timeUntilMidnight, setTimeUntilMidnight] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      if (contractAddress) {
        // Use new centralized logic for contract-specific timers
        setTimeUntilMidnight(getFormattedTimerForContract(contractAddress));
      } else {
        // Fallback to legacy logic for backward compatibility
        setTimeUntilMidnight(getTimeUntilMidnight());
      }
    };

    updateCountdown(); // Initial calculation

    const interval = setInterval(() => {
      updateCountdown();
    }, 1000); // Update every second for live timer

    return () => clearInterval(interval);
  }, [contractAddress]); // Add contractAddress to dependencies

  return timeUntilMidnight;
};