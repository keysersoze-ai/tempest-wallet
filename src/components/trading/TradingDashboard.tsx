// File Version: 2.0
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { tradingEngine, TradingStrategy, TradeOrder } from '@/services/TradingEngine';
import { useWallet } from '@/core/WalletProvider';

export function TradingDashboard() {
  const { wallet } = useWallet();
  const [strategies, setStrategies] = useState<TradingStrategy[]>([]);
  const [activeOrders, setActiveOrders] = useState<TradeOrder[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTradingData();
  }, []);

  const loadTradingData = async () => {
    try {
      setIsLoading(true);

      if (wallet) {
        await tradingEngine.initialize(wallet);
      }

      const [strategiesData, ordersData, metricsData] = await Promise.all([
        tradingEngine.getStrategies(),
        tradingEngine.getActiveOrders(),
        tradingEngine.getPerformanceMetrics()
      ]);

      setStrategies(strategiesData);
      setActiveOrders(ordersData);
      setPerformanceMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load trading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStrategy = () => {
    Alert.alert(
      'Create Trading Strategy',
      'Choose a strategy type',
      [
        {
          text: 'DCA (Dollar Cost Average)',
          onPress: () => createDCAStrategy()
        },
        {
          text: 'Momentum Trading',
          onPress: () => createMomentumStrategy()
        },
        {
          text: 'AI Custom',
          onPress: () => createAICustomStrategy()
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const createDCAStrategy = () => {
    const strategy = tradingEngine.createDCAStrategy(
      'ETH DCA Weekly',
      'ethereum',
      0.1, // 0.1 ETH per week
      'weekly'
    );

    setStrategies(prev => [...prev, strategy]);

    Alert.alert(
      'DCA Strategy Created',
      'A weekly DCA strategy for ETH has been created. Enable it to start automated investing.',
      [{ text: 'OK' }]
    );
  };

  const createMomentumStrategy = () => {
    const strategy = tradingEngine.createMomentumStrategy(
      'ETH Momentum',
      'ethereum',
      7, // 7-day lookback
      0.05 // 5% threshold
    );

    setStrategies(prev => [...prev, strategy]);

    Alert.alert(
      'Momentum Strategy Created',
      'A momentum-based strategy for ETH has been created. It will buy on upward momentum and sell on downward momentum.',
      [{ text: 'OK' }]
    );
  };

  const createAICustomStrategy = () => {
    const strategy = tradingEngine.createAICustomStrategy(
      'AI Adaptive Trading',
      'AI-powered adaptive trading strategy that learns from market conditions',
      {
        assets: ['ethereum', 'bitcoin'],
        riskLevel: 'medium',
        learningRate: 0.1,
        maxAllocation: 30
      }
    );

    setStrategies(prev => [...prev, strategy]);

    Alert.alert(
      'AI Strategy Created',
      'An AI-powered adaptive strategy has been created. The AI will learn from market patterns and optimize trading decisions.',
      [{ text: 'OK' }]
    );
  };

  const toggleStrategy = async (strategyId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await tradingEngine.enableStrategy(strategyId);
      } else {
        await tradingEngine.disableStrategy(strategyId);
      }

      setStrategies(prev =>
        prev.map(s => s.id === strategyId ? { ...s, enabled } : s)
      );
    } catch (error) {
      console.error('Failed to toggle strategy:', error);
      Alert.alert('Error', 'Failed to update strategy');
    }
  };

  const deleteStrategy = async (strategyId: string) => {
    Alert.alert(
      'Delete Strategy',
      'Are you sure? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await tradingEngine.deleteStrategy(strategyId);
              setStrategies(prev => prev.filter(s => s.id !== strategyId));
            } catch (error) {
              console.error('Failed to delete strategy:', error);
              Alert.alert('Error', 'Failed to delete strategy');
            }
          }
        }
      ]
    );
  };

  const renderPerformanceOverview = () => {
    if (!performanceMetrics) return null;

    return (
      <Card variant="ai" style={styles.performanceCard}>
        <View style={styles.performanceHeader}>
          <Ionicons name="trending-up" size={20} color="#9F4AF3" />
          <Text style={styles.performanceTitle}>Trading Performance</Text>
        </View>

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{performanceMetrics.activeStrategies}</Text>
            <Text style={styles.metricLabel}>Active Strategies</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{performanceMetrics.totalTrades}</Text>
            <Text style={styles.metricLabel}>Total Trades</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, styles.successRate]}>
              {Math.round(performanceMetrics.successRate * 100)}%
            </Text>
            <Text style={styles.metricLabel}>Success Rate</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, styles.totalReturn]}>
              {performanceMetrics.totalReturn > 0 ? '+' : ''}{performanceMetrics.totalReturn.toFixed(2)}%
            </Text>
            <Text style={styles.metricLabel}>Total Return</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderStrategyCard = (strategy: TradingStrategy) => {
    const getRiskColor = (risk: string) => {
      switch (risk) {
        case 'low': return '#30D158';
        case 'medium': return '#FFD60A';
        case 'high': return '#FF9500';
        case 'degen': return '#FF3B30';
        default: return '#666';
      }
    };

    const getStrategyIcon = (type: string) => {
      switch (type) {
        case 'dca': return 'calendar';
        case 'momentum': return 'trending-up';
        case 'mean_reversion': return 'swap-horizontal';
        case 'grid': return 'grid';
        case 'ai_custom': return 'brain';
        default: return 'settings';
      }
    };

    return (
      <Card key={strategy.id} variant="default" style={styles.strategyCard}>
        <View style={styles.strategyHeader}>
          <View style={styles.strategyInfo}>
            <View style={styles.strategyTitleRow}>
              <Ionicons
                name={getStrategyIcon(strategy.type) as any}
                size={16}
                color="#9F4AF3"
              />
              <Text style={styles.strategyName}>{strategy.name}</Text>
              <View style={[styles.riskBadge, { backgroundColor: getRiskColor(strategy.riskLevel) }]}>
                <Text style={styles.riskText}>{strategy.riskLevel.toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.strategyDescription}>{strategy.description}</Text>
          </View>
          <View style={styles.strategyActions}>
            <TouchableOpacity
              style={[styles.toggleButton, strategy.enabled && styles.toggleButtonActive]}
              onPress={() => toggleStrategy(strategy.id, !strategy.enabled)}
            >
              <Ionicons
                name={strategy.enabled ? 'pause' : 'play'}
                size={16}
                color={strategy.enabled ? '#30D158' : '#666'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteStrategy(strategy.id)}
            >
              <Ionicons name="trash" size={16} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.strategyStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Trades</Text>
            <Text style={styles.statValue}>{strategy.performance.totalTrades}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Success</Text>
            <Text style={styles.statValue}>
              {strategy.performance.totalTrades > 0
                ? Math.round((strategy.performance.successfulTrades / strategy.performance.totalTrades) * 100)
                : 0}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Return</Text>
            <Text style={[styles.statValue, strategy.performance.totalReturn >= 0 ? styles.positive : styles.negative]}>
              {strategy.performance.totalReturn >= 0 ? '+' : ''}{strategy.performance.totalReturn.toFixed(2)}%
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Max Allocation</Text>
            <Text style={styles.statValue}>{strategy.maxAllocation}%</Text>
          </View>
        </View>

        {strategy.lastExecuted && (
          <View style={styles.lastExecuted}>
            <Text style={styles.lastExecutedText}>
              Last executed: {new Date(strategy.lastExecuted).toLocaleString()}
            </Text>
          </View>
        )}
      </Card>
    );
  };

  const renderActiveOrders = () => {
    if (activeOrders.length === 0) {
      return (
        <Card variant="default" style={styles.ordersCard}>
          <Text style={styles.ordersTitle}>Active Orders</Text>
          <View style={styles.emptyOrders}>
            <Ionicons name="document-text" size={32} color="#666" />
            <Text style={styles.emptyOrdersText}>No active orders</Text>
          </View>
        </Card>
      );
    }

    return (
      <Card variant="default" style={styles.ordersCard}>
        <Text style={styles.ordersTitle}>Active Orders ({activeOrders.length})</Text>
        {activeOrders.slice(0, 5).map(order => (
          <View key={order.id} style={styles.orderItem}>
            <View style={styles.orderInfo}>
              <Text style={styles.orderType}>
                {order.type.toUpperCase()} {order.asset}
              </Text>
              <Text style={styles.orderAmount}>
                {parseFloat(order.amount.toString()) / 1e18} ETH
              </Text>
            </View>
            <View style={styles.orderStatus}>
              <View style={[styles.statusDot, styles[`${order.status}Status`]]} />
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </View>
        ))}
        {activeOrders.length > 5 && (
          <Text style={styles.moreOrders}>+{activeOrders.length - 5} more orders</Text>
        )}
      </Card>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading trading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Trading Dashboard</Text>
        <Text style={styles.subtitle}>
          Automated trading strategies powered by artificial intelligence
        </Text>
      </View>

      {renderPerformanceOverview()}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Trading Strategies</Text>
          <Button
            title="Create Strategy"
            onPress={handleCreateStrategy}
            variant="ai"
            size="small"
          />
        </View>

        {strategies.length === 0 ? (
          <Card variant="default" style={styles.emptyStrategies}>
            <View style={styles.emptyContainer}>
              <Ionicons name="robot" size={48} color="#666" />
              <Text style={styles.emptyTitle}>No Trading Strategies</Text>
              <Text style={styles.emptyText}>
                Create your first AI-powered trading strategy to start automated investing
              </Text>
              <Button
                title="Get Started"
                onPress={handleCreateStrategy}
                variant="primary"
                style={styles.emptyButton}
              />
            </View>
          </Card>
        ) : (
          strategies.map(renderStrategyCard)
        )}
      </View>

      {renderActiveOrders()}

      <Card variant="default" style={styles.disclaimerCard}>
        <View style={styles.disclaimerHeader}>
          <Ionicons name="warning" size={16} color="#FF9500" />
          <Text style={styles.disclaimerTitle}>Trading Disclaimer</Text>
        </View>
        <Text style={styles.disclaimerText}>
          Automated trading involves significant risk. Past performance does not guarantee future results.
          The AI makes decisions based on algorithms and market data, but cannot predict all market conditions.
          Only invest what you can afford to lose.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  performanceCard: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9F4AF3',
    marginLeft: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
  },
  successRate: {
    color: '#30D158',
  },
  totalReturn: {
    color: '#30D158',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  emptyStrategies: {
    padding: 40,
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyButton: {
    minWidth: 120,
  },
  strategyCard: {
    marginBottom: 16,
  },
  strategyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  strategyInfo: {
    flex: 1,
  },
  strategyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  strategyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  riskBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  riskText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#000',
  },
  strategyDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  strategyActions: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#333',
    marginRight: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#0A2E0A',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  strategyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  statItem: {
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
  positive: {
    color: '#30D158',
  },
  negative: {
    color: '#FF3B30',
  },
  lastExecuted: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  lastExecutedText: {
    fontSize: 12,
    color: '#666',
  },
  ordersCard: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  ordersTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  emptyOrders: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyOrdersText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  orderInfo: {
    flex: 1,
  },
  orderType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  orderAmount: {
    fontSize: 12,
    color: '#666',
  },
  orderStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  pendingStatus: {
    backgroundColor: '#FFD60A',
  },
  executedStatus: {
    backgroundColor: '#30D158',
  },
  failedStatus: {
    backgroundColor: '#FF3B30',
  },
  cancelledStatus: {
    backgroundColor: '#666',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  moreOrders: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    paddingTop: 8,
  },
  disclaimerCard: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    marginLeft: 6,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
});