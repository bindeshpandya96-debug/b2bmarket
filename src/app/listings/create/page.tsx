'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Form, Input, InputNumber, Button, Card, Typography, Alert, Select, Spin } from 'antd';

type CategoryOption = { id: string; name: string };

export default function CreateListingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loadingCat, setLoadingCat] = useState(true);
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .finally(() => setLoadingCat(false));
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/listings/create');
      return;
    }
    if (status === 'authenticated' && !isAdmin) {
      router.replace('/');
    }
  }, [status, isAdmin, router]);

  const onFinish = async (values: {
    title: string;
    description?: string;
    category: string;
    quantityAvailable: number;
    pricePerUnit: number;
    expiryDate?: string;
  }) => {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          description: values.description || null,
          category: values.category,
          quantityAvailable: values.quantityAvailable,
          pricePerUnit: values.pricePerUnit,
          expiryDate: values.expiryDate || null,
        }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? (data.details ? 'Validation failed' : 'Failed to create listing'));
        setSubmitting(false);
        return;
      }
      router.push('/');
      router.refresh();
    } catch {
      setError('Something went wrong');
      setSubmitting(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated' || !isAdmin) return null;

  return (
    <div className="page-container" style={{ maxWidth: 560 }}>
      <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>New listing</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>Add surplus medical supplies to the marketplace.</Typography.Paragraph>
      {error && <Alert type="error" message={error} style={{ marginBottom: 20, borderRadius: 12 }} />}
      <Card style={{ borderRadius: 16, overflow: 'hidden' }} styles={{ body: { padding: 28 } }}>
        <Form layout="vertical" onFinish={onFinish} initialValues={{ quantityAvailable: 1, pricePerUnit: 0 }} size="large">
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input placeholder="e.g. Surgical Gloves Box" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Optional" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="category" label="Category" rules={[{ required: true, message: 'Select a category' }]}>
            <Select
              placeholder="Select category"
              loading={loadingCat}
              options={categories.map((c) => ({ value: c.name, label: c.name }))}
              style={{ borderRadius: 10 }}
              allowClear={false}
            />
          </Form.Item>
          <Form.Item name="quantityAvailable" label="Quantity available" rules={[{ required: true }, { type: 'number', min: 0 }]}>
            <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="pricePerUnit" label="Price per unit" rules={[{ required: true }, { type: 'number', min: 0 }]}>
            <InputNumber min={0} step={0.01} style={{ width: '100%', borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="expiryDate" label="Expiry date (optional)">
            <Input type="date" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button type="primary" htmlType="submit" loading={submitting} block size="large" style={{ height: 48, borderRadius: 10, fontWeight: 600 }}>
              Create listing
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
