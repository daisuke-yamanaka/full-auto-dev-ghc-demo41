import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import { getAdminLoans } from '../../api/admin';
import { formatDate } from '../../utils/dateUtils';
import type { AdminLoansResponse } from '../../types';

const STATUS_LABEL: Record<string, string> = { ACTIVE: '貸出中', OVERDUE: '延滞中', RETURNED: '返却済' };
const STATUS_COLOR: Record<string, string> = { ACTIVE: '#1a73e8', OVERDUE: '#d93025', RETURNED: '#1e8e3e' };
const STATUS_BG: Record<string, string> = { ACTIVE: '#e8f0fe', OVERDUE: '#fce8e6', RETURNED: '#e6f4ea' };

export default function LoanManagementPage() {
  const [data, setData] = useState<AdminLoansResponse | null>(null);
  const [page, setPage] = useState(1);
  const size = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await getAdminLoans(p, size);
      setData(res);
    } catch (err) {
      console.error('[AdminLoans] fetch error', err);
      setError('貸出データの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(page); }, [page]);

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 24, color: '#202124', fontWeight: 600 }}>貸出管理</h2>

        {loading && <LoadingSpinner />}
        {error && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <p style={{ color: '#d93025', marginBottom: 16 }}>{error}</p>
            <button onClick={() => fetchData(page)} style={{ padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>再読み込み</button>
          </div>
        )}

        {!loading && !error && data?.loans.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#5f6368' }}>貸出データがありません</div>
        )}

        {!loading && !error && data && data.loans.length > 0 && (
          <>
            <div style={{ backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.12)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    {['図書', 'ユーザ', '貸出日', '返却期限', '返却日', 'ステータス'].map((h) => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #e0e0e0', color: '#5f6368', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.loans.map((loan) => (
                    <tr key={loan.loanId} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <Link to={`/books/${loan.bookId}`} style={{ color: '#1a73e8', textDecoration: 'none' }}>{loan.bookTitle}</Link>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#5f6368' }}>{loan.userName} ({loan.userLoginId})</td>
                      <td style={{ padding: '12px 14px', color: '#5f6368' }}>{formatDate(loan.loanedAt)}</td>
                      <td style={{ padding: '12px 14px', color: loan.isOverdue ? '#d93025' : '#202124', fontWeight: loan.isOverdue ? 700 : 400 }}>{formatDate(loan.dueDate)}</td>
                      <td style={{ padding: '12px 14px', color: '#5f6368' }}>{loan.returnedAt ? formatDate(loan.returnedAt) : '-'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, backgroundColor: STATUS_BG[loan.status], color: STATUS_COLOR[loan.status] }}>
                          {STATUS_LABEL[loan.status]}
                        </span>
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
    </Layout>
  );
}

