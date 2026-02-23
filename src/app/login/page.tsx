'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Alert, Divider } from 'antd';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { email: string; password: string }) => {
    setError(null);
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: false,
      });
      if (res?.error) {
        setError('Invalid email or password. If you just registered a hospital, wait for platform admin approval before signing in.');
        setLoading(false);
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError('Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <Card className="auth-card" title={null} styles={{ body: { padding: 32 } }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 700 }}>Welcome back</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: '0.95rem' }}>Sign in to your account</Typography.Text>
        </div>
        {error && <Alert type="error" message={error} style={{ marginBottom: 20, borderRadius: 10 }} />}
        <Form name="login" layout="vertical" onFinish={onFinish} requiredMark={false} size="large">
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input placeholder="you@hospital.com" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password placeholder="••••••••" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading} block size="large" style={{ height: 48, borderRadius: 10, fontWeight: 600 }}>
              Sign in
            </Button>
          </Form.Item>
        </Form>
        <Divider plain style={{ margin: '20px 0' }}>or</Divider>
        <Typography.Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
          Don&apos;t have an account? <Link href="/signup" style={{ color: '#0d9488', fontWeight: 500 }}>Sign up</Link>
        </Typography.Text>
      </Card>
    </div>
  );
}
