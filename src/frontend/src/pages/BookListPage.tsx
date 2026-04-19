import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import { searchBooks } from '../api/books';
import type { BookSummary, BookSearchParams } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function BookListPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [books, setBooks] = useState<BookSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const size = 20;

  const [searchForm, setSearchForm] = useState({ title: '', author: '', category: '', isbn: '' });

  const CATEGORIES = ['プログラミング', 'データベース', 'Web開発', 'AI/ML', 'ソフトウェア設計', 'インフラ'];
  const [activeSearch, setActiveSearch] = useState<BookSearchParams>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBooks = async (params: BookSearchParams, currentPage: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await searchBooks({ ...params, page: currentPage, size });
      setBooks(res.books);
      setTotal(res.total);
    } catch (err) {
      console.error('[BookList] fetch error', err);
      setError('図書の読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooks(activeSearch, page); }, [activeSearch, page]);

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

  const handleClearSearch = () => {
    setSearchForm({ title: '', author: '', category: '', isbn: '' });
    setPage(1);
    setActiveSearch({});
  };

  return (
    <Layout>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 16 }}>
          <h2 style={{ margin: 0, color: '#202124', fontWeight: 600, flex: 1 }}>図書を探す</h2>
          {isAdmin && (
            <Link to="/admin/books/new" style={{
              padding: '8px 16px', backgroundColor: '#1a73e8', color: '#fff',
              textDecoration: 'none', borderRadius: 4, fontSize: 14,
            }}>+ 図書追加</Link>
          )}
        </div>

        {/* Search form */}
        <div style={{
          backgroundColor: '#fff', borderRadius: 8,
          boxShadow: '0 1px 3px rgba(0,0,0,0.12)', padding: 20, marginBottom: 24,
        }}>
          <form onSubmit={handleSearch}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[
                { key: 'title', label: 'タイトル' },
                { key: 'author', label: '著者名' },
                { key: 'isbn', label: 'ISBN' },
              ].map(({ key, label }) => (
                <input key={key} type="text" placeholder={label}
                  value={searchForm[key as keyof typeof searchForm]}
                  onChange={(e) => setSearchForm((f) => ({ ...f, [key]: e.target.value }))}
                  style={{
                    flex: '1 1 160px', padding: '8px 12px', border: '1px solid #dadce0',
                    borderRadius: 4, fontSize: 14, outline: 'none',
                  }}
                />
              ))}
              <select
                value={searchForm.category}
                onChange={(e) => setSearchForm((f) => ({ ...f, category: e.target.value }))}
                style={{
                  flex: '1 1 160px', padding: '8px 12px', border: '1px solid #dadce0',
                  borderRadius: 4, fontSize: 14, outline: 'none', backgroundColor: '#fff',
                }}
              >
                <option value="">カテゴリを選択</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button type="submit" style={{
                padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff',
                border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600,
              }}>検索</button>
              <button type="button" onClick={handleClearSearch} style={{
                padding: '8px 16px', backgroundColor: '#fff', color: '#5f6368',
                border: '1px solid #dadce0', borderRadius: 4, cursor: 'pointer',
              }}>クリア</button>
            </div>
          </form>
        </div>

        {loading && <LoadingSpinner />}
        {error && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: '#d93025', marginBottom: 16 }}>{error}</p>
            <button onClick={() => fetchBooks(activeSearch, page)} style={{
              padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer',
            }}>再読み込み</button>
          </div>
        )}

        {!loading && !error && books.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#5f6368' }}>
            <p style={{ marginBottom: 16 }}>該当する図書が見つかりませんでした</p>
            <button onClick={handleClearSearch} style={{
              padding: '8px 20px', backgroundColor: '#fff', color: '#1a73e8',
              border: '1px solid #1a73e8', borderRadius: 4, cursor: 'pointer',
            }}>検索条件をクリア</button>
          </div>
        )}

        {!loading && !error && books.length > 0 && (
          <>
            <div style={{ marginBottom: 8, color: '#5f6368', fontSize: 13 }}>
              全 {total} 件
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {books.map((book) => (
                <div key={book.id} style={{
                  backgroundColor: '#fff', borderRadius: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)', padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 16,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/books/${book.id}`} style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: 500, fontSize: 15 }}>
                      {book.title}
                    </Link>
                    <div style={{ color: '#5f6368', fontSize: 13, marginTop: 4 }}>
                      {book.author} ／ {book.category} ／ {book.isbn}
                    </div>
                  </div>
                  <div>
                    {book.availableCopies > 0 ? (
                      <span style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 12,
                        backgroundColor: '#e6f4ea', color: '#1e8e3e', fontWeight: 600,
                      }}>貸出可能 {book.availableCopies}冊</span>
                    ) : (
                      <span style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 12,
                        backgroundColor: '#f5f5f5', color: '#5f6368', fontWeight: 600,
                      }}>全冊貸出中</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} total={total} size={size} onPageChange={setPage} />
          </>
        )}
      </div>
    </Layout>
  );
}


