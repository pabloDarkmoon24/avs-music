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
  const [estadosPeticiones, setEstadosPeticiones] = useState({}); // Estado global de peticiones

  // Verificar si hay usuario autenticado
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      console.log('Usuario actual:', currentUser?.email || 'No autenticado');
    });

    return () => unsubscribe();
  }, []);

  const handleLoginSuccess = (user) => {
    setUser(user);
    setShowLogin(false);
  };

  const handleLogout = async () => {
    const confirmar = confirm('¿Cerrar sesión como DJ?');
    if (!confirmar) return;

    try {
      await signOut(auth);
      setUser(null);
      alert('✓ Sesión cerrada correctamente');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      alert('❌ Error al cerrar sesión');
    }
  };

  const handleAddToList = (track, listType, code = null) => {
    console.log('Canción añadida:', track);
    console.log('Tipo de lista:', listType);
    if (code) {
      console.log('Código usado:', code);
    }
  };

  const renderSeccion = () => {
    switch (seccionActiva) {
      case 'biblioteca':
        return <Biblioteca onAddToList={handleAddToList} />;
      case 'peticiones':
        return <ListaPeticiones 
          isDJ={!!user} 
          estadosPeticiones={estadosPeticiones}
          setEstadosPeticiones={setEstadosPeticiones}
        />;
      case 'reproduccion':
        return <ReproduccionActual isDJ={!!user} />;
      case 'codigos':
        return <GestionCodigos />;
      default:
        return <Biblioteca onAddToList={handleAddToList} />;
    }
  };

  // Mostrar loading mientras verifica autenticación
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        fontSize: '1.5rem',
        color: '#1db954'
      }}>
        ⏳ Cargando...
      </div>
    );
  }

  // Mostrar pantalla de login
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
      />
      
      <main>
        {renderSeccion()}
      </main>

      {/* Botón para abrir login (solo si no es DJ) */}
      {!user && (
        <button 
          onClick={() => setShowLogin(true)}
          className="toggle-dj-btn"
          title="Iniciar sesión como DJ"
        >
          🎧 Acceso DJ
        </button>
      )}
    </div>
  )
}

export default App