// src/App.jsx
import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './services/firebase'
import Navbar from './components/navbar'
import Login from './components/Login'
import Biblioteca from './components/Biblioteca'
import ListaPeticiones from './components/listapeticiones'
import ReproduccionActual from './components/reproduccionactual'
import GestionCodigos from './components/gestioncodigos'
import './App.css'

function App() {
  const [seccionActiva, setSeccionActiva] = useState('biblioteca');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [estadosPeticiones, setEstadosPeticiones] = useState({});

  // Verificar si hay usuario autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user) => {
    setUser(user);
    setShowLogin(false);
  };

  // Logout SIN alert() – ahora muestra popup bonito
const handleLogout = async () => {
  try {
    await signOut(auth);

    setShowLogoutPopup(true);

    setTimeout(() => {
      window.location.reload();  // recarga y limpia todo
    }, 900); // espera a que el popup aparezca antes de recargar
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
  }
};

  const renderSeccion = () => {
    switch (seccionActiva) {
      case 'biblioteca':
        return <Biblioteca onAddToList={() => {}} />;
      case 'peticiones':
        return (
          <ListaPeticiones 
            isDJ={!!user} 
            estadosPeticiones={estadosPeticiones}
            setEstadosPeticiones={setEstadosPeticiones}
          />
        );
      case 'reproduccion':
        return <ReproduccionActual isDJ={!!user} />;
      case 'codigos':
        return <GestionCodigos />;
      default:
        return <Biblioteca onAddToList={() => {}} />;
    }
  };

  if (loading) {
    return (
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'center',
        minHeight:'100vh', fontSize:'1.5rem', color:'#1db954'
      }}>
        ⏳ Cargando...
      </div>
    );
  }

  if (showLogin) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="app">
      <Navbar 
        seccionActiva={seccionActiva} 
        onCambiarSeccion={setSeccionActiva}
        isDJ={!!user}
        onLogout={user ? handleLogout : null}
        onLoginDJ={!user ? () => setShowLogin(true) : null}
      />
      
      <main>
        {renderSeccion()}
      </main>

      {/* POPUP DE LOGOUT */}
      {showLogoutPopup && (
        <div className="logout-popup">
          <div className="logout-popup-content">
            <span className="logout-icon">👋</span>
            <p>Sesión finalizada correctamente</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App;
