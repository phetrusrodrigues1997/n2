import React, { useEffect, useState } from 'react';

interface LoadingScreenAdvancedProps {
  title?: string;
  subtitle?: string;
  duration?: number; // in milliseconds
}

export default function LoadingScreenAdvanced({ 
  title = "Prediwin", 
  subtitle = "Preparing your pots...",
  duration = 2000 
}: LoadingScreenAdvancedProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    const initializeApp = async () => {
      // Progressive loading steps (4-second total duration)
      const loadingSteps = [
        { progress: 20, delay: 50, label: 'Loading markets...' },
        { progress: 40, delay: 300, label: 'Fetching data...' },
        { progress: 55, delay: 400, label: 'Setting up interface...' },
        { progress: 70, delay: 500, label: 'Processing data...' },
        { progress: 85, delay: 600, label: 'Finalizing...' },
        { progress: 95, delay: 700, label: 'Almost ready...' },
        { progress: 100, delay: duration, label: 'Ready!' }
      ];

      for (const step of loadingSteps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
        setLoadingProgress(step.progress);
      }
    };

    initializeApp();
  }, []);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        {/* Logo with Circular Loading Animation */}
        <div className="flex justify-center relative">
          {/* Circular loading ring */}
          <div className="relative w-48 h-48">
            <svg className="w-48 h-48 absolute inset-0 -rotate-90" viewBox="0 0 128 128">
              {/* Background circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#e5e7eb"
                strokeWidth="4"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#dc2626"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - loadingProgress / 100)}`}
                className="transition-all duration-300 ease-out"
              />
              {/* Animated rotating circle on top */}
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#b91c1c"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeDasharray="20 200"
                className="animate-spin"
                style={{ transformOrigin: '64px 64px' }}
              />
            </svg>

            {/* Logo in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <h1 className="text-4xl font-black text-red-700 tracking-tight">
                {title}
              </h1>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}