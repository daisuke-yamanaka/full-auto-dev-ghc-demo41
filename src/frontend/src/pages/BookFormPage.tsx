import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getBook } from '../api/books';
import { createBook, updateBook } from '../api/admin';
import { useSnackbar } from '../contexts/SnackbarContext';
import type { ErrorResponse } from '../types';
import type { AxiosError } from 'axios';

interface FormData {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishedYear: string;
  category: string;
  totalCopies: string;
}

const INITIAL_FORM: FormData = {
  title: '', author: '', isbn: '', publisher: '',
  publishedYear: '', category: '', totalCopies: '',
};

export default function BookFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const bookId = Number(id);
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [version, setVersion] = useState<number>(0);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const book = await getBook(bookId);
        setForm({
          title: book.title,
          author: book.author,
          isbn: book.isbn,
          publisher: book.publisher,
          publishedYear: String(book.publishedYear),
          category: book.category,
          totalCopies: String(book.totalCopies),
        });
        setVersion(book.version);
      } catch (err) {
        console.error('[BookForm] fetch error', err);
        showSnackbar('図書データの読み込みに失敗しました', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, bookId]);

  const validate = (): boolean => {
    const errs: Partial<FormData> = {};
    if (!form.title.trim()) errs.title = '必須です';
    if (!form.author.trim()) errs.author = '必須です';
    if (!form.isbn.trim()) errs.isbn = '必須です';
    else if (!/^\d{10}(\d{3})?$/.test(form.isbn)) errs.isbn = '10桁または13桁の数字で入力してください';
    if (!form.publisher.trim()) errs.publisher = '必須です';
    const year = Number(form.publishedYear);
    if (!form.publishedYear || isNaN(year) || year < 1000 || year > 9999) errs.publishedYear = '1000〜9999の数字を入力してください';
    if (!form.category.trim()) errs.category = '必須です';
    const copies = Number(form.totalCopies);
    if (!form.totalCopies || isNaN(copies) || copies < 1) errs.totalCopies = '1以上の整数を入力してください';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError('');
    try {
      const payload = {
        title: form.title.trim(),
        author: form.author.trim(),
        isbn: form.isbn.trim(),
        publisher: form.publisher.trim(),
        publishedYear: Number(form.publishedYear),
        category: form.category.trim(),
        totalCopies: Number(form.totalCopies),
      };
      if (isEdit) {
        await updateBook(bookId, { ...payload, version });
        console.info(`[book] update success: bookId=${bookId}`);
        showSnackbar('図書を更新しました', 'success');
        navigate(`/books/${bookId}`);
      } else {
        const res = await createBook(payload);
        console.info(`[book] create success: bookId=${res.id}`);
        showSnackbar('図書を登録しました', 'success');
        navigate('/admin/books');
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[BookForm] save error', err);
      if (axiosErr.response?.status === 409) {
        setApiError('データが更新されました。再読込してください');
      } else {
        setApiError(axiosErr.response?.data?.message || '保存に失敗しました');
      }
    } finally {
      setSaving(false);
    }
  };

  const fields: Array<{ key: keyof FormData; label: string; type?: string; required?: boolean }> = [
    { key: 'title', label: 'タイトル', required: true },
    { key: 'author', label: '著者名', required: true },
    { key: 'isbn', label: 'ISBN', required: true },
    { key: 'publisher', label: '出版社', required: true },
    { key: 'publishedYear', label: '出版年', type: 'number', required: true },
    { key: 'category', label: 'カテゴリ', required: true },
    { key: 'totalCopies', label: '蔵書数', type: 'number', required: true },
  ];

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Layout>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#1a73e8', fontSize: 14,
          }}>← 戻る</button>
        </div>
        <h2 style={{ marginBottom: 24, color: '#202124', fontWeight: 600 }}>
          {isEdit ? '図書編集' : '図書登録'}
        </h2>

        {loading ? <LoadingSpinner /> : (
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
              {fields.map(({ key, label, type, required }) => (
                <div key={key} style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#202124', fontWeight: 500 }}>
                    {label} {required && <span style={{ color: '#d93025' }}>*</span>}
                  </label>
                  <input
                    type={type || 'text'}
                    value={form[key]}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, [key]: e.target.value }));
                      setErrors((er) => ({ ...er, [key]: undefined }));
                    }}
                    disabled={saving}
                    style={{
                      width: '100%', padding: '10px 14px', boxSizing: 'border-box',
                      border: `1px solid ${errors[key] ? '#d93025' : '#dadce0'}`, borderRadius: 4,
                      fontSize: 14, outline: 'none',
                    }}
                  />
                  {errors[key] && <div style={{ color: '#d93025', fontSize: 12, marginTop: 4 }}>{errors[key]}</div>}
                </div>
              ))}

              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" disabled={saving || hasErrors} style={{
                  padding: '10px 24px', backgroundColor: '#1a73e8', color: '#fff',
                  border: 'none', borderRadius: 4, cursor: saving || hasErrors ? 'not-allowed' : 'pointer',
                  opacity: saving || hasErrors ? 0.6 : 1, fontWeight: 600,
                }}>
                  {saving ? '保存中...' : '保存'}
                </button>
                <button type="button" onClick={() => navigate(-1)} disabled={saving} style={{
                  padding: '10px 20px', backgroundColor: '#fff', color: '#5f6368',
                  border: '1px solid #dadce0', borderRadius: 4, cursor: 'pointer',
                }}>キャンセル</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}


