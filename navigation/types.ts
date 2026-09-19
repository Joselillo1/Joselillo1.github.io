import { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

export type MainTabsParamList = {
  Portfolio: undefined;
  Catalog: { autoFocus?: boolean } | undefined;
  History: undefined;
  Gains: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabsParamList>;
  StockDetail: { symbol: string };
  TransactionForm: { symbol: string; transactionId?: string; initialType?: 'compra' | 'venta' };
  Expenses: undefined;
  ExpenseForm: { expenseId?: string };
  Income: undefined;
  IncomeForm: { incomeId?: string };
};

/** Para pantallas montadas directamente por el stack raíz (StockDetail, TransactionForm). */
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

/** Para pantallas dentro de las tabs, que también necesitan poder navegar a rutas del stack raíz (ej. StockDetail). */
export type MainTabsScreenProps<T extends keyof MainTabsParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabsParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
