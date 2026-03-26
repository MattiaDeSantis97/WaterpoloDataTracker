import React, { useState } from 'react';
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from './firebase';
import MatchForm from './MatchForm';
import Dashboard from './Dashboard';
import Roster from './Roster';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
    } catch (error) {
      console.error("Autenticazione fallita:", error);
    }
  };

  const handleLogout = () => {
    auth.signOut();
    setUser(null);
  };

  const navigate = (view) => {
    setCurrentView(view);
    setIsMenuOpen(false);
  };

  return (
    <div className="app-container">
      {!user ? (
        <div className="card" style={{ textAlign: 'center', maxWidth: '400px', margin: '100px auto' }}>
          <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>WaterPoloData</h1>
          <p style={{ color: '#7f8c8d', marginBottom: '30px' }}>Analisi AI per la pallanuoto</p>
          <button onClick={handleLogin} style={{ width: '100%', fontSize: '1.1rem', padding: '15px' }}>
            Accedi con Google
          </button>
        </div>
      ) : (
        <>
          <nav className="navbar">
            <h1 className="navbar-brand">WaterPoloData</h1>
            <button className="hamburger" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              ☰
            </button>
            <div className={`nav-buttons ${isMenuOpen ? 'open' : ''}`}>
              <button onClick={() => navigate('dashboard')}>Dashboard</button>
              <button onClick={() => navigate('roster')}>Roster</button>
              <button onClick={() => navigate('form')}>Nuova Partita</button>
              <button onClick={handleLogout} className="btn-danger">Disconnetti</button>
            </div>
          </nav>

          <main>
            {currentView === 'dashboard' && <Dashboard user={user} />}
            {currentView === 'roster' && <Roster user={user} />}
            {currentView === 'form' && <MatchForm user={user} />}
          </main>
        </>
      )}
    </div>
  );
}

export default App;