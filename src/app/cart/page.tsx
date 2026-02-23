'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, List, Typography, Button, Space, InputNumber, Empty, Spin } from 'antd';
import { ShoppingCartOutlined } from '@ant-design/icons';
import { useCart } from '@/contexts/CartContext';

export default function CartPage() {
  const { status } = useSession();
  const router = useRouter();
  const { items, updateQuantity, removeItem, itemCount } = useCart();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/cart');
      return;
    }
  }, [status, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="page-container" style={{ maxWidth: 720 }}>
        <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 720 }}>
      <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>Cart</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Review your items and proceed to checkout.
      </Typography.Paragraph>

      {items.length === 0 ? (
        <Card>
          <Empty
            image={<ShoppingCartOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
            description="Your cart is empty"
          >
            <Link href="/">
              <Button type="primary" size="large" style={{ borderRadius: 10 }}>Continue shopping</Button>
            </Link>
          </Empty>
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 24 }}>
            <List
              itemLayout="horizontal"
              dataSource={items}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <InputNumber
                      key="qty"
                      min={1}
                      value={item.quantity}
                      onChange={(v) => updateQuantity(item.listingId, v ?? 1)}
                      style={{ width: 80 }}
                    />,
                    <Button key="remove" type="link" danger size="small" onClick={() => removeItem(item.listingId)}>
                      Remove
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={item.title ?? item.listingId}
                    description={
                      <Space split="|">
                        {item.hospitalName && <span>Seller: {item.hospitalName}</span>}
                        {item.pricePerUnit != null && (
                          <span>${Number(item.pricePerUnit).toFixed(2)} / unit</span>
                        )}
                        <span>Subtotal: ${((item.pricePerUnit ?? 0) * item.quantity).toFixed(2)}</span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <Link href="/">
              <Button style={{ borderRadius: 10 }}>Continue shopping</Button>
            </Link>
            <Link href="/checkout">
              <Button type="primary" size="large" style={{ borderRadius: 10, fontWeight: 600 }}>
                Proceed to checkout
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
