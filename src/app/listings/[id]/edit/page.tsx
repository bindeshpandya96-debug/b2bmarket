'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Form, Input, InputNumber, Button, Card, Typography, Alert, Spin, Select, Space } from 'antd';

export default function EditListingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [listing, setListing] = useState<{
    title: string;
    description: string | null;
    category: string;
    quantityAvailable: number;
    pricePerUnit: string;
    expiryDate: string | null;
  } | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loadingCat, setLoadingCat] = useState(true);
  const isAdmin = (session?.user as { role?: string })?.role === 'ADMIN';

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .finally(() => setLoadingCat(false));
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(`/login?callbackUrl=/listings/${id}/edit`);
      return;
    }
    if (status === 'authenticated' && !isAdmin) {
      router.replace('/');
      return;
    }
    if (status !== 'authenticated' || !isAdmin || !id) return;

    fetch(`/api/listings/${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setListing({
          title: data.title,
          description: data.description ?? null,
          category: data.category,
          quantityAvailable: data.quantityAvailable,
          pricePerUnit: String(data.pricePerUnit),
          expiryDate: data.expiryDate ? data.expiryDate.slice(0, 10) : null,
        });
      })
      .catch((e) => {
        setError(e.message ?? 'Failed to load listing');
        setListing(null);
      })
      .finally(() => setLoadingListing(false));
  }, [status, isAdmin, id, router]);

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
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          description: values.description ?? null,
          category: values.category,
          quantityAvailable: values.quantityAvailable,
          pricePerUnit: values.pricePerUnit,
          expiryDate: values.expiryDate || null,
        }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? (data.details ? 'Validation failed' : 'Failed to update'));
        setSubmitting(false);
        return;
      }
      router.push('/listings');
      router.refresh();
    } catch {
      setError('Something went wrong');
      setSubmitting(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated' || !isAdmin) return null;
  if (loadingListing) {
    return (
      <div className="page-container" style={{ maxWidth: 560 }}>
        <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
      </div>
    );
  }
  if (!listing) {
    return (
      <div className="page-container" style={{ maxWidth: 560 }}>
        <Alert type="error" message={error ?? 'Listing not found'} />
        <Link href="/listings"><Button style={{ marginTop: 16 }}>Back to My listings</Button></Link>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 560 }}>
      <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>Edit listing</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>Update your listing details.</Typography.Paragraph>
      {error && <Alert type="error" message={error} style={{ marginBottom: 20, borderRadius: 12 }} />}
      <Card style={{ borderRadius: 16, overflow: 'hidden' }} styles={{ body: { padding: 28 } }}>
        <Form
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            title: listing.title,
            description: listing.description ?? undefined,
            category: listing.category,
            quantityAvailable: listing.quantityAvailable,
            pricePerUnit: Number(listing.pricePerUnit),
            expiryDate: listing.expiryDate ?? undefined,
          }}
          size="large"
        >
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
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting} size="large" style={{ borderRadius: 10, fontWeight: 600 }}>
                Save changes
              </Button>
              <Link href="/listings">
                <Button size="large" style={{ borderRadius: 10 }}>Cancel</Button>
              </Link>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
