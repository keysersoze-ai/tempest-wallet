// File Version: 2.0
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

type CardVariant = 'default' | 'ai' | 'warning' | 'success' | 'danger';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: ViewStyle;
  padding?: number;
  testID?: string;
}

export function Card({
  children,
  variant = 'default',
  style,
  padding = 16,
  testID
}: CardProps) {
  const cardStyle = [
    styles.card,
    styles[`${variant}Card`],
    { padding },
    style
  ];

  return (
    <View style={cardStyle} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginVertical: 8,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // Variants
  defaultCard: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    shadowColor: '#000',
  },
  aiCard: {
    backgroundColor: '#1A0D2E',
    borderWidth: 1,
    borderColor: '#9F4AF3',
    shadowColor: '#9F4AF3',
    shadowOpacity: 0.2,
  },
  warningCard: {
    backgroundColor: '#2D1B0F',
    borderWidth: 1,
    borderColor: '#FF9500',
    shadowColor: '#FF9500',
    shadowOpacity: 0.2,
  },
  successCard: {
    backgroundColor: '#0F2D1B',
    borderWidth: 1,
    borderColor: '#30D158',
    shadowColor: '#30D158',
    shadowOpacity: 0.2,
  },
  dangerCard: {
    backgroundColor: '#2D0F0F',
    borderWidth: 1,
    borderColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOpacity: 0.2,
  },
});