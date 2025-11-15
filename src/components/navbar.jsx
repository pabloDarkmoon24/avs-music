// src/components/Navbar.jsx
import { useState } from 'react';
import './Navbar.css';

function Navbar({ seccionActiva, onCambiarSeccion, isDJ, onLogout }) {
  const [showCleanPopup, setShowCleanPopup] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const secciones = [
    { id: 'biblioteca', nombre: '🎵 Biblioteca', icono: '🔍' },
    { id: 'peticiones', nombre: '📋 Peticiones', icono: '📝' },
    { id: 'reproduccion', nombre: '▶️ Reproducción', icono: '🎧' }
  ];

  // Agregar sección de códigos solo para DJ
  const seccionesConCodigos = isDJ 
    ? [...secciones, { id: 'codigos', nombre: '🎫 Códigos', icono: '🎫' }]
    : secciones;

  const handleLimpiarTodo = async () => {
    setIsClearing(true);
    
    try {
      const { limpiarTodo } = await import('../services/peticionesService');
      const result = await limpiarTodo();
      
      if (result.success) {
        console.log('✅ Base de datos limpiada exitosamente');
        setShowCleanPopup(false);
      } else {
        console.error('❌ Error al limpiar:', result.error);
        setShowCleanPopup(false);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setShowCleanPopup(false);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>🎧 AVSMUSIC</h1>
          <span className="navbar-subtitle">DJ App</span>
        </div>

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

        <div className="navbar-status">
          <span className={`status-badge ${isDJ ? 'dj' : 'cliente'}`}>
            {isDJ ? '🎧 DJ' : '👤 Cliente'}
          </span>
          
          {isDJ && (
            <>
              <button 
                onClick={() => setShowCleanPopup(true)} 
                className="btn-clean-all" 
                title="Limpiar toda la base de datos"
              >
                🗑️ Limpiar Todo
              </button>
              
              {onLogout && (
                <button onClick={onLogout} className="btn-logout" title="Cerrar sesión">
                  🚪 Salir
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* POPUP DE CONFIRMACIÓN PARA LIMPIAR TODO */}
      {showCleanPopup && (
        <div className="modal-overlay-clean" onClick={() => !isClearing && setShowCleanPopup(false)}>
          <div className="clean-popup" onClick={(e) => e.stopPropagation()}>
            <div className="clean-popup-header">
              <h3>⚠️ Limpiar Base de Datos</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowCleanPopup(false)}
                disabled={isClearing}
              >
                ✕
              </button>
            </div>
            
            <div className="clean-popup-body">
              <div className="warning-box">
                <span className="warning-icon">⚠️</span>
                <p className="warning-title">¡ADVERTENCIA!</p>
                <p className="warning-desc">
                  Esta acción eliminará <strong>TODA</strong> la información:
                </p>
              </div>

              <ul className="items-to-delete">
                <li>🗑️ Cola de reproducción</li>
                <li>📜 Historial de reproducción</li>
                <li>📋 Peticiones básicas</li>
                <li>⭐ Peticiones premium</li>
              </ul>

              <p className="final-warning">
                Esta acción <strong>NO SE PUEDE DESHACER</strong>.
              </p>
              
              <div className="clean-popup-actions">
                <button 
                  onClick={() => setShowCleanPopup(false)} 
                  className="btn-cancel-clean"
                  disabled={isClearing}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleLimpiarTodo} 
                  className="btn-confirm-clean"
                  disabled={isClearing}
                >
                  {isClearing ? 'Limpiando...' : 'Sí, Limpiar Todo'}
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