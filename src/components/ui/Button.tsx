// File Version: 2.0
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ai';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  testID
}: ButtonProps) {
  const buttonStyle = [
    styles.button,
    styles[`${variant}Button`],
    styles[`${size}Button`],
    disabled && styles.disabledButton,
    style
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={getLoadingColor(variant)} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

function getLoadingColor(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
    case 'ai':
      return '#fff';
    case 'secondary':
      return '#007AFF';
    case 'danger':
      return '#fff';
    case 'ghost':
      return '#666';
    default:
      return '#fff';
  }
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },

  // Variants
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#333',
  },
  aiButton: {
    backgroundColor: '#9F4AF3',
    shadowColor: '#9F4AF3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Sizes
  smallButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
  },
  mediumButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 48,
  },
  largeButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 56,
  },

  // Disabled state
  disabledButton: {
    opacity: 0.5,
  },

  // Text styles
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },

  // Variant text
  primaryText: {
    color: '#fff',
    fontSize: 16,
  },
  secondaryText: {
    color: '#007AFF',
    fontSize: 16,
  },
  dangerText: {
    color: '#fff',
    fontSize: 16,
  },
  ghostText: {
    color: '#fff',
    fontSize: 16,
  },
  aiText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Size text
  smallText: {
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },

  disabledText: {
    opacity: 0.7,
  },
});