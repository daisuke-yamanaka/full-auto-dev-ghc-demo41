import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { getMyActivities } from '../api/me';
import { formatRelative } from '../utils/dateUtils';
import type { ActivityItem } from '../types';

const TYPE_CONFIG = {
  LOAN: { icon: '📚', label: '貸出', color: '#00897b' },
  RETURN: { icon: '↩', label: '返却', color: '#5f6368' },
  RESERVATION: { icon: '🔖', label: '予約', color: '#1a73e8' },
};

export default function ActivityFeedPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getMyActivities();
      setActivities(res.activities);
    } catch (err) {
      console.error('[ActivityFeed] fetch error', err);
      setError('アクティビティの読み込みに失敗しました。再読み込みしてください。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <Layout>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h2 style={{ marginBottom: 24, color: '#202124', fontWeight: 600 }}>アクティビティフィード</h2>

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

        {!loading && !error && activities.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80, color: '#5f6368' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
            <p style={{ marginBottom: 16 }}>まだアクティビティがありません</p>
            <Link to="/books" style={{
              padding: '8px 20px', backgroundColor: '#1a73e8', color: '#fff',
              textDecoration: 'none', borderRadius: 4, fontSize: 14,
            }}>図書を探す</Link>
          </div>
        )}

        {!loading && !error && activities.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activities.map((activity) => {
              const cfg = TYPE_CONFIG[activity.type];
              return (
                <div key={activity.id} style={{
                  backgroundColor: '#fff', borderRadius: 8,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)', padding: 16,
                  display: 'flex', alignItems: 'flex-start', gap: 16,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    backgroundColor: `${cfg.color}20`, color: cfg.color, flexShrink: 0,
                  }}>
                    {cfg.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: cfg.color, fontWeight: 600, marginBottom: 4 }}>
                      {cfg.label}
                    </div>
                    <div style={{ fontSize: 14, color: '#202124', marginBottom: 4 }}>
                      <Link to={`/books/${activity.bookId}`} style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: 500 }}>
                        {activity.bookTitle}
                      </Link>
                    </div>
                    <div style={{ fontSize: 12, color: '#5f6368' }}>
                      {formatRelative(activity.datetime)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

