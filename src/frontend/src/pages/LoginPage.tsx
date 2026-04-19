import type { FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginApi } from '../api/auth';
import { useAuth } from '../contexts/AuthContext';
import type { AxiosError } from 'axios';
import type { ErrorResponse } from '../types';

export default function LoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const canSubmit = loginId.trim() !== '' && password.trim() !== '';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const res = await loginApi({ loginId, password });
      login(res.token, {
        userId: res.userId,
        name: res.name,
        role: res.role,
        fontSize: res.fontSize,
      });
      console.info(`[auth] login success: userId=${res.userId}`);
      navigate('/');
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[auth] login failed', axiosErr);
      setError('ユーザIDまたはパスワードが正しくありません');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#f8f9fa',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 400, backgroundColor: '#fff',
        borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
        padding: '40px 32px',
      }}>
        <h1 style={{ textAlign: 'center', marginBottom: 32, fontSize: 24, color: '#202124', fontWeight: 600 }}>
          図書管理システム
        </h1>

        {error && (
          <div style={{
            backgroundColor: '#fce8e6', color: '#d93025', padding: '12px 16px',
            borderRadius: 4, marginBottom: 16, fontSize: 14,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="loginId" style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#5f6368' }}>
              ユーザID / メールアドレス
            </label>
            <input
              id="loginId"
              type="text" value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              style={{
                width: '100%', padding: '12px 16px', boxSizing: 'border-box',
                border: `1px solid ${error ? '#d93025' : '#dadce0'}`, borderRadius: 4, fontSize: 14,
                outline: 'none',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#1a73e8'; }}
              onBlur={(e) => { e.target.style.borderColor = error ? '#d93025' : '#dadce0'; }}
              placeholder="user001 または メールアドレス"
              autoComplete="username"
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label htmlFor="loginPassword" style={{ display: 'block', marginBottom: 4, fontSize: 13, color: '#5f6368' }}>
              パスワード
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="loginPassword"
                type={showPassword ? 'text' : 'password'} value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%', padding: '12px 44px 12px 16px', boxSizing: 'border-box',
                  border: `1px solid ${error ? '#d93025' : '#dadce0'}`, borderRadius: 4, fontSize: 14,
                  outline: 'none',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#1a73e8'; }}
                onBlur={(e) => { e.target.style.borderColor = error ? '#d93025' : '#dadce0'; }}
                placeholder="パスワード"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)} style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#5f6368',
              }}>
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={!canSubmit || loading} style={{
            width: '100%', padding: '12px 24px', backgroundColor: '#1a73e8', color: '#fff',
            border: 'none', borderRadius: 4, fontSize: 16, cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
            opacity: !canSubmit || loading ? 0.5 : 1, fontWeight: 600,
          }}>
            {loading ? '⏳ ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  );
}


