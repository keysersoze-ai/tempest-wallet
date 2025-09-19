// File Version: 2.0
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ethers } from 'ethers';
import { Card } from '../ui/Card';
import { useWallet } from '@/core/WalletProvider';

interface WalletBalanceProps {
  showAIInsights?: boolean;
  onRefresh?: () => void;
}

export function WalletBalance({ showAIInsights = true, onRefresh }: WalletBalanceProps) {
  const { wallet, walletState } = useWallet();
  const [balance, setBalance] = useState<bigint>(0n);
  const [aiInsights, setAIInsights] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchBalance = async () => {
    if (!wallet || walletState?.isLocked) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await wallet.getBalance();
      setBalance(result.balance);
      if (result.aiInsights) {
        setAIInsights(result.aiInsights);
      }
    } catch (err) {
      setError('Failed to fetch balance');
      console.error('Balance fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [wallet, walletState?.isLocked]);

  const handleRefresh = () => {
    fetchBalance();
    onRefresh?.();
  };

  const formatBalance = (balance: bigint): string => {
    const ethBalance = ethers.formatEther(balance);
    const numBalance = parseFloat(ethBalance);

    if (numBalance === 0) return '0.0000';
    if (numBalance < 0.0001) return '< 0.0001';
    if (numBalance < 1) return numBalance.toFixed(4);
    if (numBalance < 1000) return numBalance.toFixed(3);
    return numBalance.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const getBalanceColor = (balance: bigint): string => {
    const ethBalance = parseFloat(ethers.formatEther(balance));
    if (ethBalance === 0) return '#666';
    if (ethBalance < 0.01) return '#FF9500'; // Warning orange
    if (ethBalance < 0.1) return '#FFD60A'; // Yellow
    return '#30D158'; // Success green
  };

  if (walletState?.isLocked) {
    return (
      <Card variant="default">
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={24} color="#666" />
          <Text style={styles.lockedText}>Wallet is locked</Text>
          <Text style={styles.lockedSubtext}>Unlock to view balance</Text>
        </View>
      </Card>
    );
  }

  return (
    <Card variant="default" style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wallet Balance</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          disabled={isLoading}
          style={styles.refreshButton}
          testID="refresh-balance"
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#007AFF" />
          ) : (
            <Ionicons name="refresh" size={20} color="#007AFF" />
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={20} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          <View style={styles.balanceContainer}>
            <Text
              style={[styles.balance, { color: getBalanceColor(balance) }]}
              testID="balance-amount"
            >
              {formatBalance(balance)} ETH
            </Text>
            <Text style={styles.currency}>Ethereum</Text>
          </View>

          {showAIInsights && aiInsights && (
            <Card variant="ai" style={styles.insightsCard}>
              <View style={styles.insightsHeader}>
                <Ionicons name="brain" size={16} color="#9F4AF3" />
                <Text style={styles.insightsTitle}>AI Insights</Text>
              </View>
              <Text style={styles.insightsText}>{aiInsights}</Text>
            </Card>
          )}

          {/* Balance breakdown */}
          <View style={styles.breakdown}>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Available</Text>
              <Text style={styles.breakdownValue}>
                {formatBalance(balance)} ETH
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Text style={styles.breakdownLabel}>Reserved</Text>
              <Text style={styles.breakdownValue}>0.0000 ETH</Text>
            </View>
          </View>

          {/* Quick stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>24h Change</Text>
              <Text style={[styles.statValue, styles.positiveChange]}>
                +0.0%
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Network</Text>
              <Text style={styles.statValue}>
                {walletState?.address ? 'Sepolia' : 'Not connected'}
              </Text>
            </View>
          </View>
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  refreshButton: {
    padding: 8,
  },
  lockedContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  lockedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  lockedSubtext: {
    fontSize: 14,
    color: '#444',
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#2D0F0F',
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 8,
  },
  balanceContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  balance: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  currency: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  insightsCard: {
    marginTop: 16,
    marginBottom: 16,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9F4AF3',
    marginLeft: 6,
  },
  insightsText: {
    fontSize: 14,
    color: '#CCC',
    lineHeight: 20,
  },
  breakdown: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  positiveChange: {
    color: '#30D158',
  },
  negativeChange: {
    color: '#FF3B30',
  },
});