'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Button, Space, Typography } from 'antd';

const headerStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 100,
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(12px)',
  borderBottom: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgb(0 0 0 / 0.04)',
};
const innerStyle: React.CSSProperties = {
  maxWidth: 1200,
  margin: '0 auto',
  padding: '14px 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 24,
};
const brandStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  textDecoration: 'none',
  color: '#0f172a',
  fontWeight: 700,
  fontSize: '1.2rem',
  letterSpacing: '-0.02em',
};
const navStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' };
const linkStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 10,
  color: '#64748b',
  fontSize: '0.9rem',
  fontWeight: 500,
  textDecoration: 'none',
};

export function Nav() {
  const { data: session, status } = useSession();

  return (
    <header style={headerStyle}>
      <div style={innerStyle}>
        <Link href="/" style={brandStyle}>
          <span style={{ color: '#0d9488', fontSize: '1.1rem' }}>◉</span>
          <span>MedSupply</span>
        </Link>
        <nav style={navStyle}>
          {status === 'loading' && <Typography.Text type="secondary" style={{ fontSize: '0.875rem' }}>Loading...</Typography.Text>}
          {status === 'authenticated' && (
            <>
              <Link href="/" style={linkStyle}>Marketplace</Link>
              <Link href="/orders" style={linkStyle}>My Orders</Link>
              <Link href="/orders/create" style={linkStyle}>Create Order</Link>
              <Link href="/orders/pending" style={linkStyle}>Pending</Link>
              {(session.user as { role?: string })?.role === 'ADMIN' && (
                <>
                  <Link href="/listings/create" style={linkStyle}>New Listing</Link>
                  <Link href="/invite" style={linkStyle}>Invite team</Link>
                </>
              )}
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: 8, padding: '6px 12px', background: '#f8fafc', borderRadius: 8, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {session.user?.email}
              </span>
              <Button type="default" size="middle" style={{ borderRadius: 10, fontWeight: 500 }} onClick={() => signOut({ callbackUrl: '/' })}>
                Sign out
              </Button>
            </>
          )}
          {status === 'unauthenticated' && (
            <Space size="small">
              <Link href="/login"><Button type="text" size="middle">Sign in</Button></Link>
              <Link href="/signup"><Button type="primary" size="middle" style={{ fontWeight: 600, borderRadius: 10 }}>Sign up</Button></Link>
            </Space>
          )}
        </nav>
      </div>
    </header>
  );
}
