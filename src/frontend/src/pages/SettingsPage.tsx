import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';

// Settings page redirects to profile which includes settings
export default function SettingsPage() {
  const navigate = useNavigate();
  React.useEffect(() => { navigate('/me/profile', { replace: true }); }, [navigate]);
  return <Layout><div /></Layout>;
}
