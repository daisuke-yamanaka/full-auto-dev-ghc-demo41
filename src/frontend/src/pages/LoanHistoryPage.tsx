import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Pagination from '../components/common/Pagination';
import { getMyLoans } from '../api/me';
import { returnLoan } from '../api/loans';
import { useSnackbar } from '../contexts/SnackbarContext';
import { formatDate } from '../utils/dateUtils';
import type { LoanItem, MyLoansResponse } from '../types';
import type { AxiosError } from 'axios';
import type { ErrorResponse } from '../types';

const STATUS_LABEL: Record<string, string> = { ACTIVE: '貸出中', OVERDUE: '延滞中', RETURNED: '返却済' };
const STATUS_COLOR: Record<string, string> = { ACTIVE: '#1a73e8', OVERDUE: '#d93025', RETURNED: '#1e8e3e' };
const STATUS_BG: Record<string, string> = { ACTIVE: '#e8f0fe', OVERDUE: '#fce8e6', RETURNED: '#e6f4ea' };

export default function LoanHistoryPage() {
  const [data, setData] = useState<MyLoansResponse | null>(null);
  const [page, setPage] = useState(1);
  const size = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [returning, setReturning] = useState<number | null>(null);
  const { showSnackbar } = useSnackbar();

  const fetchData = async (currentPage: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await getMyLoans(currentPage, size);
      setData(res);
    } catch (err) {
      console.error('[LoanHistory] fetch error', err);
      setError('データの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(page); }, [page]);

  const handleReturn = async (loan: LoanItem) => {
    setReturning(loan.loanId);
    try {
      await returnLoan(loan.loanId, { version: loan.version });
      console.info(`[loan] return success: loanId=${loan.loanId}`);
      showSnackbar(`「${loan.bookTitle}」を返却しました`, 'success');
      await fetchData(page);
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[LoanHistory] return error', axiosErr);
      if (axiosErr.response?.status === 409) {
        showSnackbar('データが更新されました。再読込してください', 'error');
        await fetchData(page);
      } else {
        showSnackbar('返却に失敗しました', 'error');
      }
    } finally {
      setReturning(null);
    }
  };

  return (
    <Layout>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 24, color: '#202124', fontWeight: 600 }}>貸出履歴</h2>

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

        {!loading && !error && data?.loans.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: '#5f6368' }}>
            <p style={{ marginBottom: 16 }}>貸出履歴がありません</p>
            <Link to="/books" style={{
              padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff',
              textDecoration: 'none', borderRadius: 4,
            }}>図書を探す</Link>
          </div>
        )}

        {!loading && !error && data && data.loans.length > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {data.loans.map((loan) => (
                <div key={loan.loanId} style={{
                  backgroundColor: '#fff', borderRadius: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)', padding: '16px 20px',
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <Link to={`/books/${loan.bookId}`} style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: 500, fontSize: 15 }}>
                      {loan.bookTitle}
                    </Link>
                    <div style={{ color: '#5f6368', fontSize: 13, marginTop: 4 }}>{loan.author}</div>
                    <div style={{ fontSize: 12, color: '#5f6368', marginTop: 4 }}>
                      貸出日: {formatDate(loan.loanedAt)} ／ 返却期限: {formatDate(loan.dueDate)}
                      {loan.returnedAt && ` ／ 返却日: ${formatDate(loan.returnedAt)}`}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    backgroundColor: STATUS_BG[loan.status], color: STATUS_COLOR[loan.status],
                  }}>
                    {STATUS_LABEL[loan.status]}
                  </span>
                  {loan.status !== 'RETURNED' && (
                    <button
                      disabled={returning === loan.loanId}
                      onClick={() => handleReturn(loan)}
                      style={{
                        padding: '6px 14px', backgroundColor: '#00897b', color: '#fff',
                        border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13,
                        opacity: returning === loan.loanId ? 0.6 : 1,
                      }}>
                      {returning === loan.loanId ? '処理中...' : '返却する'}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Pagination page={page} total={data.total} size={size} onPageChange={setPage} />
          </>
        )}
      </div>
    </Layout>
  );
}

