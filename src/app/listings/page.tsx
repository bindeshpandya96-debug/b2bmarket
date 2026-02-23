'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Table, Typography, Tag, Button, Input, Select, Space, Alert, Spin, Modal } from 'antd';
import type { ColumnsType } from 'antd/es/table';

type ListingRow = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  quantityAvailable: number;
  pricePerUnit: string;
  expiryDate: string | null;
  status: string;
  createdAt: string;
};

export default function MyListingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [list, setList] = useState<ListingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    title: searchParams.get('title') ?? '',
    category: searchParams.get('category') ?? undefined as string | undefined,
    status: searchParams.get('status') ?? undefined as string | undefined,
  });
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; title: string } | null>(null);
  const isAdmin = (session?.user as { role?: string })?.role === 'ADMIN';

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []));
  }, []);

  const fetchListings = (params?: { title?: string; category?: string; status?: string; page?: number }) => {
    setLoading(true);
    const q = new URLSearchParams();
    if (params?.title) q.set('title', params.title);
    if (params?.category) q.set('category', params.category);
    if (params?.status) q.set('status', params.status);
    if (params?.page) q.set('page', String(params.page));
    q.set('pageSize', '20');
    fetch(`/api/listings/my?${q}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setList(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((e) => setError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/listings');
      return;
    }
    if (status === 'authenticated' && !isAdmin) {
      router.replace('/');
      return;
    }
    if (status !== 'authenticated' || !isAdmin) return;
    fetchListings(filters);
  }, [status, isAdmin, router]);

  const onFilter = () => {
    fetchListings({
      title: filters.title || undefined,
      category: filters.category,
      status: filters.status,
    });
  };

  const onDeactivate = (id: string) => {
    setDeactivatingId(id);
    setError(null);
    fetch(`/api/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'INACTIVE' }),
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setList((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'INACTIVE' } : o)));
        setDeleteModal(null);
      })
      .catch((e) => setError(e.message ?? 'Failed to deactivate'))
      .finally(() => setDeactivatingId(null));
  };

  if (status === 'loading' || status === 'unauthenticated' || !isAdmin) {
    return null;
  }

  const statusColors: Record<string, string> = {
    ACTIVE: 'green',
    SOLD_OUT: 'blue',
    EXPIRED: 'default',
    INACTIVE: 'default',
  };

  const columns: ColumnsType<ListingRow> = [
    { title: 'Title', dataIndex: 'title', key: 'title', render: (t: string, r: ListingRow) => <Link href={`/listings/${r.id}/edit`} style={{ fontWeight: 600 }}>{t}</Link> },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 120 },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => <Tag color={statusColors[s] ?? 'default'}>{s}</Tag>,
    },
    { title: 'Qty', dataIndex: 'quantityAvailable', key: 'quantityAvailable', width: 70 },
    {
      title: 'Price/unit',
      dataIndex: 'pricePerUnit',
      key: 'pricePerUnit',
      width: 100,
      render: (p: string) => `$${Number(p).toFixed(2)}`,
    },
    { title: 'Expiry', dataIndex: 'expiryDate', key: 'expiryDate', width: 110 },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: unknown, row: ListingRow) => (
        <Space>
          <Link href={`/listings/${row.id}/edit`}>
            <Button type="link" size="small" style={{ padding: 0 }}>Edit</Button>
          </Link>
          {row.status !== 'INACTIVE' && (
            <Button
              type="link"
              danger
              size="small"
              loading={deactivatingId === row.id}
              onClick={() => setDeleteModal({ id: row.id, title: row.title })}
            >
              Deactivate
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>My listings</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        View, search, edit, or deactivate your hospital&apos;s listings.
      </Typography.Paragraph>
      {error && <Alert type="error" message={error} style={{ marginBottom: 20, borderRadius: 12 }} closable onClose={() => setError(null)} />}
      <Card style={{ borderRadius: 16, marginBottom: 24 }} styles={{ body: { padding: 20 } }}>
        <Space wrap size="middle" align="end">
          <div>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Search by title</Typography.Text>
            <Input
              placeholder="Title contains..."
              value={filters.title}
              onChange={(e) => setFilters((f) => ({ ...f, title: e.target.value }))}
              onPressEnter={onFilter}
              style={{ width: 200, borderRadius: 10 }}
              allowClear
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Category</Typography.Text>
            <Select
              placeholder="All"
              value={filters.category}
              onChange={(v) => setFilters((f) => ({ ...f, category: v }))}
              style={{ width: 140 }}
              options={[
                { value: undefined, label: 'All' },
                ...categories.map((c) => ({ value: c.name, label: c.name })),
              ]}
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: '0.85rem' }}>Status</Typography.Text>
            <Select
              placeholder="All"
              value={filters.status}
              onChange={(v) => setFilters((f) => ({ ...f, status: v }))}
              style={{ width: 120 }}
              options={[
                { value: undefined, label: 'All' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'SOLD_OUT', label: 'Sold out' },
                { value: 'INACTIVE', label: 'Inactive' },
                { value: 'EXPIRED', label: 'Expired' },
              ]}
            />
          </div>
          <Button type="primary" onClick={onFilter} style={{ borderRadius: 10 }}>Apply filters</Button>
          <Link href="/listings/create">
            <Button style={{ borderRadius: 10 }}>New listing</Button>
          </Link>
        </Space>
      </Card>
      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
        {loading ? (
          <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={list}
            pagination={{
              pageSize: 20,
              total,
              showTotal: (t) => `Total ${t} listings`,
              onChange: (page) => fetchListings({ ...filters, page }),
            }}
          />
        )}
      </Card>
      <Modal
        title="Deactivate listing"
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        onOk={() => deleteModal && onDeactivate(deleteModal.id)}
        okText="Deactivate"
        okButtonProps={{ danger: true, loading: deactivatingId === deleteModal?.id }}
      >
        {deleteModal && (
          <Typography.Text>Deactivate &quot;{deleteModal.title}&quot;? It will no longer appear on the marketplace.</Typography.Text>
        )}
      </Modal>
    </div>
  );
}
