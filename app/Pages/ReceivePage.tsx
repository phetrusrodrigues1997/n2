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
      <div className="bg-white p-3 rounded-xl shadow-inner border">
        <div className="w-32 h-32 bg-white flex items-center justify-center mx-auto">
          <img 
            src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(value)}&bgcolor=ffffff&color=000000&margin=3`}
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
      <div className="max-w-md mx-auto px-4 py-8">
        {/* How to Buy Crypto Link */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => window.open('https://keys.coinbase.com', '_blank', 'noopener,noreferrer')}
            className="text-gray-700 hover:text-black transition-all duration-200 font-medium text-sm tracking-wide border-b border-gray-300 hover:border-black pb-0.5"
          >
            How do I buy crypto?
          </button>
        </div>

        {!isConnected || !address ? (
          /* Not Connected State */
          <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center shadow-xl">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Wallet className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-black mb-3">{t.connectYourWalletReceive}</h2>
            <p className="text-gray-600">
              {t.connectWalletToViewAddress}
            </p>
          </div>
        ) : (
          /* Connected State */
          <div className="space-y-6">
            {/* Combined QR Code & Address Section */}
            <div className="bg-white rounded-3xl border border-gray-200 p-5 shadow-xl">
              <div className="text-center mb-4">
                <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full mb-3">
                  <QrCode className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-semibold text-gray-600">{t.receiveETH}</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-4">
                <QRCodeDisplay value={address} />
              </div>

              {/* Wallet Address */}
              <div className="bg-gray-50 rounded-xl p-3 mb-4">
                <div className="font-mono text-xs text-gray-900 break-all text-center leading-relaxed">
                  {address}
                </div>
              </div>

              {/* Copy Button */}
              <button
                onClick={copyAddressToClipboard}
                className="w-full bg-black hover:bg-gray-800 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 mb-3"
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
                <div className="inline-flex items-center gap-2 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  <span className="text-gray-700 text-xs font-semibold">{t.baseNetworkOnly}</span>
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