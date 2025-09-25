'use client';

import React, { useState, useEffect } from 'react';
import { Wallet } from 'lucide-react';
import Cookies from 'js-cookie';
import { useAccount } from 'wagmi';
import { Language, getTranslation } from '../Languages/languages';
import { useContractData } from '../hooks/useContractData';
import EmailManagement from '../Components/EmailManagement';

interface DashboardProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  selectedMarket?: string;
  currentLanguage?: Language;
  showEmailManagement?: boolean;
}


const Dashboard = ({ activeSection, setActiveSection, selectedMarket, currentLanguage = 'en', showEmailManagement }: DashboardProps) => {
  // Email management state
  const [showEmailUI, setShowEmailUI] = useState<boolean>(false);

  // Tutorial state - simplified since we're skipping tutorial UI
  const [hasSeenTutorial, setHasSeenTutorial] = useState<boolean | null>(null);

  const { address, isConnected } = useAccount();

  // Use centralized contract data hook
  const { contractAddresses, participantsData } = useContractData();


  // Get translations
  const t = getTranslation(currentLanguage);

  // Check tutorial status and handle routing - simplified since we skip tutorial UI
  useEffect(() => {
    const tutorialSeen = Cookies.get('tutorialBridgeSeen');
    const hasSeenBefore = tutorialSeen === 'true';
    setHasSeenTutorial(hasSeenBefore);

    console.log('🎓 TutorialBridge: Tutorial seen status:', hasSeenBefore);

    // If not doing email management and connected, redirect immediately
    if (!showEmailManagement && isConnected) {
      console.log('🔄 TutorialBridge: Redirecting to participant check');
      // Small delay to prevent immediate redirect flash
      setTimeout(() => {
        handleParticipantRouting();
      }, 500);
    }
  }, [showEmailManagement, isConnected]);

  // Show email management UI when requested from props
  useEffect(() => {
    if (showEmailManagement && isConnected) {
      console.log('🔧 Email management requested - showing email UI');
      setShowEmailUI(true);
    }
  }, [showEmailManagement, isConnected]);

  // Simplified participant routing function
  const handleParticipantRouting = () => {
    if (!isConnected || !address) {
      console.log('User not connected - sending to predictionPotTest');
      setActiveSection('bitcoinPot');
      return;
    }

    const selectedMarketAddress = Cookies.get('selectedMarket');
    const SPECIAL_ADDRESSES = ['0xA90611B6AFcBdFa9DDFfCB2aa2014446297b6680', '0x8bc670d5339AEa659c8DAb19D39206d046a250f8'];
    const isSpecialUser = address && SPECIAL_ADDRESSES.map(addr => addr.toLowerCase()).includes(address.toLowerCase());

    console.log('🔍 TutorialBridge Participant Check:');
    console.log('  - selectedMarketAddress:', selectedMarketAddress);
    console.log('  - isSpecialUser:', isSpecialUser);

    // Check if user is participant in the selected market
    const contractIndex = contractAddresses.findIndex(addr => addr === selectedMarketAddress);
    const participants = contractIndex !== -1 ? participantsData[contractIndex] : undefined;
    const isParticipant = participants && participants.some(
      (participant: string) => participant.toLowerCase() === address.toLowerCase()
    );

    console.log('  - isParticipant:', isParticipant);

    if (isParticipant && !isSpecialUser) {
      console.log('User is already a participant, redirecting to makePrediction');
      setActiveSection('makePrediction');
    } else {
      console.log('User is not a participant, redirecting to predictionPotTest');
      setActiveSection('bitcoinPot');
    }
  };





  return (
    <div className="min-h-screen bg-white text-black w-full overflow-x-hidden">
      <div className="w-full mx-auto p-6">
        <div className="flex items-start justify-center pt-4 md:pt-8 min-h-screen">
          <div className="text-center w-full max-w-4xl">

            {/* Email Management UI */}
            {showEmailUI && isConnected && (
              <EmailManagement
                currentLanguage={currentLanguage}
                onClose={() => setShowEmailUI(false)}
                onBack={() => setActiveSection('home')}
                showBackButton={true}
              />
            )}

            {/* Connect Wallet UI - Show when wallet is not connected */}
            {!isConnected && (
              <div>
                <div className="w-full min-h-[70vh] flex items-center justify-center px-4 md:px-8">
                  <div className="relative max-w-lg mx-auto w-full">{/* Removed animation for debugging */}
                    {/* Modern Connect Wallet Container */}
                    <div className="bg-white rounded-3xl border-0 p-8 md:p-10 text-center">
                      {/* Wallet Icon */}
                      <div className="mb-8">
                        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                          <Wallet className="w-10 h-10 text-white" />
                        </div>
                      </div>

                      {/* Header Section */}
                      <div className="mb-10">
                        <h1 className="text-3xl md:text-4xl font-light text-gray-900 mb-4 tracking-tight">
                          {t.connectWallet}
                        </h1>

                      </div>

                      {/* Instruction Text */}
                      <div className="mb-8">
                        <p className="text-gray-600 text-lg leading-relaxed font-light">
                          {t.clickSignInButton.split('Sign In').map((part, index) => 
                            index === 0 ? part : 
                            <>
                              <span className="font-medium text-purple-600">Sign In</span>
                              {part}
                            </>
                          )}
                        </p>
                      </div>

                      {/* Bottom Note */}
                      <div className="pt-6 border-t border-gray-100">
                        <p className="text-sm text-gray-400 text-center font-light tracking-wide">
                          Secure connection powered by Coinbase
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tutorial Screen - Show when not managing email and tutorial hasn't been seen */}
            {!showEmailUI && isConnected && showTutorial && (
              <div className="max-w-5xl mx-auto opacity-100 px-0 md:px-4">
                {/* Back to Email Collection Button
                <div className="mb-6 px-4 md:px-0">
                  <button
                    onClick={() => setShowEmailCollection(true)}
                    className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors duration-200 font-light text-sm tracking-wide"
                  >
                    <span>←</span>
                    <span>{currentUserEmail ? t.manageEmail : t.emailCollection}</span>
                  </button>
                </div> */}

                {/* Tutorial Content */}
                <div className="bg-white rounded-none md:rounded-3xl border-0 p-0 md:p-6 md:mb-8 mb-16">
                  {/* Header - Desktop with skip button, Mobile without */}
                  <div className="hidden md:flex items-center justify-between mb-12">
                    <h2 className="text-4xl font-light text-gray-900 tracking-tight">
                      {t.howItWorksTitle}
                    </h2>
                    <button
                      onClick={handleSkipClick}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-3 rounded-2xl transition-all duration-300 font-medium text-base transform hover:scale-[1.02] active:scale-[0.98] tracking-wide shadow-lg hover:shadow-xl"
                    >
                      {currentStep === tutorialSteps.length - 1 ? 'Continue' : t.skipButton}
                    </button>
                  </div>

                  {/* Mobile Header - Just title */}
                  <div className="md:hidden mb-4 px-4">
                    <h2 className="text-xl font-light text-gray-900 tracking-tight text-center">
                      {t.howItWorksTitle}
                    </h2>
                  </div>

                  {/* Carousel Container */}
                  <div className="relative mb-8 mx-0 md:mx-0 md:px-0">
                    {/* Mobile Navigation Arrows - Top positioned */}
                    <div className="md:hidden flex justify-between items-center mb-4 px-4">
                      <button
                        onClick={prevStep}
                        className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <ChevronLeft className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={nextStep}
                        className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <ChevronRight className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>

                    {/* Current Step Display */}
                    <div className="bg-white border-0 md:border border-gray-200/60 rounded-none md:rounded-2xl p-4 md:p-8 shadow-none md:shadow-sm min-h-[280px] md:min-h-[320px] flex items-center overflow-hidden mx-0 md:mx-0">
                      <div className="flex flex-col items-center md:items-start gap-4 md:gap-6 w-full">
                        {/* Icon and Step Number */}
                        <div className="flex items-center gap-4 w-full justify-center md:justify-start">
                          <div className={`bg-gradient-to-br ${tutorialSteps[currentStep]?.color} text-white rounded-xl w-12 h-12 md:w-16 md:h-16 flex items-center justify-center flex-shrink-0 shadow-lg`}>
                            {tutorialSteps[currentStep]?.icon &&
                              React.createElement(tutorialSteps[currentStep].icon, {
                                className: "w-6 h-6 md:w-8 md:h-8"
                              })
                            }
                          </div>
                          {/* <div className="bg-gray-100 text-gray-700 rounded-lg w-8 h-8 md:w-10 md:h-10 flex items-center justify-center font-semibold text-sm md:text-base flex-shrink-0">
                            {currentStep + 1}
                          </div> */}
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1 text-center md:text-left w-full">
                          <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 break-words leading-tight">
                            {tutorialSteps[currentStep]?.title}
                          </h3>

                          {/* Key Highlights */}
                          <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                            {tutorialSteps[currentStep]?.highlights.map((highlight, index) => (
                              <span
                                key={index}
                                className={`px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${tutorialSteps[currentStep]?.color} shadow-sm`}
                              >
                                {highlight}
                              </span>
                            ))}
                          </div>

                          {/* Description with better formatting */}
                          <div className="text-sm md:text-base text-gray-600 leading-relaxed space-y-3">
                            {tutorialSteps[currentStep]?.description.split('. ').map((sentence, index, array) => {
                              if (!sentence.trim()) return null;
                              return (
                                <p key={index} className="text-left md:text-left">
                                  <span className="inline-flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2 flex-shrink-0"></span>
                                    <span>{sentence}{index < array.length - 1 ? '.' : ''}</span>
                                  </span>
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Navigation Arrows - Side positioned */}
                    <div className="hidden md:block absolute top-1/2 -translate-y-1/2 -left-6">
                      <button
                        onClick={prevStep}
                        className="w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <ChevronLeft className="w-6 h-6 text-gray-600" />
                      </button>
                    </div>
                    <div className="hidden md:block absolute top-1/2 -translate-y-1/2 -right-6">
                      <button
                        onClick={nextStep}
                        className="w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        <ChevronRight className="w-6 h-6 text-gray-600" />
                      </button>
                    </div>

                    {/* Step Indicators */}
                    <div className="flex justify-center gap-2 mt-6">
                      {tutorialSteps.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToStep(index)}
                          className={`w-3 h-3 rounded-full transition-all duration-200 ${
                            index === currentStep
                              ? 'bg-purple-600 scale-110'
                              : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Step Counter */}
                    <div className="text-center mt-4">
                      <span className="text-sm text-gray-500 font-medium">
                        {currentStep + 1} {currentLanguage === 'pt-BR' ? 'de' : 'of'} {tutorialSteps.length}
                      </span>
                    </div>
                  </div>

                  {/* Mobile Skip Button - Below carousel */}
                  <div className="md:hidden mt-6 px-4">
                    <button
                      onClick={handleSkipClick}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-6 py-3 rounded-2xl transition-all duration-300 font-medium text-base transform hover:scale-[1.02] active:scale-[0.98] tracking-wide shadow-lg hover:shadow-xl w-full"
                    >
                      {currentStep === tutorialSteps.length - 1 ? 'Continue' : t.skipButton}
                    </button>
                  </div>

                  <div className="mt-8 md:mt-12 p-4 md:p-8 bg-gradient-to-r from-purple-50/80 to-blue-50/80 rounded-3xl border-0">
                    <p className="text-center text-base md:text-xl text-gray-800 font-light leading-relaxed break-words">
                      {isPenaltyExempt ? (
                        <>🏆 <span className="font-medium text-[#0000aa]">{currentLanguage === 'pt-BR' ? 'Seu Objetivo:' : 'Your Goal:'}</span> {t.yourGoalTournament}</>
                      ) : (
                        <>🎯 <span className="font-medium text-[#0000aa]">{t.yourGoal}</span> {t.tutorialGoal}</>
                      )}
                    </p>
                  </div>
                </div>

              </div>
            )}

            {/* Redirect Message - Show when tutorial was seen and redirecting */}
            {!showEmailUI && isConnected && hasSeenTutorial && !showTutorial && (
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-lg text-gray-600">
                    {currentLanguage === 'pt-BR' ? 'Redirecionando para as previsões...' : 'Redirecting to predictions...'}
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;