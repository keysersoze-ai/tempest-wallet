// File Version: 2.0
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  backgroundColor?: string;
  statusBarStyle?: 'auto' | 'inverted' | 'light' | 'dark';
}

export function Screen({
  children,
  style,
  scrollable = false,
  backgroundColor = '#000',
  statusBarStyle = 'light'
}: ScreenProps) {
  const containerStyle = [
    styles.container,
    { backgroundColor },
    style
  ];

  if (scrollable) {
    return (
      <SafeAreaView style={containerStyle}>
        <StatusBar style={statusBarStyle} />
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containerStyle}>
      <StatusBar style={statusBarStyle} />
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});