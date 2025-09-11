export type Language = 'en' | 'pt-BR';

export interface Translations {
  // Hero Section
  heroTitle: string;
  heroSubtitle: string;
  
  // Markets Section
  marketsTitle: string;
  currentPrice: string;
  availability: string;
  potSize: string;
  higher: string;
  lower: string;
  comingSoon: string;
  
  // Market Questions
  bitcoinQuestion: string;
  ethereumQuestion: string;
  solanaQuestion: string;
  teslaQuestion: string;
  nvidiaQuestion: string;
  sp500Question: string;
  
  // How It Works Section
  howItWorksTitle: string;
  howItWorksSubtitle: string;
  step1Title: string;
  step1Description: string;
  step2Title: string;
  step2Description: string;
  step3Title: string;
  step3Description: string;
  searchPlaceholder: string;
  noMarketsFound: string;

  // Tutorial Section
  tutorialStep1Title: string;
  tutorialStep1Description: string;
  tutorialStep2Title: string;
  tutorialStep2Description: string;
  tutorialStep3Title: string;
  tutorialStep3Description: string;
  tutorialStep4Title: string;
  tutorialStep4Description: string;
  tutorialStep5Title: string;
  tutorialStep5Description: string;
  skipTutorial: string;
  previous: string;
  next: string;
  startPlaying: string;
  tutorialTip: string;
  tutorialGoal: string;
  yourGoal: string;

  // PredictionPotTest specific
  bitcoinPotTitle: string;
  connectWalletPrompt: string;
  alreadyInPot: string;
  enteredPotMessage: string;
  goToBetting: string;
  entryAmount?: string;
  amountBalance?: string; // Added for consistency with other sections
  approveSpending?: string; // Added for the approve spending section
  allowContracts?: string; // Added for the allowance message
  enterPot?: string; // Added for the enter pot section 
  pay10USDC?: string; // Added for the payment instruction in the enter pot section 
  approveProcessing?: string; // Added for the processing state of the approve button
  alreadyApproved?: string; // Added for the already approved state of the approve button
  approveUSDC?: string; // Added for the approve USDC button text
  enterPotProcessing?: string; // Added for the processing state of the enter pot button
  enterPotButton?: string; // Added for the enter pot button text
  insufficientUSDC?: string; // Added for the insufficient balance message
  pleaseApproveFirst?: string; // Added for the message to approve USDC spending first  
  appleQuestion?: string; // Added for the Apple stock question
  googleQuestion?: string; // Added for the Google stock question
  microsoftQuestion?: string; // Added for the Microsoft stock question
  amazonQuestion?: string; // Added for the Amazon stock question
  metaQuestion?: string; // Added for the Meta stock question
  dogecoinQuestion?: string; // Added for the Dogecoin question
  
  // PredictionPotTest interface elements
  processingYourEntry?: string;
  preparingYourPots?: string;
  fundYourAccount?: string;
  fundAccountMessage?: string;
  letsFundAccount?: string;
  backToHome?: string;
  back?: string;
  waitingWalletConfirmation?: string;
  transactionConfirming?: string;
  viewOnBasescan?: string;
  reEntryRequired?: string;
  reEntryDescription?: string;
  payReEntryFee?: string;
  processingReEntry?: string;
  payToReEnter?: string;
  loadingTournamentInfo?: string;
  checkingTournamentStatus?: string;
  specialDiscountAvailable?: string;
  congratulations?: string;
  regularPrice?: string;
  yourPrice?: string;
  saveAmount?: string;
  usingDiscount?: string;
  payToEnter?: string;
  joinPredictionsTournament?: string;
  competeForPot?: string;
  enterCode?: string;
  enterButton?: string;
  referralProgram?: string; // Added for referral navigation links
  referralCode?: string; // Added for referral code input label
  cardanoQuestion?: string; // Added for the Cardano question
  xrpQuestion?: string; // Added for the XRP question
  ftse100Question?: string; // Added for the FTX token question
  goldQuestion?: string; // Added for the Gold question
  howItWorksLink?: string; // Added for the link to the How It Works section
  chelseaManUtdQuestion?: string; // Added for the Chelsea

  
  
  // Market Names
  marketTrending: string;
  marketCrypto: string;
  marketStocks: string;
  marketMusicCharts: string;
  marketXTrendingTopics: string;
  marketWeather: string;
  marketSports: string;
  marketPolitics: string;
  marketElections: string;
  marketTVShows: string;
  marketPopCulture: string;
  marketTechNews: string;
  marketBoxOffice: string;
  marketAstronomy: string;
  marketFashionTrends: string;
  marketCelebrityNews: string;
  marketHealthFitness: string;
  marketGaming: string;
  marketTravelTourism: string;

  // Personalized Labels
  personalizedForYou: string;
  personalizedBitcoin: string;
  personalizedTesla: string;
  personalizedSabrinaCarrenter: string;
  personalizedPopularHashtags: string;
  personalizedClimate: string;
  personalizedFootball: string;
  personalizedTrump: string;
  personalizedUS2024: string;
  personalizedTechNews: string;
  personalizedFashionTrends: string;
  personalizedAstronomy: string;
  personalizedPopCulture: string;
  personalizedGaming: string;
  personalizedTravelTourism: string;
  personalizedCelebrityNews: string;
  personalizedHealthFitness: string;
  personalizedTVShows: string;
  personalizedBoxOffice: string;

  // Header
  searchPotsPlaceholder: string;
  howItWorks: string;
  yourBalance: string;
  yourBalanceMobile: string;

  // Email Collection
  readyToPlay: string;
  joinGlobalCommunity: string;
  enterEmailAddress: string;
  joinCommunity: string;
  joining: string;
  skipForNow: string;
  connectWallet: string;
  clickSignInButton: string;
  emailCollection: string;

  // Tutorial - How It Works
  skipButton: string;
  globalCompetition: string;
  globalCompetitionDesc: string;
  dailyPredictions: string;
  dailyPredictionsDesc: string;
  dynamicPricing: string;
  dynamicPricingDesc: string;
  secondChances: string;
  secondChancesDesc: string;
  finalShowdown: string;
  finalShowdownDesc: string;
  liveStats: string;
  liveStatsDesc: string;

  // Footer
  footerText: string;

  // Discord FAQ
  faqTitle: string;
  backToMarkets: string;
  stillHaveQuestions: string;
  joinCommunitySupport: string;
  discordSupport: string;
  followOnX: string;

  // FAQ Questions
  howSignInQuestion: string;
  howSignInAnswer: string;
  howPrediwinWorksQuestion: string;
  howPrediwinWorksAnswer: string;
  dynamicPricingPublicPotsQuestion: string;
  dynamicPricingPublicPotsAnswer: string;
  wrongPredictionQuestion: string;
  wrongPredictionAnswer: string;
  privatePotsQuestion: string;
  privatePotsAnswer: string;
  createSharePrivatePotQuestion: string;
  createSharePrivatePotAnswer: string;
  controlPrivatePotsQuestion: string;
  controlPrivatePotsAnswer: string;
  privatePotParticipantsQuestion: string;
  privatePotParticipantsAnswer: string;
  needEthereumQuestion: string;
  needEthereumAnswer: string;
  entryFeesCalculationQuestion: string;
  entryFeesCalculationAnswer: string;
  referralSystemQuestion: string;
  referralSystemAnswer: string;
  eventTypesQuestion: string;
  eventTypesAnswer: string;
  makePredictionsQuestion: string;
  makePredictionsAnswer: string;
  winnersQuestion: string;
  winnersAnswer: string;
  getWinningsQuestion: string;
  getWinningsAnswer: string;
  withoutCryptoExperienceQuestion: string;
  withoutCryptoExperienceAnswer: string;
  livePotsQuestion: string;
  livePotsAnswer: string;
  gamblingQuestion: string;
  gamblingAnswer: string;

  // Bookmarks Page
  connectYourWallet: string;
  connectWalletBookmarks: string;
  loadingBookmarks: string;
  yourPots: string;
  potsBookmarkedEntered: string;
  enteredPots: string;
  bookmarked: string;
  noBookmarksYet: string;
  startBookmarking: string;
  explore: string;
  marketNotAvailable: string;
  removeBookmark: string;
  viewPot: string;
  goToCategory: string;
  inPot: string;
  noPotsEntered: string;
  enterPredictionPots: string;
  findPotsToEnter: string;
  potsYouEntered: string;
  participatingInPot: string;
  view: string;
  unknownMarket: string;

  // Navigation Menu
  home: string;
  privateMarkets: string;
  fundAccount: string;
  statsRankings: string;
  games: string;
  myPots: string;
  ideas: string;
  liveMarkets: string;
  wallet: string;
  logOut: string;
  discordSupportNav: string;
  followOnXNav: string;
  toggleMenu: string;
  closeMenu: string;

  // Bottom Navigation
  bottomNavHome: string;
  bottomNavLive: string;
  bottomNavSearch: string;
  bottomNavMyPots: string;

  // MakePredictionsPage (VERY LIMITED - only safe display strings)
  loadingPredictions: string;
  finalPredictions: string;
  congratulationsFinal10: string;
  gotIt: string;
  loadingYourBet: string;
  nextQuestion: string;
  nextElimination: string;
  importantTimers: string;
  connectWalletTitle: string;
  connectToStartPredicting: string;
  accessRequired: string;
  mustJoinPotFirst: string;
  yesButton: string;
  noButton: string;
  
  // Re-entry and Status
  reentryRequired: string;
  dailyOutcomeSet: string;
  disputeOutcome: string;
  evidenceSubmitted: string;
  evidenceWindowClosed: string;
  resultsDay: string;
  predictionsClosed: string;
  youChose: string;
  for: string;
  tomorrow: string;
  managePrediction: string;
  activePrediction: string;
  makePrediction: string;
  underReview: string;
  status: string;
  evidenceSubmittedAt: string;
  submitEvidence: string;
  evidenceSubmissionTerms: string;

  // Timer Messages
  entered: string;
  beginsSoon: string;
  provisional: string;
  actualResult: string;
  processing: string;
  evidencePlaceholder: string;
  submittingEvidence: string;
  wrongPredictionIn: string;
  payTodaysEntryFee: string;
  
  // Date and prediction timing
  predictingForTomorrow: string;
  resultsReveal: string;
  tomorrowAtMidnight: string;
  autoSubmittingChoice: string;
  
  // BookmarksPage - Active Pots section
  yourActivePots: string;
  currentlyParticipatingIn: string;
  pot: string;
  pots: string;
  clickAnyPotAbove: string;
}

export const translations: Record<Language, Translations> = {
  'en': {
    // Hero Section
    heroTitle: 'Will you predict higher or lower?',
    heroSubtitle: 'Choose your market and make your prediction',
    
    // Markets Section
    marketsTitle: 'Will you predict higher or lower?',
    currentPrice: 'Current Price',
    availability: 'Available',
    potSize: 'Pot Size',
    higher: 'Yes',
    lower: 'No',
    comingSoon: 'market coming soon!',
    
    // Market Questions
    bitcoinQuestion: 'Will Bitcoin end the day higher?',
    ethereumQuestion: 'Will Ethereum end the day higher?',
    solanaQuestion: 'Will Solana end the day higher?',
    teslaQuestion: 'Will Tesla stock end the day higher?',
    nvidiaQuestion: 'Will NVIDIA stock end the day higher?',
    sp500Question: 'Will S&P 500 end the day higher?',
    
    // How It Works Section
    howItWorksTitle: 'How It Works',
    howItWorksSubtitle: 'Join prediction markets with real rewards and consequences',
    step1Title: 'Enter the Pot',
    step1Description: 'Join weekly prediction markets. Each market has its own growing pot of participants.',
    step2Title: 'Make Your Prediction',
    step2Description: 'Predict tomorrow\'s outcome - will Bitcoin go up or down? Lock in your prediction before the deadline.',
    step3Title: 'Winners Take All',
    step3Description: 'Correct predictors at the end of the week split the entire pot equally. Wrong predictors get temporarily blocked from predicting until next week.',
    searchPlaceholder: "Search markets...",
    noMarketsFound: "No markets found. Please try a different search.",

    // Tutorial Section
    tutorialStep1Title: 'Weekly Prediction Markets',
    tutorialStep1Description: 'Survive the week by making correct predictions across crypto, stocks, sports and more. Entry fees increase daily (Sun $0.01 → Fri $0.06).',
    tutorialStep2Title: 'Get Your Tokens & Enter the Pot',
    tutorialStep2Description: 'You need USDC (for pot entries) and ETH (for gas fees ~$0.01). Buy them on our Buy page or receive from any wallet. Then pay the daily entry fee to join any prediction market. Sundays are cheapest at $0.01 USDC!',
    tutorialStep3Title: 'Daily Predictions (Sunday-Friday)',
    tutorialStep3Description: 'Every day, predict tomorrow\'s outcome in your chosen market. Wrong predictions require a re-entry fee to continue playing.',
    tutorialStep4Title: 'Saturday Results & New Pot',
    tutorialStep4Description: 'Winners split the pot every Saturday. The game restarts Sunday with fresh entry fees and a new weekly cycle.',
    tutorialStep5Title: 'Ready to Start?',
    tutorialStep5Description: 'Choose your market, join early for the best prices, make smart predictions, and survive to split the weekly pot!',
    skipTutorial: 'Skip Tutorial',
    previous: 'Previous',
    next: 'Next',
    startPlaying: 'Start Playing',
    tutorialTip: 'The more accurate your predictions, the more you\'ll win!',
    tutorialGoal: 'Keep predicting correctly until you\'re one of the last 10.',
    yourGoal: 'Your Goal:',

    // PredictionPotTest specific
    bitcoinPotTitle: 'Prediction Market',
    connectWalletPrompt: 'Please connect your wallet to interact with the contract.',
    alreadyInPot: "🎉 You're in!",
    enteredPotMessage: "You can now place your predictions!",
    goToBetting: 'Go to Prediction Page',
    entryAmount: 'Entry Amount',
    amountBalance: 'Market Balance', // Added for consistency with other sections
    approveSpending: '1. Approve USDC Spending',
    allowContracts: 'Allow the contract to spend your USDC. Current allowance:',
    enterPot: 'Enter Prediction Pot',
    pay10USDC: 'Pay 10 USDC to enter the pot. Make sure you have approved USDC spending first.',
    approveProcessing: 'Processing...',
    alreadyApproved: 'Already Approved',
    approveUSDC: 'Approve USDC',
    enterPotProcessing: 'Processing...',
    enterPotButton: 'Enter Pot (10 USDC)',
    insufficientUSDC: 'Insufficient USDC balance',
    pleaseApproveFirst: 'Please approve USDC spending first',
    amazonQuestion: 'Will Amazon stock end the day higher?',
    appleQuestion: 'Will Apple stock end the day higher?',
    googleQuestion: 'Will Google stock end the day higher?',
    microsoftQuestion: 'Will Microsoft stock end the day higher?',
    metaQuestion: 'Will Meta stock end the day higher?',
    dogecoinQuestion: 'Will Dogecoin end the day higher?',
    cardanoQuestion: 'Will Cardano end the day higher?',
    xrpQuestion: 'Will XRP end the day higher?',
    ftse100Question: 'Will FTSE 100 end the day higher?',
    goldQuestion: 'Will Gold end the day higher?',
    howItWorksLink: 'How it works >', // Added for the link to the How It Works section
    chelseaManUtdQuestion: 'Will Chelsea vs Manchester United end with a higher score for Chelsea?',
    
    
    // PredictionPotTest interface elements
    processingYourEntry: 'Processing your entry...',
    preparingYourPots: 'Preparing your pots...',
    fundYourAccount: 'Fund Your Account',
    fundAccountMessage: 'You need at least $0.01 worth of ETH to participate in prediction pots.',
    letsFundAccount: "Let's fund your account →",
    backToHome: '← Back to Home',
    back: 'Back',
    waitingWalletConfirmation: 'Waiting for wallet confirmation...',
    transactionConfirming: 'Transaction confirming on blockchain...',
    viewOnBasescan: 'View on BaseScan →',
    reEntryRequired: '⚠️ Re-entry Required',
    reEntryDescription: 'You made a wrong prediction and need to pay today\'s entry fee to re-enter this specific pot.',
    payReEntryFee: 'Pay the re-entry fee to resume predicting in this pot',
    processingReEntry: 'Processing Re-entry...',
    payToReEnter: 'Pay to Re-enter',
    loadingTournamentInfo: 'Loading Tournament Info...',
    checkingTournamentStatus: 'Checking tournament status',
    specialDiscountAvailable: 'Special Discount Available',
    congratulations: 'Congratulations!!!',
    regularPrice: 'Regular',
    yourPrice: 'Your Price',
    saveAmount: 'SAVE',
    usingDiscount: 'Using Discount...',
    payToEnter: 'Pay to Enter',
    joinPredictionsTournament: 'Join Predictions Tournament',
    competeForPot: 'Compete for the pot',
    enterCode: 'Enter code...',
    enterButton: 'Enter',
    referralProgram: 'Referrals', // Added for referral navigation links
    referralCode: 'Referral Code (Optional)', // Added for referral code input label

    // Market Names
    marketTrending: 'Trending',
    marketCrypto: 'Crypto',
    marketStocks: 'Stocks',
    marketMusicCharts: 'Music Charts',
    marketXTrendingTopics: 'X Trending Topics',
    marketWeather: 'Weather',
    marketSports: 'Sports',
    marketPolitics: 'Politics',
    marketElections: 'Elections',
    marketTVShows: 'TV Shows',
    marketPopCulture: 'Pop Culture',
    marketTechNews: 'Tech News',
    marketBoxOffice: 'Box Office',
    marketAstronomy: 'Astronomy',
    marketFashionTrends: 'Fashion Trends',
    marketCelebrityNews: 'Celebrity News',
    marketHealthFitness: 'Health & Fitness',
    marketGaming: 'Gaming',
    marketTravelTourism: 'Travel & Tourism',

    // Personalized Labels
    personalizedForYou: 'For you',
    personalizedBitcoin: 'Bitcoin',
    personalizedTesla: 'Tesla',
    personalizedSabrinaCarrenter: 'Sabrina Carpenter',
    personalizedPopularHashtags: 'Popular Hashtags',
    personalizedClimate: 'Climate',
    personalizedFootball: 'Football',
    personalizedTrump: 'Trump',
    personalizedUS2024: 'US 2024',
    personalizedTechNews: 'Tech News',
    personalizedFashionTrends: 'Fashion Trends',
    personalizedAstronomy: 'Astronomy',
    personalizedPopCulture: 'Pop Culture',
    personalizedGaming: 'Gaming',
    personalizedTravelTourism: 'Travel & Tourism',
    personalizedCelebrityNews: 'Celebrity News',
    personalizedHealthFitness: 'Health & Fitness',
    personalizedTVShows: 'TV Shows',
    personalizedBoxOffice: 'Box Office',

    // Header
    searchPotsPlaceholder: 'Search pots...',
    howItWorks: 'How it works',
    yourBalance: 'Your balance',
    yourBalanceMobile: 'Balance',

    // Email Collection
    readyToPlay: 'Ready to Play?',
    joinGlobalCommunity: 'Join the global prediction community and start competing today',
    enterEmailAddress: 'Enter your email address',
    joinCommunity: 'Join Community',
    joining: 'Joining...',
    skipForNow: 'Skip for now',
    connectWallet: 'Connect Wallet',
    clickSignInButton: 'Click the Sign In button at the top right of the screen to connect your wallet',
    emailCollection: 'Email collection',

    // Tutorial - How It Works
    skipButton: 'Skip →',
    globalCompetition: 'Global competition',
    globalCompetitionDesc: 'Players worldwide compete in the same prediction tournaments.',
    dailyPredictions: 'Daily predictions',
    dailyPredictionsDesc: 'Choose and enter a pot so you can predict what\'s gonna happen tomorrow!',
    dynamicPricing: 'Dynamic pricing',
    dynamicPricingDesc: 'Entry fees start low but will double after the 5th day - join early to save!',
    secondChances: 'Second chances',
    secondChancesDesc: 'Eliminated? Pay today\'s fee to re-enter anytime.',
    finalShowdown: 'Final showdown',
    finalShowdownDesc: 'Tournament runs until final 10 players remain for the last day.',
    liveStats: 'Live stats',
    liveStatsDesc: 'Stay informed with up-to-date information for each pot.',

    // Footer
    footerText: 'Prediwin — All rights reserved.',

    // Discord FAQ
    faqTitle: 'Frequently Asked Questions',
    backToMarkets: 'Back to markets',
    stillHaveQuestions: 'Still have questions? Join our community for more support.',
    joinCommunitySupport: 'Join our community for more support.',
    discordSupport: 'Discord Support',
    followOnX: 'Follow on X',

    // FAQ Questions
    howSignInQuestion: 'How do I sign in?',
    howSignInAnswer: 'To sign in, click on the "Sign In" button, then select "Create Account". Enter your details to complete the registration process. If you\'re on a mobile phone, make sure to tap on the black screen at the end to finalize your account creation.',
    howPrediwinWorksQuestion: 'How does Prediwin work?',
    howPrediwinWorksAnswer: 'Prediwin.com is a predictions platform that offers two main experiences. The first are Public pots, which are prediction competitions where users make daily predictions on global events. Each pot has its own timeline controlled by the number of participants still in the tournament - tournaments automatically reach their final day once player count drops below 10. Entry fees increase based on days since the pot started (not calendar days). Players get eliminated daily for making a wrong prediction and may choose to re-enter by paying the current entry fee. The second are Private pots, which allow you to create your own custom prediction topics and invite friends to join by sharing a link.',
    dynamicPricingPublicPotsQuestion: 'How does dynamic pricing work for Public pots?',
    dynamicPricingPublicPotsAnswer: 'Public pots use individual pot timers with dynamic pricing based on days since each pot started. Entry fees follow this structure: Days 1-4 have fixed early pricing ($0.02, $0.03, $0.04, $0.05 USD in ETH). Starting on day 5, fees begin at $0.10 USD and double each subsequent day. Each pot has its own independent timeline controlled by the number of participants still in the tournament - tournaments automatically reach their final day once player count drops below 10. Private pots let you set any entry fee you want.',
    wrongPredictionQuestion: 'What happens if I make a wrong prediction?',
    wrongPredictionAnswer: 'In Public pots: If you predict incorrectly, you\'ll be eliminated but can re-enter by paying the current day\'s entry fee. The goal is to stay in the tournament until it reaches its final day (which happens automatically when player count drops below 10) and winners are determined. In Private pots: The pot creator decides the final date, outcome and winners - you cannot re-enter a private pot after the winners have been determined.',
    privatePotsQuestion: 'What are Private pots and how do they work?',
    privatePotsAnswer: 'Private pots are custom prediction pots you create on any topic - crypto prices, sports outcomes, world events, or fun questions with friends. As the creator, you set the entry fee, invite participants via a shareable link, and decide the winners. It\'s perfect for friend groups, teams, or communities who want their own prediction competitions.',
    createSharePrivatePotQuestion: 'How do I create and share a Private pot?',
    createSharePrivatePotAnswer: 'Go to "Private pots" in the navigation menu, set your pot name and description, then deploy it for minimal gas fees (~$0.01-0.05 on Base). You\'ll receive a shareable URL that you can send to friends via text, social media, or email. Anyone with the link can join your pot by paying the entry fee you set.',
    controlPrivatePotsQuestion: 'Who controls Private pots?',
    controlPrivatePotsAnswer: 'As the pot creator, you have full control. You set the entry amount, manage participants, decide when to close entries, determine the winning outcome, and distribute rewards to winners. The platform provides tools to see all participants and their predictions in a beautiful interface.',
    privatePotParticipantsQuestion: 'How do Private pot participants join?',
    privatePotParticipantsAnswer: 'Friends click your shared link, connect their wallet, pay the entry fee in ETH, and make their prediction. They can see all other participants (by wallet address or email if submitted), entry amounts, and prediction status. It\'s fully transparent so everyone can see who predicted what.',
    needEthereumQuestion: 'Why do I need Ethereum to place predictions?',
    needEthereumAnswer: 'You need ETH for gas fees on the Base network (usually ~$0.01-0.05 per transaction). This covers the blockchain transaction costs for entering pots, making predictions, and claiming winnings. You\'ll also need ETH to pay the actual pot\'s entry fees.',
    entryFeesCalculationQuestion: 'How are entry fees calculated in Public pots?',
    entryFeesCalculationAnswer: 'Public pots follow a dynamic pricing model based on days since each pot started (not calendar days). Days 1-4 have fixed pricing: $0.02, $0.03, $0.04, $0.05 USD in ETH. After day 4, fees begin to double starting at $0.10 USD on day 5, then $0.20 on day 6, $0.40 on day 7, and so on. Each pot has its own independent timeline. Private pots let you set any entry fee you want.',
    referralSystemQuestion: 'How does the referral system work?',
    referralSystemAnswer: 'Each user gets a unique 8-character referral code. When 3 friends succesfully enter pots using your code, you earn 1 free pot entry. This system includes fraud protection to ensure legitimate referrals and works for both Public and Private pots.',
    eventTypesQuestion: 'What types of events can I predict?',
    eventTypesAnswer: 'Public pots cover cryptocurrency prices, stock movements, sports, and world events. Private pots are unlimited - create pots on anything: "Will it rain tomorrow?", "Who wins the office fantasy league?", "Will our friend get the job?", crypto prices, sports bets with friends, or any measurable outcome you can think of.',
    makePredictionsQuestion: 'How do I make predictions?',
    makePredictionsAnswer: 'After entering a pot, you choose YES or NO for the outcome (or positive/negative for price movements). In Public pots, you can make one prediction per day and update it before cutoff. In Private pots, you typically make one prediction per pot topic set by the creator.',
    winnersQuestion: 'When and how are winners determined?',
    winnersAnswer: 'Public pots: Winners are determined when tournaments reach their final day (automatically triggered when player count drops below 10), based on actual event results. Private pots: The pot creator decides when to close predictions, determines the actual outcome, and distributes rewards to winners through the smart contract.',
    getWinningsQuestion: 'How do I get my winnings?',
    getWinningsAnswer: 'Winnings are automatically distributed through smart contracts on the Base network. Once you\'re determined as a winner, the ETH is sent directly to your connected wallet - no manual claiming required. This works the same for both Public and Private pots.',
    withoutCryptoExperienceQuestion: 'Can I participate without crypto experience?',
    withoutCryptoExperienceAnswer: 'Not yet! The platform includes a comprehensive 5-step tutorial and a built-in buy page where you can easily purchase ETH using Coinbase OnChainKit. The interface is designed to be user-friendly for crypto beginners. We recommend users familiarize themselves with basic crypto concepts like wallets, gas fees, and ETH before participating.',
    livePotsQuestion: 'What are Live pots?',
    livePotsAnswer: 'Live pots are hourly prediction rounds that activate after entering a live pot. Once you pay the entry fee, you\'ll participate in structured hourly question sessions covering various topics. It\'s a time-based format designed for users who enjoy regular prediction challenges with scheduled results every hour.',
    gamblingQuestion: 'Is this gambling?',
    gamblingAnswer: 'Prediwin is a prediction pot platform focused on forecasting skills rather than gambling. Users make informed predictions about real-world events using their knowledge and analysis, similar to platforms like Polymarket or Kalshi. Private pots add a social element where friends compete on topics they care about.',

    // Bookmarks Page
    connectYourWallet: 'Connect Your Wallet',
    connectWalletBookmarks: 'Connect your wallet to view your bookmarked pots.',
    loadingBookmarks: 'Loading your bookmarks...',
    yourPots: 'Your Pots',
    potsBookmarkedEntered: 'Pots you\'ve bookmarked and entered',
    enteredPots: 'Entered pots',
    bookmarked: 'Bookmarked',
    noBookmarksYet: 'No bookmarks yet',
    startBookmarking: 'Start bookmarking questions to see them here.',
    explore: 'Explore',
    marketNotAvailable: 'Market question not available',
    removeBookmark: 'Remove bookmark',
    viewPot: 'View Pot',
    goToCategory: 'Go to Category',
    inPot: 'in pot',
    noPotsEntered: 'No pots entered yet',
    enterPredictionPots: 'Enter prediction pots to start competing and making predictions.',
    findPotsToEnter: 'Find Pots to Enter',
    potsYouEntered: 'Pots You\'ve Entered',
    nextQuestion: 'Next Question:',
    participatingInPot: 'You\'re participating in this pot. Click to make predictions and check your status.',
    view: 'View',
    unknownMarket: 'Unknown Market',

    // Navigation Menu
    home: 'Home',
    privateMarkets: 'Private Markets',
    fundAccount: 'Fund Account',
    statsRankings: 'Stats & Rankings',
    games: 'Games',
    myPots: 'My Pots',
    ideas: 'Ideas',
    liveMarkets: 'Live Markets',
    wallet: 'Wallet',
    logOut: 'Log out',
    discordSupportNav: 'Discord Support',
    followOnXNav: 'Follow on X',
    toggleMenu: 'Toggle menu',
    closeMenu: 'Close menu',

    // Bottom Navigation
    bottomNavHome: 'Home',
    bottomNavLive: 'Live',
    bottomNavSearch: 'Search',
    bottomNavMyPots: 'My Pots',

    // MakePredictionsPage (VERY LIMITED - only safe display strings)
    loadingPredictions: 'Loading your predictions...',
    finalPredictions: 'Final Predictions',
    congratulationsFinal10: 'Congratulations! You are down to the last 10. Make your predictions as you normally would and if you win we will notify you.',
    gotIt: 'Got it! 🎯',
    loadingYourBet: 'Loading your prediction...',
    nextElimination: 'Next Elimination',
    importantTimers: 'Important Timers',
    connectWalletTitle: 'Connect Wallet',
    connectToStartPredicting: 'Connect to start predicting',
    accessRequired: 'Access Required',
    mustJoinPotFirst: 'You must join the pot first',

    yesButton: 'YES',
    noButton: 'NO',
    
    // Re-entry and Status
    reentryRequired: 'Re-entry Required',
    dailyOutcomeSet: 'Daily Outcome Set',
    disputeOutcome: 'Dispute the Outcome?',
    evidenceSubmitted: 'Evidence Submitted',
    evidenceWindowClosed: 'Evidence Window Closed',
    resultsDay: 'Results Day! 🎉',
    predictionsClosed: 'Predictions Closed',
    youChose: 'You Chose',
    for: 'For:',
    tomorrow: 'tomorrow',
    managePrediction: 'Manage your current prediction',
    activePrediction: 'Active Prediction',
    makePrediction: 'Make Prediction',
    underReview: 'Under Review',
    status: 'Status:',
    evidenceSubmittedAt: 'Evidence submitted:',
    submitEvidence: 'Submit Evidence',
    evidenceSubmissionTerms: 'Evidence Submission Terms:',

    // Timer Messages
    entered: 'Waiting',
    beginsSoon: 'Begins soon',
    provisional: 'provisional',
    actualResult: 'Actual result',
    processing: 'Processing...',
    evidencePlaceholder: 'Provide detailed evidence why this outcome is incorrect. Include links, sources, or explanations...',
    submittingEvidence: 'Submitting Evidence...',
    wrongPredictionIn: 'Wrong prediction in',
    payTodaysEntryFee: 'Pay today\'s entry fee to continue.',
    
    // Date and prediction timing
    predictingForTomorrow: 'Predicting for Tomorrow',
    resultsReveal: 'Results Reveal',
    tomorrowAtMidnight: 'Tomorrow at Midnight',
    autoSubmittingChoice: 'Auto-Submitting Your Choice',
    
    // BookmarksPage - Active Pots section
    yourActivePots: 'Your Active Pots',
    currentlyParticipatingIn: 'You\'re currently participating in',
    pot: 'pot',
    pots: 'pots',
    clickAnyPotAbove: 'Click on any pot above to make predictions and compete for the pot.'
  },
  'pt-BR': {
    // Hero Section
    heroTitle: 'Você prevê alta ou baixa?',
    heroSubtitle: 'Escolha seu mercado e faça sua previsão',
    
    // Markets Section
    marketsTitle: 'Você prevê alta ou baixa?',
    currentPrice: 'Preço Atual',
    availability: 'Disponível',
    potSize: 'Valor do Pote',
    higher: 'Sim',
    lower: 'Nao',
    comingSoon: 'mercado em breve!',
    
    // Market Questions
    bitcoinQuestion: 'O Bitcoin vai terminar o dia em alta?',
    ethereumQuestion: 'O Ethereum vai terminar o dia em alta?',
    solanaQuestion: 'O Solana vai terminar o dia em alta?',
    teslaQuestion: 'A ação da Tesla vai terminar o dia em alta?',
    nvidiaQuestion: 'A ação da NVIDIA vai terminar o dia em alta?',
    sp500Question: 'O S&P 500 vai terminar o dia em alta?',
    
    // How It Works Section
    howItWorksTitle: 'Como Funciona',
    howItWorksSubtitle: 'Participe de mercados de previsão com recompensas e consequências reais',
    step1Title: 'Entre no Pote',
    step1Description: 'Pague 0.01 USDC para participar dos mercados de previsão diários. Cada mercado tem seu próprio pote crescente de participantes.',
    step2Title: 'Faça Sua Previsão',
    step2Description: 'Preveja o resultado de amanhã - Bitcoin vai subir ou descer? Confirme sua previsão antes do prazo.',
    step3Title: 'Vencedores Levam Tudo',
    step3Description: 'Preditores corretos dividem todo o pote igualmente. Preditores errados ficam temporariamente bloqueados de fazer previsões até a próxima rodada.',
    searchPlaceholder: "Pesquisar mercados...",
    noMarketsFound: "Nenhum mercado encontrado. Por favor, tente uma pesquisa diferente.",

    // Tutorial Section
    tutorialStep1Title: 'Bem-vindo aos Mercados de Previsão',
    tutorialStep1Description: 'Junte-se a milhares de jogadores em competições diárias de previsão onde habilidade e estratégia ganham recompensas reais.',
    tutorialStep2Title: 'Obtenha Tokens e Entre no Pote',
    tutorialStep2Description: 'Você precisa de USDC (para entradas) e ETH (para taxas de gás ~$0.01). Compre na nossa página ou receba de qualquer carteira. Depois pague a taxa diária para entrar no mercado de previsão. Domingos custam apenas $0.01 USDC!',
    tutorialStep3Title: 'Faça Suas Previsões (Ter-Qui)',
    tutorialStep3Description: 'Previsões abrem de terça a quinta-feira. Preveja se Bitcoin vai subir ou descer no próximo dia. Escolha sabiamente - sua previsão determina seu destino.',
    tutorialStep4Title: 'Dia dos Resultados Sexta',
    tutorialStep4Description: 'Vencedores são determinados sexta à meia-noite UTC. Preditores corretos dividem o pote igualmente. Preditores errados ficam temporariamente bloqueados da próxima rodada.',
    tutorialStep5Title: 'Pronto para Jogar?',
    tutorialStep5Description: 'Agora você entende as regras. Conecte sua carteira e faça sua primeira previsão para começar a ganhar!',
    skipTutorial: 'Pular Tutorial',
    previous: 'Anterior',
    next: 'Próximo',
    startPlaying: 'Começar a Jogar',
    tutorialTip: 'Quanto mais precisas suas previsões, mais você ganhará!',
    tutorialGoal: 'Continue prevendo corretamente até ser um dos últimos 10.',
    yourGoal: 'Seu Objetivo:',

    // PredictionPotTest specific
    bitcoinPotTitle: 'Detalhes do Pote',
    connectWalletPrompt: 'Por favor, conecte sua carteira para interagir com o contrato.',
    alreadyInPot: "🎉 Você está no Pote!",
    enteredPotMessage: "Você entrou com sucesso no pote. Agora pode fazer suas previsões!",
    goToBetting: 'Ir para a Página de Predições',
    entryAmount: 'Valor de Entrada',
    amountBalance: 'Saldo do Pote', // Added for consistency with other sections
    approveSpending: '1. Aprovar gastos de USDC',
    allowContracts: 'Permitir que o contrato gaste seu USDC. Limite atual:',
    enterPot: 'Entrar no Pote de Previsões',
    pay10USDC: 'Pague 10 USDC para entrar no pote. Certifique-se de ter aprovado os gastos de USDC primeiro.',
    approveProcessing: 'Processando...',
    alreadyApproved: 'Já Aprovado',
    approveUSDC: 'Aprovar USDC',
    enterPotProcessing: 'Processando...',
    enterPotButton: 'Entrar no Pote (10 USDC)',
    insufficientUSDC: 'Saldo insuficiente de USDC',
    pleaseApproveFirst: 'Por favor, aprove primeiro os gastos de USDC',
    amazonQuestion: 'A ação da Amazon vai terminar o dia em alta?',
    appleQuestion: 'A ação da Apple vai terminar o dia em alta?',
    googleQuestion: 'A ação do Google vai terminar o dia em alta?',
    microsoftQuestion: 'A ação da Microsoft vai terminar o dia em alta?',
    metaQuestion: 'A ação da Meta vai terminar o dia em alta?',
    dogecoinQuestion: 'O Dogecoin vai terminar o dia em alta?',
    cardanoQuestion: 'O Cardano vai terminar o dia em alta?',
    xrpQuestion: 'O XRP vai terminar o dia em alta?',
    ftse100Question: 'O FTSE 100 vai terminar o dia em alta?',
    goldQuestion: 'O Ouro vai terminar o dia em alta?',
    howItWorksLink: 'Como funciona?', // Added for the link to the How It Works section
    chelseaManUtdQuestion: 'Chelsea vai ganhar do Machester United?',
   
    referralProgram: 'Indicações', // Added for referral navigation links
    referralCode: 'Código de Indicação (Opcional)', // Added for referral code input label
    // PredictionPotTest interface elements
    processingYourEntry: 'Processando sua entrada...',
    preparingYourPots: 'Preparando seus potes...',
    fundYourAccount: 'Financie Sua Conta',
    fundAccountMessage: 'Você precisa de pelo menos $0,01 em ETH para participar de potes de previsão.',
    letsFundAccount: "Vamos financiar sua conta →",
    backToHome: '← Voltar ao Início',
    back: 'Voltar',
    waitingWalletConfirmation: 'Aguardando confirmação da carteira...',
    transactionConfirming: 'Transação confirmando na blockchain...',
    viewOnBasescan: 'Ver no BaseScan →',
    reEntryRequired: '⚠️ Reentrada Necessária',
    reEntryDescription: 'Você fez uma previsão errada e precisa pagar a taxa de entrada de hoje para reentrar neste pote específico.',
    payReEntryFee: 'Pague a taxa de reentrada para continuar prevendo neste pote',
    processingReEntry: 'Processando Reentrada...',
    payToReEnter: 'Pagar para Reentrar',
    loadingTournamentInfo: 'Carregando Informações do Torneio...',
    checkingTournamentStatus: 'Verificando status do torneio',
    specialDiscountAvailable: 'Desconto Especial Disponível',
    congratulations: 'Parabéns!!!',
    regularPrice: 'Regular',
    yourPrice: 'Seu Preço',
    saveAmount: 'ECONOMIZE',
    usingDiscount: 'Usando Desconto...',
    payToEnter: 'Pagar para Entrar',
    joinPredictionsTournament: 'Participar do Torneio de Previsões',
    competeForPot: 'Concorra ao pote',
    enterCode: 'Digite o código...',
    enterButton: 'Entrar',

    // Market Names
    marketTrending: 'Em Alta',
    marketCrypto: 'Criptomoedas',
    marketStocks: 'Ações',
    marketMusicCharts: 'Paradas Musicais',
    marketXTrendingTopics: 'Tópicos em Alta no X',
    marketWeather: 'Clima',
    marketSports: 'Esportes',
    marketPolitics: 'Política',
    marketElections: 'Eleições',
    marketTVShows: 'Programas de TV',
    marketPopCulture: 'Cultura Pop',
    marketTechNews: 'Notícias de Tecnologia',
    marketBoxOffice: 'Bilheteria',
    marketAstronomy: 'Astronomia',
    marketFashionTrends: 'Tendências de Moda',
    marketCelebrityNews: 'Notícias de Celebridades',
    marketHealthFitness: 'Saúde e Fitness',
    marketGaming: 'Gaming',
    marketTravelTourism: 'Viagem e Turismo',

    // Personalized Labels
    personalizedForYou: 'Para você',
    personalizedBitcoin: 'Bitcoin',
    personalizedTesla: 'Tesla',
    personalizedSabrinaCarrenter: 'Sabrina Carpenter',
    personalizedPopularHashtags: 'Hashtags Populares',
    personalizedClimate: 'Clima',
    personalizedFootball: 'Futebol',
    personalizedTrump: 'Trump',
    personalizedUS2024: 'EUA 2024',
    personalizedTechNews: 'Notícias Tech',
    personalizedFashionTrends: 'Tendências de Moda',
    personalizedAstronomy: 'Astronomia',
    personalizedPopCulture: 'Cultura Pop',
    personalizedGaming: 'Jogos',
    personalizedTravelTourism: 'Viagem & Turismo',
    personalizedCelebrityNews: 'Notícias de Celebridades',
    personalizedHealthFitness: 'Saúde & Fitness',
    personalizedTVShows: 'Programas de TV',
    personalizedBoxOffice: 'Bilheteria',

    // Header
    searchPotsPlaceholder: 'Buscar potes...',
    howItWorks: 'Como funciona',
    yourBalance: 'Seu saldo',
    yourBalanceMobile: 'Saldo',

    // Email Collection
    readyToPlay: 'Pronto para Jogar?',
    joinGlobalCommunity: 'Junte-se à comunidade global de previsões e comece a competir hoje',
    enterEmailAddress: 'Digite seu endereço de email',
    joinCommunity: 'Entrar na Comunidade',
    joining: 'Entrando...',
    skipForNow: 'Pular por enquanto',
    connectWallet: 'Conectar Carteira',
    clickSignInButton: 'Clique no botão Entrar no canto superior direito da tela para conectar sua carteira',
    emailCollection: 'Coleta de email',

    // Tutorial - How It Works
    skipButton: 'Pular →',
    globalCompetition: 'Competição global',
    globalCompetitionDesc: 'Jogadores do mundo todo competem nos mesmos torneios de previsão.',
    dailyPredictions: 'Previsões diárias',
    dailyPredictionsDesc: 'Escolha e entre em um pote para tentar prever o que vai acontecer amanhã!',
    dynamicPricing: 'Preços dinâmicos',
    dynamicPricingDesc: 'As taxas de entrada começam baixas, mas dobrarão após o 5º dia - entre cedo para economizar!',
    secondChances: 'Segunda chance',
    secondChancesDesc: 'Eliminado? Pague a taxa de hoje para entrar novamente a qualquer momento.',
    finalShowdown: 'Confronto final',
    finalShowdownDesc: 'O torneio continua até restarem apenas 10 jogadores para a final.',
    liveStats: 'Estatísticas ao vivo',
    liveStatsDesc: 'Mantenha-se informado com informações atualizadas para cada pote.',

    // Footer
    footerText: 'Prediwin — Todos os direitos reservados.',

    // Discord FAQ
    faqTitle: 'Perguntas Frequentes',
    backToMarkets: 'Voltar aos mercados',
    stillHaveQuestions: 'Ainda tem dúvidas? Junte-se à nossa comunidade para mais suporte.',
    joinCommunitySupport: 'Junte-se à nossa comunidade para mais suporte.',
    discordSupport: 'Suporte Discord',
    followOnX: 'Seguir no X',

    // FAQ Questions
    howSignInQuestion: 'Como faço login?',
    howSignInAnswer: 'Para fazer login, clique no botão "Entrar", depois selecione "Criar Conta". Digite seus dados para completar o processo de registro. Se estiver no celular, certifique-se de tocar na tela preta no final para finalizar a criação da conta.',
    howPrediwinWorksQuestion: 'Como funciona o Prediwin?',
    howPrediwinWorksAnswer: 'Prediwin.com é uma plataforma de previsões que oferece duas experiências principais. A primeira são Potes Públicos, que são competições de previsões onde usuários fazem previsões diárias sobre eventos globais. Cada pote tem sua própria linha do tempo controlada pelo número de participantes ainda no torneio - torneios automaticamente chegam ao dia final quando a contagem de jogadores cai abaixo de 10. Taxas de entrada aumentam baseadas nos dias desde que o pote começou (não dias do calendário). Jogadores são eliminados diariamente por fazer uma previsão errada e podem escolher re-entrar pagando a taxa de entrada atual. A segunda são Potes Privados, que permitem criar seus próprios tópicos de previsão personalizados e convidar amigos para participar compartilhando um link.',
    dynamicPricingPublicPotsQuestion: 'Como funciona o preço dinâmico para Potes Públicos?',
    dynamicPricingPublicPotsAnswer: 'Potes Públicos usam cronômetros individuais de pote com preços dinâmicos baseados nos dias desde que cada pote começou. Taxas de entrada seguem esta estrutura: Dias 1-4 têm preços fixos iniciais ($0.02, $0.03, $0.04, $0.05 USD em ETH). Começando no dia 5, taxas começam em $0.10 USD e dobram a cada dia subsequente. Cada pote tem sua própria linha do tempo independente controlada pelo número de participantes ainda no torneio - torneios automaticamente chegam ao dia final quando a contagem de jogadores cai abaixo de 10. Potes Privados permitem definir qualquer taxa de entrada que quiser.',
    wrongPredictionQuestion: 'O que acontece se eu fizer uma previsão errada?',
    wrongPredictionAnswer: 'Em Potes Públicos: Se você prever incorretamente, será eliminado mas pode re-entrar pagando a taxa de entrada do dia atual. O objetivo é permanecer no torneio até chegar ao dia final (que acontece automaticamente quando a contagem de jogadores cai abaixo de 10) e vencedores são determinados. Em Potes Privados: O criador do pote decide a data final, resultado e vencedores - você não pode re-entrar em um pote privado após os vencedores terem sido determinados.',
    privatePotsQuestion: 'O que são Potes Privados e como funcionam?',
    privatePotsAnswer: 'Potes Privados são potes de previsão personalizados que você cria sobre qualquer tópico - preços de cripto, resultados esportivos, eventos mundiais, ou perguntas divertidas com amigos. Como criador, você define a taxa de entrada, convida participantes via link compartilhável, e decide os vencedores. É perfeito para grupos de amigos, equipes, ou comunidades que querem suas próprias competições de previsão.',
    createSharePrivatePotQuestion: 'Como criar e compartilhar um Pote Privado?',
    createSharePrivatePotAnswer: 'Vá para "Potes privados" no menu de navegação, defina o nome e descrição do pote, depois implante por taxas mínimas de gás (~$0.01-0.05 na Base). Você receberá uma URL compartilhável que pode enviar para amigos via mensagem, redes sociais, ou email. Qualquer pessoa com o link pode entrar no seu pote pagando a taxa de entrada que você definiu.',
    controlPrivatePotsQuestion: 'Quem controla os Potes Privados?',
    controlPrivatePotsAnswer: 'Como criador do pote, você tem controle total. Você define o valor da entrada, gerencia participantes, decide quando fechar entradas, determina o resultado vencedor, e distribui recompensas aos vencedores. A plataforma fornece ferramentas para ver todos os participantes e suas previsões em uma interface bonita.',
    privatePotParticipantsQuestion: 'Como participantes de Potes Privados entram?',
    privatePotParticipantsAnswer: 'Amigos clicam no seu link compartilhado, conectam sua carteira, pagam a taxa de entrada em ETH, e fazem sua previsão. Eles podem ver todos os outros participantes (por endereço de carteira ou email se enviado), valores de entrada, e status da previsão. É totalmente transparente então todos podem ver quem previu o quê.',
    needEthereumQuestion: 'Por que preciso de Ethereum para fazer previsões?',
    needEthereumAnswer: 'Você precisa de ETH para taxas de gás na rede Base (geralmente ~$0.01-0.05 por transação). Isso cobre os custos de transação blockchain para entrar em potes, fazer previsões, e reivindicar ganhos. Você também precisará de ETH para pagar as taxas de entrada reais do pote.',
    entryFeesCalculationQuestion: 'Como são calculadas as taxas de entrada em Potes Públicos?',
    entryFeesCalculationAnswer: 'Potes Públicos seguem um modelo de preços dinâmicos baseado nos dias desde que cada pote começou (não dias do calendário). Dias 1-4 têm preços fixos: $0.02, $0.03, $0.04, $0.05 USD em ETH. Após o dia 4, taxas começam a dobrar começando em $0.10 USD no dia 5, depois $0.20 no dia 6, $0.40 no dia 7, e assim por diante. Cada pote tem sua própria linha do tempo independente. Potes Privados permitem definir qualquer taxa de entrada que quiser.',
    referralSystemQuestion: 'Como funciona o sistema de indicação?',
    referralSystemAnswer: 'Cada usuário recebe um código de indicação único de 8 caracteres. Quando 3 amigos entram com sucesso em potes usando seu código, você ganha 1 entrada gratuita de pote. Este sistema inclui proteção contra fraude para garantir indicações legítimas e funciona tanto para Potes Públicos quanto Privados.',
    eventTypesQuestion: 'Que tipos de eventos posso prever?',
    eventTypesAnswer: 'Potes Públicos cobrem preços de criptomoedas, movimentos de ações, esportes, e eventos mundiais. Potes Privados são ilimitados - crie potes sobre qualquer coisa: "Vai chover amanhã?", "Quem ganha o campeonato de fantasia do escritório?", "Nosso amigo vai conseguir o emprego?", preços de cripto, apostas esportivas com amigos, ou qualquer resultado mensurável que possa pensar.',
    makePredictionsQuestion: 'Como faço previsões?',
    makePredictionsAnswer: 'Depois de entrar em um pote, você escolhe SIM ou NÃO para o resultado (ou positivo/negativo para movimentos de preço). Em Potes Públicos, você pode fazer uma previsão por dia e atualizá-la antes do prazo. Em Potes Privados, você tipicamente faz uma previsão por tópico do pote definido pelo criador.',
    winnersQuestion: 'Quando e como os vencedores são determinados?',
    winnersAnswer: 'Potes Públicos: Vencedores são determinados quando torneios chegam ao dia final (automaticamente acionado quando a contagem de jogadores cai abaixo de 10), baseado nos resultados reais do evento. Potes Privados: O criador do pote decide quando fechar previsões, determina o resultado real, e distribui recompensas aos vencedores através do contrato inteligente.',
    getWinningsQuestion: 'Como recebo meus ganhos?',
    getWinningsAnswer: 'Ganhos são automaticamente distribuídos através de contratos inteligentes na rede Base. Uma vez determinado como vencedor, o ETH é enviado diretamente para sua carteira conectada - não é necessário reivindicação manual. Isso funciona igual tanto para Potes Públicos quanto Privados.',
    withoutCryptoExperienceQuestion: 'Posso participar sem experiência em cripto?',
    withoutCryptoExperienceAnswer: 'Ainda não! A plataforma inclui um tutorial abrangente de 5 passos e uma página de compra integrada onde você pode facilmente comprar ETH usando Coinbase OnChainKit. A interface é projetada para ser amigável para iniciantes em cripto. Recomendamos que usuários se familiarizem com conceitos básicos de cripto como carteiras, taxas de gás, e ETH antes de participar.',
    livePotsQuestion: 'O que são Potes Ao Vivo?',
    livePotsAnswer: 'Potes Ao Vivo são rodadas de previsão de hora em hora que se ativam após entrar em um pote ao vivo. Uma vez que você paga a taxa de entrada, participará de sessões de perguntas estruturadas por hora cobrindo vários tópicos. É um formato baseado em tempo projetado para usuários que gostam de desafios regulares de previsão com resultados programados a cada hora.',
    gamblingQuestion: 'Isso é jogo de azar?',
    gamblingAnswer: 'Prediwin é uma plataforma de potes de previsão focada em habilidades de previsão ao invés de jogos de azar. Usuários fazem previsões informadas sobre eventos do mundo real usando seu conhecimento e análise, similar a plataformas como Polymarket ou Kalshi. Potes Privados adicionam um elemento social onde amigos competem em tópicos que se importam.',

    // Bookmarks Page
    connectYourWallet: 'Conectar Sua Carteira',
    connectWalletBookmarks: 'Conecte sua carteira para ver seus potes favoritados.',
    loadingBookmarks: 'Carregando seus favoritos...',
    yourPots: 'Seus Potes',
    potsBookmarkedEntered: 'Potes que você favoritou e entrou',
    enteredPots: 'Potes que entrou',
    bookmarked: 'Favoritados',
    noBookmarksYet: 'Nenhum favorito ainda',
    startBookmarking: 'Comece a favoritar questões para vê-las aqui.',
    explore: 'Explorar',
    marketNotAvailable: 'Pergunta do mercado não disponível',
    removeBookmark: 'Remover favorito',
    viewPot: 'Ver Pote',
    goToCategory: 'Ir para Categoria',
    inPot: 'no pote',
    noPotsEntered: 'Nenhum pote entrado ainda',
    enterPredictionPots: 'Entre em potes de previsão para começar a competir e fazer previsões.',
    findPotsToEnter: 'Encontrar Potes para Entrar',
    potsYouEntered: 'Potes Que Você Entrou',
    nextQuestion: 'Próxima Pergunta:',
    participatingInPot: 'Você está participando neste pote. Clique para fazer previsões e verificar seu status.',
    view: 'Ver',
    unknownMarket: 'Mercado Desconhecido',

    // Navigation Menu
    home: 'Início',
    privateMarkets: 'Mercados Privados',
    fundAccount: 'Depositar',
    statsRankings: 'Estatísticas e Rankings',
    games: 'Jogos',
    myPots: 'Meus Potes',
    ideas: 'Ideias',
    liveMarkets: 'Mercados Ao Vivo',
    wallet: 'Carteira',
    logOut: 'Sair',
    discordSupportNav: 'Suporte Discord',
    followOnXNav: 'Seguir no X',
    toggleMenu: 'Alternar menu',
    closeMenu: 'Fechar menu',

    // Bottom Navigation
    bottomNavHome: 'Início',
    bottomNavLive: 'Ao Vivo',
    bottomNavSearch: 'Buscar',
    bottomNavMyPots: 'Meus potes',

    // MakePredictionsPage (VERY LIMITED - only safe display strings)
    loadingPredictions: 'Carregando suas previsões...',
    finalPredictions: 'Previsões Finais',
    congratulationsFinal10: 'Parabéns! Você está entre os 10 últimos. Faça suas previsões normalmente e se ganhar, nós te notificaremos.',
    gotIt: 'Entendi! 🎯',
    loadingYourBet: 'Carregando sua previsão...',
    nextElimination: 'Próxima Eliminação',
    importantTimers: 'Cronômetros Importantes',
    connectWalletTitle: 'Conectar Carteira',
    connectToStartPredicting: 'Conecte para começar a prever',
    accessRequired: 'Acesso Necessário',
    mustJoinPotFirst: 'Você deve entrar no pote primeiro',

    yesButton: 'SIM',
    noButton: 'NÃO',
    
    // Re-entry and Status
    reentryRequired: 'Re-entrada Necessária',
    dailyOutcomeSet: 'Resultado Diário Definido',
    disputeOutcome: 'Contestar o Resultado?',
    evidenceSubmitted: 'Evidência Enviada',
    evidenceWindowClosed: 'Janela de Evidências Fechada',
    resultsDay: 'Dia dos Resultados! 🎉',
    predictionsClosed: 'Previsões Fechadas',
    youChose: 'Você Escolheu',
    for: 'Para:',
    tomorrow: 'amanhã',
    managePrediction: 'Gerenciar sua previsão atual',
    activePrediction: 'Previsão Ativa',
    makePrediction: 'Fazer Previsão',
    underReview: 'Em Análise',
    status: 'Status:',
    evidenceSubmittedAt: 'Evidência enviada:',
    submitEvidence: 'Enviar Evidência',
    evidenceSubmissionTerms: 'Termos de Envio de Evidência:',

    // Timer Messages  
    entered: 'Aguardando',
    beginsSoon: 'Inicia em breve',
    provisional: 'provisório',
    actualResult: 'Resultado real',
    processing: 'Processando...',
    evidencePlaceholder: 'Forneça evidência detalhada de por que este resultado está incorreto. Inclua links, fontes ou explicações...',
    submittingEvidence: 'Enviando Evidência...',
    wrongPredictionIn: 'Previsão errada em',
    payTodaysEntryFee: 'Pague a taxa de entrada de hoje para continuar.',
    
    // Date and prediction timing
    predictingForTomorrow: 'Prevendo para Amanhã',
    resultsReveal: 'Revelação dos Resultados',
    tomorrowAtMidnight: 'Amanhã à Meia-noite',
    autoSubmittingChoice: 'Enviando Sua Escolha Automaticamente',
    
    // BookmarksPage - Active Pots section
    yourActivePots: 'Seus Potes Ativos',
    currentlyParticipatingIn: 'Você está participando atualmente de',
    pot: 'pote',
    pots: 'potes',
    clickAnyPotAbove: 'Clique em qualquer pote acima para fazer previsões e competir pelo pote.'
  },
};

export const getTranslation = (language: Language): Translations => {
  return translations[language] || translations['en'];
};

export const supportedLanguages: { code: Language; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Flag_of_the_United_States_%28Pantone%29.svg/250px-Flag_of_the_United_States_%28Pantone%29.svg.png' },
  { code: 'pt-BR', name: 'Português', flag: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/05/Flag_of_Brazil.svg/1200px-Flag_of_Brazil.svg.png' },
];

// Helper function to translate market names
export const getMarketDisplayName = (marketName: string, language: Language): string => {
  const t = getTranslation(language);
  
  const marketNameMap: Record<string, string> = {
    'Trending': t.marketTrending,
    'Crypto': t.marketCrypto,
    'Stocks': t.marketStocks,
    'Music Charts': t.marketMusicCharts,
    'X Trending Topics': t.marketXTrendingTopics,
    'Weather': t.marketWeather,
    'Sports': t.marketSports,
    'Politics': t.marketPolitics,
    'Elections': t.marketElections,
    'TV Shows': t.marketTVShows,
    'Pop Culture': t.marketPopCulture,
    'Tech News': t.marketTechNews,
    'Box Office': t.marketBoxOffice,
    'Astronomy': t.marketAstronomy,
    'Fashion Trends': t.marketFashionTrends,
    'Celebrity News': t.marketCelebrityNews,
    'Health & Fitness': t.marketHealthFitness,
    'Gaming': t.marketGaming,
    'Travel & Tourism': t.marketTravelTourism,
  };
  
  return marketNameMap[marketName] || marketName;
};

// Helper function to get personalized labels
export const getPersonalizedLabel = (marketName: string, language: Language): string => {
  const t = getTranslation(language);
  
  const personalizedMap: Record<string, string> = {
    'Trending': t.personalizedForYou,
    'Crypto': t.personalizedBitcoin,
    'Stocks': t.personalizedTesla,
    'Music Charts': t.personalizedSabrinaCarrenter,
    'X Trending Topics': t.personalizedPopularHashtags,
    'Weather': t.personalizedClimate,
    'Sports': t.personalizedFootball,
    'Politics': t.personalizedTrump,
    'Elections': t.personalizedUS2024,
    'Tech News': t.personalizedTechNews,
    'Fashion Trends': t.personalizedFashionTrends,
    'Astronomy': t.personalizedAstronomy,
    'Pop Culture': t.personalizedPopCulture,
    'Gaming': t.personalizedGaming,
    'Travel & Tourism': t.personalizedTravelTourism,
    'Celebrity News': t.personalizedCelebrityNews,
    'Health & Fitness': t.personalizedHealthFitness,
    'TV Shows': t.personalizedTVShows,
    'Box Office': t.personalizedBoxOffice,
  };
  
  return personalizedMap[marketName] || marketName;
};

// Helper function to get translated market questions (display only)
export const getTranslatedMarketQuestion = (market: any, language: Language): string => {
  const t = getTranslation(language);
  
  // Map market names/IDs to their appropriate translated questions
  const questionMap: Record<string, string> = {
    // Main markets
    'Trending': language === 'en' 
      ? 'Will a solo female artist have the #1 song on the global spotify charts?'
      : 'Uma artista solo feminina terá a música #1 nas paradas globais do Spotify?',
    'Crypto': t.bitcoinQuestion,
    'Stocks': t.teslaQuestion, 
    'Music Charts': language === 'en'
      ? 'Will "Espresso" be the #1 track on Spotify Global?'
      : 'Será que "Espresso" será a faixa #1 no Spotify Global?',
    // Additional markets
    'X Trending Topics': language === 'en'
      ? 'Which topic will rank #1 on X trending topics in the United States by 21:00 UTC today?'
      : 'Qual tópico ficará em #1 nos tópicos em alta do X nos Estados Unidos às 21:00 UTC hoje?',
    'Tech News': language === 'en'
      ? 'Will there be major tech news today?'
      : 'Haverá grandes notícias de tecnologia hoje?',
    'Fashion Trends': language === 'en'
      ? 'Will fashion trends change significantly today?'
      : 'As tendências da moda mudarão significativamente hoje?',
  };
  
  // Return translated question if available, otherwise return original
  return questionMap[market.name] || questionMap[market.id] || market.question || '';
};

// Centralized direct question translation function (for actual question text strings)
export const translateMarketQuestion = (questionText: string, language: Language): string => {
  if (language === 'en') {
    return questionText; // Return as-is for English
  }
  
  // Direct mapping of English questions to Portuguese translations
  const questionTranslations: Record<string, string> = {
    // Tesla stock question - from English to Portuguese
    'Will Tesla stock end the day higher?': 'A ação da Tesla vai terminar o dia em alta?',
    
    // Music/Espresso question - direct hardcoded mapping
    'Will "Espresso" be the #1 track on Spotify Global?': 'Será que "Espresso" será a faixa #1 no Spotify Global?',
    
    // Trending - this would be a translated version from the Trending market
    'Will a solo female artist have the #1 song on the global spotify charts?': 'Uma artista solo feminina terá a música #1 nas paradas globais do Spotify?',
    
    // Bitcoin (if it appears)
    'Will Bitcoin end the day higher?': 'O Bitcoin vai terminar o dia em alta?',
    
    // Handle case where Tesla question might already be in Portuguese (when markets.ts used Portuguese t)
    'A ação da Tesla vai terminar o dia em alta?': 'A ação da Tesla vai terminar o dia em alta?',
    
    // Add more question translations here as needed
  };
  
  // Debug logging (can be removed in production)
  console.log('🌍 translateMarketQuestion called:', { questionText, language });
  console.log('🌍 Available translations:', Object.keys(questionTranslations));
  
  // Try to find exact translation, otherwise return original
  const result = questionTranslations[questionText] || questionText;
  console.log('🌍 Translation result:', result);
  return result;
};
