'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Typography, Button, Space, Select, Form, Input, Modal, Alert, Spin, message } from 'antd';
import { useCart } from '@/contexts/CartContext';

type Address = {
  id: string;
  label: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  isDefault: boolean;
};

function addressToSnapshot(a: Address) {
  return {
    label: a.label ?? undefined,
    line1: a.addressLine1,
    line2: a.addressLine2 ?? undefined,
    city: a.city,
    state: a.state ?? undefined,
    postalCode: a.postalCode,
    country: a.country,
  };
}

function formatAddress(a: Address) {
  const parts = [a.addressLine1, a.addressLine2, [a.city, a.state, a.postalCode].filter(Boolean).join(', '), a.country];
  return parts.filter(Boolean).join(' — ');
}

export default function CheckoutPage() {
  const { status } = useSession();
  const router = useRouter();
  const { items, clearCart } = useCart();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddr, setLoadingAddr] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/checkout');
      return;
    }
    if (status !== 'authenticated') return;
    fetch('/api/addresses', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setAddresses(Array.isArray(data) ? data : []);
        const defaultOne = (Array.isArray(data) ? data : []).find((a: Address) => a.isDefault);
        if (defaultOne) setSelectedAddressId(defaultOne.id);
        else if (Array.isArray(data) && data.length > 0) setSelectedAddressId(data[0].id);
      })
      .finally(() => setLoadingAddr(false));
  }, [status, router]);

  const onAddAddress = async (values: Record<string, unknown>) => {
    const res = await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: values.label,
        addressLine1: values.addressLine1,
        addressLine2: values.addressLine2 || undefined,
        city: values.city,
        state: values.state || undefined,
        postalCode: values.postalCode,
        country: values.country || 'US',
        isDefault: addresses.length === 0,
      }),
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      message.error(data.error ?? 'Failed to add address');
      return;
    }
    message.success('Address added');
    setAddresses((prev) => [...prev, data]);
    setSelectedAddressId(data.id);
    setAddModalOpen(false);
    form.resetFields();
  };

  const onPlaceOrder = async () => {
    const addr = addresses.find((a) => a.id === selectedAddressId);
    if (!addr) {
      message.error('Please select a delivery address');
      return;
    }
    if (items.length === 0) {
      message.error('Cart is empty');
      return;
    }
    setPlacing(true);
    setError(null);
    const snapshot = addressToSnapshot(addr);
    let failed = false;
    for (const item of items) {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: item.listingId,
          quantity: item.quantity,
          deliveryAddress: snapshot,
        }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Failed to place order');
        failed = true;
        break;
      }
    }
    setPlacing(false);
    if (!failed) {
      clearCart();
      message.success('Orders placed successfully');
      router.push('/orders');
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const totalItems = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="page-container" style={{ maxWidth: 720 }}>
      <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>Checkout</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Select delivery address and place your order.
      </Typography.Paragraph>

      {items.length === 0 ? (
        <Card>
          <Typography.Paragraph type="secondary">Your cart is empty.</Typography.Paragraph>
          <Link href="/"><Button type="primary" style={{ borderRadius: 10 }}>Go to marketplace</Button></Link>
        </Card>
      ) : (
        <>
          {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} closable onClose={() => setError(null)} />}

          <Card title="Delivery address" style={{ marginBottom: 24 }}>
            {loadingAddr ? (
              <Spin />
            ) : (
              <>
                <Select
                  placeholder="Select delivery address"
                  value={selectedAddressId}
                  onChange={setSelectedAddressId}
                  style={{ width: '100%', marginBottom: 12 }}
                  options={addresses.map((a) => ({
                    value: a.id,
                    label: (a.label ? `${a.label} — ` : '') + formatAddress(a) + (a.isDefault ? ' (Default)' : ''),
                  }))}
                />
                <Button type="dashed" block onClick={() => setAddModalOpen(true)} style={{ borderRadius: 10 }}>
                  + Add new address
                </Button>
                {addresses.length === 0 && (
                  <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
                    Add an address to continue.
                  </Typography.Text>
                )}
              </>
            )}
          </Card>

          <Card title={`Order summary (${totalItems} item${totalItems !== 1 ? 's' : ''})`} style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {items.map((item) => (
                <div key={item.listingId} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.title ?? item.listingId} × {item.quantity}</span>
                  <span>${((item.pricePerUnit ?? 0) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </Space>
          </Card>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <Link href="/cart">
              <Button style={{ borderRadius: 10 }}>Back to cart</Button>
            </Link>
            <Button
              type="primary"
              size="large"
              loading={placing}
              disabled={!selectedAddressId || addresses.length === 0}
              onClick={onPlaceOrder}
              style={{ borderRadius: 10, fontWeight: 600 }}
            >
              Place order
            </Button>
          </div>
        </>
      )}

      <Modal
        title="Add new address"
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); form.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onAddAddress}>
          <Form.Item name="label" label="Label (optional)">
            <Input placeholder="e.g. Main Office" />
          </Form.Item>
          <Form.Item name="addressLine1" label="Address line 1" rules={[{ required: true }]}>
            <Input placeholder="Street address" />
          </Form.Item>
          <Form.Item name="addressLine2" label="Address line 2 (optional)">
            <Input placeholder="Apt, suite, etc." />
          </Form.Item>
          <Form.Item name="city" label="City" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="state" label="State / Province (optional)">
            <Input />
          </Form.Item>
          <Form.Item name="postalCode" label="Postal code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="country" label="Country" initialValue="US" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" style={{ borderRadius: 10 }}>Save address</Button>
              <Button onClick={() => setAddModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
