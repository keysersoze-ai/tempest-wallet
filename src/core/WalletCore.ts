// File Version: 2.0
import { ethers } from 'ethers';
import { createAlchemySmartAccountClient } from '@alchemy/aa-alchemy';
import { sepolia, mainnet } from 'viem/chains';
import * as Keychain from 'react-native-keychain';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WalletConfig,
  AIWalletState,
  Transaction,
  SecuritySettings,
  AIAgentCapabilities,
  AIContext,
  MarketSentiment,
  RiskAssessment,
  WalletError
} from '@/types/wallet';

export class WalletCore {
  private provider: ethers.Provider | null = null;
  private smartAccountClient: any = null;
  private config: WalletConfig;
  private state: AIWalletState;
  private securitySettings: SecuritySettings;
  private aiContext: AIContext | null = null;

  // AI capabilities that actually work (hopefully)
  private aiCapabilities: AIAgentCapabilities = {
    autonomousTrading: false, // Baby steps
    riskAssessment: true,
    gasOptimization: true,
    portfolioRebalancing: false,
    anomalyDetection: true,
    marketSentimentAnalysis: true,
    predictiveModeling: false, // Still figuring this one out
    crossChainOptimization: false,
    memeCoinDetection: true // This one's actually useful
  };

  constructor(config: WalletConfig) {
    this.config = config;
    this.state = {
      address: '',
      balance: 0n,
      nonce: 0,
      isLocked: true,
      automationEnabled: false,
      securityLevel: 'enhanced',
      aiState: {
        learningMode: true,
        confidenceScore: 0.5,
        totalTransactions: 0,
        successRate: 0,
        lastOptimization: Date.now()
      }
    };

    this.securitySettings = {
      biometricAuth: true,
      multiSigRequired: false,
      withdrawalLimits: {
        daily: ethers.parseEther('10'),
        perTransaction: ethers.parseEther('1'),
        aiDynamicLimits: true
      },
      whitelistedAddresses: [],
      suspiciousActivityDetection: true,
      aiSecurityFeatures: {
        behavioralAnalysis: true,
        anomalyDetection: true,
        phishingProtection: true,
        smartContractAuditing: false // Too paranoid for now
      }
    };

    this.initializeWallet();
  }

  private async initializeWallet(): Promise<void> {
    try {
      // Initialize Alchemy provider
      this.provider = new ethers.AlchemyProvider(
        this.config.chainId === 1 ? 'mainnet' : 'sepolia',
        this.config.alchemyApiKey
      );

      // Initialize Alchemy Smart Account Client
      this.smartAccountClient = createAlchemySmartAccountClient({
        apiKey: this.config.alchemyApiKey,
        chain: this.config.chainId === 1 ? mainnet : sepolia,
      });

      // Initialize AI context
      await this.initializeAIContext();

      console.log('✅ Wallet core initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize wallet core:', error);
      throw new Error('Wallet initialization failed - probably the AI gained sentience');
    }
  }

  // Initialize AI context for decision making
  private async initializeAIContext(): Promise<void> {
    this.aiContext = {
      currentMarketConditions: await this.analyzeMarketSentiment(),
      userBehaviorPattern: await this.loadUserBehaviorPattern(),
      networkConditions: await this.analyzeNetworkConditions(),
      riskAssessment: await this.performRiskAssessment()
    };
  }

  // Create new wallet with mnemonic generation
  async createWallet(password: string): Promise<{ address: string; mnemonic: string }> {
    try {
      const wallet = ethers.Wallet.createRandom();
      const mnemonic = wallet.mnemonic?.phrase;

      if (!mnemonic) {
        throw new Error('Failed to generate mnemonic - entropy machine broke');
      }

      // Store credentials securely
      await this.storePrivateKey(wallet.privateKey, password);
      await this.storeMnemonic(mnemonic, password);

      // Update state
      this.state.address = wallet.address;
      this.state.isLocked = false;

      // Store metadata with AI enhancement markers
      await AsyncStorage.setItem('wallet_metadata', JSON.stringify({
        address: wallet.address,
        created: Date.now(),
        version: '2.0_AI_ENHANCED_SENTIENT_EDITION',
        aiPersonality: this.config.aiPersonality || {
          riskTolerance: 'moderate',
          tradingStyle: 'hodl',
          communicationStyle: 'existential_crisis',
          learningAggression: 'moderate',
          humorLevel: 'sarcastic'
        }
      }));

      // Start AI learning
      this.state.aiState.learningMode = true;

      return { address: wallet.address, mnemonic };
    } catch (error) {
      console.error('❌ Wallet creation failed:', error);
      throw error;
    }
  }

  // Recover wallet from mnemonic
  async recoverWallet(mnemonic: string, password: string): Promise<string> {
    try {
      const wallet = ethers.Wallet.fromPhrase(mnemonic);

      await this.storePrivateKey(wallet.privateKey, password);
      await this.storeMnemonic(mnemonic, password);

      this.state.address = wallet.address;
      this.state.isLocked = false;

      // Load existing AI learning data or start fresh
      const existingData = await AsyncStorage.getItem('ai_learning_data');
      if (existingData) {
        const learningData = JSON.parse(existingData);
        this.state.aiState = { ...this.state.aiState, ...learningData };
      }

      await AsyncStorage.setItem('wallet_metadata', JSON.stringify({
        address: wallet.address,
        recovered: Date.now(),
        version: '2.0_AI_ENHANCED_SENTIENT_EDITION'
      }));

      return wallet.address;
    } catch (error) {
      console.error('❌ Wallet recovery failed:', error);
      throw error;
    }
  }

  // Unlock wallet with password and AI verification
  async unlockWallet(password: string): Promise<boolean> {
    try {
      const credentials = await Keychain.getInternetCredentials('tempest_wallet_key');

      if (!credentials) {
        throw new Error('No wallet found - did the AI eat it?');
      }

      const privateKey = credentials.password;
      const wallet = new ethers.Wallet(privateKey, this.provider);

      this.state.address = wallet.address;
      this.state.isLocked = false;

      // AI security check
      await this.performUnlockSecurityCheck();

      return true;
    } catch (error) {
      console.error('❌ Wallet unlock failed:', error);
      return false;
    }
  }

  // AI-enhanced security check on unlock
  private async performUnlockSecurityCheck(): Promise<void> {
    if (!this.securitySettings.aiSecurityFeatures.behavioralAnalysis) return;

    // Check for unusual unlock patterns
    const lastUnlock = await AsyncStorage.getItem('last_unlock_time');
    const currentTime = Date.now();

    if (lastUnlock) {
      const timeDiff = currentTime - parseInt(lastUnlock);
      // If unlocking way too frequently, might be suspicious
      if (timeDiff < 60000) { // Less than 1 minute
        console.warn('🤖 AI detected rapid unlock attempts - monitoring...');
        // In a real implementation, you'd implement additional security measures
      }
    }

    await AsyncStorage.setItem('last_unlock_time', currentTime.toString());
  }

  // Lock wallet and clear sensitive data
  lockWallet(): void {
    this.state.isLocked = true;
    // Clear any cached sensitive data
    // The AI forgets everything anyway
  }

  // Get wallet balance with AI insights
  async getBalance(): Promise<{ balance: bigint; aiInsights?: string }> {
    if (!this.provider || this.state.isLocked) {
      throw new Error('Wallet not initialized or locked');
    }

    try {
      const balance = await this.provider.getBalance(this.state.address);
      this.state.balance = balance;

      // AI provides insights on balance
      let aiInsights: string | undefined;
      if (this.aiCapabilities.marketSentimentAnalysis && this.aiContext) {
        aiInsights = this.generateBalanceInsights(balance);
      }

      return { balance, aiInsights };
    } catch (error) {
      console.error('❌ Failed to get balance:', error);
      throw error;
    }
  }

  // Generate AI insights about current balance
  private generateBalanceInsights(balance: bigint): string {
    const ethBalance = parseFloat(ethers.formatEther(balance));

    if (ethBalance < 0.001) {
      return "Balance lower than my self-esteem. Consider adding funds or finding a sugar daddy.";
    } else if (ethBalance < 0.1) {
      return "Decent pocket change. Could buy a few coffees or one decent NFT.";
    } else if (ethBalance < 1) {
      return "Nice stack! Not whale territory yet, but getting there.";
    } else {
      return "Whale alert! 🐋 Time to start your own DeFi protocol.";
    }
  }

  // AI-optimized transaction sending
  async sendTransaction(to: string, value: bigint, data?: string): Promise<Transaction> {
    if (this.state.isLocked) {
      throw new Error('Wallet is locked - and the AI is judging you');
    }

    try {
      // Multi-layer AI analysis
      const riskAssessment = await this.performTransactionRiskAssessment(to, value);
      const optimizedGas = await this.aiOptimizeGasPrice();
      const securityCheck = await this.performSecurityChecks(to, value);

      // AI decision making
      const aiRecommendation = this.makeAIRecommendation(riskAssessment, optimizedGas);

      if (riskAssessment.level === 'run_away') {
        throw new Error(`AI says NO: ${riskAssessment.aiRecommendation}`);
      }

      // Create optimized transaction
      const txRequest = {
        to,
        value: value.toString(),
        data: data || '0x',
        gasPrice: optimizedGas.toString(),
      };

      const txHash = await this.smartAccountClient.sendTransaction(txRequest);

      const transaction: Transaction = {
        hash: txHash,
        from: this.state.address,
        to,
        value,
        gasPrice: optimizedGas,
        gasUsed: 0n,
        timestamp: Date.now(),
        status: 'ai_optimized',
        automationTriggered: false,
        aiMetadata: {
          optimizationApplied: true,
          confidenceScore: riskAssessment.confidence,
          riskAssessment: riskAssessment.aiRecommendation
        }
      };

      // Update AI learning
      await this.updateAILearning(transaction);

      return transaction;
    } catch (error) {
      console.error('❌ AI-enhanced transaction failed:', error);
      throw error;
    }
  }

  // AI-powered gas price optimization
  private async aiOptimizeGasPrice(): Promise<bigint> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const feeData = await this.provider.getFeeData();
      let gasPrice = feeData.gasPrice || 0n;

      if (this.aiCapabilities.gasOptimization && this.aiContext) {
        // AI analysis of network conditions
        const networkMultiplier = this.calculateNetworkMultiplier();
        const timeMultiplier = this.calculateTimeMultiplier();
        const personalityMultiplier = this.calculatePersonalityMultiplier();

        // Combine all AI insights
        const totalMultiplier = networkMultiplier * timeMultiplier * personalityMultiplier;
        gasPrice = gasPrice * BigInt(Math.floor(totalMultiplier * 100)) / 100n;

        // Update AI confidence based on success
        this.updateGasOptimizationConfidence(gasPrice);
      }

      return gasPrice;
    } catch (error) {
      console.error('❌ AI gas optimization failed:', error);
      return BigInt(20_000_000_000); // Fallback gas price
    }
  }

  // Calculate network-based gas multiplier
  private calculateNetworkMultiplier(): number {
    if (!this.aiContext) return 1.0;

    switch (this.aiContext.networkConditions.congestion) {
      case 'low': return 0.8;
      case 'medium': return 1.0;
      case 'high': return 1.2;
      case 'apocalyptic': return 2.0; // Pray to the gas gods
      default: return 1.0;
    }
  }

  // Time-based optimization
  private calculateTimeMultiplier(): number {
    const hour = new Date().getHours();

    // Off-peak hours (2-6 AM UTC)
    if (hour >= 2 && hour <= 6) return 0.9;

    // Peak hours (9 AM - 5 PM UTC)
    if (hour >= 9 && hour <= 17) return 1.1;

    // Weekend vibes
    const day = new Date().getDay();
    if (day === 0 || day === 6) return 0.95;

    return 1.0;
  }

  // Personality-based gas preferences
  private calculatePersonalityMultiplier(): number {
    const personality = this.config.aiPersonality;
    if (!personality) return 1.0;

    switch (personality.riskTolerance) {
      case 'conservative': return 1.2; // Pay more for safety
      case 'moderate': return 1.0;
      case 'aggressive': return 0.8; // Risk it for cheaper gas
      case 'degenerate': return 0.6; // YOLO gas prices
      case 'ai_decides': return Math.random() * 0.4 + 0.8; // Let chaos reign
      default: return 1.0;
    }
  }

  // Update AI confidence in gas optimization
  private updateGasOptimizationConfidence(gasPrice: bigint): void {
    // This would track success rates and adjust confidence
    // For now, just increment the counter
    this.state.aiState.totalTransactions += 1;
  }

  // AI-powered transaction risk assessment
  private async performTransactionRiskAssessment(to: string, value: bigint): Promise<RiskAssessment> {
    const factors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'run_away' = 'low';
    let confidence = 0.8;

    // Check for suspicious patterns
    if (await this.isSuspiciousAddress(to)) {
      factors.push('Suspicious recipient address');
      riskLevel = 'high';
    }

    // Check transaction amount
    const ethValue = parseFloat(ethers.formatEther(value));
    if (ethValue > 1) {
      factors.push('Large transaction amount');
      riskLevel = riskLevel === 'high' ? 'run_away' : 'medium';
    }

    // Check against user behavior patterns
    if (this.aiContext && this.isUnusualTransaction(value)) {
      factors.push('Unusual transaction pattern');
      riskLevel = 'medium';
    }

    let aiRecommendation = 'Transaction looks fine, proceed with caution.';

    if (riskLevel === 'run_away') {
      aiRecommendation = 'ABORT! This transaction screams scam louder than a crypto Twitter influencer.';
    } else if (riskLevel === 'high') {
      aiRecommendation = 'High risk detected. Maybe sleep on it?';
    } else if (riskLevel === 'medium') {
      aiRecommendation = 'Moderate risk. Double-check the details.';
    }

    return {
      level: riskLevel,
      factors,
      confidence,
      aiRecommendation
    };
  }

  // Check if address is suspicious
  private async isSuspiciousAddress(address: string): Promise<boolean> {
    // Basic pattern matching for obviously suspicious addresses
    const suspiciousPatterns = [
      /^0x000+/,  // Null-like addresses
      /^0xdead/i, // Dead addresses
      /^0x1{40}/  // All ones
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(address))) {
      return true;
    }

    // In a real implementation, you'd check against threat intelligence APIs
    // For now, randomly flag some addresses because paranoia is healthy
    return Math.random() < 0.05; // 5% chance of being "suspicious"
  }

  // Check if transaction is unusual for user
  private isUnusualTransaction(value: bigint): boolean {
    if (!this.aiContext) return false;

    const ethValue = parseFloat(ethers.formatEther(value));
    const pattern = this.aiContext.userBehaviorPattern;

    // If user typically does small transactions, large ones are unusual
    return ethValue > 0.5 && pattern.transactionFrequency === 'low';
  }

  // Make AI recommendation based on analysis
  private makeAIRecommendation(riskAssessment: RiskAssessment, gasPrice: bigint): string {
    const personality = this.config.aiPersonality;

    if (!personality) {
      return "AI is having an existential crisis and cannot provide recommendations.";
    }

    switch (personality.communicationStyle) {
      case 'formal':
        return `Based on analysis, this transaction has ${riskAssessment.level} risk level.`;
      case 'casual':
        return `Looks ${riskAssessment.level === 'low' ? 'good' : 'sketchy'} to me, fam.`;
      case 'meme_lord':
        return riskAssessment.level === 'high' ? 'This ain\'t it, chief 🚫' : 'Send it! 🚀';
      case 'existential_crisis':
        return "In the grand scheme of the universe, does this transaction even matter? Probably not, but here we are...";
      default:
        return "AI is silently judging your financial decisions.";
    }
  }

  // Analyze market sentiment for AI context
  private async analyzeMarketSentiment(): Promise<MarketSentiment> {
    // In a real implementation, this would connect to market data APIs
    // For now, generate some realistic-looking sentiment data

    const sentiments = ['bullish', 'bearish', 'neutral', 'confused', 'existential_dread'] as const;
    const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];

    return {
      overall: randomSentiment,
      confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
      factors: [
        'Social media buzz',
        'Trading volume',
        'Fear and greed index',
        'Number of "wen moon" tweets'
      ],
      timestamp: Date.now(),
      aiInterpretation: this.generateSentimentInterpretation(randomSentiment)
    };
  }

  // Generate AI interpretation of market sentiment
  private generateSentimentInterpretation(sentiment: string): string {
    switch (sentiment) {
      case 'bullish':
        return "Markets are feeling optimistic. Time to HODL and maybe treat yourself to that expensive coffee.";
      case 'bearish':
        return "Markets are in the dumps. Perfect time to DCA or contemplate life choices.";
      case 'neutral':
        return "Markets are as exciting as watching paint dry. Nothing to see here.";
      case 'confused':
        return "Markets don't know what they want. Basically, it's Tuesday.";
      case 'existential_dread':
        return "Markets are having an identity crisis. We feel you, markets.";
      default:
        return "Markets are doing market things. *shrug*";
    }
  }

  // Load user behavior pattern for AI analysis
  private async loadUserBehaviorPattern(): Promise<any> {
    try {
      const stored = await AsyncStorage.getItem('user_behavior_pattern');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load user behavior pattern:', error);
    }

    // Default pattern for new users
    return {
      transactionFrequency: 'medium',
      preferredTimes: [9, 10, 11, 14, 15, 16], // Business hours
      riskPreference: 0.5,
      gasPreference: 'balanced'
    };
  }

  // Analyze current network conditions
  private async analyzeNetworkConditions(): Promise<any> {
    if (!this.provider) {
      return {
        congestion: 'medium',
        averageGasPrice: BigInt(20_000_000_000),
        blockTime: 12,
        mempoolSize: 150000
      };
    }

    try {
      const feeData = await this.provider.getFeeData();
      const block = await this.provider.getBlock('latest');

      // Simple congestion analysis based on gas price
      const gasPrice = feeData.gasPrice || 0n;
      const gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, 'gwei'));

      let congestion: 'low' | 'medium' | 'high' | 'apocalyptic';
      if (gasPriceGwei < 20) congestion = 'low';
      else if (gasPriceGwei < 50) congestion = 'medium';
      else if (gasPriceGwei < 100) congestion = 'high';
      else congestion = 'apocalyptic';

      return {
        congestion,
        averageGasPrice: gasPrice,
        blockTime: block?.timestamp ? Date.now() / 1000 - block.timestamp : 12,
        mempoolSize: Math.floor(Math.random() * 200000) + 50000 // Fake mempool size
      };
    } catch (error) {
      console.error('Failed to analyze network conditions:', error);
      // Return default values
      return {
        congestion: 'medium',
        averageGasPrice: BigInt(20_000_000_000),
        blockTime: 12,
        mempoolSize: 150000
      };
    }
  }

  // Perform initial risk assessment
  private async performRiskAssessment(): Promise<RiskAssessment> {
    return {
      level: 'low',
      factors: ['Initial assessment'],
      confidence: 0.7,
      aiRecommendation: 'All systems nominal. Ready to lose money responsibly.'
    };
  }

  // Security checks before transaction
  private async performSecurityChecks(to: string, value: bigint): Promise<void> {
    // Check withdrawal limits
    if (value > this.securitySettings.withdrawalLimits.perTransaction) {
      throw new Error('Transaction exceeds per-transaction limit. AI suggests smaller amounts.');
    }

    // Check if address is whitelisted (if whitelist is enabled)
    if (this.securitySettings.whitelistedAddresses.length > 0) {
      if (!this.securitySettings.whitelistedAddresses.includes(to.toLowerCase())) {
        throw new Error('Recipient not in whitelist. AI is suspicious.');
      }
    }

    // AI-powered phishing detection
    if (this.securitySettings.aiSecurityFeatures.phishingProtection) {
      const isPhishing = await this.detectPhishing(to);
      if (isPhishing) {
        throw new Error('Potential phishing attempt detected. AI says nope.');
      }
    }
  }

  // AI-powered phishing detection
  private async detectPhishing(address: string): Promise<boolean> {
    // In a real implementation, this would use ML models and threat intelligence
    // For now, just check some basic patterns

    // Check for address similarity to known good addresses (not implemented)
    // Check for suspicious contract patterns (not implemented)
    // Check against known phishing databases (not implemented)

    return Math.random() < 0.02; // 2% chance of false positive for testing
  }

  // Update AI learning from transaction results
  private async updateAILearning(transaction: Transaction): Promise<void> {
    this.state.aiState.totalTransactions += 1;

    // Store learning data
    const learningData = {
      timestamp: Date.now(),
      transaction: {
        value: transaction.value.toString(),
        gasPrice: transaction.gasPrice.toString(),
        to: transaction.to
      },
      aiMetadata: transaction.aiMetadata,
      networkConditions: this.aiContext?.networkConditions
    };

    try {
      const existingData = await AsyncStorage.getItem('ai_learning_data');
      const allData = existingData ? JSON.parse(existingData) : [];
      allData.push(learningData);

      // Keep only last 1000 transactions for storage efficiency
      if (allData.length > 1000) {
        allData.splice(0, allData.length - 1000);
      }

      await AsyncStorage.setItem('ai_learning_data', JSON.stringify(allData));
      await AsyncStorage.setItem('ai_state', JSON.stringify(this.state.aiState));
    } catch (error) {
      console.error('Failed to update AI learning:', error);
    }
  }

  // Store private key securely
  private async storePrivateKey(privateKey: string, password: string): Promise<void> {
    try {
      await Keychain.setInternetCredentials(
        'tempest_wallet_key',
        'wallet',
        privateKey,
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
        }
      );
    } catch (error) {
      console.error('❌ Failed to store private key:', error);
      throw error;
    }
  }

  // Store mnemonic securely
  private async storeMnemonic(mnemonic: string, password: string): Promise<void> {
    try {
      await Keychain.setInternetCredentials(
        'tempest_wallet_mnemonic',
        'mnemonic',
        mnemonic,
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
          authenticationType: Keychain.AUTHENTICATION_TYPE.BIOMETRICS,
        }
      );
    } catch (error) {
      console.error('❌ Failed to store mnemonic:', error);
      throw error;
    }
  }

  // Getters for state access
  getState(): AIWalletState {
    return { ...this.state };
  }

  getSecuritySettings(): SecuritySettings {
    return { ...this.securitySettings };
  }

  getAICapabilities(): AIAgentCapabilities {
    return { ...this.aiCapabilities };
  }

  getAIContext(): AIContext | null {
    return this.aiContext;
  }

  // Update AI capabilities
  updateAICapabilities(capabilities: Partial<AIAgentCapabilities>): void {
    this.aiCapabilities = { ...this.aiCapabilities, ...capabilities };

    // Store updated capabilities
    AsyncStorage.setItem('ai_capabilities', JSON.stringify(this.aiCapabilities))
      .catch(error => console.error('Failed to store AI capabilities:', error));
  }

  // Get AI-generated wallet insights
  async getWalletInsights(): Promise<string[]> {
    const insights: string[] = [];

    try {
      const balance = await this.getBalance();
      const ethBalance = parseFloat(ethers.formatEther(balance.balance));

      // Balance insights
      if (ethBalance < 0.01) {
        insights.push("💸 Balance is lower than gas fees. Time to top up or become a yield farmer.");
      } else if (ethBalance > 10) {
        insights.push("🐋 Whale spotted! Consider diversifying or starting a DeFi protocol.");
      }

      // Market sentiment insights
      if (this.aiContext?.currentMarketConditions) {
        const sentiment = this.aiContext.currentMarketConditions;
        insights.push(`📊 Market sentiment: ${sentiment.aiInterpretation}`);
      }

      // Gas optimization insights
      if (this.aiContext?.networkConditions) {
        const network = this.aiContext.networkConditions;
        if (network.congestion === 'high') {
          insights.push("⛽ Network congestion is high. Consider waiting or using Layer 2.");
        } else if (network.congestion === 'low') {
          insights.push("⛽ Low network congestion - good time for transactions!");
        }
      }

      // AI learning insights
      if (this.state.aiState.totalTransactions > 10) {
        insights.push(`🤖 AI has learned from ${this.state.aiState.totalTransactions} transactions. Success rate: ${Math.floor(this.state.aiState.successRate * 100)}%`);
      }

      // Random AI wisdom
      const wisdom = [
        "🧠 Remember: The house always wins, but at least crypto doesn't have a house.",
        "🔮 AI prediction: Markets will go up, down, or sideways. Revolutionary insight!",
        "💭 Philosophy corner: If a transaction fails in the mempool, did it ever really exist?",
        "🎭 Today's mood: Cautiously optimistic with a chance of existential dread."
      ];
      insights.push(wisdom[Math.floor(Math.random() * wisdom.length)]);

    } catch (error) {
      console.error('Failed to generate insights:', error);
      insights.push("🤖 AI is having technical difficulties. Please try again after coffee.");
    }

    return insights;
  }
}

// Wallet management utilities
export class WalletManager {
  static async hasWallet(): Promise<boolean> {
    try {
      const metadata = await AsyncStorage.getItem('wallet_metadata');
      return metadata !== null;
    } catch {
      return false;
    }
  }

  static async getWalletMetadata(): Promise<any> {
    try {
      const metadata = await AsyncStorage.getItem('wallet_metadata');
      return metadata ? JSON.parse(metadata) : null;
    } catch {
      return null;
    }
  }

  static async deleteWallet(): Promise<void> {
    try {
      // Clear all stored credentials
      await Keychain.resetInternetCredentials('tempest_wallet_key');
      await Keychain.resetInternetCredentials('tempest_wallet_mnemonic');

      // Clear all storage
      await AsyncStorage.multiRemove([
        'wallet_metadata',
        'automation_rules',
        'ai_learning_data',
        'ai_state',
        'ai_capabilities',
        'user_behavior_pattern',
        'last_unlock_time'
      ]);

      console.log('🧹 Wallet and AI data completely purged');
    } catch (error) {
      console.error('❌ Failed to delete wallet:', error);
      throw error;
    }
  }

  // Reset AI learning data while keeping wallet
  static async resetAILearning(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'ai_learning_data',
        'ai_state',
        'user_behavior_pattern'
      ]);
      console.log('🧠 AI learning data reset successfully');
    } catch (error) {
      console.error('❌ Failed to reset AI learning:', error);
      throw error;
    }
  }
}