'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, List, Typography, Spin, Tag, Space, Alert, Button, InputNumber, Select, Pagination, message } from 'antd';
import { useCart } from '@/contexts/CartContext';
import { ShoppingOutlined, TeamOutlined, SafetyOutlined, LoginOutlined, UserAddOutlined } from '@ant-design/icons';

const PAGE_SIZE = 12;

type ListingItem = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  quantityAvailable: number;
  pricePerUnit: string;
  expiryDate: string | null;
  status: string;
  hospital: { id: string; name: string };
};

type ListingsResponse = {
  items: ListingItem[];
  total: number;
  page: number;
  pageSize: number;
};

type Facets = {
  categories: string[];
  organizations: { id: string; name: string }[];
  priceMin: number;
  priceMax: number;
};

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [data, setData] = useState<ListingsResponse | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFacets, setLoadingFacets] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') ?? '',
    hospitalId: searchParams.get('hospitalId') ?? '',
    priceMin: searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined as number | undefined,
    priceMax: searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined as number | undefined,
    sort: (searchParams.get('sort') as 'latest' | 'price_asc' | 'price_desc') || 'latest',
    page: Math.max(1, parseInt(searchParams.get('page') ?? '1', 10)),
  });

  const cart = useCart();
  const ownOrgId = (session?.user as { organizationId?: string } | undefined)?.organizationId;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const hideBuyButton = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isLoggedIn = status === 'authenticated';
  const isProcurement = role === 'PROCUREMENT';

  // Hospital Admin: no marketplace; redirect to My listings
  useEffect(() => {
    if (status === 'authenticated' && role === 'ADMIN') {
      router.replace('/listings');
      return;
    }
  }, [status, role, router]);

  // Marketplace data: only when logged in (PROCUREMENT or SUPER_ADMIN). Exclude own hospital for PROCUREMENT.
  useEffect(() => {
    if (status !== 'authenticated' || role === 'ADMIN') return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    if (filters.hospitalId) params.set('hospitalId', filters.hospitalId);
    if (isProcurement && ownOrgId) params.set('excludeHospitalId', ownOrgId);
    if (filters.priceMin != null) params.set('priceMin', String(filters.priceMin));
    if (filters.priceMax != null) params.set('priceMax', String(filters.priceMax));
    if (filters.sort && filters.sort !== 'latest') params.set('sort', filters.sort);
    params.set('page', String(filters.page));
    params.set('pageSize', String(PAGE_SIZE));
    fetch(`/api/listings/marketplace?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load listings');
        return res.json();
      })
      .then((json) => {
        setData({
          items: json.items ?? [],
          total: json.total ?? 0,
          page: json.page ?? 1,
          pageSize: json.pageSize ?? PAGE_SIZE,
        });
        setCategories(json.categories ?? []);
        setFacets({
          categories: (json.categories ?? []).map((c: { name: string }) => c.name),
          organizations: json.organizations ?? [],
          priceMin: json.priceMin ?? 0,
          priceMax: json.priceMax ?? 0,
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => {
        setLoading(false);
        setLoadingFacets(false);
        setLoadingCategories(false);
      });
  }, [status, role, isProcurement, ownOrgId, filters.page, filters.category, filters.hospitalId, filters.priceMin, filters.priceMax, filters.sort]);

  const onFilterApply = () => {
    setFilters((f) => ({ ...f, page: 1 }));
  };

  const renderCardAction = (item: ListingItem) => {
    if (!isLoggedIn) {
      return (
        <Link key="signin" href={`/login?callbackUrl=${encodeURIComponent('/')}`}>
          <Button type="primary" block style={{ borderRadius: 10, fontWeight: 600 }}>Sign in to order</Button>
        </Link>
      );
    }
    if (hideBuyButton) {
      return ownOrgId && item.hospital.id === ownOrgId ? (
        <Typography.Text key="own" type="secondary" style={{ display: 'block', textAlign: 'center', padding: '8px 0' }}>Your listing</Typography.Text>
      ) : (
        <Typography.Text key="view" type="secondary" style={{ display: 'block', textAlign: 'center', padding: '8px 0' }}>—</Typography.Text>
      );
    }
    if (ownOrgId && item.hospital.id === ownOrgId) {
      return <Typography.Text key="own" type="secondary" style={{ display: 'block', textAlign: 'center', padding: '8px 0' }}>Your listing</Typography.Text>;
    }
    if (isProcurement) {
      return (
        <Button
          key="add"
          type="primary"
          block
          style={{ borderRadius: 10, fontWeight: 600 }}
          onClick={() => {
            cart.addItem({
              listingId: item.id,
              quantity: 1,
              title: item.title,
              pricePerUnit: Number(item.pricePerUnit),
              hospitalName: item.hospital.name,
            });
            message.success('Added to cart');
          }}
        >
          Add to cart
        </Button>
      );
    }
    return (
      <Link key="buy" href={`/orders/create?listingId=${item.id}`}>
        <Button type="primary" block style={{ borderRadius: 10, fontWeight: 600 }}>Buy now</Button>
      </Link>
    );
  };

  // Unauthenticated: landing only — purpose, how to use, how to join. No listings.
  if (status !== 'authenticated' || role === 'ADMIN') {
    return (
      <main className="page-container">
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px' }}>
          <Typography.Title level={1} style={{ marginBottom: 16, fontWeight: 700, letterSpacing: '-0.03em', color: '#0f172a', textAlign: 'center' }}>
            B2B Healthcare Marketplace
          </Typography.Title>
          <Typography.Paragraph style={{ fontSize: '1.125rem', color: '#475569', marginBottom: 32, textAlign: 'center', lineHeight: 1.6 }}>
            A trusted platform for hospitals to buy and sell surplus medical supplies. Connect with other healthcare organizations and manage inventory efficiently.
          </Typography.Paragraph>

          <Card style={{ borderRadius: 16, marginBottom: 24 }} styles={{ body: { padding: 28 } }}>
            <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 16, fontWeight: 600 }}>What you can do here</Typography.Title>
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <ShoppingOutlined style={{ fontSize: 20, color: '#0d9488', marginTop: 2 }} />
                <div>
                  <Typography.Text strong>Browse &amp; order</Typography.Text>
                  <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
                    Discover surplus medical supplies listed by other hospitals. Add to cart and place orders for your organization.
                  </Typography.Paragraph>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <SafetyOutlined style={{ fontSize: 20, color: '#0d9488', marginTop: 2 }} />
                <div>
                  <Typography.Text strong>Sell surplus</Typography.Text>
                  <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
                    List your hospital&apos;s surplus equipment and consumables. Manage listings and respond to orders.
                  </Typography.Paragraph>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <TeamOutlined style={{ fontSize: 20, color: '#0d9488', marginTop: 2 }} />
                <div>
                  <Typography.Text strong>Invite your team</Typography.Text>
                  <Typography.Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: '0.9rem' }}>
                    Hospital admins can invite procurement users to place orders on behalf of the organization.
                  </Typography.Paragraph>
                </div>
              </div>
            </Space>
          </Card>

          <Card style={{ borderRadius: 16, marginBottom: 24 }} styles={{ body: { padding: 28 } }}>
            <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 12, fontWeight: 600 }}>How to join</Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 20, fontSize: '0.95rem' }}>
              Register your hospital to get started. Once approved, you can list surplus supplies and invite your team. Use an invite code from your hospital admin to join as a procurement user.
            </Typography.Paragraph>
            <Space size="middle" wrap>
              <Link href={`/login?callbackUrl=${encodeURIComponent('/')}`}>
                <Button type="primary" size="large" icon={<LoginOutlined />} style={{ borderRadius: 10, fontWeight: 600 }}>Sign in</Button>
              </Link>
              <Link href="/signup">
                <Button size="large" icon={<UserAddOutlined />} style={{ borderRadius: 10 }}>Sign up</Button>
              </Link>
            </Space>
          </Card>
        </div>
      </main>
    );
  }

  // Authenticated (PROCUREMENT or SUPER_ADMIN): marketplace with listings from other hospitals only (for PROCUREMENT)
  return (
    <main className="page-container">
      <div style={{ textAlign: 'center', marginBottom: 32, padding: '24px 16px' }}>
        <Typography.Title level={1} style={{ marginBottom: 12, fontWeight: 700, letterSpacing: '-0.03em', color: '#0f172a' }}>
          Marketplace
        </Typography.Title>
        <Typography.Paragraph style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: 520, margin: '0 auto' }}>
          {isProcurement ? 'Browse listings from other hospitals. Add to cart and place orders.' : 'Browse active listings.'}
        </Typography.Paragraph>
      </div>

      {error && (
        <Alert type="warning" message={error} description="Ensure the dev server is running and the API is available." style={{ marginBottom: 24, borderRadius: 12 }} closable onClose={() => setError(null)} />
      )}

      {/* Filters */}
      <Card style={{ borderRadius: 16, marginBottom: 24 }} styles={{ body: { padding: 20 } }}>
        <Typography.Title level={5} style={{ marginBottom: 16, marginTop: 0 }}>Filters</Typography.Title>
        <Space wrap size="middle" align="end">
          <div>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Category</Typography.Text>
            <Select
              placeholder="All categories"
              value={filters.category || undefined}
              onChange={(v) => setFilters((f) => ({ ...f, category: v ?? '' }))}
              style={{ width: 160 }}
              options={[{ value: '', label: 'All' }, ...categories.map((c) => ({ value: c.name, label: c.name }))]}
              loading={loadingCategories}
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Seller (organization)</Typography.Text>
            <Select
              placeholder="All sellers"
              value={filters.hospitalId || undefined}
              onChange={(v) => setFilters((f) => ({ ...f, hospitalId: v ?? '' }))}
              style={{ width: 200 }}
              options={[{ value: '', label: 'All' }, ...(facets?.organizations?.map((o) => ({ value: o.id, label: o.name })) ?? [])]}
              loading={loadingFacets}
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Price min ($)</Typography.Text>
            <InputNumber
              min={0}
              placeholder="Min"
              value={filters.priceMin}
              onChange={(v) => setFilters((f) => ({ ...f, priceMin: v ?? undefined }))}
              style={{ width: 100 }}
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Price max ($)</Typography.Text>
            <InputNumber
              min={0}
              placeholder="Max"
              value={filters.priceMax}
              onChange={(v) => setFilters((f) => ({ ...f, priceMax: v ?? undefined }))}
              style={{ width: 100 }}
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Sort by</Typography.Text>
            <Select
              value={filters.sort}
              onChange={(v) => setFilters((f) => ({ ...f, sort: v }))}
              style={{ width: 160 }}
              options={[
                { value: 'latest', label: 'Latest first' },
                { value: 'price_asc', label: 'Price: Low to high' },
                { value: 'price_desc', label: 'Price: High to low' },
              ]}
            />
          </div>
          <Button type="primary" onClick={onFilterApply} style={{ borderRadius: 10 }}>Apply</Button>
        </Space>
      </Card>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <Typography.Title level={4} style={{ margin: 0, fontWeight: 600 }}>Active listings</Typography.Title>
        {!loading && data && (
          <Typography.Text type="secondary" style={{ fontSize: '0.9rem' }}>{data.total} listing{data.total !== 1 ? 's' : ''}</Typography.Text>
        )}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /></div>}
      {!loading && data && (
        <>
          {data.items.length === 0 ? (
            <Card style={{ borderRadius: 16, textAlign: 'center', padding: 48 }}>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>No listings match your filters.</Typography.Paragraph>
              <Button type="default" onClick={() => setFilters({ category: '', hospitalId: '', priceMin: undefined, priceMax: undefined, sort: 'latest', page: 1 })}>Clear filters</Button>
            </Card>
          ) : (
            <>
              <List
                grid={{ gutter: 20, xs: 1, sm: 1, md: 2, lg: 2, xl: 3 }}
                dataSource={data.items}
                renderItem={(item) => (
                  <List.Item>
                    <Card
                      className="listing-card"
                      size="small"
                      style={{ height: '100%', borderRadius: 16, overflow: 'hidden' }}
                      styles={{ body: { padding: 20 } }}
                      actions={[renderCardAction(item)]}
                    >
                      <Space direction="vertical" size={12} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <Typography.Title level={5} style={{ margin: 0, fontWeight: 600 }}>{item.title}</Typography.Title>
                          <Tag style={{ margin: 0, borderRadius: 8 }}>{item.category}</Tag>
                        </div>
                        {item.description && (
                          <Typography.Paragraph type="secondary" style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5 }} ellipsis={{ rows: 2 }}>
                            {item.description}
                          </Typography.Paragraph>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <Typography.Text strong style={{ color: '#0d9488', fontSize: '1.1rem' }}>${Number(item.pricePerUnit).toFixed(2)}</Typography.Text>
                          <Typography.Text type="secondary">/ unit · {item.quantityAvailable} available</Typography.Text>
                        </div>
                        <Typography.Text type="secondary" style={{ fontSize: '0.85rem' }}>Seller: {item.hospital.name}</Typography.Text>
                      </Space>
                    </Card>
                  </List.Item>
                )}
              />
              {data.total > PAGE_SIZE && (
                <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    current={data.page}
                    total={data.total}
                    pageSize={PAGE_SIZE}
                    showSizeChanger={false}
                    showTotal={(t) => `Total ${t} items`}
                    onChange={(page) => {
                      setFilters((f) => ({ ...f, page }));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </main>
  );
}
