// src/components/ReproduccionActual.jsx
import { useState, useEffect } from 'react';
import { 
  subscribeToListaReproduccion,
  deleteFromListaReproduccion,
  subscribeToHistorialReproduccion
} from '../services/peticionesService';
import './ReproduccionActual.css';

function ReproduccionActual({ isDJ = false }) {
  const [colaReproduccion, setColaReproduccion] = useState([]); // Canciones pendientes
  const [historial, setHistorial] = useState([]); // Canciones ya reproducidas

  useEffect(() => {
    // Suscribirse a la cola de reproducción (canciones pendientes)
    const unsubCola = subscribeToListaReproduccion((canciones) => {
      // Ordenar por orden
      const ordenadas = canciones.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setColaReproduccion(ordenadas);
    });

    // Suscribirse al historial (canciones reproducidas)
    const unsubHistorial = subscribeToHistorialReproduccion((canciones) => {
      // Ordenar por timestamp descendente (más recientes primero)
      const ordenadas = canciones.sort((a, b) => {
        const timeA = a.reproducidaAt?.toMillis() || 0;
        const timeB = b.reproducidaAt?.toMillis() || 0;
        return timeB - timeA;
      });
      setHistorial(ordenadas);
    });

    return () => {
      unsubCola();
      unsubHistorial();
    };
  }, []);

  // Marcar canción como reproducida (mueve a historial)
  const handleMarcarReproducida = async (cancion) => {
    if (!isDJ) return;
    
    try {
      // Importar función para mover a historial
      const { marcarComoReproducida } = await import('../services/peticionesService');
      await marcarComoReproducida(cancion);
      
      console.log('✅ Canción marcada como reproducida');
    } catch (error) {
      console.error('Error al marcar como reproducida:', error);
      alert('Error al marcar la canción. Intenta de nuevo.');
    }
  };

  // Eliminar canción de la cola
  const handleEliminar = async (cancionId) => {
    if (!isDJ) return;
    
    if (!window.confirm('¿Eliminar esta canción de la cola?')) {
      return;
    }

    try {
      await deleteFromListaReproduccion(cancionId);
      console.log('✅ Canción eliminada');
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar la canción. Intenta de nuevo.');
    }
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / 60000);
      
      if (diffMinutes < 1) return 'Hace un momento';
      if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `Hace ${diffHours}h`;
      
      return date.toLocaleDateString();
    } catch (error) {
      return '';
    }
  };

  return (
    <div className="reproduccion-actual">
      <h2>🎵 Lista de Reproducción</h2>

      {/* SECCIÓN: COLA DE REPRODUCCIÓN */}
      <div className="seccion-cola">
        <div className="seccion-header">
          <h3>📋 Cola de Reproducción</h3>
          <span className="contador">{colaReproduccion.length} canciones</span>
        </div>

        {colaReproduccion.length === 0 ? (
          <div className="empty-state">
            <p>🎼 No hay canciones en la cola</p>
            <small>Las canciones aprobadas aparecerán aquí</small>
          </div>
        ) : (
          <div className="lista-canciones">
            {colaReproduccion.map((cancion, index) => (
              <div key={cancion.firebaseId || cancion.id} className="cancion-card">
                {/* Número de orden */}
                <div className="orden-numero">
                  {index + 1}
                </div>

                {/* Cover */}
                <img 
                  src={cancion.albumCover} 
                  alt={cancion.album} 
                  className="cancion-cover"
                />

                {/* Info */}
                <div className="cancion-info">
                  <h4>{cancion.name}</h4>
                  <p className="artist">{cancion.artist}</p>
                  <p className="album">{cancion.album}</p>
                  <div className="cancion-meta">
                    <span className="duration">{formatDuration(cancion.duration)}</span>
                    {cancion.tipoPeticion && (
                      <span className={`badge-tipo ${cancion.tipoPeticion}`}>
                        {cancion.tipoPeticion === 'premium' ? '⭐ Premium' : '🎵 Básica'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Acciones (solo DJ) */}
                {isDJ && (
                  <div className="cancion-acciones">
                    <button
                      onClick={() => handleMarcarReproducida(cancion)}
                      className="btn-reproducida"
                      title="Marcar como reproducida"
                    >
                      ✓ Reproducida
                    </button>
                    <button
                      onClick={() => handleEliminar(cancion.firebaseId || cancion.id)}
                      className="btn-eliminar"
                      title="Eliminar de la cola"
                    >
                      🗑️
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECCIÓN: HISTORIAL */}
      <div className="seccion-historial">
        <div className="seccion-header">
          <h3>📜 Historial de Reproducción</h3>
          <span className="contador">{historial.length} reproducidas</span>
        </div>

        {historial.length === 0 ? (
          <div className="empty-state">
            <p>📭 No hay canciones en el historial</p>
            <small>Las canciones reproducidas aparecerán aquí</small>
          </div>
        ) : (
          <div className="lista-canciones historial">
            {historial.map((cancion) => (
              <div key={cancion.firebaseId || cancion.id} className="cancion-card historial-card">
                {/* Cover */}
                <img 
                  src={cancion.albumCover} 
                  alt={cancion.album} 
                  className="cancion-cover"
                />

                {/* Info */}
                <div className="cancion-info">
                  <h4>{cancion.name}</h4>
                  <p className="artist">{cancion.artist}</p>
                  <p className="album">{cancion.album}</p>
                  <div className="cancion-meta">
                    <span className="duration">{formatDuration(cancion.duration)}</span>
                    {cancion.tipoPeticion && (
                      <span className={`badge-tipo ${cancion.tipoPeticion}`}>
                        {cancion.tipoPeticion === 'premium' ? '⭐ Premium' : '🎵 Básica'}
                      </span>
                    )}
                    {cancion.reproducidaAt && (
                      <span className="timestamp">
                        🕒 {formatTimeAgo(cancion.reproducidaAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Badge de reproducida */}
                <div className="badge-reproducida">
                  ✓ Reproducida
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ReproduccionActual;