// File Version: 2.0
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';
import { tempestAPI } from './TempestAPI';
import { WalletCore } from '@/core/WalletCore';

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  type: 'gas_optimization' | 'network_timing' | 'ai_custom' | 'dca' | 'momentum';
  enabled: boolean;
  parameters: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high';
  maxAllocation: number;
  created: number;
  lastExecuted?: number;
  performance: {
    totalTrades: number;
    successfulTrades: number;
    totalGasSaved: bigint;
    avgConfirmationTime: number;
    totalReturn: number;
  };
}

export interface TradeOrder {
  id: string;
  strategyId: string;
  type: 'optimize_gas' | 'delay_transaction' | 'execute_now' | 'buy' | 'sell';
  gasPrice: bigint;
  estimatedWaitTime: number;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  timestamp: number;
  txHash?: string;
  aiConfidence: number;
  reasoning: string;
  asset?: string;
  amount?: number;
}

export interface AITradingDecision {
  action: 'optimize_gas' | 'delay_transaction' | 'execute_now' | 'wait';
  recommendedGasPrice: bigint;
  estimatedWaitTime: number;
  confidence: number;
  reasoning: string;
  riskScore: number;
  networkFactors: string[];
  gasSavings?: bigint;
}

class TradingEngine {
  private strategies: Map<string, TradingStrategy> = new Map();
  private activeOrders: Map<string, TradeOrder> = new Map();
  private walletCore: WalletCore | null = null;

  // AI decision-making parameters
  private readonly AI_CONFIDENCE_THRESHOLD = 0.7;
  private readonly MAX_DAILY_OPTIMIZATIONS = 50;

  async initialize(walletCore: WalletCore): Promise<void> {
    this.walletCore = walletCore;
    await this.loadStrategies();
    await this.loadActiveOrders();

    // Start gas optimization engine
    const aiCapabilities = walletCore.getAICapabilities();
    if (aiCapabilities.gasOptimization) {
      this.startGasOptimizationEngine();
    }
  }

  // Create gas optimization strategy
  createGasOptimizationStrategy(
    name: string,
    targetSavings: number,
    maxDelay: number // minutes
  ): TradingStrategy {
    const strategy: TradingStrategy = {
      id: `gas_opt_${Date.now()}`,
      name,
      description: `Optimize gas prices to save ${targetSavings}% with max ${maxDelay}min delay`,
      type: 'gas_optimization',
      enabled: false,
      parameters: {
        targetSavings,
        maxDelay,
        minConfidence: 0.6
      },
      riskLevel: 'low',
      maxAllocation: 100, // Can optimize all transactions
      created: Date.now(),
      performance: {
        totalTrades: 0,
        successfulTrades: 0,
        totalGasSaved: 0n,
        avgConfirmationTime: 0,
        totalReturn: 0
      }
    };

    this.strategies.set(strategy.id, strategy);
    this.saveStrategies();
    return strategy;
  }

  // AI-powered gas optimization decision
  async makeGasOptimizationDecision(
    targetGasPrice: bigint,
    urgency: 'low' | 'medium' | 'high'
  ): Promise<AITradingDecision> {
    try {
      // Get real network conditions
      const networkConditions = await tempestAPI.getNetworkConditions();
      const gasData = await tempestAPI.getOptimalGasPrice();

      // Calculate optimal strategy
      const decision = this.generateGasOptimizationDecision(
        targetGasPrice,
        networkConditions,
        gasData,
        urgency
      );

      return decision;
    } catch (error) {
      console.error('Gas optimization decision failed:', error);
      throw new Error(`Cannot optimize gas - Tempest API unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateGasOptimizationDecision(
    targetGasPrice: bigint,
    networkConditions: any,
    gasData: any,
    urgency: string
  ): AITradingDecision {
    const currentStandard = BigInt(gasData.standard);
    const currentFast = BigInt(gasData.fast);
    const currentSlow = BigInt(gasData.slow);

    const targetGwei = Number(targetGasPrice) / 1000000000;
    const standardGwei = Number(currentStandard) / 1000000000;

    let action: 'optimize_gas' | 'delay_transaction' | 'execute_now' | 'wait';
    let recommendedGasPrice = currentStandard;
    let reasoning = '';
    let confidence = networkConditions.confidence;

    // Decision logic based on network conditions
    if (targetGasPrice <= currentSlow) {
      // User wants very low gas - might need to wait
      if (networkConditions.congestion === 'high' && urgency === 'low') {
        action = 'delay_transaction';
        recommendedGasPrice = currentSlow;
        reasoning = 'Network congestion high - delaying for better gas prices';
        confidence *= 0.8;
      } else {
        action = 'optimize_gas';
        recommendedGasPrice = currentSlow;
        reasoning = 'Using slow gas price for maximum savings';
      }
    } else if (targetGasPrice >= currentFast || urgency === 'high') {
      // User wants fast execution
      action = 'execute_now';
      recommendedGasPrice = currentFast;
      reasoning = 'Executing immediately with fast gas price';
    } else {
      // Standard optimization
      action = 'optimize_gas';
      recommendedGasPrice = currentStandard;
      reasoning = 'Using standard optimized gas price';
    }

    // Calculate potential savings
    const gasSavings = targetGasPrice > recommendedGasPrice
      ? targetGasPrice - recommendedGasPrice
      : 0n;

    return {
      action,
      recommendedGasPrice,
      estimatedWaitTime: networkConditions.avgWaitTime,
      confidence,
      reasoning,
      riskScore: this.calculateNetworkRiskScore(networkConditions),
      networkFactors: [
        `Network congestion: ${networkConditions.congestion}`,
        `Mempool size: ${networkConditions.mempoolSize} transactions`,
        `Current gas prices: ${standardGwei.toFixed(1)} Gwei`,
        `Confidence: ${Math.round(confidence * 100)}%`
      ],
      gasSavings
    };
  }

  private calculateNetworkRiskScore(networkConditions: any): number {
    let riskScore = 0.1; // Base risk

    // Congestion risk
    switch (networkConditions.congestion) {
      case 'low': riskScore += 0.1; break;
      case 'medium': riskScore += 0.3; break;
      case 'high': riskScore += 0.6; break;
      case 'critical': riskScore += 0.9; break;
    }

    // Gas price volatility risk
    if (networkConditions.gasPrice > 100) riskScore += 0.3;
    else if (networkConditions.gasPrice > 50) riskScore += 0.2;

    // Wait time risk
    if (networkConditions.avgWaitTime > 300) riskScore += 0.2; // 5+ minutes

    return Math.min(riskScore, 1.0);
  }

  // Start the gas optimization engine
  private startGasOptimizationEngine(): void {
    // Monitor network conditions every 2 minutes
    setInterval(async () => {
      try {
        await this.executeOptimizationStrategies();
      } catch (error) {
        console.error('Gas optimization engine error:', error);
      }
    }, 2 * 60 * 1000);

    console.log('⛽ Gas Optimization Engine started - saving you money');
  }

  private async executeOptimizationStrategies(): Promise<void> {
    const enabledStrategies = Array.from(this.strategies.values()).filter(s => s.enabled);

    for (const strategy of enabledStrategies) {
      try {
        await this.executeStrategy(strategy);
      } catch (error) {
        console.error(`Strategy ${strategy.name} execution failed:`, error);
      }
    }
  }

  private async executeStrategy(strategy: TradingStrategy): Promise<void> {
    // Rate limiting
    if (strategy.lastExecuted && Date.now() - strategy.lastExecuted < 120000) {
      return; // Too soon since last execution (2 minutes)
    }

    switch (strategy.type) {
      case 'gas_optimization':
        await this.executeGasOptimizationStrategy(strategy);
        break;
      case 'network_timing':
        await this.executeNetworkTimingStrategy(strategy);
        break;
      case 'ai_custom':
        await this.executeAICustomStrategy(strategy);
        break;
      default:
        console.warn(`Unknown strategy type: ${strategy.type}`);
    }

    strategy.lastExecuted = Date.now();
    await this.saveStrategies();
  }

  private async executeGasOptimizationStrategy(strategy: TradingStrategy): Promise<void> {
    const { targetSavings, maxDelay, minConfidence } = strategy.parameters;

    try {
      const networkConditions = await tempestAPI.getNetworkConditions();

      // Only optimize if we have good confidence
      if (networkConditions.confidence < minConfidence) {
        return;
      }

      // Check if current conditions favor optimization
      if (networkConditions.congestion === 'low' && networkConditions.gasPrice < 30) {
        console.log(`⛽ Optimal gas conditions detected - ${networkConditions.gasPrice} Gwei`);

        // Update strategy performance
        strategy.performance.totalTrades += 1;
        strategy.performance.successfulTrades += 1;
      }
    } catch (error) {
      console.error('Gas optimization strategy execution failed:', error);
    }
  }

  private async executeNetworkTimingStrategy(strategy: TradingStrategy): Promise<void> {
    // This would implement timing-based strategies
    // e.g., "execute transactions during off-peak hours"
  }

  private async executeAICustomStrategy(strategy: TradingStrategy): Promise<void> {
    // This would implement custom AI strategies
  }

  private async loadStrategies(): Promise<void> {
    try {
      const strategiesJson = await AsyncStorage.getItem('gas_strategies');
      if (strategiesJson) {
        const strategies = JSON.parse(strategiesJson);
        strategies.forEach((strategy: TradingStrategy) => {
          this.strategies.set(strategy.id, strategy);
        });
      }
    } catch (error) {
      console.error('Failed to load gas strategies:', error);
    }
  }

  private async saveStrategies(): Promise<void> {
    try {
      const strategies = Array.from(this.strategies.values());
      await AsyncStorage.setItem('gas_strategies', JSON.stringify(strategies));
    } catch (error) {
      console.error('Failed to save gas strategies:', error);
    }
  }

  private async loadActiveOrders(): Promise<void> {
    try {
      const ordersJson = await AsyncStorage.getItem('gas_orders');
      if (ordersJson) {
        const orders = JSON.parse(ordersJson);
        orders.forEach((order: TradeOrder) => {
          this.activeOrders.set(order.id, order);
        });
      }
    } catch (error) {
      console.error('Failed to load gas orders:', error);
    }
  }

  private async saveActiveOrders(): Promise<void> {
    try {
      const orders = Array.from(this.activeOrders.values());
      await AsyncStorage.setItem('gas_orders', JSON.stringify(orders));
    } catch (error) {
      console.error('Failed to save gas orders:', error);
    }
  }

  // Public API methods
  async getStrategies(): Promise<TradingStrategy[]> {
    return Array.from(this.strategies.values());
  }

  async getActiveOrders(): Promise<TradeOrder[]> {
    return Array.from(this.activeOrders.values());
  }

  async enableStrategy(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.enabled = true;
      await this.saveStrategies();
    }
  }

  async disableStrategy(strategyId: string): Promise<void> {
    const strategy = this.strategies.get(strategyId);
    if (strategy) {
      strategy.enabled = false;
      await this.saveStrategies();
    }
  }

  async deleteStrategy(strategyId: string): Promise<void> {
    this.strategies.delete(strategyId);
    await this.saveStrategies();
  }

  // Get current network status for UI
  async getNetworkStatus(): Promise<{
    gasPrice: number;
    congestion: string;
    recommendation: string;
    confidence: number;
  }> {
    try {
      const networkConditions = await tempestAPI.getNetworkConditions();

      let recommendation = '';
      if (networkConditions.congestion === 'low') {
        recommendation = 'Great time to transact - low gas prices';
      } else if (networkConditions.congestion === 'medium') {
        recommendation = 'Moderate gas prices - consider waiting if not urgent';
      } else if (networkConditions.congestion === 'high') {
        recommendation = 'High gas prices - delay non-urgent transactions';
      } else {
        recommendation = 'Critical congestion - avoid transactions if possible';
      }

      return {
        gasPrice: networkConditions.gasPrice,
        congestion: networkConditions.congestion,
        recommendation,
        confidence: networkConditions.confidence
      };
    } catch (error) {
      throw new Error(`Cannot get network status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPerformanceMetrics(): Promise<any> {
    const strategies = Array.from(this.strategies.values());
    const totalGasSaved = strategies.reduce((sum, s) => sum + Number(s.performance.totalGasSaved), 0);
    const avgConfirmationTime = strategies.reduce((sum, s) => sum + s.performance.avgConfirmationTime, 0) / strategies.length || 0;
    const totalReturn = strategies.reduce((sum, s) => sum + s.performance.totalReturn, 0);

    return {
      totalStrategies: strategies.length,
      activeStrategies: strategies.filter(s => s.enabled).length,
      totalOptimizations: strategies.reduce((sum, s) => sum + s.performance.totalTrades, 0),
      totalGasSaved: totalGasSaved,
      totalReturn: totalReturn,
      avgConfirmationTime: Math.round(avgConfirmationTime),
      successRate: strategies.reduce((sum, s) => {
        return sum + (s.performance.totalTrades > 0 ? s.performance.successfulTrades / s.performance.totalTrades : 0);
      }, 0) / strategies.length || 0
    };
  }

  // DCA Strategy Creation
  createDCAStrategy(
    name: string,
    asset: string,
    amount: number,
    interval: 'daily' | 'weekly' | 'monthly'
  ): TradingStrategy {
    const strategy: TradingStrategy = {
      id: `dca_${Date.now()}`,
      name,
      description: `DCA ${amount} ${asset.toUpperCase()} ${interval}`,
      type: 'dca',
      enabled: false,
      parameters: {
        asset,
        amount,
        interval,
        nextExecution: Date.now() + this.getIntervalMs(interval)
      },
      riskLevel: 'low',
      maxAllocation: 25, // Max 25% of portfolio for DCA
      created: Date.now(),
      performance: {
        totalTrades: 0,
        successfulTrades: 0,
        totalGasSaved: 0n,
        avgConfirmationTime: 0,
        totalReturn: 0
      }
    };

    this.strategies.set(strategy.id, strategy);
    this.saveStrategies();
    return strategy;
  }

  // Momentum Strategy Creation
  createMomentumStrategy(
    name: string,
    asset: string,
    lookbackDays: number,
    threshold: number
  ): TradingStrategy {
    const strategy: TradingStrategy = {
      id: `momentum_${Date.now()}`,
      name,
      description: `Momentum trading for ${asset.toUpperCase()} with ${lookbackDays}d lookback`,
      type: 'momentum',
      enabled: false,
      parameters: {
        asset,
        lookbackDays,
        threshold,
        lastSignal: null
      },
      riskLevel: 'medium',
      maxAllocation: 50, // Max 50% for momentum strategies
      created: Date.now(),
      performance: {
        totalTrades: 0,
        successfulTrades: 0,
        totalGasSaved: 0n,
        avgConfirmationTime: 0,
        totalReturn: 0
      }
    };

    this.strategies.set(strategy.id, strategy);
    this.saveStrategies();
    return strategy;
  }

  // AI Custom Strategy Creation
  createAICustomStrategy(
    name: string,
    aiPrompt: string,
    riskLevel: 'low' | 'medium' | 'high' = 'medium'
  ): TradingStrategy {
    const strategy: TradingStrategy = {
      id: `ai_custom_${Date.now()}`,
      name,
      description: `AI-powered custom strategy: ${aiPrompt.substring(0, 50)}...`,
      type: 'ai_custom',
      enabled: false,
      parameters: {
        aiPrompt,
        learningRate: 0.1,
        confidenceThreshold: 0.7
      },
      riskLevel,
      maxAllocation: riskLevel === 'low' ? 25 : riskLevel === 'medium' ? 50 : 75,
      created: Date.now(),
      performance: {
        totalTrades: 0,
        successfulTrades: 0,
        totalGasSaved: 0n,
        avgConfirmationTime: 0,
        totalReturn: 0
      }
    };

    this.strategies.set(strategy.id, strategy);
    this.saveStrategies();
    return strategy;
  }

  private getIntervalMs(interval: string): number {
    switch (interval) {
      case 'daily': return 24 * 60 * 60 * 1000;
      case 'weekly': return 7 * 24 * 60 * 60 * 1000;
      case 'monthly': return 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }
}

// Export singleton instance
export const tradingEngine = new TradingEngine();