'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, List, Typography, Spin, Tag, Tabs, Alert } from 'antd';

type OrderItem = {
  id: string;
  quantity: number;
  totalPrice: string;
  status: string;
  createdAt: string;
  listing?: { id: string; title: string; category: string };
  sellerHospital?: { id: string; name: string };
  buyerHospital?: { id: string; name: string };
};

export default function MyOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [buyerOrders, setBuyerOrders] = useState<OrderItem[]>([]);
  const [sellerOrders, setSellerOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/orders');
      return;
    }
    if (status !== 'authenticated') return;

    Promise.all([
      fetch('/api/orders/my?as=buyer').then((r) => r.json()),
      fetch('/api/orders/my?as=seller').then((r) => r.json()),
    ])
      .then(([buyerRes, sellerRes]) => {
        setBuyerOrders(buyerRes.orders ?? []);
        setSellerOrders(sellerRes.orders ?? []);
      })
      .catch(() => setError('Failed to load orders'))
      .finally(() => setLoading(false));
  }, [status, router]);

  const statusColor = (s: string) => ({ RESERVED: 'orange', CONFIRMED: 'blue', COMPLETED: 'green', REJECTED: 'red' }[s] ?? 'default');

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="page-container"><Spin size="large" style={{ display: 'block', margin: '48px auto' }} /></div>;
  }

  const orderCard = (o: OrderItem) => (
    <Card size="small" style={{ width: '100%', borderRadius: 12, marginBottom: 12 }}>
      <Typography.Text strong style={{ fontSize: '1rem' }}>{o.listing?.title ?? o.id}</Typography.Text>
      <Tag color={statusColor(o.status)} style={{ marginLeft: 8, borderRadius: 6 }}>{o.status}</Tag>
      <br />
      <Typography.Text type="secondary" style={{ marginTop: 8, fontSize: '0.9rem' }}>
        Qty: {o.quantity} · Total: ${o.totalPrice} · {new Date(o.createdAt).toLocaleString()}
      </Typography.Text>
      {o.buyerHospital && <><br /><Typography.Text type="secondary" style={{ fontSize: '0.85rem' }}>Buyer: {o.buyerHospital.name}</Typography.Text></>}
      {o.sellerHospital && <><br /><Typography.Text type="secondary" style={{ fontSize: '0.85rem' }}>Seller: {o.sellerHospital.name}</Typography.Text></>}
    </Card>
  );

  return (
    <div className="page-container">
      <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>My Orders</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>View orders as buyer or seller.</Typography.Paragraph>
      {error && <Alert type="error" message={error} style={{ marginBottom: 20, borderRadius: 12 }} />}
      {loading ? <Spin size="large" style={{ display: 'block', margin: '48px auto' }} /> : (
        <Tabs
          size="large"
          items={[
            { key: 'buyer', label: 'As buyer', children: <List dataSource={buyerOrders} renderItem={(o) => <List.Item style={{ border: 'none' }}>{orderCard(o)}</List.Item>} /> },
            { key: 'seller', label: 'As seller', children: <List dataSource={sellerOrders} renderItem={(o) => <List.Item style={{ border: 'none' }}>{orderCard(o)}</List.Item>} /> },
          ]}
        />
      )}
    </div>
  );
}
