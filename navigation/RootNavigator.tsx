import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { MainTabs } from './MainTabs';
import { StockDetailScreen } from '../screens/StockDetailScreen';
import { TransactionFormScreen } from '../screens/TransactionFormScreen';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { ExpenseFormScreen } from '../screens/ExpenseFormScreen';
import { IncomeScreen } from '../screens/IncomeScreen';
import { IncomeFormScreen } from '../screens/IncomeFormScreen';
import { useTheme } from '../components/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: theme.card },
        headerTintColor: theme.text,
        headerTitleStyle: { color: theme.text },
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="StockDetail"
        component={StockDetailScreen}
        options={({ route }) => ({ title: route.params.symbol })}
      />
      <Stack.Screen
        name="TransactionForm"
        component={TransactionFormScreen}
        options={{ title: 'Transacción', presentation: 'modal' }}
      />
      <Stack.Screen name="Expenses" component={ExpensesScreen} options={{ title: 'Gastos extra' }} />
      <Stack.Screen
        name="ExpenseForm"
        component={ExpenseFormScreen}
        options={{ title: 'Gasto extra', presentation: 'modal' }}
      />
      <Stack.Screen name="Income" component={IncomeScreen} options={{ title: 'Ingresos' }} />
      <Stack.Screen
        name="IncomeForm"
        component={IncomeFormScreen}
        options={{ title: 'Ingreso', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
