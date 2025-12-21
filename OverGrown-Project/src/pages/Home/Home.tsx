import { Link } from 'react-router-dom';
import { MainLayout } from '../../layouts';
import './Home.css';

export const Home = () => {
  return (
    <MainLayout>
      <div className="home-container">
        <h1>Welcome to Overgrown Project</h1>
        <p className="subtitle">A modern React application with Firebase integration</p>
        <div className="cta-buttons">
          <Link to="/login" className="btn btn-primary">
            Login
          </Link>
          <Link to="/signup" className="btn btn-secondary">
            Sign Up
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};
