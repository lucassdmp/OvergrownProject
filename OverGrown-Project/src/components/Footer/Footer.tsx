import './Footer.css';

export const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>&copy; {new Date().getFullYear()} Overgrown Project. All rights reserved.</p>
      </div>
    </footer>
  );
};
