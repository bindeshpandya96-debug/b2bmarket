'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, Table, Button, Typography, Tag, Alert, Spin } from 'antd';
import type { ColumnsType } from 'antd/es/table';

type OrgRow = {
  id: string;
  name: string;
  status: string;
  inviteCode: string | null;
  createdAt: string;
  userCount: number;
  listingCount: number;
};

export default function AdminOrganizationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [list, setList] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const isSuperAdmin = (session?.user as { role?: string })?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/admin/organizations');
      return;
    }
    if (status === 'authenticated' && !isSuperAdmin) {
      router.replace('/');
      return;
    }
    if (status !== 'authenticated' || !isSuperAdmin) return;

    fetch('/api/admin/organizations', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setList(data.items ?? []);
      })
      .catch((e) => setError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [status, isSuperAdmin, router]);

  const approve = (id: string) => {
    setApprovingId(id);
    setError(null);
    fetch(`/api/admin/organizations/${id}/approve`, { method: 'PATCH', credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setList((prev) => prev.map((o) => (o.id === id ? { ...o, status: 'APPROVED' } : o)));
      })
      .catch((e) => setError(e.message ?? 'Failed to approve'))
      .finally(() => setApprovingId(null));
  };

  if (status === 'loading' || status === 'unauthenticated' || !isSuperAdmin) {
    return null;
  }

  const columns: ColumnsType<OrgRow> = [
    { title: 'Hospital', dataIndex: 'name', key: 'name', render: (n: string) => <Typography.Text strong>{n}</Typography.Text> },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={s === 'APPROVED' ? 'green' : 'orange'}>{s}</Tag>
      ),
    },
    { title: 'Users', dataIndex: 'userCount', key: 'userCount', width: 80 },
    { title: 'Listings', dataIndex: 'listingCount', key: 'listingCount', width: 90 },
    { title: 'Invite code', dataIndex: 'inviteCode', key: 'inviteCode', render: (c: string | null) => c ?? '—' },
    {
      title: 'Action',
      key: 'action',
      width: 120,
      render: (_: unknown, row: OrgRow) =>
        row.status === 'PENDING' ? (
          <Button type="primary" size="small" loading={approvingId === row.id} onClick={() => approve(row.id)} style={{ borderRadius: 8 }}>
            Approve
          </Button>
        ) : (
          <Typography.Text type="secondary">Approved</Typography.Text>
        ),
    },
  ];

  return (
    <div className="page-container">
      <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>Organizations</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Approve hospitals so they can sign in and participate in the marketplace.
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
            pagination={false}
          />
        </Card>
      )}
    </div>
  );
}
