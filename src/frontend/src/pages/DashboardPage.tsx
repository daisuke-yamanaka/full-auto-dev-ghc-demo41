import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getMyLoans } from '../api/me';
import { returnLoan } from '../api/loans';
import { useSnackbar } from '../contexts/SnackbarContext';
import { formatDate, isDueSoon } from '../utils/dateUtils';
import type { MyLoansResponse, LoanItem } from '../types';
import type { AxiosError } from 'axios';
import type { ErrorResponse } from '../types';
import { MAX_LOANS_PER_USER } from '../constants/business';

export default function DashboardPage() {
  const [data, setData] = useState<MyLoansResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [returning, setReturning] = useState<number | null>(null);
  const { showSnackbar } = useSnackbar();

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMyLoans(1, 20);
      setData(res);
    } catch (err) {
      console.error('[Dashboard] fetch error', err);
      setError('データの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleReturn = async (loan: LoanItem) => {
    setReturning(loan.loanId);
    try {
      await returnLoan(loan.loanId, { version: loan.version });
      console.info(`[loan] return success: loanId=${loan.loanId}`);
      showSnackbar(`「${loan.bookTitle}」を返却しました`, 'success');
      await fetchData();
    } catch (err) {
      const axiosErr = err as AxiosError<ErrorResponse>;
      console.error('[Dashboard] return error', axiosErr);
      if (axiosErr.response?.status === 409) {
        showSnackbar('データが更新されました。再読込してください', 'error');
        await fetchData();
      } else {
        showSnackbar('返却に失敗しました', 'error');
      }
    } finally {
      setReturning(null);
    }
  };

  const activeLoans = data?.loans.filter((l) => l.status !== 'RETURNED') ?? [];
  const overdueLoans = activeLoans.filter((l) => l.isOverdue);
  const progress = data ? (data.currentLoanCount / MAX_LOANS_PER_USER) * 100 : 0;

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 24, color: '#202124', fontWeight: 600 }}>ダッシュボード</h2>

        {loading && <LoadingSpinner />}
        {error && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <p style={{ color: '#d93025', marginBottom: 16 }}>{error}</p>
            <button onClick={fetchData} style={{
              padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer',
            }}>再読み込み</button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {overdueLoans.length > 0 && (
              <div style={{
                backgroundColor: '#fce8e6', color: '#d93025', padding: '12px 16px',
                borderRadius: 8, marginBottom: 24, fontWeight: 600,
              }}>
                ⚠️ 延滞中の図書があります。返却してください。
              </div>
            )}

            {/* Summary Card */}
            <div style={{
              backgroundColor: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              padding: 24, marginBottom: 24,
            }}>
              <h3 style={{ marginBottom: 16, color: '#202124' }}>貸出状況</h3>
              <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                <div>
                  <span style={{ fontSize: 32, fontWeight: 700, color: '#1a73e8' }}>{data.currentLoanCount}</span>
                  <span style={{ color: '#5f6368' }}> / {MAX_LOANS_PER_USER} 冊</span>
                </div>
                <div style={{ color: '#5f6368', alignSelf: 'flex-end' }}>
                  残り {data.remainingLoanCount} 冊貸出可能
                </div>
              </div>
              <div style={{ height: 8, backgroundColor: '#e0e0e0', borderRadius: 4 }}>
                <div style={{
                  height: '100%', borderRadius: 4, transition: 'width 0.3s',
                  backgroundColor: progress >= 100 ? '#d93025' : '#1a73e8',
                  width: `${Math.min(progress, 100)}%`,
                }} />
              </div>
            </div>

            {activeLoans.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 48, color: '#5f6368' }}>
                <p style={{ marginBottom: 16 }}>現在貸出中の図書はありません</p>
                <Link to="/books" style={{
                  padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff',
                  textDecoration: 'none', borderRadius: 4,
                }}>図書を探す</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeLoans.map((loan) => {
                  const overdue = loan.isOverdue;
                  const dueSoon = !overdue && isDueSoon(loan.dueDate);
                  let dueDateColor: string;
                  if (overdue) {
                    dueDateColor = '#d93025';
                  } else if (dueSoon) {
                    dueDateColor = '#f29900';
                  } else {
                    dueDateColor = '#202124';
                  }
                  return (
                    <div key={loan.loanId} style={{
                      backgroundColor: '#fff', borderRadius: 8,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.12)', padding: '16px 20px',
                      display: 'flex', alignItems: 'center', gap: 16,
                    }}>
                      <div style={{ flex: 1 }}>
                        <Link to={`/books/${loan.bookId}`} style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: 500, fontSize: 15 }}>
                          {loan.bookTitle}
                        </Link>
                        <div style={{ color: '#5f6368', fontSize: 13, marginTop: 4 }}>{loan.author}</div>
                        <div style={{ fontSize: 13, marginTop: 4 }}>
                          貸出日: {formatDate(loan.loanedAt)} ／
                          <span style={{ color: dueDateColor, fontWeight: overdue ? 700 : 400, marginLeft: 8 }}>
                            返却期限: {formatDate(loan.dueDate)}
                            {overdue && ' ⚠️ 延滞中'}
                            {dueSoon && ' ⏰ もうすぐ期限'}
                          </span>
                        </div>
                      </div>
                      <button
                        disabled={returning === loan.loanId}
                        onClick={() => handleReturn(loan)}
                        style={{
                          padding: '8px 16px', backgroundColor: '#00897b', color: '#fff',
                          border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13,
                          opacity: returning === loan.loanId ? 0.6 : 1,
                        }}>
                        {returning === loan.loanId ? '処理中...' : '返却する'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

