// File Version: 2.0
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: number;
}

export interface HistoricalPrice {
  timestamp: number;
  price: number;
  volume: number;
}

export interface MarketData {
  prices: PriceData[];
  totalMarketCap: number;
  totalVolume: number;
  btcDominance: number;
  fearGreedIndex: number;
  lastUpdated: number;
}

class PriceService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute
  private readonly TEMPEST_API_BASE = 'http://localhost:3001/api/v1';

  // Rate limiting for Tempest API
  private rateLimiter = {
    requests: 0,
    resetTime: Date.now() + 3600000, // 1 hour
    maxRequests: 100 // Tempest API limit
  };

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();

    if (now > this.rateLimiter.resetTime) {
      this.rateLimiter.requests = 0;
      this.rateLimiter.resetTime = now + 60000;
    }

    if (this.rateLimiter.requests >= this.rateLimiter.maxRequests) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    this.rateLimiter.requests++;
  }

  private getCacheKey(endpoint: string, params?: any): string {
    return `${endpoint}_${JSON.stringify(params || {})}`;
  }

  private isDataFresh(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  private async fetchWithCache<T>(
    endpoint: string,
    params?: any,
    cacheDuration?: number
  ): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, params);
    const cached = this.cache.get(cacheKey);

    if (cached && this.isDataFresh(cached.timestamp)) {
      return cached.data;
    }

    await this.checkRateLimit();

    try {
      const url = new URL(`${this.TEMPEST_API_BASE}${endpoint}`);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Tempest API request failed: ${response.status}`);
      }

      const data = await response.json();

      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('Tempest API error:', error);
      throw new Error(`Tempest API unavailable: ${error.message}`);
    }
  }

  async getPrice(symbol: string): Promise<PriceData> {
    // Get gas data from Tempest API
    const gasData = await this.fetchWithCache<any>('/gas/optimal');

    if (!gasData.success) {
      throw new Error('Failed to get gas price data from Tempest API');
    }

    // Convert gas prices to price-like format
    const standardGas = parseFloat(gasData.data.standard) / 1000000000; // Convert to Gwei

    return {
      symbol: 'GAS',
      price: standardGas,
      change24h: 0, // Would need historical data
      changePercent24h: 0,
      marketCap: 0,
      volume24h: 0,
      lastUpdated: Date.now()
    };
  }

  async getMultiplePrices(symbols: string[]): Promise<PriceData[]> {
    // Get both gas prices and mempool stats from Tempest API
    const [gasData, mempoolData] = await Promise.all([
      this.fetchWithCache<any>('/gas/optimal'),
      this.fetchWithCache<any>('/mempool/stats')
    ]);

    if (!gasData.success || !mempoolData.success) {
      throw new Error('Failed to get data from Tempest API');
    }

    const results: PriceData[] = [];

    // Add gas price data
    results.push({
      symbol: 'GAS',
      price: parseFloat(gasData.data.standard) / 1000000000,
      change24h: 0,
      changePercent24h: 0,
      marketCap: 0,
      volume24h: 0,
      lastUpdated: Date.now()
    });

    // Add mempool stats as "price" data
    results.push({
      symbol: 'MEMPOOL',
      price: mempoolData.data.pendingCount,
      change24h: 0,
      changePercent24h: 0,
      marketCap: parseFloat(mempoolData.data.totalValue),
      volume24h: parseFloat(mempoolData.data.avgGasPrice),
      lastUpdated: Date.now()
    });

    return results;
  }

  async getHistoricalPrices(
    symbol: string,
    days: number = 7
  ): Promise<HistoricalPrice[]> {
    // Tempest API doesn't provide historical data yet
    // This would need to be implemented in the gas oracle
    throw new Error('Historical data not available from Tempest API - feature needs implementation');
  }

  async getMarketData(): Promise<MarketData> {
    // Get real-time data from Tempest API
    const [gasData, mempoolData] = await Promise.all([
      this.fetchWithCache<any>('/gas/optimal'),
      this.fetchWithCache<any>('/mempool/stats')
    ]);

    if (!gasData.success || !mempoolData.success) {
      throw new Error('Failed to get market data from Tempest API');
    }

    const prices = await this.getMultiplePrices(['gas', 'mempool']);

    return {
      prices,
      totalMarketCap: parseFloat(mempoolData.data.totalValue),
      totalVolume: parseFloat(mempoolData.data.avgGasPrice) * mempoolData.data.pendingCount,
      btcDominance: 0, // Not applicable for gas data
      fearGreedIndex: this.calculateNetworkSentiment(gasData.data, mempoolData.data),
      lastUpdated: Date.now()
    };
  }

  private calculateNetworkSentiment(gasData: any, mempoolData: any): number {
    // Calculate sentiment based on network conditions
    const standardGas = parseFloat(gasData.data.standard) / 1000000000;
    const fastGas = parseFloat(gasData.data.fast) / 1000000000;
    const pendingCount = mempoolData.data.pendingCount;

    // Lower gas prices and fewer pending txs = positive sentiment
    let sentiment = 50; // Neutral base

    // Gas price factor (lower is better)
    if (standardGas < 20) sentiment += 20;
    else if (standardGas > 50) sentiment -= 20;

    // Mempool congestion factor
    if (pendingCount < 50000) sentiment += 15;
    else if (pendingCount > 100000) sentiment -= 15;

    // Gas price spread (lower spread = more stable)
    const spread = (fastGas - standardGas) / standardGas;
    if (spread < 0.2) sentiment += 10;
    else if (spread > 0.5) sentiment -= 10;

    return Math.max(0, Math.min(100, sentiment));
  }

  // Gas price prediction using Tempest API
  async getPricePrediction(symbol: string): Promise<{
    prediction: number;
    confidence: number;
    timeframe: string;
    factors: string[];
  }> {
    // Use Tempest API prediction endpoint
    const response = await fetch(`${this.TEMPEST_API_BASE}/gas/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        gasPrice: '20000000000' // 20 gwei base
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get prediction from Tempest API');
    }

    const predictionData = await response.json();

    if (!predictionData.success) {
      throw new Error('Tempest API prediction failed');
    }

    return {
      prediction: parseFloat(predictionData.data.estimatedWaitTime || 0),
      confidence: predictionData.data.confidence || 0.5,
      timeframe: '1h',
      factors: [
        `Network congestion: ${predictionData.data.networkCongestion || 'unknown'}`,
        `Current mempool: ${predictionData.data.mempoolSize || 0} transactions`,
        'Real-time network analysis',
        'Tempest gas oracle prediction'
      ]
    };
  }

  // Store price alerts locally
  async setPriceAlert(symbol: string, targetPrice: number, type: 'above' | 'below'): Promise<void> {
    try {
      const alerts = await this.getPriceAlerts();
      const newAlert = {
        id: Date.now().toString(),
        symbol,
        targetPrice,
        type,
        created: Date.now(),
        triggered: false
      };

      alerts.push(newAlert);
      await AsyncStorage.setItem('price_alerts', JSON.stringify(alerts));
    } catch (error) {
      console.error('Failed to set price alert:', error);
      throw error;
    }
  }

  async getPriceAlerts(): Promise<any[]> {
    try {
      const alertsJson = await AsyncStorage.getItem('price_alerts');
      return alertsJson ? JSON.parse(alertsJson) : [];
    } catch (error) {
      console.error('Failed to get price alerts:', error);
      return [];
    }
  }

  async checkPriceAlerts(): Promise<{ triggered: any[]; remaining: any[] }> {
    try {
      const alerts = await this.getPriceAlerts();
      const triggered: any[] = [];
      const remaining: any[] = [];

      for (const alert of alerts) {
        if (alert.triggered) continue;

        try {
          const currentPrice = await this.getPrice(alert.symbol);

          const shouldTrigger = (
            (alert.type === 'above' && currentPrice.price >= alert.targetPrice) ||
            (alert.type === 'below' && currentPrice.price <= alert.targetPrice)
          );

          if (shouldTrigger) {
            alert.triggered = true;
            alert.triggeredAt = Date.now();
            alert.triggeredPrice = currentPrice.price;
            triggered.push(alert);
          } else {
            remaining.push(alert);
          }
        } catch (error) {
          // Keep alert if price check fails
          remaining.push(alert);
        }
      }

      // Update storage
      await AsyncStorage.setItem('price_alerts', JSON.stringify([...triggered, ...remaining]));

      return { triggered, remaining };
    } catch (error) {
      console.error('Failed to check price alerts:', error);
      return { triggered: [], remaining: [] };
    }
  }

  // Clear old cache entries to prevent memory bloat
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats for debugging
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const priceService = new PriceService();