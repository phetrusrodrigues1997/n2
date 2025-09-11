import React from 'react';

interface ComingSoonPageProps {
  // No props needed for this simple page
}

const ComingSoonPage: React.FC<ComingSoonPageProps> = () => {
  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-center px-4">
      {/* Ghostie Image */}
      <div className="mb-8">
        <img 
          src="/ghostienobg.png" 
          alt="Ghostie" 
          className="w-16 h-16 md:w-16 md:h-16 animate-pulse"
        />
      </div>

      {/* Coming Soon Text */}
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
          Coming So Soon
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-8">
          If you blink you'll miss it
        </p>

        {/* Animated dots */}
        <div className="flex justify-center space-x-2">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>

      {/* Optional subtle background pattern */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-black to-blue-900"></div>
      </div>
    </div>
  );
};

export default ComingSoonPage;