'use client';

import React, { useState, useEffect } from 'react';
import { Gamepad2, Grid3X3 } from 'lucide-react';
import Wordle from './wordlePage';

interface AIPageProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const GamesHub = ({ activeSection, setActiveSection }: AIPageProps) => {
  const [selectedGame, setSelectedGame] = useState<'hub' | 'wordle'>('hub');

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Game Hub View
  if (selectedGame === 'hub') {
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <div className="bg-white px-4 py-6 border-b border-gray-200">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-black rounded-lg">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-black">Games Hub</h1>
            </div>
            <p className="text-gray-600">Play games and earn free pot entries</p>
          </div>
        </div>

        {/* Games Grid */}
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Wordle Game */}
            <div 
              onClick={() => setSelectedGame('wordle')}
              className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-red-300 hover:shadow-lg transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Grid3X3 className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-black">Wordle</h3>
                  <p className="text-gray-600">Daily word puzzle</p>
                </div>
              </div>
              
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-700">🎯 Guess the 5-letter word in 6 tries</p>
                <p className="text-sm text-gray-700">🏆 Win and earn free pot entries</p>
                <p className="text-sm text-gray-700">📅 One game per day for connected wallets</p>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-700">Play Now →</span>
                <div className="text-xs text-gray-500">5 min</div>
              </div>
            </div>

            {/* Future Games Placeholder */}
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 opacity-60">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-gray-200 rounded-lg">
                  <Gamepad2 className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-400">More Games</h3>
                  <p className="text-gray-400">Coming soon</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">More exciting games are in development...</p>
              
              <span className="text-sm font-medium text-gray-400">Stay tuned</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Wordle Game View
  if (selectedGame === 'wordle') {
    return (
      <div className="min-h-screen bg-white">
        <Wordle 
          onBack={() => setSelectedGame('hub')}
          showBackButton={true}
        />
      </div>
    );
  }

  return null;
};

export default GamesHub;