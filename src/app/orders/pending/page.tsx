'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, List, Typography, Spin, Button, Space, Alert, Tag } from 'antd';

type OrderItem = {
  id: string;
  quantity: number;
  totalPrice: string;
  status: string;
  createdAt: string;
  listing?: { title: string; category: string };
  buyerHospital?: { name: string };
};

export default function PendingOrdersPage() {
  const { status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = () => {
    fetch('/api/orders/my?as=seller')
      .then((r) => r.json())
      .then((data) => setOrders((data.orders ?? []).filter((o: OrderItem) => o.status === 'RESERVED')))
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/orders/pending');
      return;
    }
    if (status !== 'authenticated') return;
    load();
  }, [status, router]);

  const confirm = async (orderId: string) => {
    setActioningId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/confirm`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed');
        return;
      }
      load();
    } catch {
      setError('Something went wrong');
    } finally {
      setActioningId(null);
    }
  };

  const reject = async (orderId: string) => {
    setActioningId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/reject`, { method: 'POST', credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? 'Failed');
        return;
      }
      load();
    } catch {
      setError('Something went wrong');
    } finally {
      setActioningId(null);
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="page-container"><Spin size="large" style={{ margin: '48px auto', display: 'block' }} /></div>;
  }

  return (
    <div className="page-container">
      <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>Pending orders</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>Orders in RESERVED status waiting for your confirmation.</Typography.Paragraph>
      {error && <Alert type="error" message={error} style={{ marginBottom: 20, borderRadius: 12 }} closable />}
      {loading ? (
        <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
      ) : orders.length === 0 ? (
        <Card style={{ borderRadius: 16, textAlign: 'center', padding: 48 }}>
          <Typography.Text type="secondary">No pending (RESERVED) orders.</Typography.Text>
        </Card>
      ) : (
        <List
          dataSource={orders}
          renderItem={(o) => (
            <List.Item style={{ border: 'none' }}>
              <Card size="small" style={{ width: '100%', borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <Typography.Text strong style={{ fontSize: '1rem' }}>{o.listing?.title ?? o.id}</Typography.Text>
                    <Tag color="orange" style={{ marginLeft: 8, borderRadius: 6 }}>{o.status}</Tag>
                    <br />
                    <Typography.Text type="secondary" style={{ fontSize: '0.9rem', display: 'block', marginTop: 6 }}>
                      Buyer: {o.buyerHospital?.name} · Qty: {o.quantity} · Total: ${o.totalPrice}
                    </Typography.Text>
                  </div>
                  <Space>
                    <Button type="primary" size="middle" onClick={() => confirm(o.id)} loading={actioningId === o.id} style={{ borderRadius: 10, fontWeight: 500 }}>
                      Confirm
                    </Button>
                    <Button size="middle" danger onClick={() => reject(o.id)} loading={actioningId === o.id} style={{ borderRadius: 10 }}>
                      Reject
                    </Button>
                  </Space>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
