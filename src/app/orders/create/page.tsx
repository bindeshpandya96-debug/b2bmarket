'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, InputNumber, Button, Card, Typography, Alert, Spin, Select } from 'antd';

type ListingItem = {
  id: string;
  title: string;
  category: string;
  quantityAvailable: number;
  pricePerUnit: string;
  hospital: { id: string; name: string };
};

export default function CreateOrderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get('listingId');
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/orders/create');
      return;
    }
    if (status !== 'authenticated') return;

    fetch('/api/listings?pageSize=100')
      .then((r) => r.json())
      .then((data) => setListings(data.items ?? []))
      .catch(() => setError('Failed to load listings'))
      .finally(() => setLoadingListings(false));
  }, [status, router]);

  const onFinish = async (values: { listingId: string; quantity: number }) => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: values.listingId, quantity: values.quantity }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Failed to create order');
        setSubmitting(false);
        return;
      }
      router.push('/orders');
      router.refresh();
    } catch {
      setError('Something went wrong');
      setSubmitting(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return <div className="page-container"><Spin size="large" style={{ margin: '48px auto', display: 'block' }} /></div>;
  }

  const ownOrgId = (session?.user as { organizationId?: string } | undefined)?.organizationId;
  const otherListings = ownOrgId ? listings.filter((l) => l.hospital.id !== ownOrgId) : listings;
  const options = otherListings.map((l) => ({
    value: l.id,
    label: `${l.title} (${l.category}) — ${l.quantityAvailable} available, $${Number(l.pricePerUnit).toFixed(2)}/unit — ${l.hospital.name}`,
  }));

  return (
    <div className="page-container" style={{ maxWidth: 560 }}>
      <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>Create Order</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>Select a listing and quantity to place an order.</Typography.Paragraph>
      {error && <Alert type="error" message={error} style={{ marginBottom: 20, borderRadius: 12 }} />}
      {loadingListings ? (
        <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
      ) : (
        <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 28 } }}>
          <Form
            layout="vertical"
            size="large"
            onFinish={onFinish}
            initialValues={{
              listingId: (preselectedId && otherListings.some((l) => l.id === preselectedId)) ? preselectedId : undefined,
              quantity: 1,
            }}
          >
            <Form.Item
              name="listingId"
              label="Listing"
              rules={[{ required: true, message: 'Select a listing' }]}
            >
              <Select
                placeholder="Select a listing to order"
                options={options}
                showSearch
                optionFilterProp="label"
                allowClear
              />
            </Form.Item>
            <Form.Item
              name="quantity"
              label="Quantity"
              rules={[{ required: true }, { type: 'number', min: 1 }]}
            >
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" loading={submitting} block size="large" style={{ height: 48, borderRadius: 10, fontWeight: 600 }}>
                Place order
              </Button>
            </Form.Item>
          </Form>
        </Card>
      )}
    </div>
  );
}
