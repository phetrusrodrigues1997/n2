import React, { useState, useEffect } from "react";
import { useAccount } from 'wagmi';
import { Copy, Check, QrCode, Wallet, ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { getTranslation, type Language } from '../Languages/languages';

interface ReceiveSectionProps {
  activeSection?: string;
  setActiveSection?: (section: string) => void;
  currentLanguage?: Language;
}

const ReceiveSection: React.FC<ReceiveSectionProps> = ({ activeSection, setActiveSection, currentLanguage = 'en' }) => {
  const { address, isConnected } = useAccount();
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();

  // Language is now passed as prop from parent component

  const t = getTranslation(currentLanguage);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Refresh balance when component mounts
  useEffect(() => {
    if (isConnected && address) {
      console.log('🔄 ReceivePage: Refreshing balance in header');
      queryClient.invalidateQueries({ queryKey: ['balance'] });
      queryClient.invalidateQueries({ queryKey: ['readContract'] });
    }
  }, [isConnected, address, queryClient]);

  const copyAddressToClipboard = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy address:', err);
      }
    }
  };

  // QR Code component
  const QRCodeDisplay = ({ value }: { value: string }) => {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3">
        <div className="w-24 h-24 bg-white flex items-center justify-center mx-auto">
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(value)}&bgcolor=ffffff&color=000000&margin=3`}
            alt="QR Code"
            className="w-full h-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement!.innerHTML = `
                <div class="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                  <div class="text-center">
                    <div class="text-gray-400 text-xs">QR Code</div>
                    <div class="text-xs text-gray-500">Unavailable</div>
                  </div>
                </div>
              `;
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Header
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <button
          onClick={() => setActiveSection?.('home')}
          className="text-gray-900 hover:text-gray-600 transition-colors"
        >
          <span className="text-xl">←</span>
        </button>
        <button
          onClick={() => window.open('https://keys.coinbase.com', '_blank', 'noopener,noreferrer')}
          className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          Where can I buy crypto?
        </button>
      </div> */}

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6">

        {!isConnected || !address ? (
          /* Not Connected State */
          <div className="text-center py-16">
            <h2 className="text-lg font-medium text-gray-900 mb-2">{t.connectYourWalletReceive}</h2>
            <p className="text-gray-500">{t.connectWalletToViewAddress}</p>
          </div>
        ) : (
          /* Connected State */
          <div className="space-y-6">
            {/* Page Title */}
            <div className="text-center">
              <h1 className="text-xl font-medium text-gray-900 mb-2">{t.receiveETH}</h1>
              <p className="text-sm text-gray-500">Your wallet address on Base network</p>
            </div>

            {/* QR Code & Address Section */}
            <div className="border border-gray-200 rounded-lg p-6">

              {/* QR Code */}
              <div className="flex justify-center mb-6">
                <QRCodeDisplay value={address} />
              </div>

              {/* Wallet Address */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="font-mono text-sm text-gray-900 break-all text-center">
                  {address}
                </div>
              </div>

              {/* Copy Button */}
              <button
                onClick={copyAddressToClipboard}
                className="w-full bg-[#010065] hover:bg-red-800 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{t.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{t.copyAddress}</span>
                  </>
                )}
              </button>

              {/* Network Badge */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                  <span className="text-gray-700 text-xs font-medium">{t.baseNetworkOnly}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiveSection;