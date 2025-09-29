'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useBalance } from 'wagmi';
import { formatUnits, parseEther } from 'viem';
import { X } from 'lucide-react';
import { Language, getTranslation } from '../Languages/languages';
import { calculateEntryFee, PENALTY_EXEMPT_CONTRACTS } from '../Database/config';
import { getPrice } from '../Constants/getPrice';

// Contract ABI for SimplePredictionPot (ETH-based)lol
const PREDICTION_POT_ABI = [
  {
    "inputs": [],
    "name": "enterPot",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBalance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

interface JoinPotModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractAddress: string;
  marketQuestion: string;
  marketIcon: string;
  potBalance: string;
  entryFee: number;
  currentLanguage?: Language;
  onSuccess?: () => void;
}

const JoinPotModal: React.FC<JoinPotModalProps> = ({
  isOpen,
  onClose,
  contractAddress,
  marketQuestion,
  marketIcon,
  potBalance,
  entryFee,
  currentLanguage = 'en',
  onSuccess
}) => {
  const { address, isConnected } = useAccount();
  const t = getTranslation(currentLanguage);

  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [isReferralDropdownOpen, setIsReferralDropdownOpen] = useState(false);
  const [ethPrice, setEthPrice] = useState<number | null>(null);

  // Get user's ETH balance
  const ethBalance = useBalance({
    address: address,
  });

  // Contract interaction hooks
  const { writeContract, data: hash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Fetch ETH price on component mount
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const price = await getPrice('ETH');
        setEthPrice(price);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        setEthPrice(4700); // Fallback price
      }
    };

    fetchEthPrice();
  }, []);

  // Calculate entry amount in ETH (convert USD to wei)
  const ethToUsd = (ethAmount: bigint): number => {
    const fallbackEthPrice = 4700;
    const currentEthPrice = ethPrice || fallbackEthPrice;
    const ethValue = Number(formatUnits(ethAmount, 18));
    return ethValue * currentEthPrice;
  };

  const usdToEth = (usdAmount: number): number => {
    const fallbackEthPrice = 4700;
    const currentEthPrice = ethPrice || fallbackEthPrice;
    return usdAmount / currentEthPrice;
  };

  const entryAmountEth = usdToEth(entryFee);
  const entryAmount = parseEther(entryAmountEth.toString());

  // Check if user has sufficient balance
  const hasInsufficientBalance = isConnected && ethBalance.data && ethToUsd(ethBalance.data.value) < entryFee + 0.01;

  const showMessage = (msg: string, isError = false) => {
    setMessage(msg);
    if (!isError) {
      setTimeout(() => setMessage(''), 8000);
    } else {
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleEnterPot = async () => {
    if (!contractAddress || !isConnected) return;

    setIsLoading(true);

    try {
      await writeContract({
        address: contractAddress as `0x${string}`,
        abi: PREDICTION_POT_ABI,
        functionName: 'enterPot',
        args: [],
        value: entryAmount,
      });

      showMessage('Tournament entry submitted! Waiting for confirmation...');
    } catch (error) {
      console.error('Enter pot failed:', error);
      showMessage('Transaction failed. Please try again.', true);
      setIsLoading(false);
    }
  };

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      showMessage('Successfully joined tournament! 🎉');
      setIsLoading(false);
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }
    }
  }, [isConfirmed, onSuccess, onClose]);

  // Reset loading state if transaction fails
  useEffect(() => {
    if (!isPending && !isConfirming && hash && !isConfirmed) {
      setIsLoading(false);
    }
  }, [isPending, isConfirming, hash, isConfirmed]);

  const isActuallyLoading = isLoading || isPending || isConfirming;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-end md:items-center justify-center z-50 p-0 md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-t-2xl md:rounded-2xl max-w-md w-full max-h-[80vh] md:max-h-[75vh] overflow-hidden animate-slide-up md:animate-none md:flex md:flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag indicator */}
        <div className="flex md:hidden justify-center pt-3 pb-1">
          <div className="w-8 h-1 bg-gray-300 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-5 border-b border-gray-200 md:flex-shrink">
          <h2 className="text-lg font-semibold text-gray-900">Join Tournament</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-5 md:flex-initial md:overflow-visible">
          {/* Market Info */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <img
              src={marketIcon}
              alt="Market"
              className="w-16 h-16 rounded-lg"
            />
            <div className="flex-1">
              <div className="text-xs text-gray-500 font-medium mb-1">
                {PENALTY_EXEMPT_CONTRACTS.includes(contractAddress) ? 'Question of the Week' : 'Question of the Day'}
              </div>
              <h3 className="font-medium text-gray-900 text-sm leading-tight">
                {marketQuestion}
              </h3>
            </div>
          </div>

          {/* Entry Details */}
          <div className="mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <img
                      src="https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png"
                      alt="ETH"
                      className="w-5 h-5"
                    />
                  </div>
                  <div>
                    <div className="text-blue-700 text-xs font-medium">Entry Fee</div>
                    <div className="text-gray-900 font-semibold text-sm">
                      ${entryFee.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-blue-700 text-xs font-medium">Prize</div>
                  <div className="text-gray-900 font-semibold text-sm">
                    {potBalance}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Referral Code (Optional) */}
          <div className="mb-4">
            <div
              className="flex items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-lg p-2.5 transition-colors"
              onClick={() => setIsReferralDropdownOpen(!isReferralDropdownOpen)}
            >
              <span className="text-gray-700 text-sm font-medium">
                Referral Code (Optional)
              </span>
              <div className="w-4 h-4 flex items-center justify-center text-gray-600 font-bold text-sm">
                {isReferralDropdownOpen ? '−' : '+'}
              </div>
            </div>

            {isReferralDropdownOpen && (
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Enter code..."
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
                  maxLength={8}
                />
              </div>
            )}
          </div>

          {/* Insufficient Balance Warning */}
          {hasInsufficientBalance && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-xs">
                Insufficient ETH balance. You need at least ${(entryFee + 0.01).toFixed(2)} worth of ETH.
              </p>
            </div>
          )}

          {/* Success/Error Message */}
          {message && (
            <div className={`mb-3 p-3 rounded-lg ${
              message.includes('failed') || message.includes('error')
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-green-50 border border-green-200 text-green-700'
            }`}>
              <p className="text-xs">{message}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleEnterPot}
              disabled={isActuallyLoading || hasInsufficientBalance || !isConnected}
              className="w-full bg-red-700 hover:bg-red-800 text-white px-4 py-2.5 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {isActuallyLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : !isConnected ? (
                'Connect Wallet'
              ) : (
                `Join Tournament`
              )}
            </button>

            <button
              onClick={onClose}
              disabled={isActuallyLoading}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-medium transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinPotModal;