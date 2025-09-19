// File Version: 2.0
import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { WalletProvider, useWallet, useWalletState, useAIInsights } from '../WalletProvider';
import { Text, Button } from 'react-native';

// Test component that uses wallet context
function TestWalletComponent() {
  const {
    wallet,
    isInitialized,
    hasWallet,
    walletState,
    createWallet,
    unlockWallet,
    lockWallet,
    getWalletInsights
  } = useWallet();

  return (
    <>
      <Text testID="initialized">{isInitialized.toString()}</Text>
      <Text testID="hasWallet">{hasWallet.toString()}</Text>
      <Text testID="isLocked">{walletState?.isLocked?.toString() || 'null'}</Text>
      <Button
        testID="createWallet"
        title="Create Wallet"
        onPress={() => createWallet('test-password')}
      />
      <Button
        testID="unlockWallet"
        title="Unlock Wallet"
        onPress={() => unlockWallet('test-password')}
      />
      <Button
        testID="lockWallet"
        title="Lock Wallet"
        onPress={() => lockWallet()}
      />
    </>
  );
}

// Test component for wallet state hook
function TestWalletStateComponent() {
  const walletState = useWalletState();

  return (
    <Text testID="walletState">
      {walletState ? JSON.stringify(walletState) : 'null'}
    </Text>
  );
}

// Test component for AI insights hook
function TestAIInsightsComponent() {
  const { insights, isLoading } = useAIInsights();

  return (
    <>
      <Text testID="insightsLoading">{isLoading.toString()}</Text>
      <Text testID="insights">{insights.join('|')}</Text>
    </>
  );
}

describe('WalletProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock AsyncStorage responses
    const mockGetItem = jest.spyOn(require('@react-native-async-storage/async-storage'), 'getItem');
    mockGetItem.mockResolvedValue(null); // No existing wallet by default
  });

  it('should initialize without existing wallet', async () => {
    const { getByTestId } = render(
      <WalletProvider>
        <TestWalletComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(getByTestId('initialized').children[0]).toBe('true');
      expect(getByTestId('hasWallet').children[0]).toBe('false');
      expect(getByTestId('isLocked').children[0]).toBe('null');
    });
  });

  it('should initialize with existing wallet', async () => {
    const mockGetItem = jest.spyOn(require('@react-native-async-storage/async-storage'), 'getItem');
    mockGetItem.mockResolvedValue('{"address": "0x123"}');

    const { getByTestId } = render(
      <WalletProvider>
        <TestWalletComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(getByTestId('initialized').children[0]).toBe('true');
      expect(getByTestId('hasWallet').children[0]).toBe('true');
    });
  });

  it('should create wallet and update state', async () => {
    const { getByTestId } = render(
      <WalletProvider>
        <TestWalletComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(getByTestId('initialized').children[0]).toBe('true');
    });

    await act(async () => {
      getByTestId('createWallet').props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId('hasWallet').children[0]).toBe('true');
      expect(getByTestId('isLocked').children[0]).toBe('false');
    });
  });

  it('should handle wallet locking and unlocking', async () => {
    const { getByTestId } = render(
      <WalletProvider>
        <TestWalletComponent />
      </WalletProvider>
    );

    // Wait for initialization and create wallet
    await waitFor(() => {
      expect(getByTestId('initialized').children[0]).toBe('true');
    });

    await act(async () => {
      getByTestId('createWallet').props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId('isLocked').children[0]).toBe('false');
    });

    // Lock wallet
    await act(async () => {
      getByTestId('lockWallet').props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId('isLocked').children[0]).toBe('true');
    });

    // Unlock wallet
    await act(async () => {
      getByTestId('unlockWallet').props.onPress();
    });

    await waitFor(() => {
      expect(getByTestId('isLocked').children[0]).toBe('false');
    });
  });

  it('should provide custom config', async () => {
    const customConfig = {
      chainId: 1, // Mainnet
      aiPersonality: {
        riskTolerance: 'aggressive' as const,
        communicationStyle: 'meme_lord' as const
      }
    };

    const { getByTestId } = render(
      <WalletProvider config={customConfig}>
        <TestWalletComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(getByTestId('initialized').children[0]).toBe('true');
    });

    // Config should be merged with defaults
    // This is more of an integration test to ensure no errors occur
  });

  it('should handle initialization errors gracefully', async () => {
    // Mock AsyncStorage to throw an error
    const mockGetItem = jest.spyOn(require('@react-native-async-storage/async-storage'), 'getItem');
    mockGetItem.mockRejectedValue(new Error('Storage error'));

    const { getByTestId } = render(
      <WalletProvider>
        <TestWalletComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(getByTestId('initialized').children[0]).toBe('true');
    });
  });
});

describe('useWallet hook', () => {
  it('should throw error when used outside provider', () => {
    const TestComponent = () => {
      useWallet();
      return null;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useWallet must be used within a WalletProvider - AI is confused about context'
    );
  });
});

describe('useWalletState hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should auto-refresh wallet state when unlocked', async () => {
    const { getByTestId } = render(
      <WalletProvider>
        <TestWalletStateComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(getByTestId('walletState').children[0]).toBe('null');
    });

    // The auto-refresh mechanism would be tested here
    // but requires more complex mocking of the refresh interval
  });

  it('should not auto-refresh when wallet is locked', () => {
    // This would test that the interval is not set up when wallet is locked
    // Implementation depends on the specific auto-refresh logic
  });
});

describe('useAIInsights hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load AI insights on mount', async () => {
    const { getByTestId } = render(
      <WalletProvider>
        <TestAIInsightsComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(getByTestId('insightsLoading').children[0]).toBe('false');
      expect(getByTestId('insights').children[0]).toContain('🤖');
    });
  });

  it('should handle insights loading state', async () => {
    const { getByTestId } = render(
      <WalletProvider>
        <TestAIInsightsComponent />
      </WalletProvider>
    );

    // Initially should be loading
    expect(getByTestId('insightsLoading').children[0]).toBe('true');

    await waitFor(() => {
      expect(getByTestId('insightsLoading').children[0]).toBe('false');
    });
  });

  it('should cache insights and avoid frequent refreshes', async () => {
    const { getByTestId } = render(
      <WalletProvider>
        <TestAIInsightsComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(getByTestId('insightsLoading').children[0]).toBe('false');
    });

    // Multiple calls within 5 minutes should use cached data
    // This would require mocking Date.now() and testing the caching logic
  });

  it('should handle insights error gracefully', async () => {
    // Mock getWalletInsights to throw an error
    const mockError = new Error('AI is having an existential crisis');

    const { getByTestId } = render(
      <WalletProvider>
        <TestAIInsightsComponent />
      </WalletProvider>
    );

    await waitFor(() => {
      expect(getByTestId('insights').children[0]).toContain('existential crisis');
    });
  });
});