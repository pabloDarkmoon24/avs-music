// src/components/Navbar.jsx
import { useState } from 'react';
import './Navbar.css';

function Navbar({ seccionActiva, onCambiarSeccion, isDJ, onLogout, onLoginDJ }) {
  const [showCleanPopup, setShowCleanPopup] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const secciones = [
    { id: 'biblioteca', nombre: '🎵 Biblioteca', icono: '🔍' },
    { id: 'peticiones', nombre: '📋 Peticiones', icono: '📝' },
    { id: 'reproduccion', nombre: '▶️ Reproducción', icono: '🎧' }
  ];

  const seccionesConCodigos = isDJ 
    ? [...secciones, { id: 'codigos', nombre: '🎫 Códigos', icono: '🎫' }]
    : secciones;

  const handleLimpiarTodo = async () => {
    setIsClearing(true);
    
    try {
      const { limpiarTodo } = await import('../services/peticionesService');
      const result = await limpiarTodo();
      
      if (result.success) {
        setShowCleanPopup(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleConfirmLogout = () => {
    if (onLogout) onLogout();
    setShowLogoutPopup(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">

        {/* Marca */}
        <div className="navbar-brand">
          <h1>🎧 AVCMUSIC</h1>
          <span className="navbar-subtitle">DJ App</span>
        </div>

        {/* Menú central */}
        <div className="navbar-menu">
          {seccionesConCodigos.map((seccion) => (
            <button
              key={seccion.id}
              onClick={() => onCambiarSeccion(seccion.id)}
              className={`navbar-item ${seccionActiva === seccion.id ? 'active' : ''}`}
            >
              <span className="navbar-icon">{seccion.icono}</span>
              <span className="navbar-text">{seccion.nombre}</span>
            </button>
          ))}
        </div>

        {/* Zona derecha */}
        <div className="navbar-status">

          {/* Botón login DJ */}
          {!isDJ && onLoginDJ && (
            <button className="btn-login-dj" onClick={onLoginDJ}>
              🎧 Acceso DJ
            </button>
          )}

          {/* Opciones DJ */}
          {isDJ && (
            <>
              <button className="btn-clean-all" onClick={() => setShowCleanPopup(true)}>
                🗑️ Limpiar Todo
              </button>

              <button className="btn-logout" onClick={() => setShowLogoutPopup(true)}>
                🚪 Salir
              </button>
            </>
          )}
        </div>
      </div>

      {/* Popup LIMPIAR TODO */}
      {showCleanPopup && (
        <div className="modal-overlay-clean" onClick={() => !isClearing && setShowCleanPopup(false)}>
          <div className="clean-popup" onClick={(e) => e.stopPropagation()}>
            <div className="clean-popup-header">
              <h3>⚠️ Limpiar Base de Datos</h3>
              <button className="close-btn" onClick={() => setShowCleanPopup(false)}>✕</button>
            </div>

            <div className="clean-popup-body">
              <p className="warning-desc">Esto eliminará TODO de la base de datos</p>
              <div className="clean-popup-actions">
                <button className="btn-cancel-clean" onClick={() => setShowCleanPopup(false)}>
                  Cancelar
                </button>
                <button className="btn-confirm-clean" onClick={handleLimpiarTodo}>
                  {isClearing ? 'Limpiando...' : 'Sí, Limpiar Todo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup CERRAR SESIÓN */}
      {showLogoutPopup && (
        <div className="modal-overlay-clean" onClick={() => setShowLogoutPopup(false)}>
          <div className="clean-popup" onClick={(e) => e.stopPropagation()}>
            <div className="clean-popup-header">
              <h3>🚪 Cerrar Sesión</h3>
              <button className="close-btn" onClick={() => setShowLogoutPopup(false)}>✕</button>
            </div>

            <div className="clean-popup-body">
              <p className="warning-desc">¿Seguro que quieres salir del modo DJ?</p>

              <div className="clean-popup-actions">
                <button className="btn-cancel-clean" onClick={() => setShowLogoutPopup(false)}>
                  Cancelar
                </button>

                <button className="btn-confirm-clean" onClick={handleConfirmLogout}>
                  Sí, cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </nav>
  );
}

export default Navbar;
