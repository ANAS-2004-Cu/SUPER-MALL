export type AlertKind = 'success' | 'error' | 'warning' | 'info' | 'cart';

interface HeaderStyle {
  bg: string;
  icon: string;
}

export interface AlertTheme {
  overlay: string;
  containerBg: string;
  headerText: string;
  bodyText: string;
  button: {
    primaryBg: string;
    primaryText: string;
    secondaryBg: string;
    secondaryBorder: string;
    secondaryText: string;
  };
  header: Record<AlertKind, HeaderStyle>;
  bodyBg: Record<AlertKind, string>;
}

export const lightAlertTheme: AlertTheme = {
  overlay: 'rgba(0, 0, 0, 0.5)',
  containerBg: '#ffffff',
  headerText: '#ffffff',
  bodyText: '#333333',
  button: {
    primaryBg: '#f7cfae',
    primaryText: '#000000',
    secondaryBg: '#f5f5f5',
    secondaryBorder: '#dddddd',
    secondaryText: '#666666',
  },
  header: {
    success: { bg: '#f7cfae', icon: '#ffffff' },
    error: { bg: '#ff4d4f', icon: '#ffffff' },
    warning: { bg: '#faad14', icon: '#121212' },
    info: { bg: '#1890ff', icon: '#ffffff' },
    cart: { bg: '#f7cfae', icon: '#121212' },
  },
  bodyBg: {
    success: '#f8f2f6',
    error: '#fff2f2',
    warning: '#fffbe6',
    info: '#f0f7ff',
    cart: '#f0f7ff',
  },
};

export const darkAlertTheme: AlertTheme = {
  overlay: 'rgba(0, 0, 0, 0.6)',
  containerBg: '#1E1E1E',
  headerText: '#ffffff',
  bodyText: '#E0C9A6',
  button: {
    primaryBg: '#B39169',
    primaryText: '#121212',
    secondaryBg: '#2A2A2A',
    secondaryBorder: '#3A3A3A',
    secondaryText: '#E0C9A6',
  },
  header: {
    success: { bg: '#f7cfae', icon: '#121212' },
    error: { bg: '#ff4d4f', icon: '#ffffff' },
    warning: { bg: '#faad14', icon: '#121212' },
    info: { bg: '#1890ff', icon: '#ffffff' },
    cart: { bg: '#f7cfae', icon: '#121212' },
  },
  bodyBg: {
    success: '#2A1F24',
    error: '#2A1B1B',
    warning: '#2A2415',
    info: '#1F2733',
    cart: '#1F262B',
  },
};
