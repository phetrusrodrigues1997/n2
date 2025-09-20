import React, { useState } from "react";
import { FaChevronDown, FaChevronUp, FaDiscord } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { getTranslation, Language } from '../Languages/languages';

interface FAQItem {
  question: string;
  answer: string;
}

interface HowItWorksSectionProps {
  setActiveSection?: (section: string) => void;
  currentLanguage?: Language;
}

const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ setActiveSection, currentLanguage = 'en' }) => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const t = getTranslation(currentLanguage);

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  const faqItems: FAQItem[] = [
    {
      question: t.howSignInQuestion,
      answer: t.howSignInAnswer
    },
    {
      question: t.howPrediwinWorksQuestion,
      answer: t.howPrediwinWorksAnswer
    },
    {
      question: t.dynamicPricingPublicPotsQuestion,
      answer: t.dynamicPricingPublicPotsAnswer
    },
    {
      question: t.wrongPredictionQuestion,
      answer: t.wrongPredictionAnswer
    },
    {
      question: t.privatePotsQuestion,
      answer: t.privatePotsAnswer
    },
    {
      question: t.createSharePrivatePotQuestion,
      answer: t.createSharePrivatePotAnswer
    },
    {
      question: t.controlPrivatePotsQuestion,
      answer: t.controlPrivatePotsAnswer
    },
    {
      question: t.privatePotParticipantsQuestion,
      answer: t.privatePotParticipantsAnswer
    },
    {
      question: t.needEthereumQuestion,
      answer: t.needEthereumAnswer
    },
    {
      question: t.entryFeesCalculationQuestion,
      answer: t.entryFeesCalculationAnswer
    },
    {
      question: t.referralSystemQuestion,
      answer: t.referralSystemAnswer
    },
    {
      question: t.eventTypesQuestion,
      answer: t.eventTypesAnswer
    },
    {
      question: t.makePredictionsQuestion,
      answer: t.makePredictionsAnswer
    },
    {
      question: t.winnersQuestion,
      answer: t.winnersAnswer
    },
    {
      question: t.getWinningsQuestion,
      answer: t.getWinningsAnswer
    },
    {
      question: t.withoutCryptoExperienceQuestion,
      answer: t.withoutCryptoExperienceAnswer
    },
    {
      question: t.livePotsQuestion,
      answer: t.livePotsAnswer
    },
    {
      question: t.gamblingQuestion,
      answer: t.gamblingAnswer
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-6 mt-8 bg-white rounded-lg shadow-md border border-gray-300">
      {/* Back Button - Mobile Only */}
      {setActiveSection && (
        <div className="mb-6 md:hidden">
          <button
            onClick={() => setActiveSection('home')}
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition-colors duration-200 font-medium text-sm tracking-wide bg-white hover:bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:border-purple-300"
          >
            <span>←</span>
            <span>{t.backToMarkets}</span>
          </button>
        </div>
      )}

      <h2 className="text-2xl font-bold text-black text-center mb-8">
        {t.faqTitle}
      </h2>
      
      <div className="space-y-4">
        {faqItems.map((item, index) => (
          <div key={index} className="border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleItem(index)}
              className="w-full px-6 py-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors duration-200 flex justify-between items-center"
            >
              <span className="text-black font-semibold pr-4">{item.question}</span>
              {openItems.has(index) ? (
                <FaChevronUp className="text-gray-600 flex-shrink-0" />
              ) : (
                <FaChevronDown className="text-gray-600 flex-shrink-0" />
              )}
            </button>
            
            {openItems.has(index) && (
              <div className="px-6 py-4 bg-white border-t border-gray-300">
                <p className="text-gray-800 leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <p className="text-gray-600 text-sm mb-4">
          {t.stillHaveQuestions}
        </p>
        <div className="flex justify-center space-x-4">
          <a
            href="https://discord.gg/8H9Hxc4Y"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 px-4 py-2 bg-[#5865F2] text-white rounded-lg hover:bg-[#4752C4] transition-colors text-sm"
          >
            <FaDiscord size={16} />
            <span>{t.discordSupport}</span>
          </a>
          <a
            href="https://x.com/Prediwin"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
          >
            <FaXTwitter size={16} />
            <span>{t.followOnX}</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksSection;
