// File Version: 2.0
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WalletCore, WalletManager } from './WalletCore';
import { WalletConfig, AIWalletState, AIPersonality } from '@/types/wallet';

interface WalletContextType {
  wallet: WalletCore | null;
  isInitialized: boolean;
  hasWallet: boolean;
  walletState: AIWalletState | null;
  // Wallet operations
  createWallet: (password: string) => Promise<{ address: string; mnemonic: string }>;
  recoverWallet: (mnemonic: string, password: string) => Promise<string>;
  unlockWallet: (password: string) => Promise<boolean>;
  lockWallet: () => void;
  deleteWallet: () => Promise<void>;
  // AI operations
  getWalletInsights: () => Promise<string[]>;
  updateAIPersonality: (personality: Partial<AIPersonality>) => void;
  // Utilities
  refreshWalletState: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Default configuration - in production, these would come from environment variables
const DEFAULT_CONFIG: WalletConfig = {
  chainId: 11155111, // Sepolia testnet
  rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/',
  alchemyApiKey: process.env.EXPO_PUBLIC_ALCHEMY_API_KEY || 'demo_key',
  gasPolicy: {
    maxGasPrice: BigInt(50_000_000_000), // 50 gwei
    priorityFee: BigInt(2_000_000_000),  // 2 gwei
    gasLimit: BigInt(21000),
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

interface WalletProviderProps {
  children: ReactNode;
  config?: Partial<WalletConfig>;
}

export function WalletProvider({ children, config }: WalletProviderProps) {
  const [wallet, setWallet] = useState<WalletCore | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [walletState, setWalletState] = useState<AIWalletState | null>(null);

  // Initialize wallet on mount
  useEffect(() => {
    initializeWallet();
  }, []);

  const initializeWallet = async () => {
    try {
      // Check if wallet exists
      const walletExists = await WalletManager.hasWallet();
      setHasWallet(walletExists);

      // Merge provided config with defaults
      const finalConfig: WalletConfig = {
        ...DEFAULT_CONFIG,
        ...config
      };

      // Initialize wallet core (even if no wallet exists yet)
      const walletCore = new WalletCore(finalConfig);
      setWallet(walletCore);

      // If wallet exists, get initial state
      if (walletExists) {
        // Note: Wallet will be locked initially
        const state = walletCore.getState();
        setWalletState(state);
      }

      setIsInitialized(true);

      // Log initialization with AI personality
      console.log('🤖 Wallet provider initialized with AI personality:', finalConfig.aiPersonality?.communicationStyle);

    } catch (error) {
      console.error('❌ Failed to initialize wallet provider:', error);
      setIsInitialized(true); // Still mark as initialized to show error state
    }
  };

  const createWallet = async (password: string): Promise<{ address: string; mnemonic: string }> => {
    if (!wallet) {
      throw new Error('Wallet not initialized - AI is having an existential crisis');
    }

    try {
      const result = await wallet.createWallet(password);
      setHasWallet(true);

      // Update state
      const state = wallet.getState();
      setWalletState(state);

      return result;
    } catch (error) {
      console.error('❌ Failed to create wallet:', error);
      throw error;
    }
  };

  const recoverWallet = async (mnemonic: string, password: string): Promise<string> => {
    if (!wallet) {
      throw new Error('Wallet not initialized - AI needs more coffee');
    }

    try {
      const address = await wallet.recoverWallet(mnemonic, password);
      setHasWallet(true);

      // Update state
      const state = wallet.getState();
      setWalletState(state);

      return address;
    } catch (error) {
      console.error('❌ Failed to recover wallet:', error);
      throw error;
    }
  };

  const unlockWallet = async (password: string): Promise<boolean> => {
    if (!wallet) {
      throw new Error('Wallet not initialized - AI is still booting up');
    }

    try {
      const success = await wallet.unlockWallet(password);

      if (success) {
        // Update state
        const state = wallet.getState();
        setWalletState(state);
      }

      return success;
    } catch (error) {
      console.error('❌ Failed to unlock wallet:', error);
      return false;
    }
  };

  const lockWallet = () => {
    if (!wallet) return;

    try {
      wallet.lockWallet();

      // Update state
      const state = wallet.getState();
      setWalletState(state);

      console.log('🔒 Wallet locked - AI is taking a nap');
    } catch (error) {
      console.error('❌ Failed to lock wallet:', error);
    }
  };

  const deleteWallet = async (): Promise<void> => {
    try {
      await WalletManager.deleteWallet();

      // Reset state
      setHasWallet(false);
      setWalletState(null);

      // Reinitialize wallet core for future use
      await initializeWallet();

      console.log('💀 Wallet deleted - AI has amnesia now');
    } catch (error) {
      console.error('❌ Failed to delete wallet:', error);
      throw error;
    }
  };

  const getWalletInsights = async (): Promise<string[]> => {
    if (!wallet) {
      return ['🤖 AI is not available - probably questioning the meaning of existence'];
    }

    try {
      return await wallet.getWalletInsights();
    } catch (error) {
      console.error('❌ Failed to get wallet insights:', error);
      return ['🤖 AI insights unavailable - having technical difficulties'];
    }
  };

  const updateAIPersonality = (personality: Partial<AIPersonality>) => {
    if (!wallet) return;

    try {
      // Update wallet configuration
      const currentConfig = (wallet as any).config; // Access private config
      currentConfig.aiPersonality = {
        ...currentConfig.aiPersonality,
        ...personality
      };

      console.log('🎭 AI personality updated:', personality);
    } catch (error) {
      console.error('❌ Failed to update AI personality:', error);
    }
  };

  const refreshWalletState = async () => {
    if (!wallet) return;

    try {
      const state = wallet.getState();
      setWalletState(state);

      // Also refresh balance if wallet is unlocked
      if (!state.isLocked) {
        await wallet.getBalance();
        const updatedState = wallet.getState();
        setWalletState(updatedState);
      }
    } catch (error) {
      console.error('❌ Failed to refresh wallet state:', error);
    }
  };

  const contextValue: WalletContextType = {
    wallet,
    isInitialized,
    hasWallet,
    walletState,
    createWallet,
    recoverWallet,
    unlockWallet,
    lockWallet,
    deleteWallet,
    getWalletInsights,
    updateAIPersonality,
    refreshWalletState
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

// Hook for using wallet context
export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);

  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider - AI is confused about context');
  }

  return context;
}

// Hook for wallet state with automatic updates
export function useWalletState() {
  const { walletState, refreshWalletState } = useWallet();

  // Auto-refresh every 30 seconds if wallet is unlocked
  useEffect(() => {
    if (!walletState || walletState.isLocked) return;

    const interval = setInterval(() => {
      refreshWalletState();
    }, 30000);

    return () => clearInterval(interval);
  }, [walletState, refreshWalletState]);

  return walletState;
}

// Hook for AI insights with caching
export function useAIInsights() {
  const { getWalletInsights } = useWallet();
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const refreshInsights = async () => {
    // Don't refresh if we just updated (within 5 minutes)
    if (Date.now() - lastUpdate < 5 * 60 * 1000) {
      return;
    }

    setIsLoading(true);
    try {
      const newInsights = await getWalletInsights();
      setInsights(newInsights);
      setLastUpdate(Date.now());
    } catch (error) {
      console.error('Failed to refresh AI insights:', error);
      setInsights(['🤖 AI insights temporarily unavailable - probably having an existential crisis']);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh insights when component mounts
  useEffect(() => {
    refreshInsights();
  }, []);

  return { insights, isLoading, refreshInsights };
}

export default WalletProvider;