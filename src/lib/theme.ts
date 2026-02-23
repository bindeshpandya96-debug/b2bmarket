/**
 * Ant Design theme — modern, clean healthcare/professional look.
 */
import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#0d9488',
    colorPrimaryHover: '#0f766e',
    colorPrimaryActive: '#115e59',
    borderRadius: 12,
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorBorder: '#e2e8f0',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f8fafc',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
  },
  components: {
    Button: {
      primaryShadow: '0 2px 4px rgb(13 148 136 / 0.2)',
      borderRadius: 10,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 10,
      activeShadow: '0 0 0 2px rgb(13 148 136 / 0.15)',
    },
    Card: {
      borderRadiusLG: 16,
      boxShadowTertiary: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
    },
    Tabs: {
      itemColor: '#64748b',
      itemHoverColor: '#0d9488',
      itemSelectedColor: '#0d9488',
      inkBarColor: '#0d9488',
    },
  },
};
