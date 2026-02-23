import type { Metadata } from 'next';
import { ConfigProvider } from 'antd';
import { Providers } from '@/components/Providers';
import { CartProvider } from '@/contexts/CartContext';
import { AdminShell } from '@/components/AdminShell';
import { theme } from '@/lib/theme';
import './globals.css';

export const metadata: Metadata = {
  title: 'B2B Healthcare Marketplace',
  description: 'P2P marketplace for surplus medical supplies',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <ConfigProvider theme={theme}>
          <Providers>
            <CartProvider>
              <AdminShell>{children}</AdminShell>
            </CartProvider>
          </Providers>
        </ConfigProvider>
      </body>
    </html>
  );
}
