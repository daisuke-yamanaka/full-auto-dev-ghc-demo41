import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getAdminBooks, deleteBook } from '../../api/admin';
import { useSnackbar } from '../../contexts/SnackbarContext';
import type { BookSummary, BookSearchParams, BooksResponse } from '../../types';
import type { AxiosError } from 'axios';
import type { ErrorResponse } from '../../types';

export default function BookManagementPage() {
  const [data, setData] = useState<BooksResponse | null>(null);
  const [page, setPage] = useState(1);
  const size = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchForm, setSearchForm] = useState({ title: '', author: '', category: '', isbn: '' });
  const [activeSearch, setActiveSearch] = useState<BookSearchParams>({});
  const [deleteTarget, setDeleteTarget] = useState<BookSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { showSnackbar } = useSnackbar();

  const fetchData = async (params: BookSearchParams, p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminBooks({ ...params, page: p, size });
      setData(res);
    } catch (err) {
      console.error('[BookMgmt] fetch error', err);
      setError('図書一覧の読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(activeSearch, page); }, [activeSearch, page]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const params: BookSearchParams = {};
    if (searchForm.title) params.title = searchForm.title;
    if (searchForm.author) params.author = searchForm.author;
    if (searchForm.category) params.category = searchForm.category;
    if (searchForm.isbn) params.isbn = searchForm.isbn;
    setPage(1);
    setActiveSearch(params);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBook(deleteTarget.id, { version: deleteTarget.version });
      console.info(`[admin] book deleted: bookId=${deleteTarget.id}`);
      showSnackbar(`「${deleteTarget.title}」を削除しました`, 'success');
      setDeleteTarget(null);
      await fetchData(activeSearch, page);
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[BookMgmt] delete error', axiosErr);
      if (axiosErr.response?.status === 409) {
        showSnackbar('データが更新されました。再読込してください', 'error');
        await fetchData(activeSearch, page);
      } else {
        showSnackbar('削除に失敗しました', 'error');
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
          <h2 style={{ margin: 0, color: '#202124', fontWeight: 600, flex: 1 }}>図書管理</h2>
          <Link to="/admin/books/new" style={{
            padding: '8px 16px', backgroundColor: '#1a73e8', color: '#fff',
            textDecoration: 'none', borderRadius: 4, fontSize: 14, fontWeight: 600,
          }}>+ 図書追加</Link>
        </div>

        {/* Search */}
        <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.12)', padding: 16, marginBottom: 20 }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { key: 'title', label: 'タイトル' },
              { key: 'author', label: '著者名' },
              { key: 'category', label: 'カテゴリ' },
              { key: 'isbn', label: 'ISBN' },
            ].map(({ key, label }) => (
              <input key={key} type="text" placeholder={label}
                value={searchForm[key as keyof typeof searchForm]}
                onChange={(e) => setSearchForm((f) => ({ ...f, [key]: e.target.value }))}
                style={{ flex: '1 1 140px', padding: '8px 12px', border: '1px solid #dadce0', borderRadius: 4, fontSize: 14 }}
              />
            ))}
            <button type="submit" style={{ padding: '8px 16px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>検索</button>
            <button type="button" onClick={() => { setSearchForm({ title: '', author: '', category: '', isbn: '' }); setActiveSearch({}); setPage(1); }} style={{ padding: '8px 12px', backgroundColor: '#fff', color: '#5f6368', border: '1px solid #dadce0', borderRadius: 4, cursor: 'pointer' }}>クリア</button>
          </form>
        </div>

        {loading && <LoadingSpinner />}
        {error && <p style={{ color: '#d93025' }}>{error}</p>}

        {!loading && !error && data?.books.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#5f6368' }}>
            <p>図書が登録されていません</p>
          </div>
        )}

        {!loading && !error && data && data.books.length > 0 && (
          <>
            <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    {['タイトル', '著者', 'ISBN', 'カテゴリ', '蔵書', '在庫', '操作'].map((h) => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', color: '#5f6368', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.books.map((book) => (
                    <tr key={book.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <Link to={`/books/${book.id}`} style={{ color: '#1a73e8', textDecoration: 'none' }}>{book.title}</Link>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#5f6368' }}>{book.author}</td>
                      <td style={{ padding: '12px 14px', color: '#5f6368', fontSize: 12 }}>{book.isbn}</td>
                      <td style={{ padding: '12px 14px', color: '#5f6368' }}>{book.category}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>{book.totalCopies}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: book.availableCopies === 0 ? '#d93025' : '#1e8e3e', fontWeight: 600 }}>
                        {book.availableCopies}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Link to={`/admin/books/${book.id}/edit`} style={{ background: 'none', border: '1px solid #dadce0', borderRadius: 4, padding: '4px 8px', fontSize: 13, textDecoration: 'none', color: '#202124' }}>✏️</Link>
                          <button onClick={() => setDeleteTarget(book)} style={{ background: 'none', border: '1px solid #fce8e6', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', fontSize: 13 }}>🗑️</button>
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

      <ConfirmDialog
        open={!!deleteTarget}
        title="図書の削除"
        message={`「${deleteTarget?.title}」を削除しますか？`}
        confirmLabel={deleting ? '削除中...' : '削除する'}
        cancelLabel="キャンセル"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
        dangerous
      />
    </Layout>
  );
}


