'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, Button, Typography, List, Space, Modal, Form, Input, Tag, Popconfirm, Spin, message, Checkbox } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

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

export default function AddressesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [list, setList] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = () => {
    fetch('/api/addresses', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setList(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/addresses');
      return;
    }
    if (status === 'authenticated') load();
  }, [status, router]);

  const openAdd = () => {
    setEditingId(null);
    form.resetFields();
    // First address is default by default
    if (list.length === 0) form.setFieldsValue({ isDefault: true });
    setModalOpen(true);
  };

  const openEdit = (a: Address) => {
    setEditingId(a.id);
    form.setFieldsValue({
      label: a.label ?? '',
      addressLine1: a.addressLine1,
      addressLine2: a.addressLine2 ?? '',
      city: a.city,
      state: a.state ?? '',
      postalCode: a.postalCode,
      country: a.country,
      isDefault: a.isDefault,
    });
    setModalOpen(true);
  };

  const onFinish = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/addresses/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: values.label || undefined,
            addressLine1: values.addressLine1,
            addressLine2: values.addressLine2 || undefined,
            city: values.city,
            state: values.state || undefined,
            postalCode: values.postalCode,
            country: values.country || 'US',
            isDefault: values.isDefault ?? false,
          }),
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          message.error(data.error ?? 'Failed to update');
          return;
        }
        message.success('Address updated');
        setList((prev) => prev.map((a) => (a.id === editingId ? data : a)));
      } else {
        const res = await fetch('/api/addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: values.label || undefined,
            addressLine1: values.addressLine1,
            addressLine2: values.addressLine2 || undefined,
            city: values.city,
            state: values.state || undefined,
            postalCode: values.postalCode,
            country: values.country || 'US',
            isDefault: values.isDefault ?? false,
          }),
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          message.error(data.error ?? 'Failed to add');
          return;
        }
        message.success('Address added');
        setList((prev) => [...prev, data]);
      }
      setModalOpen(false);
      form.resetFields();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      message.error('Failed to delete');
      return;
    }
    message.success('Address deleted');
    setList((prev) => prev.filter((a) => a.id !== id));
  };

  if (status === 'loading' || status === 'unauthenticated') return null;

  const formatAddr = (a: Address) => [a.addressLine1, a.addressLine2, [a.city, a.state, a.postalCode].filter(Boolean).join(', '), a.country].filter(Boolean).join(', ');

  return (
    <div className="page-container" style={{ maxWidth: 720 }}>
      <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>My addresses</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Manage your delivery addresses for checkout.
      </Typography.Paragraph>

      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} style={{ borderRadius: 10 }}>
            Add new address
          </Button>
        }
      >
        {loading ? (
          <Spin style={{ display: 'block', margin: '24px auto' }} />
        ) : list.length === 0 ? (
          <Typography.Paragraph type="secondary">No addresses yet. Add one to use at checkout.</Typography.Paragraph>
        ) : (
          <List
            itemLayout="horizontal"
            dataSource={list}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button key="edit" type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(item)}>Edit</Button>,
                  <Popconfirm
                    key="del"
                    title="Delete this address?"
                    onConfirm={() => onDelete(item.id)}
                  >
                    <Button type="link" danger size="small" icon={<DeleteOutlined />}>Delete</Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      {item.label && <span>{item.label}</span>}
                      {item.isDefault && <Tag color="blue">Default</Tag>}
                    </Space>
                  }
                  description={formatAddr(item)}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Modal
        title={editingId ? 'Edit address' : 'Add new address'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
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
          <Form.Item name="isDefault" valuePropName="checked" initialValue={false}>
            <Checkbox>Set as default</Checkbox>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={saving} style={{ borderRadius: 10 }}>Save</Button>
              <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
