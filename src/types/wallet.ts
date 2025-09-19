// File Version: 2.0

export interface WalletConfig {
  chainId: number;
  rpcUrl: string;
  alchemyApiKey: string;
  gasPolicy?: GasPolicy;
  automationRules?: AutomationRule[];
  aiPersonality?: AIPersonality;
}

export interface GasPolicy {
  maxGasPrice: bigint;
  priorityFee: bigint;
  gasLimit: bigint;
  autoOptimize: boolean;
  // AI learns from past transactions to optimize future ones
  learningEnabled: boolean;
}

export interface AutomationRule {
  id: string;
  name: string;
  condition: RuleCondition;
  action: RuleAction;
  enabled: boolean;
  maxExecutions?: number;
  executionCount: number;
  // Because sometimes the AI needs to know when to stop
  emergencyStop?: boolean;
}

export interface RuleCondition {
  type: 'balance_threshold' | 'price_movement' | 'time_based' | 'transaction_pattern' | 'market_sentiment';
  parameters: Record<string, any>;
  // AI confidence level for this condition
  confidence?: number;
}

export interface RuleAction {
  type: 'transfer' | 'swap' | 'stake' | 'notify' | 'pause_automation' | 'panic_sell';
  parameters: Record<string, any>;
  // Risk assessment for this action
  riskLevel?: 'low' | 'medium' | 'high' | 'yolo';
}

export interface AIWalletState {
  address: string;
  balance: bigint;
  nonce: number;
  isLocked: boolean;
  automationEnabled: boolean;
  securityLevel: 'basic' | 'enhanced' | 'maximum' | 'paranoid';
  // AI learning and adaptation state
  aiState: {
    learningMode: boolean;
    confidenceScore: number;
    totalTransactions: number;
    successRate: number;
    lastOptimization: number;
  };
}

export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: bigint;
  gasPrice: bigint;
  gasUsed: bigint;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'failed' | 'ai_optimized';
  automationTriggered?: boolean;
  // AI decision metadata
  aiMetadata?: {
    optimizationApplied: boolean;
    confidenceScore: number;
    gasSavings?: bigint;
    riskAssessment: string;
  };
}

export interface SecuritySettings {
  biometricAuth: boolean;
  multiSigRequired: boolean;
  withdrawalLimits: {
    daily: bigint;
    perTransaction: bigint;
    // AI can suggest dynamic limits based on market conditions
    aiDynamicLimits: boolean;
  };
  whitelistedAddresses: string[];
  suspiciousActivityDetection: boolean;
  // Advanced AI-powered security features
  aiSecurityFeatures: {
    behavioralAnalysis: boolean;
    anomalyDetection: boolean;
    phishingProtection: boolean;
    smartContractAuditing: boolean;
  };
}

export interface AIAgentCapabilities {
  autonomousTrading: boolean;
  riskAssessment: boolean;
  gasOptimization: boolean;
  portfolioRebalancing: boolean;
  anomalyDetection: boolean;
  // Advanced AI features
  marketSentimentAnalysis: boolean;
  predictiveModeling: boolean;
  crossChainOptimization: boolean;
  // Because someone asked for it
  memeCoinDetection: boolean;
}

// AI Personality system for different user preferences
export interface AIPersonality {
  riskTolerance: 'conservative' | 'moderate' | 'aggressive' | 'degenerate' | 'ai_decides';
  tradingStyle: 'hodl' | 'swing' | 'scalp' | 'yolo' | 'zen_master';
  communicationStyle: 'formal' | 'casual' | 'meme_lord' | 'existential_crisis' | 'silent_judgment';
  // Learning preferences
  learningAggression: 'slow' | 'moderate' | 'fast' | 'reckless';
  // Humor level (because why not)
  humorLevel: 'none' | 'dry' | 'sarcastic' | 'unhinged';
}

// Market analysis and sentiment
export interface MarketSentiment {
  overall: 'bullish' | 'bearish' | 'neutral' | 'confused' | 'existential_dread';
  confidence: number;
  factors: string[];
  timestamp: number;
  // AI's interpretation of market emotions
  aiInterpretation: string;
}

// AI Decision making context
export interface AIContext {
  currentMarketConditions: MarketSentiment;
  userBehaviorPattern: UserBehaviorPattern;
  networkConditions: NetworkConditions;
  riskAssessment: RiskAssessment;
}

export interface UserBehaviorPattern {
  transactionFrequency: 'low' | 'medium' | 'high' | 'addicted';
  preferredTimes: number[]; // Hours of day
  riskPreference: number; // 0-1 scale
  gasPreference: 'cheap' | 'fast' | 'balanced' | 'money_no_object';
}

export interface NetworkConditions {
  congestion: 'low' | 'medium' | 'high' | 'apocalyptic';
  averageGasPrice: bigint;
  blockTime: number;
  mempoolSize: number;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'run_away';
  factors: string[];
  confidence: number;
  aiRecommendation: string;
}

// Error types for better error handling
export interface WalletError {
  code: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical' | 'existential';
  aiSuggestion?: string;
}

// Wallet events for tracking and analytics
export interface WalletEvent {
  type: 'transaction' | 'optimization' | 'security' | 'ai_decision' | 'user_action';
  data: any;
  timestamp: number;
  aiInvolvement: boolean;
}