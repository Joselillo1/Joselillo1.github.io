import React from 'react';
import { Text, TextStyle } from 'react-native';
import Decimal from 'decimal.js';
import { formatCurrency, formatPercentage } from '../../services/format';
import { useTheme } from '../theme';

interface Props {
  value: Decimal;
  /** Si es true, colorea en verde/rojo según el signo (útil para ganancias/pérdidas). */
  signed?: boolean;
  style?: TextStyle;
}

export function CurrencyText({ value, signed, style }: Props) {
  const theme = useTheme();
  const color = signed ? (value.isNegative() ? theme.negative : theme.positive) : theme.text;
  const prefix = signed && value.greaterThan(0) ? '+' : '';
  return <Text style={[{ color }, style]}>{prefix}{formatCurrency(value)}</Text>;
}

export function PercentageText({ value, signed, style }: Props) {
  const theme = useTheme();
  const color = signed ? (value.isNegative() ? theme.negative : theme.positive) : theme.text;
  const prefix = signed && value.greaterThan(0) ? '+' : '';
  return <Text style={[{ color }, style]}>{prefix}{formatPercentage(value)}</Text>;
}
