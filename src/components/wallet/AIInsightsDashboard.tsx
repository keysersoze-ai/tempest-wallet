// File Version: 2.0
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useWallet, useAIInsights } from '@/core/WalletProvider';

interface AIInsightsDashboardProps {
  onConfigureAI?: () => void;
}

export function AIInsightsDashboard({ onConfigureAI }: AIInsightsDashboardProps) {
  const { wallet, walletState } = useWallet();
  const { insights, isLoading, refreshInsights } = useAIInsights();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshInsights();
    setRefreshing(false);
  };

  const aiCapabilities = wallet?.getAICapabilities();
  const aiContext = wallet?.getAIContext();

  const getInsightIcon = (insight: string): string => {
    if (insight.includes('💸') || insight.includes('Balance')) return 'wallet';
    if (insight.includes('📊') || insight.includes('Market')) return 'trending-up';
    if (insight.includes('⛽') || insight.includes('Gas')) return 'speedometer';
    if (insight.includes('🤖') || insight.includes('AI')) return 'bulb';
    if (insight.includes('🧠') || insight.includes('learned')) return 'school';
    if (insight.includes('🔮') || insight.includes('prediction')) return 'eye';
    if (insight.includes('💭') || insight.includes('Philosophy')) return 'bulb';
    if (insight.includes('🎭') || insight.includes('mood')) return 'happy';
    return 'information-circle';
  };

  const getInsightVariant = (insight: string): 'default' | 'ai' | 'warning' | 'success' | 'danger' => {
    if (insight.includes('🤖') || insight.includes('AI') || insight.includes('🧠')) return 'ai';
    if (insight.includes('💸') || insight.includes('Warning') || insight.includes('⛽')) return 'warning';
    if (insight.includes('📊') || insight.includes('Success') || insight.includes('Low network')) return 'success';
    if (insight.includes('Failed') || insight.includes('Error')) return 'danger';
    return 'default';
  };

  const renderAIStatus = () => {
    const aiState = walletState?.aiState;
    if (!aiState) return null;

    return (
      <Card variant="ai" style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Ionicons name="bulb" size={20} color="#9F4AF3" />
          <Text style={styles.statusTitle}>AI Agent Status</Text>
        </View>

        <View style={styles.statusGrid}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Learning Mode</Text>
            <View style={[styles.statusIndicator, aiState.learningMode && styles.statusActive]}>
              <Text style={styles.statusValue}>
                {aiState.learningMode ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Confidence</Text>
            <View style={styles.confidenceBar}>
              <View
                style={[
                  styles.confidenceFill,
                  { width: `${aiState.confidenceScore * 100}%` }
                ]}
              />
              <Text style={styles.confidenceText}>
                {Math.round(aiState.confidenceScore * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Transactions</Text>
            <Text style={styles.statusValue}>{aiState.totalTransactions}</Text>
          </View>

          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Success Rate</Text>
            <Text style={[
              styles.statusValue,
              { color: aiState.successRate > 0.8 ? '#30D158' : aiState.successRate > 0.6 ? '#FFD60A' : '#FF9500' }
            ]}>
              {Math.round(aiState.successRate * 100)}%
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderMarketSentiment = () => {
    if (!aiContext?.currentMarketConditions) return null;

    const sentiment = aiContext.currentMarketConditions;
    const sentimentColor = {
      bullish: '#30D158',
      bearish: '#FF3B30',
      neutral: '#666',
      confused: '#FF9500',
      existential_dread: '#9F4AF3'
    }[sentiment.overall];

    return (
      <Card variant="default" style={styles.sentimentCard}>
        <View style={styles.sentimentHeader}>
          <Ionicons name="trending-up" size={18} color={sentimentColor} />
          <Text style={styles.sentimentTitle}>Market Sentiment</Text>
          <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor }]}>
            <Text style={styles.sentimentBadgeText}>
              {sentiment.overall.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={styles.sentimentInterpretation}>
          {sentiment.aiInterpretation}
        </Text>

        <View style={styles.sentimentFooter}>
          <Text style={styles.sentimentConfidence}>
            Confidence: {Math.round(sentiment.confidence * 100)}%
          </Text>
          <Text style={styles.sentimentTimestamp}>
            Updated {new Date(sentiment.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      </Card>
    );
  };

  const renderCapabilities = () => {
    if (!aiCapabilities) return null;

    const capabilities = Object.entries(aiCapabilities).filter(([_, enabled]) => enabled);

    return (
      <Card variant="default" style={styles.capabilitiesCard}>
        <View style={styles.capabilitiesHeader}>
          <Ionicons name="cog" size={18} color="#007AFF" />
          <Text style={styles.capabilitiesTitle}>Active AI Capabilities</Text>
        </View>

        <View style={styles.capabilitiesList}>
          {capabilities.map(([capability, _]) => (
            <View key={capability} style={styles.capabilityItem}>
              <Ionicons name="checkmark-circle" size={16} color="#30D158" />
              <Text style={styles.capabilityText}>
                {capability.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </Text>
            </View>
          ))}
        </View>

        {onConfigureAI && (
          <Button
            title="Configure AI"
            onPress={onConfigureAI}
            variant="secondary"
            size="small"
            style={styles.configureButton}
          />
        )}
      </Card>
    );
  };

  if (walletState?.isLocked) {
    return (
      <Card variant="default" style={styles.lockedCard}>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={32} color="#666" />
          <Text style={styles.lockedTitle}>AI Insights Locked</Text>
          <Text style={styles.lockedSubtext}>
            Unlock your wallet to access AI-powered insights and analytics
          </Text>
        </View>
      </Card>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#9F4AF3"
          colors={['#9F4AF3']}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>AI Insights Dashboard</Text>
        <Text style={styles.subtitle}>
          Your personal AI assistant is analyzing market conditions and optimizing your wallet
        </Text>
      </View>

      {renderAIStatus()}
      {renderMarketSentiment()}
      {renderCapabilities()}

      {/* Insights List */}
      <Card variant="default" style={styles.insightsContainer}>
        <View style={styles.insightsHeader}>
          <Ionicons name="bulb" size={18} color="#FFD60A" />
          <Text style={styles.insightsTitle}>Latest Insights</Text>
        </View>

        {isLoading && insights.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>AI is analyzing your wallet...</Text>
          </View>
        ) : insights.length > 0 ? (
          <View style={styles.insightsList}>
            {insights.map((insight, index) => (
              <View key={index} style={styles.insightItem}>
                <Ionicons
                  name={getInsightIcon(insight) as any}
                  size={16}
                  color="#9F4AF3"
                  style={styles.insightIcon}
                />
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No insights available yet. The AI needs more data to provide recommendations.
            </Text>
          </View>
        )}
      </Card>

      {/* Performance Stats */}
      <Card variant="default" style={styles.performanceCard}>
        <Text style={styles.performanceTitle}>AI Performance</Text>
        <View style={styles.performanceStats}>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceLabel}>Gas Saved</Text>
            <Text style={styles.performanceValue}>~0.005 ETH</Text>
          </View>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceLabel}>Threats Blocked</Text>
            <Text style={styles.performanceValue}>0</Text>
          </View>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceLabel}>Optimizations</Text>
            <Text style={styles.performanceValue}>
              {walletState?.aiState?.totalTransactions || 0}
            </Text>
          </View>
        </View>
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
  statusCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9F4AF3',
    marginLeft: 8,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusItem: {
    width: '48%',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  statusActive: {
    backgroundColor: '#30D158',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  confidenceBar: {
    height: 20,
    backgroundColor: '#333',
    borderRadius: 10,
    position: 'relative',
    justifyContent: 'center',
  },
  confidenceFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#9F4AF3',
    borderRadius: 10,
  },
  confidenceText: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  sentimentCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sentimentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sentimentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
    flex: 1,
  },
  sentimentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sentimentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  sentimentInterpretation: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 12,
  },
  sentimentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sentimentConfidence: {
    fontSize: 12,
    color: '#666',
  },
  sentimentTimestamp: {
    fontSize: 12,
    color: '#666',
  },
  capabilitiesCard: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  capabilitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  capabilitiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  capabilitiesList: {
    marginBottom: 12,
  },
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  capabilityText: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 8,
  },
  configureButton: {
    marginTop: 8,
  },
  lockedCard: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  lockedContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  lockedSubtext: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    lineHeight: 20,
  },
  insightsContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  insightsList: {
    gap: 12,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  insightIcon: {
    marginTop: 2,
    marginRight: 12,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  performanceCard: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  performanceStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceStat: {
    flex: 1,
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#30D158',
  },
});