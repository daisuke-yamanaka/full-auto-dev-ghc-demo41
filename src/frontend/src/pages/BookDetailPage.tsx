import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getBook } from '../api/books';
import { createLoan, returnLoan } from '../api/loans';
import { createReservation, cancelReservation } from '../api/reservations';
import { getMyLoans } from '../api/me';
import { deleteBook } from '../api/admin';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../utils/dateUtils';
import { LOAN_PERIOD_DAYS } from '../constants/business';
import type { BookDetailResponse, MyLoansResponse } from '../types';
import type { ErrorResponse } from '../types';
import type { AxiosError } from 'axios';

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const bookId = Number(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const isAdmin = user?.role === 'ADMIN';

  const [book, setBook] = useState<BookDetailResponse | null>(null);
  const [userLoans, setUserLoans] = useState<MyLoansResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const fetchBook = async () => {
    setLoading(true);
    setError('');
    try {
      const [bookRes, loansRes] = await Promise.all([
        getBook(bookId),
        !isAdmin ? getMyLoans(1, 1) : Promise.resolve(null),
      ]);
      setBook(bookRes);
      setUserLoans(loansRes);
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      if (axiosErr.response?.status === 404) {
        setError('404');
      } else {
        console.error('[BookDetail] fetch error', err);
        setError('図書の読み込みに失敗しました。');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const [bookRes, loansRes] = await Promise.all([
          getBook(bookId),
          !isAdmin ? getMyLoans(1, 1) : Promise.resolve(null),
        ]);
        if (!cancelled) {
          setBook(bookRes);
          setUserLoans(loansRes);
        }
      } catch (err) {
        if (!cancelled) {
          const axiosErr = err as AxiosError<ErrorResponse>;
          if (axiosErr.response?.status === 404) {
            setError('404');
          } else {
            console.error('[BookDetail] fetch error', err);
            setError('図書の読み込みに失敗しました。');
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [bookId]);

  const handleLoan = async () => {
    if (!book) return;
    setActionLoading(true);
    try {
      await createLoan({ bookId: book.id });
      console.info(`[loan] create success: bookId=${book.id}`);
      showSnackbar(`「${book.title}」を貸し出しました`, 'success');
      await fetchBook();
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[BookDetail] loan error', err);
      const msg = axiosErr.response?.data?.message || '貸出に失敗しました';
      showSnackbar(msg, 'error');
      await fetchBook();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReservation = async () => {
    if (!book) return;
    setActionLoading(true);
    try {
      await createReservation({ bookId: book.id });
      console.info(`[reservation] create success: bookId=${book.id}`);
      showSnackbar(`「${book.title}」を予約しました`, 'success');
      await fetchBook();
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[BookDetail] reservation error', err);
      const msg = axiosErr.response?.data?.message || '予約に失敗しました';
      showSnackbar(msg, 'error');
      await fetchBook();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!book || book.currentUserLoanId == null || book.currentUserLoanVersion == null) return;
    setActionLoading(true);
    try {
      await returnLoan(book.currentUserLoanId, { version: book.currentUserLoanVersion });
      console.info(`[loan] return success: loanId=${book.currentUserLoanId}`);
      showSnackbar(`「${book.title}」を返却しました`, 'success');
      await fetchBook();
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[BookDetail] return error', err);
      if (axiosErr.response?.status === 409) {
        showSnackbar('データが更新されました。再読込してください', 'error');
        await fetchBook();
      } else {
        showSnackbar('返却に失敗しました', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelReservation = async () => {
    if (!book || book.currentUserReservationId == null || book.currentUserReservationVersion == null) return;
    setActionLoading(true);
    try {
      await cancelReservation(book.currentUserReservationId, { version: book.currentUserReservationVersion });
      console.info(`[reservation] cancel success: reservationId=${book.currentUserReservationId}`);
      showSnackbar(`「${book.title}」の予約をキャンセルしました`, 'success');
      await fetchBook();
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[BookDetail] cancel reservation error', err);
      if (axiosErr.response?.status === 409) {
        showSnackbar('データが更新されました。再読込してください', 'error');
        await fetchBook();
      } else {
        showSnackbar('予約キャンセルに失敗しました', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!book) return;
    setShowDeleteConfirm(false);
    setActionLoading(true);
    try {
      await deleteBook(book.id, { version: book.version });
      console.info(`[book] delete success: bookId=${book.id}`);
      showSnackbar(`「${book.title}」を削除しました`, 'success');
      navigate('/admin/books');
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[BookDetail] delete error', err);
      if (axiosErr.response?.status === 409) {
        showSnackbar('データが更新されました。再読込してください', 'error');
        await fetchBook();
      } else {
        showSnackbar('削除に失敗しました', 'error');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const btnStyle = (bg: string, color = '#fff', outline = false): CSSProperties => ({
    padding: '10px 20px', backgroundColor: outline ? '#fff' : bg,
    color: outline ? bg : color, border: outline ? `1px solid ${bg}` : 'none',
    borderRadius: 4, cursor: actionLoading ? 'not-allowed' : 'pointer',
    opacity: actionLoading ? 0.6 : 1, fontSize: 14, fontWeight: 600,
  });

  return (
    <Layout>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => navigate(-1)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: '#1a73e8', fontSize: 14,
          }}>← 戻る</button>
        </div>

        {loading && <LoadingSpinner />}

        {error === '404' && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: '#d93025', marginBottom: 16 }}>図書が見つかりませんでした</p>
            <Link to="/books" style={{ color: '#1a73e8' }}>一覧に戻る</Link>
          </div>
        )}

        {error && error !== '404' && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: '#d93025', marginBottom: 16 }}>{error}</p>
            <button onClick={fetchBook} style={{
              padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer',
            }}>再読み込み</button>
          </div>
        )}

        {!loading && !error && book && (
          <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.12)', padding: 32 }}>
            <h2 style={{ marginBottom: 8, color: '#202124', fontSize: 22 }}>{book.title}</h2>
            <p style={{ color: '#5f6368', marginBottom: 16 }}>{book.author}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 20, fontSize: 14 }}>
              <div><span style={{ color: '#5f6368' }}>ISBN:</span> {book.isbn}</div>
              <div><span style={{ color: '#5f6368' }}>出版社:</span> {book.publisher}</div>
              <div><span style={{ color: '#5f6368' }}>出版年:</span> {book.publishedYear}</div>
              <div><span style={{ color: '#5f6368' }}>カテゴリ:</span> {book.category}</div>
              <div><span style={{ color: '#5f6368' }}>蔵書数:</span> {book.totalCopies}冊</div>
              {book.reservationCount > 0 && (
                <div><span style={{ color: '#5f6368' }}>予約件数:</span> {book.reservationCount}件</div>
              )}
            </div>

            {/* Availability */}
            <div style={{ marginBottom: 20 }}>
              {book.availableCopies > 0 ? (
                <span style={{ padding: '6px 14px', borderRadius: 20, backgroundColor: '#e6f4ea', color: '#1e8e3e', fontWeight: 600, fontSize: 14 }}>
                  貸出可能 {book.availableCopies}冊
                </span>
              ) : (
                <span style={{ padding: '6px 14px', borderRadius: 20, backgroundColor: '#f5f5f5', color: '#5f6368', fontWeight: 600, fontSize: 14 }}>
                  全冊貸出中
                  {book.earliestDueDate && ` (返却予定: ${formatDate(book.earliestDueDate)})`}
                </span>
              )}
            </div>

            {/* Queue position */}
            {book.currentUserStatus === 'reserved' && book.currentUserQueuePosition != null && (
              <div style={{
                backgroundColor: '#e8f0fe', color: '#1a73e8', padding: '10px 16px',
                borderRadius: 4, marginBottom: 20, fontSize: 14, fontWeight: 600,
              }}>
                あなたは {book.currentUserQueuePosition} 番目に予約しています
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: isAdmin ? 20 : 0 }}>
              {book.currentUserStatus === 'none' && book.availableCopies > 0 && (() => {
                const overdue = userLoans?.isOverdue ?? false;
                const atLimit = userLoans != null && userLoans.remainingLoanCount === 0;
                const disabled = actionLoading || overdue || atLimit;
                const title = overdue
                  ? '延滞中の図書があります。返却してください。'
                  : atLimit
                    ? `貸出上限（${userLoans?.currentLoanCount}冊）に達しています`
                    : `貸出期間: ${LOAN_PERIOD_DAYS}日`;
                return (
                  <button onClick={handleLoan} disabled={disabled}
                    title={title}
                    style={{ ...btnStyle('#1a73e8'), opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
                    貸し出す
                  </button>
                );
              })()}
              {book.currentUserStatus === 'none' && book.availableCopies === 0 && (
                <button onClick={handleReservation} disabled={actionLoading} style={btnStyle('#00897b')}>
                  予約する
                </button>
              )}
              {book.currentUserStatus === 'loaned' && (
                <button onClick={handleReturn} disabled={actionLoading} style={btnStyle('#00897b')}>
                  返却する
                </button>
              )}
              {book.currentUserStatus === 'reserved' && (
                <button onClick={handleCancelReservation} disabled={actionLoading} style={btnStyle('#1a73e8', '#1a73e8', true)}>
                  予約キャンセル
                </button>
              )}
            </div>

            {/* Admin buttons */}
            {isAdmin && (
              <div style={{ display: 'flex', gap: 12, borderTop: '1px solid #e0e0e0', paddingTop: 20 }}>
                <Link to={`/admin/books/${book.id}/edit`} style={{
                  padding: '8px 16px', backgroundColor: '#f5f5f5', color: '#202124',
                  textDecoration: 'none', borderRadius: 4, fontSize: 14,
                }}>編集</Link>
                <button onClick={() => setShowDeleteConfirm(true)} style={btnStyle('#d93025')}>
                  削除
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="図書の削除"
        message={`「${book?.title}」を削除しますか？この操作は元に戻せません。`}
        confirmLabel="削除する"
        cancelLabel="キャンセル"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        dangerous
      />
    </Layout>
  );
}


