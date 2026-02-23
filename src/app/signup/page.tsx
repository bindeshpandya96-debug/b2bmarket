'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Alert, Segmented } from 'antd';
import Link from 'next/link';

type SignupMode = 'new' | 'join';

export default function SignupPage() {
  const router = useRouter();
  const [mode, setMode] = useState<SignupMode>('new');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [pendingApproval, setPendingApproval] = useState(false);

  const onFinish = async (values: { email: string; password: string; organizationName?: string; inviteCode?: string }) => {
    setError(null);
    setLoading(true);
    try {
      const body = mode === 'join'
        ? { email: values.email, password: values.password, inviteCode: values.inviteCode?.trim().toUpperCase() }
        : { email: values.email, password: values.password, organizationName: values.organizationName?.trim() };
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? 'Sign up failed.');
        setLoading(false);
        return;
      }
      setSuccess(true);
      if (data.inviteCode) setCreatedInviteCode(data.inviteCode);
      setPendingApproval(!!data.pendingApproval);
      setLoading(false);
      if (!data.pendingApproval) setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Something went wrong.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-wrapper">
        <Card className="auth-card" styles={{ body: { padding: 40, textAlign: 'center' } }}>
          <Alert
            type={pendingApproval ? 'warning' : 'success'}
            message={pendingApproval ? 'Hospital registered — pending approval' : 'Account created successfully.'}
            description={
              pendingApproval ? (
                <>
                  Your hospital is pending approval. A platform admin must approve it before you can sign in and post listings.
                  {createdInviteCode && (
                    <>
                      <br /><br />
                      Save this invite code to share with your team after approval:{' '}
                      <Typography.Text copyable strong style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{createdInviteCode}</Typography.Text>
                    </>
                  )}
                  <br /><br />
                  <Link href="/login">Back to sign in</Link>
                </>
              ) : createdInviteCode ? (
                <>
                  You are registered as <strong>ADMIN</strong>. Share this invite code with your team so they can join as <strong>PROCUREMENT</strong>:{' '}
                  <Typography.Text copyable strong style={{ fontFamily: 'monospace', fontSize: '1.1rem' }}>{createdInviteCode}</Typography.Text>
                  <br /><br />
                  Redirecting to sign in...
                </>
              ) : (
                'You joined as PROCUREMENT. Redirecting to sign in...'
              )
            }
            showIcon
            style={{ borderRadius: 10, textAlign: 'left' }}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <Card className="auth-card" title={null} styles={{ body: { padding: 32 } }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 700 }}>Create account</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: '0.95rem' }}>
            {mode === 'new' ? 'Register your hospital (you’ll be ADMIN)' : 'Join existing hospital with invite code (you’ll be PROCUREMENT)'}
          </Typography.Text>
        </div>
        <div style={{ marginBottom: 24 }}>
          <Segmented
            block
            options={[
              { label: 'Create new hospital (ADMIN)', value: 'new' },
              { label: 'Join with invite code (PROCUREMENT)', value: 'join' },
            ]}
            value={mode}
            onChange={(v) => { setMode(v as SignupMode); setError(null); }}
            style={{ width: '100%' }}
          />
        </div>
        {error && <Alert type="error" message={error} style={{ marginBottom: 20, borderRadius: 10 }} />}
        <Form name="signup" layout="vertical" onFinish={onFinish} requiredMark={false} size="large" initialValues={{ organizationName: '', inviteCode: '' }}>
          {mode === 'new' && (
            <Form.Item name="organizationName" label="Hospital / Organization name" rules={[{ required: true, message: 'Enter your hospital name' }]}>
              <Input placeholder="City General Hospital" style={{ borderRadius: 10 }} />
            </Form.Item>
          )}
          {mode === 'join' && (
            <Form.Item name="inviteCode" label="Invite code" rules={[{ required: true, message: 'Enter the code from your hospital admin' }]}>
              <Input placeholder="e.g. A1B2C3D4" style={{ borderRadius: 10 }} maxLength={12} />
            </Form.Item>
          )}
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder={mode === 'new' ? 'admin@hospital.com' : 'you@hospital.com'} style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 8, message: 'At least 8 characters' }]}>
            <Input.Password placeholder="••••••••" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading} block size="large" style={{ height: 48, borderRadius: 10, fontWeight: 600 }}>
              {mode === 'new' ? 'Create account (ADMIN)' : 'Join hospital (PROCUREMENT)'}
            </Button>
          </Form.Item>
        </Form>
        <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
          Already have an account? <Link href="/login" style={{ color: '#0d9488', fontWeight: 500 }}>Sign in</Link>
        </Typography.Text>
      </Card>
    </div>
  );
}
