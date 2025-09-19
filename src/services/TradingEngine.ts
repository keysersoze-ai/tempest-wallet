// File Version: 2.0
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ethers } from 'ethers';
import { priceService, PriceData } from './PriceService';
import { WalletCore } from '@/core/WalletCore';

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  type: 'dca' | 'momentum' | 'mean_reversion' | 'grid' | 'ai_custom';
  enabled: boolean;
  parameters: Record<string, any>;
  riskLevel: 'low' | 'medium' | 'high' | 'degen';
  maxAllocation: number; // Percentage of portfolio
  created: number;
  lastExecuted?: number;
  performance: {
    totalTrades: number;
    successfulTrades: number;
    totalReturn: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
}

export interface TradeOrder {
  id: string;
  strategyId: string;
  type: 'buy' | 'sell';
  asset: string;
  amount: bigint;
  price: number;
  status: 'pending' | 'executed' | 'failed' | 'cancelled';
  timestamp: number;
  txHash?: string;
  aiConfidence: number;
  reasoning: string;
}

export interface PortfolioAllocation {
  asset: string;
  targetPercentage: number;
  currentPercentage: number;
  rebalanceThreshold: number;
}

export interface AITradingDecision {
  action: 'buy' | 'sell' | 'hold';
  asset: string;
  amount: number;
  confidence: number;
  reasoning: string;
  riskScore: number;
  marketFactors: string[];
  technicalIndicators: Record<string, number>;
}

class TradingEngine {
  private strategies: Map<string, TradingStrategy> = new Map();
  private activeOrders: Map<string, TradeOrder> = new Map();
  private walletCore: WalletCore | null = null;

  // AI decision-making parameters
  private readonly AI_CONFIDENCE_THRESHOLD = 0.7;
  private readonly MAX_DAILY_TRADES = 10;
  private readonly RISK_MULTIPLIERS = {
    low: 0.5,
    medium: 1.0,
    high: 1.5,
    degen: 3.0
  };

  async initialize(walletCore: WalletCore): Promise<void> {
    this.walletCore = walletCore;
    await this.loadStrategies();
    await this.loadActiveOrders();

    // Start trading engine if auto-trading is enabled
    const aiCapabilities = walletCore.getAICapabilities();
    if (aiCapabilities.autonomousTrading) {
      this.startTradingEngine();
    }
  }

  private async loadStrategies(): Promise<void> {
    try {
      const strategiesJson = await AsyncStorage.getItem('trading_strategies');
      if (strategiesJson) {
        const strategies = JSON.parse(strategiesJson);
        strategies.forEach((strategy: TradingStrategy) => {
          this.strategies.set(strategy.id, strategy);
        });
      }
    } catch (error) {
      console.error('Failed to load trading strategies:', error);
    }
  }

  private async saveStrategies(): Promise<void> {
    try {
      const strategies = Array.from(this.strategies.values());
      await AsyncStorage.setItem('trading_strategies', JSON.stringify(strategies));
    } catch (error) {
      console.error('Failed to save trading strategies:', error);
    }
  }

  private async loadActiveOrders(): Promise<void> {
    try {
      const ordersJson = await AsyncStorage.getItem('active_orders');
      if (ordersJson) {
        const orders = JSON.parse(ordersJson);
        orders.forEach((order: TradeOrder) => {
          this.activeOrders.set(order.id, order);
        });
      }
    } catch (error) {
      console.error('Failed to load active orders:', error);
    }
  }

  private async saveActiveOrders(): Promise<void> {
    try {
      const orders = Array.from(this.activeOrders.values());
      await AsyncStorage.setItem('active_orders', JSON.stringify(orders));
    } catch (error) {
      console.error('Failed to save active orders:', error);
    }
  }

  // Create predefined trading strategies
  createDCAStrategy(
    name: string,
    asset: string,
    amount: number,
    frequency: 'daily' | 'weekly' | 'monthly'
  ): TradingStrategy {
    const strategy: TradingStrategy = {
      id: `dca_${Date.now()}`,
      name,
      description: `Dollar-cost average into ${asset} ${frequency}`,
      type: 'dca',
      enabled: false,
      parameters: {
        asset,
        amount,
        frequency,
        nextExecution: this.getNextExecutionTime(frequency)
      },
      riskLevel: 'low',
      maxAllocation: 20,
      created: Date.now(),
      performance: {
        totalTrades: 0,
        successfulTrades: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      }
    };

    this.strategies.set(strategy.id, strategy);
    this.saveStrategies();
    return strategy;
  }

  createMomentumStrategy(
    name: string,
    asset: string,
    lookbackPeriod: number,
    threshold: number
  ): TradingStrategy {
    const strategy: TradingStrategy = {
      id: `momentum_${Date.now()}`,
      name,
      description: `Buy ${asset} on upward momentum, sell on downward`,
      type: 'momentum',
      enabled: false,
      parameters: {
        asset,
        lookbackPeriod,
        threshold,
        positionSize: 5 // 5% of portfolio per trade
      },
      riskLevel: 'medium',
      maxAllocation: 30,
      created: Date.now(),
      performance: {
        totalTrades: 0,
        successfulTrades: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      }
    };

    this.strategies.set(strategy.id, strategy);
    this.saveStrategies();
    return strategy;
  }

  createAICustomStrategy(
    name: string,
    description: string,
    parameters: Record<string, any>
  ): TradingStrategy {
    const strategy: TradingStrategy = {
      id: `ai_custom_${Date.now()}`,
      name,
      description,
      type: 'ai_custom',
      enabled: false,
      parameters: {
        ...parameters,
        aiPersonality: 'adaptive',
        learningRate: 0.1,
        riskAdjustment: 1.0
      },
      riskLevel: parameters.riskLevel || 'medium',
      maxAllocation: parameters.maxAllocation || 25,
      created: Date.now(),
      performance: {
        totalTrades: 0,
        successfulTrades: 0,
        totalReturn: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      }
    };

    this.strategies.set(strategy.id, strategy);
    this.saveStrategies();
    return strategy;
  }

  // AI-powered trading decision engine
  async makeAITradingDecision(
    asset: string,
    marketData: any,
    portfolioState: any
  ): Promise<AITradingDecision> {
    try {
      // Get current price and historical data
      const currentPrice = await priceService.getPrice(asset);
      const historicalData = await priceService.getHistoricalPrices(asset, 30);

      // Calculate technical indicators
      const technicalIndicators = this.calculateTechnicalIndicators(historicalData);

      // Analyze market sentiment
      const marketSentiment = await this.analyzeMarketSentiment(asset, currentPrice);

      // Risk assessment
      const riskScore = this.calculateRiskScore(currentPrice, historicalData, marketSentiment);

      // AI decision logic (simplified ML-style approach)
      const decision = this.generateTradingDecision(
        currentPrice,
        technicalIndicators,
        marketSentiment,
        riskScore,
        portfolioState
      );

      return decision;
    } catch (error) {
      console.error('AI trading decision failed:', error);

      // Fallback to conservative decision
      return {
        action: 'hold',
        asset,
        amount: 0,
        confidence: 0.1,
        reasoning: 'AI system error - defaulting to hold position for safety',
        riskScore: 1.0,
        marketFactors: ['System error detected'],
        technicalIndicators: {}
      };
    }
  }

  private calculateTechnicalIndicators(historicalData: any[]): Record<string, number> {
    if (historicalData.length < 14) {
      return {}; // Not enough data for proper indicators
    }

    const prices = historicalData.map(d => d.price);

    // Simple Moving Averages
    const sma7 = this.calculateSMA(prices, 7);
    const sma14 = this.calculateSMA(prices, 14);
    const sma30 = this.calculateSMA(prices, 30);

    // RSI (Relative Strength Index)
    const rsi = this.calculateRSI(prices, 14);

    // MACD (simplified)
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macd = ema12 - ema26;

    // Bollinger Bands
    const bollingerBands = this.calculateBollingerBands(prices, 20);

    return {
      sma7,
      sma14,
      sma30,
      rsi,
      macd,
      bollingerUpper: bollingerBands.upper,
      bollingerLower: bollingerBands.lower,
      volatility: this.calculateVolatility(prices),
      currentPrice: prices[prices.length - 1]
    };
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const slice = prices.slice(-period);
    return slice.reduce((sum, price) => sum + price, 0) / period;
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;

    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }

    return ema;
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50; // Neutral

    let gains = 0;
    let losses = 0;

    for (let i = 1; i < period + 1; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateBollingerBands(prices: number[], period: number): { upper: number; lower: number } {
    const sma = this.calculateSMA(prices, period);
    const slice = prices.slice(-period);

    const variance = slice.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    return {
      upper: sma + (stdDev * 2),
      lower: sma - (stdDev * 2)
    };
  }

  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;

    return Math.sqrt(variance);
  }

  private async analyzeMarketSentiment(asset: string, priceData: PriceData): Promise<any> {
    // Simplified sentiment analysis based on price action and volume
    const sentiment = {
      price_momentum: priceData.changePercent24h > 0 ? 'positive' : 'negative',
      volume_trend: priceData.volume24h > 1000000000 ? 'high' : 'normal', // Simplified
      market_cap_rank: priceData.marketCap > 100000000000 ? 'large_cap' : 'small_cap',
      volatility: Math.abs(priceData.changePercent24h) > 5 ? 'high' : 'normal'
    };

    return sentiment;
  }

  private calculateRiskScore(
    priceData: PriceData,
    historicalData: any[],
    marketSentiment: any
  ): number {
    let riskScore = 0.5; // Base risk

    // Price volatility risk
    const volatility = this.calculateVolatility(historicalData.map(d => d.price));
    riskScore += Math.min(volatility * 10, 0.3); // Cap volatility impact

    // Market sentiment risk
    if (marketSentiment.volatility === 'high') riskScore += 0.2;
    if (marketSentiment.volume_trend === 'high') riskScore += 0.1;

    // Price momentum risk
    if (Math.abs(priceData.changePercent24h) > 10) riskScore += 0.2;

    return Math.min(riskScore, 1.0);
  }

  private generateTradingDecision(
    priceData: PriceData,
    technicalIndicators: Record<string, number>,
    marketSentiment: any,
    riskScore: number,
    portfolioState: any
  ): AITradingDecision {
    let score = 0;
    const factors: string[] = [];

    // Technical analysis scoring
    if (technicalIndicators.rsi < 30) {
      score += 0.3;
      factors.push('RSI indicates oversold conditions');
    } else if (technicalIndicators.rsi > 70) {
      score -= 0.3;
      factors.push('RSI indicates overbought conditions');
    }

    // Moving average crossover
    if (technicalIndicators.sma7 > technicalIndicators.sma14) {
      score += 0.2;
      factors.push('Short-term MA above long-term MA');
    } else {
      score -= 0.2;
      factors.push('Short-term MA below long-term MA');
    }

    // MACD signal
    if (technicalIndicators.macd > 0) {
      score += 0.15;
      factors.push('MACD showing bullish momentum');
    } else {
      score -= 0.15;
      factors.push('MACD showing bearish momentum');
    }

    // Market sentiment
    if (marketSentiment.price_momentum === 'positive') {
      score += 0.2;
      factors.push('Positive price momentum detected');
    } else {
      score -= 0.2;
      factors.push('Negative price momentum detected');
    }

    // Risk adjustment
    score *= (1 - riskScore * 0.5); // Reduce score for high risk

    // Determine action
    let action: 'buy' | 'sell' | 'hold';
    let confidence = Math.abs(score);

    if (score > 0.3 && riskScore < 0.7) {
      action = 'buy';
    } else if (score < -0.3) {
      action = 'sell';
    } else {
      action = 'hold';
      factors.push('Signals are mixed or uncertain');
    }

    // Calculate position size (1-5% of portfolio)
    const baseAmount = 0.02; // 2% base position
    const riskAdjustedAmount = baseAmount * (1 - riskScore) * confidence;
    const amount = Math.max(0.01, Math.min(0.05, riskAdjustedAmount));

    return {
      action,
      asset: priceData.symbol,
      amount,
      confidence,
      reasoning: this.generateReasoningText(action, factors, confidence, riskScore),
      riskScore,
      marketFactors: factors,
      technicalIndicators
    };
  }

  private generateReasoningText(
    action: string,
    factors: string[],
    confidence: number,
    riskScore: number
  ): string {
    const confidenceText = confidence > 0.7 ? 'high' : confidence > 0.4 ? 'medium' : 'low';
    const riskText = riskScore > 0.7 ? 'high' : riskScore > 0.4 ? 'medium' : 'low';

    let reasoning = `AI recommends ${action.toUpperCase()} with ${confidenceText} confidence (${Math.round(confidence * 100)}%). `;
    reasoning += `Risk assessment: ${riskText} (${Math.round(riskScore * 100)}%). `;

    if (factors.length > 0) {
      reasoning += `Key factors: ${factors.slice(0, 3).join(', ')}.`;
    }

    // Add some AI personality
    if (confidence < 0.3) {
      reasoning += ' Market signals are unclear - proceeding with caution.';
    } else if (riskScore > 0.8) {
      reasoning += ' High-risk environment detected - consider waiting for better conditions.';
    } else if (action === 'buy' && confidence > 0.7) {
      reasoning += ' Strong bullish signals detected - good entry opportunity.';
    }

    return reasoning;
  }

  private getNextExecutionTime(frequency: 'daily' | 'weekly' | 'monthly'): number {
    const now = new Date();

    switch (frequency) {
      case 'daily':
        return now.setDate(now.getDate() + 1);
      case 'weekly':
        return now.setDate(now.getDate() + 7);
      case 'monthly':
        return now.setMonth(now.getMonth() + 1);
      default:
        return now.setDate(now.getDate() + 1);
    }
  }

  // Start the automated trading engine
  private startTradingEngine(): void {
    // Check for trading opportunities every 5 minutes
    setInterval(async () => {
      try {
        await this.executeStrategies();
      } catch (error) {
        console.error('Trading engine error:', error);
      }
    }, 5 * 60 * 1000);

    console.log('🤖 AI Trading Engine started - may the odds be ever in your favor');
  }

  private async executeStrategies(): Promise<void> {
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
    // Check if it's time to execute this strategy
    if (strategy.lastExecuted && Date.now() - strategy.lastExecuted < 60000) {
      return; // Too soon since last execution
    }

    switch (strategy.type) {
      case 'dca':
        await this.executeDCAStrategy(strategy);
        break;
      case 'momentum':
        await this.executeMomentumStrategy(strategy);
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

  private async executeDCAStrategy(strategy: TradingStrategy): Promise<void> {
    const { asset, amount, frequency, nextExecution } = strategy.parameters;

    if (Date.now() < nextExecution) {
      return; // Not time yet
    }

    try {
      const decision = await this.makeAITradingDecision(asset, {}, {});

      // DCA always buys, but AI can adjust the amount
      const adjustedAmount = amount * decision.confidence;

      if (adjustedAmount > 0.001) { // Minimum trade size
        await this.createOrder(strategy.id, 'buy', asset, adjustedAmount, decision);
      }

      // Schedule next execution
      strategy.parameters.nextExecution = this.getNextExecutionTime(frequency);
    } catch (error) {
      console.error('DCA strategy execution failed:', error);
    }
  }

  private async executeMomentumStrategy(strategy: TradingStrategy): Promise<void> {
    const { asset, lookbackPeriod, threshold, positionSize } = strategy.parameters;

    try {
      const historicalData = await priceService.getHistoricalPrices(asset, lookbackPeriod);
      const currentPrice = await priceService.getPrice(asset);

      // Calculate momentum
      const oldPrice = historicalData[0]?.price || currentPrice.price;
      const momentum = (currentPrice.price - oldPrice) / oldPrice;

      const decision = await this.makeAITradingDecision(asset, { momentum }, {});

      if (Math.abs(momentum) > threshold && decision.confidence > 0.6) {
        const action = momentum > 0 ? 'buy' : 'sell';
        const amount = positionSize / 100; // Convert percentage to decimal

        await this.createOrder(strategy.id, action, asset, amount, decision);
      }
    } catch (error) {
      console.error('Momentum strategy execution failed:', error);
    }
  }

  private async executeAICustomStrategy(strategy: TradingStrategy): Promise<void> {
    const { asset, aiPersonality, learningRate, riskAdjustment } = strategy.parameters;

    try {
      const decision = await this.makeAITradingDecision(asset, {}, {});

      // Apply strategy-specific adjustments
      decision.confidence *= riskAdjustment;

      if (decision.confidence > this.AI_CONFIDENCE_THRESHOLD && decision.action !== 'hold') {
        await this.createOrder(strategy.id, decision.action, asset, decision.amount, decision);
      }

      // Update strategy performance based on learning
      await this.updateStrategyPerformance(strategy, decision);
    } catch (error) {
      console.error('AI custom strategy execution failed:', error);
    }
  }

  private async createOrder(
    strategyId: string,
    action: 'buy' | 'sell',
    asset: string,
    amount: number,
    decision: AITradingDecision
  ): Promise<TradeOrder> {
    const order: TradeOrder = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      strategyId,
      type: action,
      asset,
      amount: ethers.parseEther(amount.toString()),
      price: decision.technicalIndicators.currentPrice || 0,
      status: 'pending',
      timestamp: Date.now(),
      aiConfidence: decision.confidence,
      reasoning: decision.reasoning
    };

    this.activeOrders.set(order.id, order);
    await this.saveActiveOrders();

    // In a real implementation, this would interact with a DEX or CEX
    console.log(`🤖 AI Trading Order Created: ${action.toUpperCase()} ${amount} ${asset}`);
    console.log(`Reasoning: ${decision.reasoning}`);

    return order;
  }

  private async updateStrategyPerformance(strategy: TradingStrategy, decision: AITradingDecision): Promise<void> {
    // This would track actual performance based on executed trades
    // For now, just update trade counts
    strategy.performance.totalTrades += 1;

    if (decision.confidence > 0.7) {
      strategy.performance.successfulTrades += 1;
    }

    await this.saveStrategies();
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

  async cancelOrder(orderId: string): Promise<void> {
    const order = this.activeOrders.get(orderId);
    if (order && order.status === 'pending') {
      order.status = 'cancelled';
      await this.saveActiveOrders();
    }
  }

  // Portfolio management
  async getPortfolioAnalysis(): Promise<any> {
    // This would analyze current portfolio and suggest rebalancing
    return {
      totalValue: 0,
      allocations: [],
      rebalanceNeeded: false,
      suggestedActions: []
    };
  }

  async getPerformanceMetrics(): Promise<any> {
    const strategies = Array.from(this.strategies.values());
    const totalTrades = strategies.reduce((sum, s) => sum + s.performance.totalTrades, 0);
    const successfulTrades = strategies.reduce((sum, s) => sum + s.performance.successfulTrades, 0);

    return {
      totalStrategies: strategies.length,
      activeStrategies: strategies.filter(s => s.enabled).length,
      totalTrades,
      successRate: totalTrades > 0 ? successfulTrades / totalTrades : 0,
      totalReturn: strategies.reduce((sum, s) => sum + s.performance.totalReturn, 0),
      averageSharpe: strategies.reduce((sum, s) => sum + s.performance.sharpeRatio, 0) / strategies.length || 0
    };
  }
}

// Export singleton instance
export const tradingEngine = new TradingEngine();