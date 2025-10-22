import React from 'react';
import { LogBox } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppNavigator } from './src/navigation/AppNavigator';
import { queryClient } from './src/services/queryClient';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AuthProvider } from './src/contexts/AuthContext';

// Suppress third-party deprecation warnings from dependencies
// These are not in our code - they're from React Navigation and Expo internals
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated',
  'activateKeepAwake is deprecated',
]);

export default function App() {
  console.log('🚀 [App] Component rendering...');

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <AppNavigator />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

console.log('✅ [App] Module loaded successfully');
