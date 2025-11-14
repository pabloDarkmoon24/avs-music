// src/components/Navbar.jsx
import './Navbar.css';

function Navbar({ seccionActiva, onCambiarSeccion, isDJ, onLogout }) {
  const secciones = [
    { id: 'biblioteca', nombre: '🎵 Biblioteca', icono: '🔍' },
    { id: 'peticiones', nombre: '📋 Peticiones', icono: '📝' },
    { id: 'reproduccion', nombre: '▶️ Reproducción', icono: '🎧' }
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <h1>🎧 AVSMUSIC</h1>
          <span className="navbar-subtitle">DJ App</span>
        </div>

        <div className="navbar-menu">
          {secciones.map((seccion) => (
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
          
          {isDJ && onLogout && (
            <button onClick={onLogout} className="btn-logout" title="Cerrar sesión">
              🚪 Salir
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;