'use client';

import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  showProgress?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  title = "Prediwin", 
  subtitle = "Loading prediction markets...", 
  showProgress = false
}) => {
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    if (!showProgress) return;

    const loadingSteps = [
      { progress: 20, delay: 50, label: 'Loading markets...' },
       { progress: 40, delay: 300, label: 'Fetching data...' },
       { progress: 55, delay: 400, label: 'Setting up interface...' },
       { progress: 70, delay: 500, label: 'Processing data...' },
       { progress: 85, delay: 600, label: 'Finalizing...' },
       { progress: 95, delay: 700, label: 'Almost ready...' },
       { progress: 100, delay: 400, label: 'Ready!' }
    ];
    
    const runProgressSteps = async () => {
      for (const step of loadingSteps) {
        await new Promise(resolve => setTimeout(resolve, step.delay));
        setLoadingProgress(step.progress);
      }
    };
    
    runProgressSteps();
  }, [showProgress]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-white"></div>

      {/* Animated subtle accent */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse" style={{ backgroundColor: '#010062' }}></div>
      </div>

      <div className="max-w-md mx-auto text-center relative z-10 px-6 mb-32 md:mb-20">
        <div className="bg-white backdrop-blur-sm border border-gray-100 rounded-2xl p-12 shadow-sm">
          {/* Ghostie Logo */}
          <div className="flex justify-center mb-6">
            {/* <img
              src="/ghostienobg.png"
              alt="Prediwin Logo"
              className="w-20 h-20 md:w-24 md:h-24 opacity-90"
            /> */}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold mb-4 tracking-tight" style={{ color: '#010062' }}>{title}</h1>
          <p className="text-gray-500 text-sm mb-8">{subtitle}</p>

          {showProgress ? (
            <>
              {/* Progress Bar */}
              <div className="w-full bg-white rounded-full h-1.5 mb-4 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${loadingProgress}%`,
                    backgroundColor: '#010062'
                  }}
                ></div>
              </div>

              {/* Progress Text */}
              <div className="text-gray-400 text-xs font-medium">
                {loadingProgress}%
              </div>
            </>
          ) : (
            /* Loading dots */
            <div className="flex justify-center gap-1.5">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#010062', animationDelay: '0ms', animationDuration: '1.4s' }}></div>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#010062', animationDelay: '200ms', animationDuration: '1.4s' }}></div>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#010062', animationDelay: '400ms', animationDuration: '1.4s' }}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;