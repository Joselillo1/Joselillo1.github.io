import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { TransactionsProvider } from './hooks/useTransactionsStore';
import { ExpensesProvider } from './hooks/useExpensesStore';
import { CapitalProvider } from './hooks/useCapitalStore';
import { IncomeProvider } from './hooks/useIncomeStore';
import { useAuth } from './hooks/useAuth';
import { useBiometricLock } from './hooks/useBiometricLock';
import { AuthScreen } from './screens/AuthScreen';
import { LockScreen } from './screens/LockScreen';
import { RootNavigator } from './navigation/RootNavigator';
import { useTheme } from './components/theme';
import { ActionSheetProvider } from './components/Shared/ActionSheet';

function AuthenticatedApp() {
  const { locked, checking, retry } = useBiometricLock();

  if (locked) {
    return <LockScreen checking={checking} onRetry={retry} />;
  }

  return (
    <TransactionsProvider>
      <ExpensesProvider>
        <IncomeProvider>
          <CapitalProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </CapitalProvider>
        </IncomeProvider>
      </ExpensesProvider>
    </TransactionsProvider>
  );
}

function AppContent() {
  const theme = useTheme();
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return session ? <AuthenticatedApp /> : <AuthScreen />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <ActionSheetProvider>
        <AppContent />
      </ActionSheetProvider>
    </SafeAreaProvider>
  );
}
