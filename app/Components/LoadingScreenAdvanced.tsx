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
    <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-700 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gray-900 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-md mx-auto text-center relative z-10 px-6">
        <div className="bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-3xl p-12">
          {/* Logo with Circular Loading Animation */}
          <div className="flex justify-center mb-8 relative">
            {/* Circular loading ring */}
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 absolute inset-0 -rotate-90" viewBox="0 0 128 128">
                {/* Background circle */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#b91c1c"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - loadingProgress / 100)}`}
                  className="transition-all duration-300 ease-out"
                />
                {/* Animated rotating circle */}
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="#dc2626"
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
                <h1 className="text-2xl font-black text-red-700 tracking-tight">
                  {title}
                </h1>
              </div>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-gray-600 text-base mb-8">
            {subtitle}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-800 to-red-700 rounded-full transition-all duration-300 ease-out relative"
              style={{ width: `${loadingProgress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 animate-pulse"></div>
            </div>
          </div>

          {/* Progress Text */}
          <div className="text-gray-500 text-sm font-medium">
            {loadingProgress}%
          </div>

          {/* Animated dots */}
          <div className="flex justify-center gap-1 mt-6">
            <div className="w-2 h-2 bg-red-700 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-red-700 rounded-full animate-bounce delay-100"></div>
            <div className="w-2 h-2 bg-red-700 rounded-full animate-bounce delay-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
}