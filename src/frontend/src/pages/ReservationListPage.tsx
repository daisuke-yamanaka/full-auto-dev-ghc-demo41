import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getMyReservations } from '../api/me';
import { cancelReservation } from '../api/reservations';
import { useSnackbar } from '../contexts/SnackbarContext';
import { formatDate } from '../utils/dateUtils';
import type { ReservationItem, MyReservationsResponse } from '../types';
import type { AxiosError } from 'axios';
import type { ErrorResponse } from '../types';

export default function ReservationListPage() {
  const [data, setData] = useState<MyReservationsResponse | null>(null);
  const [page, setPage] = useState(1);
  const size = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<ReservationItem | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const { showSnackbar } = useSnackbar();

  const fetchData = async (currentPage: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await getMyReservations(currentPage, size);
      setData(res);
    } catch (err) {
      console.error('[ReservationList] fetch error', err);
      setError('データの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(page); }, [page]);

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelReservation(cancelTarget.id, { version: cancelTarget.version });
      console.info(`[reservation] cancel success: reservationId=${cancelTarget.id}`);
      showSnackbar(`「${cancelTarget.bookTitle}」の予約をキャンセルしました`, 'success');
      setCancelTarget(null);
      await fetchData(page);
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[ReservationList] cancel error', axiosErr);
      if (axiosErr.response?.status === 409) {
        showSnackbar('データが更新されました。再読込してください', 'error');
        await fetchData(page);
      } else {
        showSnackbar('予約キャンセルに失敗しました', 'error');
      }
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 24, color: '#202124', fontWeight: 600 }}>予約一覧</h2>

        {loading && <LoadingSpinner />}
        {error && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: '#d93025', marginBottom: 16 }}>{error}</p>
            <button onClick={() => fetchData(page)} style={{
              padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer',
            }}>再読み込み</button>
          </div>
        )}

        {!loading && !error && data?.reservations.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#5f6368' }}>
            <p style={{ marginBottom: 16 }}>現在予約中の図書はありません</p>
            <Link to="/books" style={{
              padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff',
              textDecoration: 'none', borderRadius: 4,
            }}>図書を探す</Link>
          </div>
        )}

        {!loading && !error && data && data.reservations.length > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.reservations.map((res) => (
                <div key={res.id} style={{
                  backgroundColor: '#fff', borderRadius: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)', padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                }}>
                  <span style={{
                    width: 36, height: 36, borderRadius: '50%', backgroundColor: '#e8f0fe',
                    color: '#1a73e8', fontWeight: 700, fontSize: 16, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {res.queuePosition}
                  </span>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Link to={`/books/${res.bookId}`} style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: 500, fontSize: 15 }}>
                      {res.bookTitle}
                    </Link>
                    <div style={{ color: '#5f6368', fontSize: 13, marginTop: 4 }}>{res.author}</div>
                    <div style={{ fontSize: 12, color: '#5f6368', marginTop: 4 }}>
                      予約日: {formatDate(res.reservedAt)}
                    </div>
                  </div>
                  <button onClick={() => setCancelTarget(res)} style={{
                    padding: '6px 14px', backgroundColor: '#fff', color: '#d93025',
                    border: '1px solid #d93025', borderRadius: 4, cursor: 'pointer', fontSize: 13,
                  }}>キャンセル</button>
                </div>
              ))}
            </div>
            <Pagination page={page} total={data.total} size={size} onPageChange={setPage} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        title="予約のキャンセル確認"
        message={`「${cancelTarget?.bookTitle}」の予約をキャンセルしますか？`}
        confirmLabel={cancelling ? 'キャンセル中...' : 'キャンセルする'}
        cancelLabel="閉じる"
        onConfirm={handleCancelConfirm}
        onCancel={() => !cancelling && setCancelTarget(null)}
        dangerous
      />
    </Layout>
  );
}

