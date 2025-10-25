import { Button } from '../components';

const Home = () => {
  return (
    <div className="page-home">
      <h1>Home Page</h1>
      <p>Welcome to your Vite + React application!</p>
      <Button onClick={() => alert('Button clicked!')}>
        Click Me
      </Button>
    </div>
  );
};

export default Home;
