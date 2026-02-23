'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, Table, Button, Typography, Modal, Form, Input, Popconfirm, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

type CategoryRow = {
  id: string;
  name: string;
  createdAt: string;
};

export default function AdminCategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [list, setList] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const isSuperAdmin = (session?.user as { role?: string })?.role === 'SUPER_ADMIN';

  const load = () => {
    fetch('/api/admin/categories', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setList(Array.isArray(data) ? data : []);
      })
      .catch(() => message.error('Failed to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/admin/categories');
      return;
    }
    if (status === 'authenticated' && !isSuperAdmin) {
      router.replace('/');
      return;
    }
    if (status === 'authenticated' && isSuperAdmin) load();
  }, [status, isSuperAdmin, router]);

  const openAdd = () => {
    setEditingId(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row: CategoryRow) => {
    setEditingId(row.id);
    form.setFieldsValue({ name: row.name });
    setModalOpen(true);
  };

  const onFinish = async (values: { name: string }) => {
    const name = values.name?.trim();
    if (!name) return;
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch(`/api/admin/categories/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          message.error(data.error ?? 'Failed to update');
          return;
        }
        message.success('Category updated');
        setList((prev) => prev.map((c) => (c.id === editingId ? data : c)));
      } else {
        const res = await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          message.error(data.error ?? 'Failed to add');
          return;
        }
        message.success('Category added');
        setList((prev) => [...prev, data]);
      }
      setModalOpen(false);
      form.resetFields();
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      message.error(data.error ?? 'Failed to delete');
      return;
    }
    message.success('Category deleted');
    setList((prev) => prev.filter((c) => c.id !== id));
  };

  if (status === 'loading' || status === 'unauthenticated' || !isSuperAdmin) {
    return null;
  }

  const columns: ColumnsType<CategoryRow> = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: (n: string) => <Typography.Text strong>{n}</Typography.Text> },
    {
      title: 'Action',
      key: 'action',
      width: 160,
      render: (_, row) => (
        <>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>Edit</Button>
          <Popconfirm
            title="Delete this category?"
            description="Listings using this category must be updated first."
            onConfirm={() => onDelete(row.id)}
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>Delete</Button>
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <div className="page-container" style={{ maxWidth: 720 }}>
      <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>Categories</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Manage marketplace categories. These appear in the category dropdown when creating or editing listings and in filters.
      </Typography.Paragraph>
      <Card
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={openAdd} style={{ borderRadius: 10 }}>
            Add category
          </Button>
        }
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={list}
          loading={loading}
          pagination={false}
          size="middle"
        />
      </Card>
      <Modal
        title={editingId ? 'Edit category' : 'Add category'}
        open={modalOpen}
        onCancel={() => { setModalOpen(false); form.resetFields(); }}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="name"
            label="Category name"
            rules={[{ required: true, message: 'Enter category name' }, { max: 100 }]}
          >
            <Input placeholder="e.g. Consumables" />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Button type="primary" htmlType="submit" loading={saving} style={{ borderRadius: 10 }}>Save</Button>
            <Button style={{ marginLeft: 8 }} onClick={() => setModalOpen(false)}>Cancel</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
