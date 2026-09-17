import { useColorScheme } from 'react-native';

export interface Theme {
  background: string;
  card: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  positive: string;
  negative: string;
  danger: string;
}

const light: Theme = {
  background: '#F7F8FA',
  card: '#FFFFFF',
  border: '#E4E7EC',
  text: '#0B1220',
  textMuted: '#6B7280',
  primary: '#0052FF',
  positive: '#0C8C4C',
  negative: '#D92D20',
  danger: '#D92D20',
};

const dark: Theme = {
  background: '#0B0F14',
  card: '#151B23',
  border: '#232B36',
  text: '#F5F7FA',
  textMuted: '#8A93A3',
  primary: '#4C8DFF',
  positive: '#3ECF7E',
  negative: '#FF5C5C',
  danger: '#FF5C5C',
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? dark : light;
}
