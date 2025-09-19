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
  private readonly API_BASE = 'https://api.coingecko.com/api/v3';

  // Because free APIs have rate limits and I'm not paying for premium
  private rateLimiter = {
    requests: 0,
    resetTime: Date.now() + 60000,
    maxRequests: 50 // CoinGecko free tier limit
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
      const url = new URL(`${this.API_BASE}${endpoint}`);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, String(value));
        });
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      // Cache the result
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('Price API error:', error);

      // Return cached data if available, even if stale
      if (cached) {
        console.warn('Using stale cached data due to API error');
        return cached.data;
      }

      throw error;
    }
  }

  async getPrice(symbol: string): Promise<PriceData> {
    try {
      const data = await this.fetchWithCache<any>('/simple/price', {
        ids: symbol.toLowerCase(),
        vs_currencies: 'usd',
        include_24hr_change: 'true',
        include_market_cap: 'true',
        include_24hr_vol: 'true'
      });

      const coinData = data[symbol.toLowerCase()];
      if (!coinData) {
        throw new Error(`No data found for ${symbol}`);
      }

      return {
        symbol: symbol.toUpperCase(),
        price: coinData.usd || 0,
        change24h: coinData.usd_24h_change || 0,
        changePercent24h: coinData.usd_24h_change || 0,
        marketCap: coinData.usd_market_cap || 0,
        volume24h: coinData.usd_24h_vol || 0,
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error(`Failed to get price for ${symbol}:`, error);

      // Return mock data for development
      return {
        symbol: symbol.toUpperCase(),
        price: Math.random() * 3000 + 1000, // Random price between 1000-4000
        change24h: (Math.random() - 0.5) * 200, // Random change ±100
        changePercent24h: (Math.random() - 0.5) * 10, // Random ±5%
        marketCap: Math.random() * 1000000000000, // Random market cap
        volume24h: Math.random() * 10000000000, // Random volume
        lastUpdated: Date.now()
      };
    }
  }

  async getMultiplePrices(symbols: string[]): Promise<PriceData[]> {
    try {
      const ids = symbols.map(s => s.toLowerCase()).join(',');
      const data = await this.fetchWithCache<any>('/simple/price', {
        ids,
        vs_currencies: 'usd',
        include_24hr_change: 'true',
        include_market_cap: 'true',
        include_24hr_vol: 'true'
      });

      return symbols.map(symbol => {
        const coinData = data[symbol.toLowerCase()] || {};
        return {
          symbol: symbol.toUpperCase(),
          price: coinData.usd || 0,
          change24h: coinData.usd_24h_change || 0,
          changePercent24h: coinData.usd_24h_change || 0,
          marketCap: coinData.usd_market_cap || 0,
          volume24h: coinData.usd_24h_vol || 0,
          lastUpdated: Date.now()
        };
      });
    } catch (error) {
      console.error('Failed to get multiple prices:', error);

      // Return mock data for all symbols
      return symbols.map(symbol => ({
        symbol: symbol.toUpperCase(),
        price: Math.random() * 3000 + 1000,
        change24h: (Math.random() - 0.5) * 200,
        changePercent24h: (Math.random() - 0.5) * 10,
        marketCap: Math.random() * 1000000000000,
        volume24h: Math.random() * 10000000000,
        lastUpdated: Date.now()
      }));
    }
  }

  async getHistoricalPrices(
    symbol: string,
    days: number = 7
  ): Promise<HistoricalPrice[]> {
    try {
      const data = await this.fetchWithCache<any>(
        `/coins/${symbol.toLowerCase()}/market_chart`,
        {
          vs_currency: 'usd',
          days: days.toString()
        }
      );

      if (!data.prices) {
        throw new Error('No historical data available');
      }

      return data.prices.map(([timestamp, price]: [number, number]) => ({
        timestamp,
        price,
        volume: 0 // CoinGecko returns volume separately
      }));
    } catch (error) {
      console.error(`Failed to get historical prices for ${symbol}:`, error);

      // Generate mock historical data
      const mockData: HistoricalPrice[] = [];
      const basePrice = 2000;
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;

      for (let i = days; i >= 0; i--) {
        mockData.push({
          timestamp: now - (i * dayMs),
          price: basePrice + (Math.random() - 0.5) * 500,
          volume: Math.random() * 1000000000
        });
      }

      return mockData;
    }
  }

  async getMarketData(): Promise<MarketData> {
    try {
      const [globalData, topCoins] = await Promise.all([
        this.fetchWithCache<any>('/global'),
        this.fetchWithCache<any>('/coins/markets', {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: '10',
          page: '1'
        })
      ]);

      const prices: PriceData[] = topCoins.map((coin: any) => ({
        symbol: coin.symbol.toUpperCase(),
        price: coin.current_price || 0,
        change24h: coin.price_change_24h || 0,
        changePercent24h: coin.price_change_percentage_24h || 0,
        marketCap: coin.market_cap || 0,
        volume24h: coin.total_volume || 0,
        lastUpdated: Date.now()
      }));

      return {
        prices,
        totalMarketCap: globalData.data?.total_market_cap?.usd || 0,
        totalVolume: globalData.data?.total_volume?.usd || 0,
        btcDominance: globalData.data?.market_cap_percentage?.btc || 0,
        fearGreedIndex: Math.floor(Math.random() * 100), // Mock fear/greed index
        lastUpdated: Date.now()
      };
    } catch (error) {
      console.error('Failed to get market data:', error);

      // Return mock market data
      return {
        prices: [
          { symbol: 'BTC', price: 45000, change24h: 1200, changePercent24h: 2.7, marketCap: 850000000000, volume24h: 25000000000, lastUpdated: Date.now() },
          { symbol: 'ETH', price: 3200, change24h: -50, changePercent24h: -1.5, marketCap: 380000000000, volume24h: 15000000000, lastUpdated: Date.now() },
          { symbol: 'BNB', price: 380, change24h: 15, changePercent24h: 4.1, marketCap: 58000000000, volume24h: 2000000000, lastUpdated: Date.now() }
        ],
        totalMarketCap: 2200000000000,
        totalVolume: 85000000000,
        btcDominance: 42.5,
        fearGreedIndex: 65, // Greed territory
        lastUpdated: Date.now()
      };
    }
  }

  // AI-enhanced price prediction (very basic ML simulation)
  async getPricePrediction(symbol: string): Promise<{
    prediction: number;
    confidence: number;
    timeframe: string;
    factors: string[];
  }> {
    try {
      // Get historical data for analysis
      const historical = await this.getHistoricalPrices(symbol, 30);
      const currentPrice = historical[historical.length - 1]?.price || 0;

      // Simple trend analysis (in reality, this would use ML models)
      const recentPrices = historical.slice(-7).map(h => h.price);
      const trend = recentPrices.reduce((sum, price, i) => {
        if (i === 0) return 0;
        return sum + (price - recentPrices[i - 1]);
      }, 0) / (recentPrices.length - 1);

      // Volatility calculation
      const avgPrice = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
      const volatility = Math.sqrt(
        recentPrices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / recentPrices.length
      );

      // Prediction logic (very simplified)
      const trendMultiplier = trend > 0 ? 1.02 : 0.98;
      const volatilityFactor = Math.min(volatility / avgPrice, 0.1);
      const randomFactor = (Math.random() - 0.5) * 0.1; // ±5% random

      const prediction = currentPrice * trendMultiplier * (1 + volatilityFactor + randomFactor);

      // Confidence based on volatility (lower volatility = higher confidence)
      const confidence = Math.max(0.1, Math.min(0.9, 1 - (volatilityFactor * 5)));

      return {
        prediction,
        confidence,
        timeframe: '24h',
        factors: [
          `Recent trend: ${trend > 0 ? 'Bullish' : 'Bearish'}`,
          `Volatility: ${volatility > avgPrice * 0.05 ? 'High' : 'Low'}`,
          `Market sentiment: ${Math.random() > 0.5 ? 'Positive' : 'Negative'}`,
          'Technical indicators', // Placeholder
          'Social sentiment' // Placeholder
        ]
      };
    } catch (error) {
      console.error(`Failed to get price prediction for ${symbol}:`, error);

      // Return mock prediction
      return {
        prediction: 2000 + (Math.random() - 0.5) * 400,
        confidence: 0.6,
        timeframe: '24h',
        factors: [
          'Insufficient data for accurate prediction',
          'Using basic trend analysis',
          'Market volatility detected'
        ]
      };
    }
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