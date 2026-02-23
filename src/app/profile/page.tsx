'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, Tabs, Form, Input, Button, Typography, Spin, Alert, Tag, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

type ProfileData = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  organizationName: string | null;
};

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Platform Admin',
  ADMIN: 'Hospital Admin',
  PROCUREMENT: 'Procurement',
};

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileForm] = Form.useForm();
  const [form] = Form.useForm();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login?callbackUrl=/profile');
      return;
    }
    if (status !== 'authenticated') return;
    fetch('/api/user/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setProfile(data);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoadingProfile(false));
  }, [status, router]);

  const onProfileFinish = async (values: { firstName?: string; lastName?: string }) => {
    setSavingProfile(true);
    try {
      const res = await fetch('/api/user/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: values.firstName?.trim() || null,
          lastName: values.lastName?.trim() || null,
        }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        message.error(data.error ?? 'Failed to update profile');
        return;
      }
      message.success('Profile updated');
      setProfile(data);
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 4000);
    } finally {
      setSavingProfile(false);
    }
  };

  const onPasswordFinish = async (values: { currentPassword: string; newPassword: string }) => {
    setChangingPassword(true);
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        message.error(data.error ?? 'Failed to change password');
        setChangingPassword(false);
        return;
      }
      message.success('Password updated successfully');
      form.resetFields();
    } catch {
      message.error('Something went wrong');
    } finally {
      setChangingPassword(false);
    }
  };

  if (status === 'loading' || status === 'unauthenticated') {
    return null;
  }

  if (loadingProfile) {
    return (
      <div className="page-container" style={{ maxWidth: 720 }}>
        <Spin size="large" style={{ display: 'block', margin: '48px auto' }} />
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 720 }}>
      <Typography.Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>Account settings</Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Manage your profile and security.
      </Typography.Paragraph>

      <Card bordered={false} style={{ borderRadius: 16 }}>
        <Tabs
          defaultActiveKey="profile"
          size="large"
          items={[
            {
              key: 'profile',
              label: (
                <span>
                  <UserOutlined style={{ marginRight: 8 }} />
                  Profile
                </span>
              ),
              children: (
                <div style={{ padding: '8px 0', maxWidth: 480 }}>
                  {profileSaveSuccess && (
                    <Alert
                      type="success"
                      message="Profile saved successfully."
                      showIcon
                      closable
                      onClose={() => setProfileSaveSuccess(false)}
                      style={{ marginBottom: 20, borderRadius: 12 }}
                    />
                  )}
                  {profile ? (
                    <Form
                      form={profileForm}
                      layout="vertical"
                      onFinish={onProfileFinish}
                      initialValues={{
                        firstName: profile.firstName ?? '',
                        lastName: profile.lastName ?? '',
                      }}
                      key={profile.email + (profile.firstName ?? '') + (profile.lastName ?? '')}
                    >
                      <Form.Item name="firstName" label="First name">
                        <Input placeholder="First name" allowClear />
                      </Form.Item>
                      <Form.Item name="lastName" label="Last name">
                        <Input placeholder="Last name" allowClear />
                      </Form.Item>
                      <Form.Item label="Email">
                        <Input value={profile.email} disabled />
                      </Form.Item>
                      <Form.Item label="Role">
                        <Tag color="blue">{roleLabels[profile.role] ?? profile.role}</Tag>
                      </Form.Item>
                      {profile.organizationName && (
                        <Form.Item label="Organization">
                          <Input value={profile.organizationName} disabled />
                        </Form.Item>
                      )}
                      <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
                        <Button type="primary" htmlType="submit" loading={savingProfile}>
                          Save changes
                        </Button>
                      </Form.Item>
                    </Form>
                  ) : (
                    <Alert type="warning" message="Could not load profile." />
                  )}
                </div>
              ),
            },
            {
              key: 'security',
              label: (
                <span>
                  <LockOutlined style={{ marginRight: 8 }} />
                  Change password
                </span>
              ),
              children: (
                <div style={{ padding: '8px 0', maxWidth: 400 }}>
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={onPasswordFinish}
                    requiredMark={false}
                    size="large"
                  >
                    <Form.Item
                      name="currentPassword"
                      label="Current password"
                      rules={[{ required: true, message: 'Enter your current password' }]}
                    >
                      <Input.Password placeholder="••••••••" />
                    </Form.Item>
                    <Form.Item
                      name="newPassword"
                      label="New password"
                      rules={[
                        { required: true, message: 'Enter a new password' },
                        { min: 8, message: 'At least 8 characters' },
                      ]}
                    >
                      <Input.Password placeholder="••••••••" />
                    </Form.Item>
                    <Form.Item
                      name="confirmPassword"
                      label="Confirm new password"
                      dependencies={['newPassword']}
                      rules={[
                        { required: true, message: 'Confirm your new password' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                            return Promise.reject(new Error('Passwords do not match'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password placeholder="••••••••" />
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                      <Button type="primary" htmlType="submit" loading={changingPassword} size="large">
                        Update password
                      </Button>
                    </Form.Item>
                  </Form>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
