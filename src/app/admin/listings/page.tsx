'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, Table, Typography, Tag, Alert, Spin } from 'antd';
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
  hospitalName: string;
  hospitalStatus: string;
};

export default function AdminListingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [list, setList] = useState<ListingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isSuperAdmin = (session?.user as { role?: string })?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/admin/listings');
      return;
    }
    if (status === 'authenticated' && !isSuperAdmin) {
      router.replace('/');
      return;
    }
    if (status !== 'authenticated' || !isSuperAdmin) return;

    fetch('/api/admin/listings?pageSize=100', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setList(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .catch((e) => setError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [status, isSuperAdmin, router]);

  if (status === 'loading' || status === 'unauthenticated' || !isSuperAdmin) {
    return null;
  }

  const columns: ColumnsType<ListingRow> = [
    { title: 'Title', dataIndex: 'title', key: 'title', render: (t: string) => <Typography.Text strong>{t}</Typography.Text> },
    { title: 'Category', dataIndex: 'category', key: 'category', width: 120 },
    { title: 'Hospital', dataIndex: 'hospitalName', key: 'hospitalName' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => (
        <Tag color={s === 'ACTIVE' ? 'green' : s === 'SOLD_OUT' ? 'blue' : 'default'}>{s}</Tag>
      ),
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
  ];

  return (
    <div className="page-container">
      <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>All listings</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Total listings across all organizations: {total}
      </Typography.Paragraph>
      {error && <Alert type="error" message={error} style={{ marginBottom: 20, borderRadius: 12 }} />}
      {loading ? (
        <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
      ) : (
        <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={list}
            pagination={{ pageSize: 20, showTotal: (t) => `Total ${t} listings` }}
          />
        </Card>
      )}
    </div>
  );
}
