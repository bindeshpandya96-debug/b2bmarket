'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button, Layout, Menu, Dropdown, Space, Avatar, Badge } from 'antd';
import type { MenuProps } from 'antd';
import {
  AppstoreOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  ClockCircleOutlined,
  UnorderedListOutlined,
  TeamOutlined,
  BankOutlined,
  UserOutlined,
  LogoutOutlined,
  DownOutlined,
  EnvironmentOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { useCart } from '@/contexts/CartContext';

const { Header, Sider, Content } = Layout;

const headerStyle: React.CSSProperties = {
  background: '#fff',
  borderBottom: '1px solid #e2e8f0',
  padding: '0 24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: 56,
};

const siderStyle: React.CSSProperties = {
  background: '#fff',
  borderRight: '1px solid #e2e8f0',
  minHeight: 'calc(100vh - 56px)',
};

const contentStyle: React.CSSProperties = {
  background: 'var(--bg-page)',
  minHeight: 'calc(100vh - 56px)',
  overflow: 'auto',
};

function getMenuItems(role: string) {
  const baseItems: { key: string; icon: React.ReactNode; label: React.ReactNode }[] = [];
  if (role === 'SUPER_ADMIN') {
    baseItems.push(
      { key: '/admin/organizations', icon: <BankOutlined />, label: <Link href="/admin/organizations">Organizations</Link> },
      { key: '/admin/categories', icon: <TagOutlined />, label: <Link href="/admin/categories">Categories</Link> },
      { key: '/admin/listings', icon: <UnorderedListOutlined />, label: <Link href="/admin/listings">All listings</Link> },
    );
  } else {
    if (role === 'PROCUREMENT') {
      baseItems.push({ key: '/', icon: <AppstoreOutlined />, label: <Link href="/">Marketplace</Link> });
      baseItems.push({ key: '/orders', icon: <ShoppingOutlined />, label: <Link href="/orders">My Orders</Link> });
      baseItems.push({ key: '/addresses', icon: <EnvironmentOutlined />, label: <Link href="/addresses">My Addresses</Link> });
    }
    if (role === 'ADMIN') {
      baseItems.push({ key: '/listings', icon: <UnorderedListOutlined />, label: <Link href="/listings">My listings</Link> });
      baseItems.push({ key: '/invite', icon: <TeamOutlined />, label: <Link href="/invite">Invite team</Link> });
      baseItems.push({ key: '/orders/pending', icon: <ClockCircleOutlined />, label: <Link href="/orders/pending">Pending</Link> });
    }
  }
  baseItems.push({ key: '/profile', icon: <UserOutlined />, label: <Link href="/profile">Profile</Link> });
  return baseItems;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const cart = useCart();
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  if (isAuthPage) {
    return (
      <>
        <Header style={{ ...headerStyle, justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f172a', textDecoration: 'none' }}>
            <span style={{ color: '#0d9488', marginRight: 8 }}>◉</span> MedSupply
          </Link>
          <span>
            <Link href="/login"><Button type="text">Sign in</Button></Link>
            <Link href="/signup"><Button type="primary" style={{ borderRadius: 10 }}>Sign up</Button></Link>
          </span>
        </Header>
        {children}
      </>
    );
  }

  if (status !== 'authenticated') {
    return (
      <>
        <Header style={{ ...headerStyle, justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f172a', textDecoration: 'none' }}>
            <span style={{ color: '#0d9488', marginRight: 8 }}>◉</span> MedSupply
          </Link>
          <span>
            <Link href="/login"><Button type="text">Sign in</Button></Link>
            <Link href="/signup"><Button type="primary" style={{ borderRadius: 10 }}>Sign up</Button></Link>
          </span>
        </Header>
        {children}
      </>
    );
  }

  const role = (session.user as { role?: string })?.role ?? '';
  const menuItems = getMenuItems(role);
  const email = session.user?.email ?? '';
  const displayName = email ? (email.split('@')[0] || email) : 'Account';
  const cartCount = cart.itemCount;

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'email',
      disabled: true,
      label: <span style={{ fontSize: 12, color: '#64748b' }}>{email}</span>,
    },
    { type: 'divider' },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link href="/profile">Profile</Link>,
    },
    { type: 'divider' },
    {
      key: 'signout',
      icon: <LogoutOutlined />,
      label: 'Sign out',
      danger: true,
      onClick: () => signOut({ callbackUrl: '/' }),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={headerStyle}>
        <Link href="/" style={{ fontWeight: 700, fontSize: '1.2rem', color: '#0f172a', textDecoration: 'none' }}>
          <span style={{ color: '#0d9488', marginRight: 8 }}>◉</span> MedSupply
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {role === 'PROCUREMENT' && (
            <Link href="/cart">
              <Badge count={cartCount} size="small" offset={[-2, 2]}>
                <Button type="text" size="large" icon={<ShoppingCartOutlined style={{ fontSize: 20 }} />} style={{ borderRadius: 10 }} />
              </Badge>
            </Link>
          )}
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
          <Space
            style={{
              cursor: 'pointer',
              padding: '6px 12px',
              borderRadius: 10,
              transition: 'background 0.2s',
            }}
            className="header-user-trigger"
          >
            <Avatar size="small" style={{ backgroundColor: '#0d9488', flexShrink: 0 }}>
              {displayName ? displayName.charAt(0).toUpperCase() : <UserOutlined />}
            </Avatar>
            <span style={{ fontWeight: 500, color: '#0f172a', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </span>
            <DownOutlined style={{ fontSize: 10, color: '#64748b' }} />
          </Space>
        </Dropdown>
        </div>
      </Header>
      <Layout>
        <Sider width={220} style={siderStyle}>
          <Menu
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            style={{ borderRight: 0, marginTop: 16 }}
          />
        </Sider>
        <Content style={contentStyle}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
