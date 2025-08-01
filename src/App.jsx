import './style.css';
import Header from './components/Header';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import Auth from './Auth';
import AdminDashboard from './AdminDashboard'; // Importar el componente del dashboard
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} /> {/* Nueva ruta */}
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;