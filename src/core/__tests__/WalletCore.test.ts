// File Version: 2.0
import { WalletCore, WalletManager } from '../WalletCore';
import { WalletConfig } from '@/types/wallet';

const mockConfig: WalletConfig = {
  chainId: 11155111,
  rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/test',
  alchemyApiKey: 'test-api-key',
  gasPolicy: {
    maxGasPrice: BigInt('50000000000'),
    priorityFee: BigInt('2000000000'),
    gasLimit: BigInt('21000'),
    autoOptimize: true,
    learningEnabled: true
  },
  aiPersonality: {
    riskTolerance: 'moderate',
    tradingStyle: 'hodl',
    communicationStyle: 'existential_crisis',
    learningAggression: 'moderate',
    humorLevel: 'sarcastic'
  }
};

describe('WalletCore', () => {
  let walletCore: WalletCore;

  beforeEach(() => {
    jest.clearAllMocks();
    walletCore = new WalletCore(mockConfig);
  });

  describe('Wallet Creation', () => {
    it('should create a new wallet with mnemonic', async () => {
      const result = await walletCore.createWallet('test-password');

      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('mnemonic');
      expect(result.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      expect(result.mnemonic).toBeTruthy();
    });

    it('should update wallet state after creation', async () => {
      await walletCore.createWallet('test-password');
      const state = walletCore.getState();

      expect(state.isLocked).toBe(false);
      expect(state.address).toBeTruthy();
      expect(state.aiState.learningMode).toBe(true);
    });

    it('should store wallet metadata with AI personality', async () => {
      const mockSetItem = jest.spyOn(require('@react-native-async-storage/async-storage'), 'setItem');

      await walletCore.createWallet('test-password');

      expect(mockSetItem).toHaveBeenCalledWith(
        'wallet_metadata',
        expect.stringContaining('2.0_AI_ENHANCED_SENTIENT_EDITION')
      );
    });
  });

  describe('Wallet Recovery', () => {
    it('should recover wallet from mnemonic', async () => {
      const mnemonic = 'test mnemonic phrase';
      const address = await walletCore.recoverWallet(mnemonic, 'test-password');

      expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);

      const state = walletCore.getState();
      expect(state.isLocked).toBe(false);
      expect(state.address).toBe(address);
    });

    it('should handle invalid mnemonic gracefully', async () => {
      await expect(
        walletCore.recoverWallet('invalid mnemonic', 'test-password')
      ).rejects.toThrow();
    });
  });

  describe('Wallet Unlock/Lock', () => {
    beforeEach(async () => {
      await walletCore.createWallet('test-password');
      walletCore.lockWallet();
    });

    it('should unlock wallet with correct password', async () => {
      const success = await walletCore.unlockWallet('test-password');
      expect(success).toBe(true);

      const state = walletCore.getState();
      expect(state.isLocked).toBe(false);
    });

    it('should perform AI security check on unlock', async () => {
      const mockSetItem = jest.spyOn(require('@react-native-async-storage/async-storage'), 'setItem');

      await walletCore.unlockWallet('test-password');

      expect(mockSetItem).toHaveBeenCalledWith(
        'last_unlock_time',
        expect.any(String)
      );
    });

    it('should lock wallet and update state', () => {
      walletCore.lockWallet();

      const state = walletCore.getState();
      expect(state.isLocked).toBe(true);
    });
  });

  describe('Balance Management', () => {
    beforeEach(async () => {
      await walletCore.createWallet('test-password');
    });

    it('should get balance with AI insights', async () => {
      const result = await walletCore.getBalance();

      expect(result).toHaveProperty('balance');
      expect(result).toHaveProperty('aiInsights');
      expect(typeof result.balance).toBe('bigint');
      expect(typeof result.aiInsights).toBe('string');
    });

    it('should throw error when wallet is locked', async () => {
      walletCore.lockWallet();

      await expect(walletCore.getBalance()).rejects.toThrow('Wallet not initialized or locked');
    });

    it('should generate appropriate AI insights based on balance', async () => {
      const result = await walletCore.getBalance();

      expect(result.aiInsights).toContain('sugar daddy');
    });
  });

  describe('AI-Powered Transactions', () => {
    beforeEach(async () => {
      await walletCore.createWallet('test-password');
    });

    it('should perform AI risk assessment before transaction', async () => {
      const transaction = await walletCore.sendTransaction(
        '0x742d35Cc6634C0532925a3b8D04Cc3bb6760b0d1',
        BigInt('1000000000000000000') // 1 ETH
      );

      expect(transaction).toHaveProperty('aiMetadata');
      expect(transaction.aiMetadata).toHaveProperty('optimizationApplied');
      expect(transaction.aiMetadata).toHaveProperty('confidenceScore');
      expect(transaction.aiMetadata).toHaveProperty('riskAssessment');
    });

    it('should optimize gas prices using AI', async () => {
      const transaction = await walletCore.sendTransaction(
        '0x742d35Cc6634C0532925a3b8D04Cc3bb6760b0d1',
        BigInt('100000000000000000') // 0.1 ETH
      );

      expect(transaction.gasPrice).toBeGreaterThan(0n);
      expect(transaction.status).toBe('ai_optimized');
    });

    it('should reject high-risk transactions', async () => {
      // Mock suspicious address detection
      const originalIsSuspicious = (walletCore as any).isSuspiciousAddress;
      (walletCore as any).isSuspiciousAddress = jest.fn().mockResolvedValue(true);

      await expect(
        walletCore.sendTransaction(
          '0x000000000000000000000000000000000000dead',
          BigInt('1000000000000000000')
        )
      ).rejects.toThrow();

      (walletCore as any).isSuspiciousAddress = originalIsSuspicious;
    });

    it('should respect withdrawal limits', async () => {
      await expect(
        walletCore.sendTransaction(
          '0x742d35Cc6634C0532925a3b8D04Cc3bb6760b0d1',
          BigInt('2000000000000000000') // 2 ETH (exceeds limit)
        )
      ).rejects.toThrow('Transaction exceeds per-transaction limit');
    });
  });

  describe('AI Capabilities', () => {
    beforeEach(async () => {
      await walletCore.createWallet('test-password');
    });

    it('should return AI capabilities', () => {
      const capabilities = walletCore.getAICapabilities();

      expect(capabilities).toHaveProperty('autonomousTrading');
      expect(capabilities).toHaveProperty('riskAssessment');
      expect(capabilities).toHaveProperty('gasOptimization');
      expect(capabilities).toHaveProperty('memeCoinDetection');
      expect(capabilities.memeCoinDetection).toBe(true);
    });

    it('should update AI capabilities', () => {
      walletCore.updateAICapabilities({
        autonomousTrading: true,
        predictiveModeling: true
      });

      const capabilities = walletCore.getAICapabilities();
      expect(capabilities.autonomousTrading).toBe(true);
      expect(capabilities.predictiveModeling).toBe(true);
    });

    it('should generate wallet insights', async () => {
      const insights = await walletCore.getWalletInsights();

      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);
      expect(insights.some(insight => insight.includes('🤖'))).toBe(true);
    });

    it('should provide market sentiment analysis', async () => {
      const aiContext = walletCore.getAIContext();

      expect(aiContext).toHaveProperty('currentMarketConditions');
      expect(aiContext?.currentMarketConditions).toHaveProperty('overall');
      expect(aiContext?.currentMarketConditions).toHaveProperty('aiInterpretation');
    });
  });

  describe('Security Features', () => {
    beforeEach(async () => {
      await walletCore.createWallet('test-password');
    });

    it('should return security settings', () => {
      const settings = walletCore.getSecuritySettings();

      expect(settings).toHaveProperty('biometricAuth');
      expect(settings).toHaveProperty('aiSecurityFeatures');
      expect(settings.aiSecurityFeatures).toHaveProperty('behavioralAnalysis');
      expect(settings.aiSecurityFeatures).toHaveProperty('anomalyDetection');
    });

    it('should detect suspicious addresses', async () => {
      const isSuspicious = await (walletCore as any).isSuspiciousAddress('0x000000000000000000000000000000000000dead');

      // Should have some chance of being detected as suspicious
      expect(typeof isSuspicious).toBe('boolean');
    });

    it('should perform phishing detection', async () => {
      const isPhishing = await (walletCore as any).detectPhishing('0x742d35Cc6634C0532925a3b8D04Cc3bb6760b0d1');

      expect(typeof isPhishing).toBe('boolean');
    });
  });

  describe('AI Learning and Adaptation', () => {
    beforeEach(async () => {
      await walletCore.createWallet('test-password');
    });

    it('should update AI state after transactions', async () => {
      const initialState = walletCore.getState().aiState;

      await walletCore.sendTransaction(
        '0x742d35Cc6634C0532925a3b8D04Cc3bb6760b0d1',
        BigInt('100000000000000000')
      );

      const updatedState = walletCore.getState().aiState;
      expect(updatedState.totalTransactions).toBeGreaterThan(initialState.totalTransactions);
    });

    it('should store learning data', async () => {
      const mockSetItem = jest.spyOn(require('@react-native-async-storage/async-storage'), 'setItem');

      await walletCore.sendTransaction(
        '0x742d35Cc6634C0532925a3b8D04Cc3bb6760b0d1',
        BigInt('100000000000000000')
      );

      expect(mockSetItem).toHaveBeenCalledWith(
        'ai_learning_data',
        expect.any(String)
      );
    });
  });
});

describe('WalletManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should check if wallet exists', async () => {
    const mockGetItem = jest.spyOn(require('@react-native-async-storage/async-storage'), 'getItem');
    mockGetItem.mockResolvedValue('{"address": "0x123"}');

    const hasWallet = await WalletManager.hasWallet();
    expect(hasWallet).toBe(true);
  });

  it('should get wallet metadata', async () => {
    const mockData = { address: '0x123', version: '2.0' };
    const mockGetItem = jest.spyOn(require('@react-native-async-storage/async-storage'), 'getItem');
    mockGetItem.mockResolvedValue(JSON.stringify(mockData));

    const metadata = await WalletManager.getWalletMetadata();
    expect(metadata).toEqual(mockData);
  });

  it('should delete wallet completely', async () => {
    const mockMultiRemove = jest.spyOn(require('@react-native-async-storage/async-storage'), 'multiRemove');
    const mockResetCredentials = jest.spyOn(require('react-native-keychain'), 'resetInternetCredentials');

    await WalletManager.deleteWallet();

    expect(mockResetCredentials).toHaveBeenCalledTimes(2);
    expect(mockMultiRemove).toHaveBeenCalledWith([
      'wallet_metadata',
      'automation_rules',
      'ai_learning_data',
      'ai_state',
      'ai_capabilities',
      'user_behavior_pattern',
      'last_unlock_time'
    ]);
  });

  it('should reset AI learning data', async () => {
    const mockMultiRemove = jest.spyOn(require('@react-native-async-storage/async-storage'), 'multiRemove');

    await WalletManager.resetAILearning();

    expect(mockMultiRemove).toHaveBeenCalledWith([
      'ai_learning_data',
      'ai_state',
      'user_behavior_pattern'
    ]);
  });
});