// src/components/Login.jsx
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login exitoso:', userCredential.user);
      onLoginSuccess(userCredential.user);
    } catch (error) {
      console.error('❌ Error de login:', error);
      
      // Mensajes de error en español
      switch (error.code) {
        case 'auth/invalid-email':
          setError('El correo electrónico no es válido');
          break;
        case 'auth/user-not-found':
          setError('No existe un usuario con este correo');
          break;
        case 'auth/wrong-password':
          setError('Contraseña incorrecta');
          break;
        case 'auth/invalid-credential':
          setError('Credenciales inválidas. Verifica tu correo y contraseña.');
          break;
        default:
          setError('Error al iniciar sesión. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>🎧 AVSMUSIC</h1>
          <h2>Panel de DJ</h2>
          <p>Ingresa con tu cuenta de DJ para acceder al panel de control</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="dj@avsmusic.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn-login"
            disabled={loading}
          >
            {loading ? '⏳ Iniciando sesión...' : '🎧 Ingresar como DJ'}
          </button>
        </form>

        <div className="login-footer">
          <p>💡 <strong>Modo Cliente:</strong> No necesitas iniciar sesión</p>
          <p>Simplemente busca y solicita canciones</p>
        </div>
      </div>
    </div>
  );
}

export default Login;