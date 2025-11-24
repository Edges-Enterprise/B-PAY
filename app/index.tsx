// app/index.tsx
import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/stores/auth-store';
import LoadingScreen from '@/components/LoadingScreen';

export default function AuthGate() {
  const { 
    isAuthenticated, 
    isInitialized,
    isLoading,
    savedAccounts,
    currentAccount
  } = useAuth();

  console.log('🚪 AuthGate State:', {
    isInitialized,
    isLoading,
    isAuthenticated,
    savedAccounts: savedAccounts.length,
    currentAccount: currentAccount?.identifier
  });

  // Show loading while not initialized
  if (!isInitialized || isLoading) {
    return <LoadingScreen message="Loading B-PAY..." />;
  }

  // If authenticated, go to protected area
  if (isAuthenticated) {
    console.log('✅ AuthGate: User authenticated, redirecting to app');
    return <Redirect href="/(app)/(protected)" />;
  }

  // If we have saved accounts but not authenticated, go to welcome-back
  if (savedAccounts.length > 0) {
    console.log('📱 AuthGate: Has saved accounts, redirecting to welcome-back');
    return <Redirect href="/(app)/(Auth)/welcome-back" />;
  }

  // No accounts, go to login
  console.log('🚀 AuthGate: No accounts, redirecting to login');
  return <Redirect href="/(app)/(Auth)/login" />;
}