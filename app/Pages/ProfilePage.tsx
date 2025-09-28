import React, { useState, useEffect } from 'react';
import { Upload, Trophy, Award, Crown, Wallet, DollarSign, Zap, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { useAccount, useReadContract, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { saveImageUrl, getLatestImageUrl, getUserStats, getLeaderboard, getUserRank } from '../Database/actions';
import { Language, getTranslation } from '../Languages/languages';
import { getPrice } from '../Constants/getPrice';


// Profile now tracks ETH earnings instead of USDC

interface ProfilePageProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  currentLanguage?: Language;
}

const ETHToken = {
  chainId: 8453,
  decimals: 18,
  name: "Ethereum",
  symbol: "ETH",
  image:"https://dynamic-assets.coinbase.com/dbb4b4983bde81309ddab83eb598358eb44375b930b94687ebe38bc22e52c3b2125258ffb8477a5ef22e33d6bd72e32a506c391caa13af64c00e46613c3e5806/asset_icons/4113b082d21cc5fab17fc8f2d19fb996165bcce635e6900f7fc2d57c4ef33ae9.png",

};

const ProfilePage = ({ setActiveSection, currentLanguage = 'en' }: ProfilePageProps) => {
  const defaultProfileImage = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=400&fit=crop&crop=center';
  const [profileImage, setProfileImage] = useState(defaultProfileImage);
  const [hasCustomImage, setHasCustomImage] = useState(false);
  const [isMyStatsExpanded, setIsMyStatsExpanded] = useState(false);

  // Get translations
  const t = getTranslation(currentLanguage);

  const { address, isConnected } = useAccount();

  // Real user data state
  const [userStats, setUserStats] = useState({
    totalEarnings: '$0.00',
    marketsWon: 0,
    accuracy: '0.0%',
    totalPredictions: 0,
    rank: null as number | null
  });

  // Real leaderboard data state
  const [leaderboardData, setLeaderboardData] = useState<{
    users: any[];
    currentUser: any | null;
    showSeparator: boolean;
    totalUsers: number;
  }>({
    users: [],
    currentUser: null,
    showSeparator: false,
    totalUsers: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);

  // Removed USDC balance reading - now using ETH

  // Get ETH balance
  const { data: ethBalance } = useBalance({
    address: address as `0x${string}`,
    query: { enabled: !!address && isConnected }
  });

  // State for ETH price
  const [ethPrice, setEthPrice] = useState<number>(0);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch ETH price on mount
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        const price = await getPrice('ETH');
        setEthPrice(price ?? 4700);
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        setEthPrice(4700); // Fallback price
      }
    };

    fetchEthPrice();
    
    // Refresh price every 5 minutes
    const interval = setInterval(fetchEthPrice, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Removed USDC balance formatting

  // Helper function to convert ETH to USD
  const ethToUsd = (ethAmount: bigint): number => {
    const fallbackEthPrice = 4700;
    const currentEthPrice = ethPrice || fallbackEthPrice;
    const ethValue = Number(formatUnits(ethAmount, 18));
    return ethValue * currentEthPrice;
  };

  // Format ETH balance in USD
  const formatEthBalanceUSD = (): string => {
    if (!ethBalance?.value) return '$0.00';
    try {
      const usdValue = ethToUsd(ethBalance.value);
      return `$${usdValue.toFixed(2)}`;
    } catch {
      return '$0.00';
    }
  };
  useEffect(() => {
  const fetchImage = async () => {
    if (address) {
      const img = await getLatestImageUrl(address);
      if (img) {
        setProfileImage(img);
        setHasCustomImage(true);
      } else {
        setProfileImage(defaultProfileImage);
        setHasCustomImage(false);
      }
    }
  };

  fetchImage();
}, [address, defaultProfileImage]);

// Load user stats and leaderboard data
useEffect(() => {
  const loadData = async () => {
    if (!address) {
      setIsLoadingStats(false);
      setIsLoadingLeaderboard(false);
      return;
    }

    try {
      // Load user stats
      setIsLoadingStats(true);
      const stats = await getUserStats(address);
      const rank = await getUserRank(address);
      
      // Calculate placeholder accuracy (we'd need prediction data for real accuracy)
      const baseAccuracy = 65;
      // Note: Database still stores values as totalEarningsUSDC but they're now ETH values in wei
      // The database actions already convert to dollars, so stats.totalEarnings is already in USD format
      const earningsString = stats.totalEarnings || '$0.00';
      const earningsInDollars = parseFloat(earningsString.replace('$', '')) || 0;
      const performanceBonus = Math.min(15, (earningsInDollars / Math.max(stats.potsWon, 1)) * 2);
      const accuracy = Math.min(95, baseAccuracy + performanceBonus);
      
      setUserStats({
        totalEarnings: stats.totalEarnings,
        marketsWon: stats.potsWon,
        accuracy: `${accuracy.toFixed(1)}%`,
        totalPredictions: stats.potsWon * 3, // Rough estimate - we'd need real prediction data
        rank: rank
      });
      setIsLoadingStats(false);

      // Load leaderboard
      setIsLoadingLeaderboard(true);
      const leaderboard = await getLeaderboard(address);
      setLeaderboardData(leaderboard);
      setIsLoadingLeaderboard(false);

    } catch (error) {
      console.error('Error loading profile data:', error);
      setIsLoadingStats(false);
      setIsLoadingLeaderboard(false);
    }
  };

  loadData();
}, [address]);

interface UserStats {
    totalEarnings: string;
    marketsWon: number;
    accuracy: string;
    totalPredictions: number;
    rank: number;
}

interface LeaderboardUser {
    rank: number;
    name: string;
    earnings: string;
    marketsWon: number;
    accuracy: string;
    isCurrentUser?: boolean;
}

const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e: ProgressEvent<FileReader>) => {
    if (e.target && typeof e.target.result === 'string') {
      const base64Image = e.target.result;
      setProfileImage(base64Image); // Update UI
      setHasCustomImage(true); // Mark as having custom image

      if (address) {
        try {
          await saveImageUrl(address, base64Image); // Save to DB
          console.log("Image URL saved successfully");
        } catch (err) {
          console.error("Failed to save image:", err);
        }
      }
    }
  };
  reader.readAsDataURL(file);
};


  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Header */}
      

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Portfolio Overview - Clean */}
        {isConnected && address && (
          <div className="rounded-lg p-6 mb-6 border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Portfolio Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ETH Balance */}
              <div className="md:col-span-2  rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <img
                    src={ETHToken.image}
                    alt="ETH"
                    className="w-10 h-10 object-cover rounded-full"
                  />
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Portfolio Value</div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {formatEthBalanceUSD()}
                    </div>
                    <div className="text-xs text-gray-500">ETH on Base Network</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => setActiveSection('receive')}
                  className="w-full bg-red-700 text-white font-medium py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors text-sm"
                >
                  {t.fundAccount}
                </button>
                <button
                  onClick={() => setActiveSection('emailManagement')}
                  className="w-full border border-gray-300 text-gray-700 font-medium py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  {t.manageEmail}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* My Stats - Clean Collapsible Section */}
        <div className="border border-gray-200 rounded-lg mb-6">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => setIsMyStatsExpanded(!isMyStatsExpanded)}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-medium text-gray-900">{t.tapForStats}</h2>
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-1 rounded-full">
                {t.newBadge}
              </span>
            </div>
            <span className="text-gray-400 text-lg">
              {isMyStatsExpanded ? '↑' : '↓'}
            </span>
          </div>

          {/* Collapsible Content */}
          {isMyStatsExpanded && (
            <div className="border-t border-gray-200 p-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Profile Image Section */}
                <div className="flex flex-col items-center">
                  <div className="relative group w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={profileImage}
                      alt={t.profile}
                      className="w-full h-full object-cover"
                    />
                    <label className="absolute inset-0 flex items-center justify-center bg-red-700 bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 cursor-pointer">
                      <Upload className="text-white opacity-0 group-hover:opacity-100 w-5 h-5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {!hasCustomImage && (
                    <p className="text-xs text-gray-500 mt-2">Set profile image</p>
                  )}
                </div>

                {/* Main Stats */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-semibold text-gray-900 mb-1">
                        {isLoadingStats ? (
                          <div className="animate-pulse bg-gray-300 h-6 w-16 rounded mx-auto"></div>
                        ) : (
                          userStats.totalEarnings
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{t.totalEarnings}</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-semibold text-gray-900 mb-1">
                        {isLoadingStats ? (
                          <div className="animate-pulse bg-gray-300 h-6 w-12 rounded mx-auto"></div>
                        ) : (
                          userStats.marketsWon
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{t.potsWon}</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-semibold text-gray-900 mb-1">
                        {isLoadingStats ? (
                          <div className="animate-pulse bg-gray-300 h-6 w-14 rounded mx-auto"></div>
                        ) : (
                          userStats.accuracy
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{t.winRate}</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-semibold text-gray-900 mb-1">
                        {isLoadingStats ? (
                          <div className="animate-pulse bg-gray-300 h-6 w-12 rounded mx-auto"></div>
                        ) : (
                          userStats.rank ? `#${userStats.rank}` : t.unranked
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{t.globalRank}</div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-gray-900 mb-1">
                        {isLoadingStats ? (
                          <div className="animate-pulse bg-gray-300 h-5 w-8 rounded mx-auto"></div>
                        ) : (
                          `${userStats.totalPredictions}+`
                        )}
                      </div>
                      <div className="text-gray-500">{t.estPredictions}</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900 mb-1">
                        {isLoadingStats ? (
                          <div className="animate-pulse bg-gray-300 h-5 w-12 rounded mx-auto"></div>
                        ) : (
                          userStats.marketsWon > 0 ? t.active : t.newTrader
                        )}
                      </div>
                      <div className="text-gray-500">{t.status}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard - Clean */}
        <div className="border border-gray-200 rounded-lg">
          <div className="px-4 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">{t.globalLeaderboard}</h2>
          </div>
  
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t.rank}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t.trader}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t.earnings}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 hidden sm:table-cell">{t.potsWon}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t.accuracy}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoadingLeaderboard ? (
                  [...Array(5)].map((_, index) => (
                    <tr key={`loading-${index}`}>
                      <td className="px-4 py-3">
                        <div className="animate-pulse bg-gray-300 h-4 w-8 rounded"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="animate-pulse bg-gray-300 h-4 w-24 rounded"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="animate-pulse bg-gray-300 h-4 w-16 rounded"></div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="animate-pulse bg-gray-300 h-4 w-8 rounded"></div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="animate-pulse bg-gray-300 h-4 w-12 rounded"></div>
                      </td>
                    </tr>
                  ))
                ) : leaderboardData.totalUsers === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      <p>No leaderboard data yet. Be the first to win a pot!</p>
                    </td>
                  </tr>
                ) : (
                  <>
                    {leaderboardData.users.map((user) => (
                      <tr
                        key={user.rank}
                        className={`${user.isCurrentUser ? 'bg-blue-50' : ''} hover:bg-gray-50 transition-colors`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium text-gray-900">#{user.rank}</span>
                            {user.rank <= 3 && (
                              <Crown className={`w-3 h-3 ${user.rank === 1 ? 'text-yellow-500' : user.rank === 2 ? 'text-gray-400' : 'text-amber-600'}`} />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {user.imageUrl ? (
                              <img
                                src={user.imageUrl}
                                alt={user.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-xs text-gray-600 font-medium">
                                  {user.name.charAt(2)}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className={`text-sm font-medium ${user.isCurrentUser ? 'text-blue-900' : 'text-gray-900'}`}>
                                {user.name}
                              </div>
                              {user.isCurrentUser && (
                                <div className="text-xs text-blue-600">You</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {user.earnings}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                          {user.marketsWon}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{user.accuracy}</div>
                          <div className="text-xs text-gray-500 sm:hidden">{user.marketsWon} pots</div>
                        </td>
                      </tr>
                    ))}

                    {leaderboardData.showSeparator && (
                      <tr className="bg-gray-50">
                        <td colSpan={5} className="px-4 py-2 text-center">
                          <span className="text-xs text-gray-400">• • •</span>
                        </td>
                      </tr>
                    )}

                    {leaderboardData.currentUser && leaderboardData.showSeparator && (
                      <tr className="bg-blue-50">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-blue-900">#{leaderboardData.currentUser.rank}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {leaderboardData.currentUser.imageUrl ? (
                              <img
                                src={leaderboardData.currentUser.imageUrl}
                                alt={leaderboardData.currentUser.name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center">
                                <span className="text-xs text-blue-700 font-medium">
                                  {leaderboardData.currentUser.name.charAt(2)}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-blue-900">
                                {leaderboardData.currentUser.name}
                              </div>
                              <div className="text-xs text-blue-600">You</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {leaderboardData.currentUser.earnings}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">
                          {leaderboardData.currentUser.marketsWon}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{leaderboardData.currentUser.accuracy}</div>
                          <div className="text-xs text-gray-500 sm:hidden">{leaderboardData.currentUser.marketsWon} pots</div>
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;