import type { CSSProperties, FormEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { changeMyPassword } from '../api/me';
import { useSnackbar } from '../contexts/SnackbarContext';
import type { AxiosError } from 'axios';
import type { ErrorResponse } from '../types';

function getStrength(pw: string): { level: 'weak' | 'medium' | 'strong'; label: string; color: string; percent: number } {
  if (pw.length < 8) return { level: 'weak', label: '弱い', color: '#d93025', percent: 33 };
  const hasLetter = /[a-zA-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  if (hasLetter && hasDigit) return { level: 'strong', label: '強い', color: '#1e8e3e', percent: 100 };
  return { level: 'medium', label: '普通', color: '#f29900', percent: 66 };
}

export default function PasswordChangePage() {
  const [current, setCurrent] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const strength = newPw ? getStrength(newPw) : null;
  const confirmError = confirm && newPw !== confirm ? 'パスワードが一致しません' : '';
  const newPwError = newPw && newPw.length < 8 ? '8文字以上で入力してください' : '';

  const canSubmit = current && newPw && confirm && !confirmError && !newPwError;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setApiError('');
    try {
      await changeMyPassword({ currentPassword: current, newPassword: newPw, confirmPassword: confirm });
      console.info('[auth] password changed');
      showSnackbar('パスワードを変更しました', 'success');
      navigate('/me/profile');
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[Password] change error', axiosErr);
      if (axiosErr.response?.status === 400) {
        setApiError(axiosErr.response.data?.message || '現在のパスワードが正しくありません');
      } else {
        setApiError('パスワード変更に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError: boolean): CSSProperties => ({
    width: '100%', padding: '10px 44px 10px 14px', boxSizing: 'border-box',
    border: `1px solid ${hasError ? '#d93025' : '#dadce0'}`, borderRadius: 4, fontSize: 14,
  });

  const eyeBtn = (show: boolean, onToggle: () => void) => (
    <button type="button" onClick={onToggle} style={{
      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
      background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#5f6368',
    }}>{show ? '🙈' : '👁'}</button>
  );

  return (
    <Layout>
      <div style={{ maxWidth: 500, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => navigate('/me/profile')} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#1a73e8', fontSize: 14,
          }}>← プロフィールに戻る</button>
        </div>
        <h2 style={{ marginBottom: 24, color: '#202124', fontWeight: 600 }}>パスワード変更</h2>

        <div style={{
          backgroundColor: '#fff', borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)', padding: 32,
        }}>
          {apiError && (
            <div style={{ backgroundColor: '#fce8e6', color: '#d93025', padding: '12px 16px', borderRadius: 4, marginBottom: 20, fontSize: 14 }}>
              {apiError}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>現在のパスワード <span style={{ color: '#d93025' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input type={showCurrent ? 'text' : 'password'} value={current}
                  onChange={(e) => setCurrent(e.target.value)} style={inputStyle(false)} disabled={loading} />
                {eyeBtn(showCurrent, () => setShowCurrent((s) => !s))}
              </div>
            </div>

            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>新しいパスワード <span style={{ color: '#d93025' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input type={showNew ? 'text' : 'password'} value={newPw}
                  onChange={(e) => setNewPw(e.target.value)} style={inputStyle(!!newPwError)} disabled={loading} />
                {eyeBtn(showNew, () => setShowNew((s) => !s))}
              </div>
              {newPwError && <div style={{ color: '#d93025', fontSize: 12, marginTop: 4 }}>{newPwError}</div>}
            </div>

            {/* Strength indicator */}
            {strength && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, marginBottom: 4 }}>
                  <div style={{ height: '100%', borderRadius: 3, backgroundColor: strength.color, width: `${strength.percent}%`, transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: 12, color: strength.color }}>強度: {strength.label}</span>
              </div>
            )}

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>新しいパスワード（確認） <span style={{ color: '#d93025' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input type={showConfirm ? 'text' : 'password'} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} style={inputStyle(!!confirmError)} disabled={loading} />
                {eyeBtn(showConfirm, () => setShowConfirm((s) => !s))}
              </div>
              {confirmError && <div style={{ color: '#d93025', fontSize: 12, marginTop: 4 }}>{confirmError}</div>}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="submit" disabled={!canSubmit || loading} style={{
                padding: '10px 24px', backgroundColor: '#1a73e8', color: '#fff',
                border: 'none', borderRadius: 4, cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
                opacity: !canSubmit || loading ? 0.6 : 1, fontWeight: 600,
              }}>
                {loading ? '変更中...' : '変更する'}
              </button>
              <button type="button" onClick={() => navigate('/me/profile')} disabled={loading} style={{
                padding: '10px 16px', backgroundColor: '#fff', color: '#5f6368',
                border: '1px solid #dadce0', borderRadius: 4, cursor: 'pointer',
              }}>キャンセル</button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}


