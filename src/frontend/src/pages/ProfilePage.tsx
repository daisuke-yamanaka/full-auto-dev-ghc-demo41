import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getMyProfile, updateMyProfile, updateMySettings } from '../api/me';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../contexts/AuthContext';
import type { ProfileResponse, FontSize } from '../types';
import type { AxiosError } from 'axios';
import type { ErrorResponse } from '../types';

const FONT_SIZE_OPTIONS: Array<{ value: FontSize; label: string }> = [
  { value: 'NORMAL', label: '標準' },
  { value: 'LARGE', label: '大' },
  { value: 'XLARGE', label: '特大' },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [name, setName] = useState('');
  const [fontSize, setFontSize] = useState<FontSize>('NORMAL');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const { showSnackbar } = useSnackbar();
  const { updateUser } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const p = await getMyProfile();
        setProfile(p);
        setName(p.name);
        setFontSize(p.fontSize);
      } catch (err) {
        console.error('[Profile] fetch error', err);
        showSnackbar('プロフィールの読み込みに失敗しました', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    if (!name.trim()) { setNameError('名前は必須です'); return; }
    setSaving(true);
    try {
      const nameChanged = name.trim() !== profile.name;
      const fontSizeChanged = fontSize !== profile.fontSize;

      let currentVersion = profile.version;

      if (nameChanged) {
        const updated = await updateMyProfile({ name: name.trim(), version: currentVersion });
        setProfile(updated);
        updateUser({ name: updated.name });
        currentVersion = updated.version;
      }
      if (fontSizeChanged) {
        const settingsRes = await updateMySettings({ fontSize, version: currentVersion });
        updateUser({ fontSize: settingsRes.fontSize });
        setProfile((prev) => prev ? { ...prev, fontSize: settingsRes.fontSize, version: settingsRes.version } : null);
      }
      showSnackbar('プロフィールを更新しました', 'success');
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[Profile] save error', axiosErr);
      if (axiosErr.response?.status === 409) {
        showSnackbar('他の端末から変更が行われました。再読み込みしてください。', 'error');
      } else {
        showSnackbar('保存に失敗しました', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const canSave = name.trim().length > 0 && !nameError;

  return (
    <Layout>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 24, color: '#202124', fontWeight: 600 }}>プロフィール</h2>
        {loading ? <LoadingSpinner /> : profile && (
          <div style={{
            backgroundColor: '#fff', borderRadius: 8,
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)', padding: 32,
          }}>
            {/* Avatar */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', backgroundColor: '#1a73e8',
                color: '#fff', fontSize: 28, fontWeight: 700, margin: '0 auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {profile.name.charAt(0).toUpperCase()}
              </div>
            </div>

            {/* Name */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500 }}>名前 <span style={{ color: '#d93025' }}>*</span></label>
              <input type="text" value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }}
                disabled={saving}
                style={{
                  width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                  border: `1px solid ${nameError ? '#d93025' : '#dadce0'}`, borderRadius: 4, fontSize: 14,
                }}
              />
              {nameError && <div style={{ color: '#d93025', fontSize: 12, marginTop: 4 }}>{nameError}</div>}
            </div>

            {/* User ID - readonly */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#5f6368' }}>ユーザID</label>
              <input type="text" value={profile.userId} readOnly
                style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box', border: '1px solid #e0e0e0', borderRadius: 4, fontSize: 14, backgroundColor: '#f5f5f5', color: '#5f6368' }}
              />
            </div>

            {/* Email - readonly */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 500, color: '#5f6368' }}>メールアドレス</label>
              <input type="email" value={profile.email} readOnly
                style={{ width: '100%', padding: '10px 14px', boxSizing: 'border-box', border: '1px solid #e0e0e0', borderRadius: 4, fontSize: 14, backgroundColor: '#f5f5f5', color: '#5f6368' }}
              />
            </div>

            {/* Font size */}
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>フォントサイズ</label>
              <div style={{ display: 'flex', gap: 12 }}>
                {FONT_SIZE_OPTIONS.map(({ value, label }) => (
                  <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                    <input type="radio" name="fontSize" value={value} checked={fontSize === value}
                      onChange={() => setFontSize(value)} disabled={saving} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <button onClick={handleSave} disabled={saving || !canSave} style={{
                padding: '10px 24px', backgroundColor: '#1a73e8', color: '#fff',
                border: 'none', borderRadius: 4, cursor: canSave && !saving ? 'pointer' : 'not-allowed',
                opacity: !canSave || saving ? 0.6 : 1, fontWeight: 600,
              }}>
                {saving ? '保存中...' : '保存'}
              </button>
              <Link to="/me/password" style={{ color: '#1a73e8', textDecoration: 'none', fontSize: 14 }}>
                パスワードを変更する
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

