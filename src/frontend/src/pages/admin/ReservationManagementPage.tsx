import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { getAdminReservations } from '../../api/admin';
import { cancelReservation } from '../../api/reservations';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { formatDate } from '../../utils/dateUtils';
import type { AdminReservationItem, AdminReservationsResponse } from '../../types';
import type { AxiosError } from 'axios';
import type { ErrorResponse } from '../../types';

export default function ReservationManagementPage() {
  const [data, setData] = useState<AdminReservationsResponse | null>(null);
  const [page, setPage] = useState(1);
  const size = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<AdminReservationItem | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const { showSnackbar } = useSnackbar();

  const fetchData = async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminReservations(p, size);
      setData(res);
    } catch (err) {
      console.error('[AdminReservations] fetch error', err);
      setError('予約データの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(page); }, [page]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelReservation(cancelTarget.id, { version: cancelTarget.version });
      console.info(`[admin] reservation cancelled: ${cancelTarget.id}`);
      showSnackbar('予約をキャンセルしました', 'success');
      setCancelTarget(null);
      await fetchData(page);
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[AdminReservations] cancel error', axiosErr);
      if (axiosErr.response?.status === 409) {
        showSnackbar('データが更新されました。再読込してください', 'error');
        await fetchData(page);
      } else {
        showSnackbar('キャンセルに失敗しました', 'error');
      }
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 24, color: '#202124', fontWeight: 600 }}>予約管理</h2>

        {loading && <LoadingSpinner />}
        {error && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: '#d93025', marginBottom: 16 }}>{error}</p>
            <button onClick={() => fetchData(page)} style={{ padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>再読み込み</button>
          </div>
        )}

        {!loading && !error && data?.reservations.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#5f6368' }}>予約データがありません</div>
        )}

        {!loading && !error && data && data.reservations.length > 0 && (
          <>
            <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    {['順位', '図書', 'ユーザ', '予約日', '操作'].map((h) => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', color: '#5f6368', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.reservations.map((res) => (
                    <tr key={res.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#e8f0fe', color: '#1a73e8', fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                          {res.queuePosition}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <Link to={`/books/${res.bookId}`} style={{ color: '#1a73e8', textDecoration: 'none' }}>{res.bookTitle}</Link>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#5f6368' }}>{res.userName} ({res.userLoginId})</td>
                      <td style={{ padding: '12px 14px', color: '#5f6368' }}>{formatDate(res.reservedAt)}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <button onClick={() => setCancelTarget(res)} style={{ background: 'none', border: '1px solid #fce8e6', borderRadius: 4, cursor: 'pointer', padding: '4px 10px', fontSize: 13, color: '#d93025' }}>
                          キャンセル
                        </button>
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
        open={!!cancelTarget}
        title="予約キャンセル"
        message={`「${cancelTarget?.bookTitle}」の予約をキャンセルしますか？`}
        confirmLabel={cancelling ? 'キャンセル中...' : 'キャンセルする'}
        cancelLabel="閉じる"
        onConfirm={handleCancel}
        onCancel={() => !cancelling && setCancelTarget(null)}
        dangerous
      />
    </Layout>
  );
}

