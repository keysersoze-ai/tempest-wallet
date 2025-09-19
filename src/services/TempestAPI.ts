// File Version: 2.0
// Direct Tempest API integration - no more simulation bullshit

export interface TempestGasData {
  slow: string;
  standard: string;
  fast: string;
  instant: string;
  confidence: number;
  networkCongestion: string;
  timestamp: string;
}

export interface TempestMempoolData {
  pendingCount: number;
  avgGasPrice: string;
  medianGasPrice: string;
  totalValue: string;
  timestamp: string;
}

export interface TempestPredictionData {
  estimatedWaitTime: number;
  confidence: number;
  networkCongestion: string;
  mempoolSize: number;
}

class TempestAPI {
  private readonly BASE_URL = 'http://localhost:3001/api/v1';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  private async fetchWithCache<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const cacheKey = `${endpoint}_${JSON.stringify(options || {})}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    const url = `${this.BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        },
        ...options
      });

      if (!response.ok) {
        throw new Error(`Tempest API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`Tempest API failed: ${data.error || 'Unknown error'}`);
      }

      // Cache successful response
      this.cache.set(cacheKey, {
        data: data.data,
        timestamp: Date.now()
      });

      return data.data;
    } catch (error) {
      console.error(`Tempest API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getOptimalGasPrice(): Promise<TempestGasData> {
    return this.fetchWithCache<TempestGasData>('/gas/optimal');
  }

  async getMempoolStats(): Promise<TempestMempoolData> {
    return this.fetchWithCache<TempestMempoolData>('/mempool/stats');
  }

  async predictConfirmationTime(gasPrice: string): Promise<TempestPredictionData> {
    return this.fetchWithCache<TempestPredictionData>('/gas/predict', {
      method: 'POST',
      body: JSON.stringify({ gasPrice })
    });
  }

  async checkHealth(): Promise<{ status: string; monitoring: boolean; timestamp: string }> {
    const response = await fetch(`${this.BASE_URL}/../health`);

    if (!response.ok) {
      throw new Error('Tempest API health check failed');
    }

    return response.json();
  }

  // Get current network conditions for AI analysis
  async getNetworkConditions(): Promise<{
    gasPrice: number;
    congestion: 'low' | 'medium' | 'high' | 'critical';
    mempoolSize: number;
    avgWaitTime: number;
    confidence: number;
  }> {
    const [gasData, mempoolData] = await Promise.all([
      this.getOptimalGasPrice(),
      this.getMempoolStats()
    ]);

    const standardGas = parseFloat(gasData.standard) / 1000000000; // Convert to Gwei
    const pendingCount = mempoolData.pendingCount;

    // Determine congestion level
    let congestion: 'low' | 'medium' | 'high' | 'critical';
    if (standardGas < 20 && pendingCount < 50000) congestion = 'low';
    else if (standardGas < 50 && pendingCount < 100000) congestion = 'medium';
    else if (standardGas < 100 && pendingCount < 200000) congestion = 'high';
    else congestion = 'critical';

    return {
      gasPrice: standardGas,
      congestion,
      mempoolSize: pendingCount,
      avgWaitTime: this.estimateWaitTime(standardGas, pendingCount),
      confidence: gasData.confidence
    };
  }

  private estimateWaitTime(gasPrice: number, mempoolSize: number): number {
    // Simple estimation based on gas price and mempool size
    const baseTime = 12; // Average block time in seconds

    if (gasPrice > 50) return baseTime * 1; // Fast
    if (gasPrice > 30) return baseTime * 2; // Medium
    if (gasPrice > 20) return baseTime * 3; // Slow

    // Very low gas price - wait time depends on mempool
    const congestionMultiplier = Math.min(mempoolSize / 50000, 10);
    return baseTime * (3 + congestionMultiplier);
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const tempestAPI = new TempestAPI();