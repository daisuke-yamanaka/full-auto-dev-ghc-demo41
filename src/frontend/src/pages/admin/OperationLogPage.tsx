import { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import { getOperationLogs } from '../../api/admin';
import { formatDateTime } from '../../utils/dateUtils';
import type { OperationLogsResponse } from '../../types';

export default function OperationLogPage() {
  const [data, setData] = useState<OperationLogsResponse | null>(null);
  const [page, setPage] = useState(1);
  const size = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await getOperationLogs(p, size);
      setData(res);
    } catch (err) {
      console.error('[OperationLog] fetch error', err);
      setError('操作ログの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(page); }, [page]);

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 24, color: '#202124', fontWeight: 600 }}>操作ログ</h2>

        {loading && <LoadingSpinner />}
        {error && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: '#d93025', marginBottom: 16 }}>{error}</p>
            <button onClick={() => fetchData(page)} style={{ padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>再読み込み</button>
          </div>
        )}

        {!loading && !error && data?.logs.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#5f6368' }}>操作ログがありません</div>
        )}

        {!loading && !error && data && data.logs.length > 0 && (
          <>
            <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    {['日時', '操作種別', 'ユーザ', '対象種別', '対象ID', '詳細'].map((h) => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', color: '#5f6368', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '10px 14px', color: '#5f6368', whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 4, backgroundColor: '#f5f5f5', color: '#202124', fontSize: 12 }}>
                          {log.operationType}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#5f6368' }}>{log.userName} ({log.userLoginId})</td>
                      <td style={{ padding: '10px 14px', color: '#5f6368' }}>{log.targetType}</td>
                      <td style={{ padding: '10px 14px', color: '#5f6368', textAlign: 'center' }}>{log.targetId ?? '-'}</td>
                      <td style={{ padding: '10px 14px', color: '#5f6368', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.detail ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} total={data.total} size={size} onPageChange={setPage} />
          </>
        )}
      </div>
    </Layout>
  );
}

