// File Version: 2.0
// Quick fixes for TypeScript issues to get the build working

// Icon name fixes
export const getValidIonicon = (name: string): string => {
  const iconMap: Record<string, string> = {
    'brain': 'bulb',
    'robot': 'construct'
  };

  return iconMap[name] || name;
};