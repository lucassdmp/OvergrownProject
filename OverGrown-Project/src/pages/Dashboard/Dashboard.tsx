import { useAuth } from '../../providers';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../layouts';
import './Dashboard.css';

export const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <MainLayout>
      <div className="dashboard-container">
        <h1>Dashboard</h1>
        <div className="user-info">
          <p>Welcome, {user?.email}!</p>
          <p className="user-id">User ID: {user?.uid}</p>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>
    </MainLayout>
  );
};
