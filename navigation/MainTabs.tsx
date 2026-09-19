import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { MainTabsParamList } from './types';
import { PortfolioScreen } from '../screens/PortfolioScreen';
import { StockCatalogScreen } from '../screens/StockCatalogScreen';
import { TransactionHistoryScreen } from '../screens/TransactionHistoryScreen';
import { GainsScreen } from '../screens/GainsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useTheme } from '../components/theme';

const Tab = createBottomTabNavigator<MainTabsParamList>();

const ICONS: Record<keyof MainTabsParamList, string> = {
  Portfolio: '💼',
  Catalog: '🔎',
  History: '📜',
  Gains: '📈',
  Settings: '⚙️',
};

export function MainTabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.card, borderTopColor: theme.border },
        tabBarIcon: () => <Text style={{ fontSize: 18 }}>{ICONS[route.name as keyof MainTabsParamList]}</Text>,
      })}
    >
      <Tab.Screen name="Portfolio" component={PortfolioScreen} options={{ title: 'Portafolio' }} />
      <Tab.Screen name="Catalog" component={StockCatalogScreen} options={{ title: 'Ingresos y gastos extras' }} />
      <Tab.Screen name="History" component={TransactionHistoryScreen} options={{ title: 'Historial' }} />
      <Tab.Screen name="Gains" component={GainsScreen} options={{ title: 'Balance mensual' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ajustes' }} />
    </Tab.Navigator>
  );
}
