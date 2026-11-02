import React, { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';

type LoginPayload = {
  success: boolean;
  token?: string;
  message?: string;
};

type WrappedResponse = {
  data?: unknown;
  error?: { message?: string } | null;
  message?: string;
};

const normalizeResponse = (raw: unknown): LoginPayload | null => {
  if (!raw || typeof raw !== 'object' || raw === null) {
    return null;
  }

  const payload = raw as Partial<LoginPayload> & WrappedResponse;

  if (typeof payload.success === 'boolean') {
    return {
      success: payload.success,
      token: typeof payload.token === 'string' ? payload.token : undefined,
      message: typeof payload.message === 'string' ? payload.message : undefined,
    };
  }

  if (payload.data) {
    return normalizeResponse(payload.data);
  }

  return null;
};

const extractErrorMessage = (raw: unknown): string | undefined => {
  if (!raw || typeof raw !== 'object' || raw === null) {
    return undefined;
  }

  const payload = raw as WrappedResponse & { message?: string };

  if (payload.error && typeof payload.error === 'object' && typeof payload.error.message === 'string') {
    return payload.error.message;
  }

  if (typeof payload.message === 'string') {
    return payload.message;
  }

  return undefined;
};

export const LoginPage: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('demo123');
  const [loading, setLoading] = useState(false);
  const [isCompact, setIsCompact] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleResize = () => setIsCompact(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const layoutMetrics = useMemo(
    () => ({
      headerPaddingLeft: isCompact ? '20px' : '60px',
      headerPaddingRight: isCompact ? '20px' : '24px',
      contentWidth: isCompact ? '100%' : 640,
      contentMaxWidth: isCompact ? '100%' : '95vw',
      contentVerticalPadding: isCompact ? '2.5rem' : '0',
      fieldHeight: isCompact ? '3.5rem' : '4rem',
      buttonColor: 'rgb(20, 82, 241)',
      logoHeight: isCompact ? '48px' : '72px',
      logoMaxWidth: isCompact ? '160px' : '240px',
    }),
    [isCompact],
  );

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3002/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const raw = await res.json().catch(() => null);
      const parsed = normalizeResponse(raw);

      if (res.ok && parsed?.success && parsed.token) {
        localStorage.setItem('authToken', parsed.token);
        toast.success('登录成功');
        onSuccess();
        return;
      }

      const resolvedMessage =
        parsed?.message ||
        extractErrorMessage(raw) ||
        (!res.ok ? `登录失败（${res.status}）` : '账号或密码错误');

      toast.error('登录失败', {
        description: resolvedMessage,
        duration: 3800,
      });
    } catch (error) {
      const fallback = '登录失败，请检查网络或后端服务';
      toast.error('登录失败', {
        description: fallback,
        duration: 3800,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-white flex flex-col overflow-hidden">
      <div
        className="py-4"
        style={{
          paddingLeft: layoutMetrics.headerPaddingLeft,
          paddingRight: layoutMetrics.headerPaddingRight,
        }}
      >
        <div className="flex items-center gap-2">
          <img
            src="/logo.svg"
            alt="氢云智能餐饮"
            style={{
              height: layoutMetrics.logoHeight,
              width: 'auto',
              maxWidth: layoutMetrics.logoMaxWidth,
              display: 'block',
              objectFit: 'contain',
            }}
          />
        </div>
      </div>

      <div
        className="flex-1 flex items-center justify-center"
        style={{
          alignItems: isCompact ? 'flex-start' : 'center',
          paddingTop: isCompact ? '3rem' : 0,
        }}
      >
        <div
          className="w-full mx-auto px-6"
          style={{
            width: layoutMetrics.contentWidth,
            maxWidth: layoutMetrics.contentMaxWidth,
            paddingTop: layoutMetrics.contentVerticalPadding,
            paddingBottom: layoutMetrics.contentVerticalPadding,
          }}
        >
          <div
            className="text-center"
            style={{ textAlign: isCompact ? 'left' : 'center' }}
          >
            <h1 className="text-3xl md:text-[44px] font-semibold text-gray-900 tracking-tight">登录</h1>
            <p className="mt-4 text-base md:text-lg text-gray-600 max-w-[640px] mx-auto leading-7 md:px-0">
              获取更智能的建议与分析，解锁完整演示功能
            </p>
          </div>

          <div
            className="mt-8 space-y-6"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleLogin();
              }
            }}
          >
            <div className="relative my-6">
              <div className="h-px bg-gray-200" />
              <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-3 text-xs text-gray-500">或</span>
            </div>

            <div className="text-left">
              <label className="sr-only">用户名</label>
              <Input
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                }}
                placeholder="电子邮箱或用户名"
                className="w-full rounded-full bg-white border border-gray-300 px-6 text-[16px] focus-visible:ring-2 focus-visible:ring-black"
                style={{ height: layoutMetrics.fieldHeight }}
              />
            </div>

            <div className="text-left">
              <label className="sr-only">密码</label>
              <Input
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                }}
                placeholder="密码"
                className="w-full rounded-full bg-white border border-gray-300 px-6 text-[16px] focus-visible:ring-2 focus-visible:ring-black"
                style={{ height: layoutMetrics.fieldHeight }}
              />
            </div>
            <Button
              className="w-full rounded-full text-base font-semibold shadow-sm border-0"
              onClick={handleLogin}
              disabled={loading}
              style={{
                backgroundColor: layoutMetrics.buttonColor,
                color: '#ffffff',
                height: layoutMetrics.fieldHeight,
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? '登录中...' : '继续'}
            </Button>

            <div className="text-xs text-gray-500 text-center mt-4">如需正式账号，请联系获取</div>
          </div>
        </div>
      </div>
    </div>
  );
};
