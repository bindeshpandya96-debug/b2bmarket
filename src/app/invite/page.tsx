'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, Typography, Spin, Alert, Button, Form, Input, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';

export default function InvitePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [org, setOrg] = useState<{ name: string; inviteCode?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteForm] = Form.useForm();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/invite');
      return;
    }
    if (status === 'authenticated' && !isAdmin) {
      router.replace('/');
      return;
    }
    if (status !== 'authenticated' || !isAdmin) return;

    fetch('/api/organization', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setOrg(data);
      })
      .catch((e) => setError(e.message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [status, isAdmin, router]);

  const generateCode = () => {
    setGenerating(true);
    setError(null);
    fetch('/api/organization', { method: 'PATCH', credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setOrg((prev) => (prev ? { ...prev, inviteCode: data.inviteCode } : { name: '', inviteCode: data.inviteCode }));
      })
      .catch((e) => setError(e.message ?? 'Failed to generate'))
      .finally(() => setGenerating(false));
  };

  const onSendInvite = async (values: { email: string }) => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/invite/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email.trim() }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        message.error(data.error ?? 'Failed to send invitation');
        return;
      }
      message.success(`Invitation sent to ${values.email}`);
      inviteForm.resetFields();
    } finally {
      setSending(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated' || !isAdmin) {
    return null;
  }

  return (
    <div className="page-container" style={{ maxWidth: 560 }}>
      <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>Invite your team</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Share your invite code so colleagues can join your hospital as <strong>PROCUREMENT</strong> and place orders.
      </Typography.Paragraph>
      {error && <Alert type="error" message={error} style={{ marginBottom: 20, borderRadius: 12 }} />}
      {loading ? (
        <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
      ) : org ? (
        <>
          <Card title={<span><MailOutlined style={{ marginRight: 8 }} />Invite by email</span>} style={{ marginBottom: 24, borderRadius: 16 }} styles={{ body: { padding: 28 } }}>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
              Enter the email address where you want to send an invitation. The recipient will receive a professional email with your name, organization, and a link to join as <strong>Procurement</strong>.
            </Typography.Paragraph>
            <Form form={inviteForm} layout="vertical" onFinish={onSendInvite} requiredMark={false}>
              <Form.Item
                name="email"
                label="Email address"
                rules={[
                  { required: true, message: 'Enter the recipient email address' },
                  { type: 'email', message: 'Enter a valid email address' },
                ]}
              >
                <Input type="email" placeholder="colleague@hospital.org" size="large" style={{ maxWidth: 360 }} />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button type="primary" htmlType="submit" loading={sending} size="large" style={{ borderRadius: 10 }}>
                  Send invitation
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 28 } }}>
            <Typography.Text type="secondary">Organization</Typography.Text>
            <Typography.Title level={5} style={{ marginTop: 4, marginBottom: 24 }}>{org.name}</Typography.Title>
            {org.inviteCode ? (
              <>
                <Typography.Text type="secondary">Invite code (share with your team)</Typography.Text>
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <Typography.Text copyable strong style={{ fontFamily: 'monospace', fontSize: '1.25rem', letterSpacing: 2 }}>
                    {org.inviteCode}
                  </Typography.Text>
                </div>
                <Typography.Paragraph type="secondary" style={{ fontSize: '0.875rem', marginBottom: 0 }}>
                  New users can sign up with &quot;Join with invite code&quot; and enter this code to join as PROCUREMENT.
                </Typography.Paragraph>
              </>
            ) : (
              <>
                <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
                  No invite code set for this organization yet. Send an invite by email above to generate one, or generate it here.
                </Typography.Paragraph>
                <Button type="primary" onClick={generateCode} loading={generating} style={{ borderRadius: 10 }}>
                  Generate invite code
                </Button>
              </>
            )}
          </Card>
        </>
      ) : null}
    </div>
  );
}
