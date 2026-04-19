import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getUsers, createUser, updateUser, deleteUser, resetUserPassword } from '../../api/admin';
import { useSnackbar } from '../../contexts/SnackbarContext';
import type { UserSummary, CreateUserRequest, UpdateUserRequest, UsersResponse } from '../../types';
import type { AxiosError } from 'axios';
import type { ErrorResponse } from '../../types';

const FIELD_PLACEHOLDERS: Record<string, string> = {
  userId: 'ユーザID', email: 'メールアドレス', name: '名前', password: 'パスワード（8文字以上）',
};

type DialogMode = 'none' | 'create' | 'edit' | 'delete' | 'resetPw';

export default function UserManagementPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [page, setPage] = useState(1);
  const size = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialog, setDialog] = useState<DialogMode>('none');
  const [target, setTarget] = useState<UserSummary | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const { showSnackbar } = useSnackbar();

  const [form, setForm] = useState<CreateUserRequest>({ userId: '', email: '', name: '', password: '', role: 'USER' });
  const [editForm, setEditForm] = useState<UpdateUserRequest>({ userId: '', email: '', name: '', role: 'USER', version: 0 });
  const [newPassword, setNewPassword] = useState('');

  const fetchData = async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await getUsers(p, size);
      setData(res);
    } catch (err) {
      console.error('[UserMgmt] fetch error', err);
      setError('ユーザ一覧の読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(page); }, [page]);

  const openCreate = () => {
    setForm({ userId: '', email: '', name: '', password: '', role: 'USER' });
    setDialogError('');
    setDialog('create');
  };

  const openEdit = (u: UserSummary) => {
    setTarget(u);
    setEditForm({ userId: u.userId, email: u.email, name: u.name, role: u.role, version: u.version });
    setDialogError('');
    setDialog('edit');
  };

  const openDelete = (u: UserSummary) => { setTarget(u); setDialog('delete'); };
  const openResetPw = (u: UserSummary) => { setTarget(u); setNewPassword(''); setDialogError(''); setDialog('resetPw'); };

  const handleCreate = async () => {
    if (!form.userId || !form.email || !form.name || !form.password) {
      setDialogError('全フィールドを入力してください'); return;
    }
    setSaving(true);
    setDialogError('');
    try {
      await createUser(form);
      console.info(`[admin] user created: ${form.userId}`);
      showSnackbar('ユーザを登録しました', 'success');
      setDialog('none');
      await fetchData(page);
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[UserMgmt] create error', axiosErr);
      setDialogError(axiosErr.response?.data?.message || '登録に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!target) return;
    setSaving(true);
    setDialogError('');
    try {
      await updateUser(target.id, editForm);
      console.info(`[admin] user updated: ${target.id}`);
      showSnackbar('ユーザを更新しました', 'success');
      setDialog('none');
      await fetchData(page);
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[UserMgmt] edit error', axiosErr);
      if (axiosErr.response?.status === 409) {
        setDialogError('データが更新されました。再読込してください');
        await fetchData(page);
      } else {
        setDialogError(axiosErr.response?.data?.message || '更新に失敗しました');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!target) return;
    setSaving(true);
    try {
      await deleteUser(target.id, { version: target.version });
      console.info(`[admin] user deleted: ${target.id}`);
      showSnackbar('ユーザを削除しました', 'success');
      setDialog('none');
      await fetchData(page);
    } catch (err) {
      console.error('[UserMgmt] delete error', err);
      showSnackbar('削除に失敗しました', 'error');
      setDialog('none');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPw = async () => {
    if (!target || !newPassword) { setDialogError('新しいパスワードを入力してください'); return; }
    if (newPassword.length < 8) { setDialogError('8文字以上で入力してください'); return; }
    setSaving(true);
    setDialogError('');
    try {
      await resetUserPassword(target.id, { newPassword });
      console.info(`[admin] password reset: userId=${target.id}`);
      showSnackbar('パスワードを再設定しました', 'success');
      setDialog('none');
    } catch (err) {
      console.error('[UserMgmt] resetPw error', err);
      setDialogError('パスワード再設定に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: CSSProperties = { width: '100%', padding: '8px 12px', boxSizing: 'border-box', border: '1px solid #dadce0', borderRadius: 4, fontSize: 14, marginBottom: 12 };

  return (
    <Layout>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
          <h2 style={{ margin: 0, color: '#202124', fontWeight: 600, flex: 1 }}>ユーザ管理</h2>
          <button onClick={openCreate} style={{
            padding: '8px 16px', backgroundColor: '#1a73e8', color: '#fff',
            border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
          }}>+ ユーザ追加</button>
        </div>

        {loading && <LoadingSpinner />}
        {error && <p style={{ color: '#d93025' }}>{error}</p>}

        {!loading && !error && data?.users.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#5f6368' }}>
            <p>ユーザが登録されていません</p>
          </div>
        )}

        {!loading && !error && data && data.users.length > 0 && (
          <>
            <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    {['ユーザID', '名前', 'メールアドレス', 'ロール', '操作'].map((h) => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', color: '#5f6368', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 16px' }}>{u.userId}</td>
                      <td style={{ padding: '12px 16px' }}>{u.name}</td>
                      <td style={{ padding: '12px 16px' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                          backgroundColor: u.role === 'ADMIN' ? '#e8f0fe' : '#f5f5f5',
                          color: u.role === 'ADMIN' ? '#1a73e8' : '#5f6368',
                        }}>{u.role}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => openEdit(u)} title="編集" style={{ background: 'none', border: '1px solid #dadce0', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', fontSize: 13 }}>✏️</button>
                          <button onClick={() => openDelete(u)} title="削除" style={{ background: 'none', border: '1px solid #fce8e6', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', fontSize: 13 }}>🗑️</button>
                          <button onClick={() => openResetPw(u)} title="PW再設定" style={{ background: 'none', border: '1px solid #dadce0', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', fontSize: 13 }}>🔑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={data.total} size={size} onPageChange={setPage} />
          </>
        )}
      </div>

      {/* Create Dialog */}
      {dialog === 'create' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 32, width: 480, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginBottom: 20 }}>ユーザ登録</h3>
            {dialogError && <div style={{ color: '#d93025', fontSize: 13, marginBottom: 12 }}>{dialogError}</div>}
            {(['userId', 'email', 'name', 'password'] as const).map((k) => (
              <input key={k} type={k === 'password' ? 'password' : 'text'} placeholder={FIELD_PLACEHOLDERS[k]}
                value={form[k] as string} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} style={inputStyle} />
            ))}
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="createRole" style={{ fontSize: 14 }}>ロール: </label>
              <select id="createRole" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'USER' | 'ADMIN' }))} style={{ padding: '8px 12px', border: '1px solid #dadce0', borderRadius: 4 }}>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setDialog('none')} style={{ padding: '8px 20px', border: '1px solid #dadce0', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleCreate} disabled={saving} style={{ padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? '登録中...' : '登録'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {dialog === 'edit' && target && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 32, width: 480, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginBottom: 20 }}>ユーザ編集</h3>
            {dialogError && <div style={{ color: '#d93025', fontSize: 13, marginBottom: 12 }}>{dialogError}</div>}
            <input type="text" value={editForm.userId} onChange={(e) => setEditForm((f) => ({ ...f, userId: e.target.value }))} placeholder="ユーザID" style={inputStyle} />
            <input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} placeholder="メールアドレス" style={inputStyle} />
            <input type="text" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="名前" style={inputStyle} />
            <div style={{ marginBottom: 12 }}>
              <label htmlFor="editRole" style={{ fontSize: 14 }}>ロール: </label>
              <select id="editRole" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as 'USER' | 'ADMIN' }))} style={{ padding: '8px 12px', border: '1px solid #dadce0', borderRadius: 4 }}>
                <option value="USER">USER</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setDialog('none')} style={{ padding: '8px 20px', border: '1px solid #dadce0', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleEdit} disabled={saving} style={{ padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? '更新中...' : '更新'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={dialog === 'delete'}
        title="ユーザ削除"
        message={`「${target?.name}」を削除しますか？`}
        confirmLabel={saving ? '削除中...' : '削除する'}
        cancelLabel="キャンセル"
        onConfirm={handleDelete}
        onCancel={() => !saving && setDialog('none')}
        dangerous
      />

      {/* Reset password dialog */}
      {dialog === 'resetPw' && target && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 32, width: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginBottom: 16 }}>パスワード再設定</h3>
            <p style={{ color: '#5f6368', fontSize: 14, marginBottom: 16 }}>「{target.name}」の新しいパスワードを設定します</p>
            {dialogError && <div style={{ color: '#d93025', fontSize: 13, marginBottom: 12 }}>{dialogError}</div>}
            <input type="password" placeholder="新しいパスワード（8文字以上）" value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setDialogError(''); }} style={inputStyle} />
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setDialog('none')} style={{ padding: '8px 20px', border: '1px solid #dadce0', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>キャンセル</button>
              <button onClick={handleResetPw} disabled={saving} style={{ padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? '設定中...' : '設定する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}


