// src/components/ReproduccionActual.jsx
import { useState, useEffect } from 'react';
import { 
  subscribeToListaReproduccion,
  deleteFromListaReproduccion,
  updateEstadoCancion,
  updateOrdenCancion
} from '../services/peticionesService';
import './ReproduccionActual.css';

function ReproduccionActual({ isDJ = false }) {
  const [listaReproduccion, setListaReproduccion] = useState([]);
  const [cancionActual, setCancionActual] = useState(null);
  const [proximasCanciones, setProximasCanciones] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);

  useEffect(() => {
    // Suscribirse a cambios en tiempo real
    const unsubscribe = subscribeToListaReproduccion((canciones) => {
      setListaReproduccion(canciones);
      
      // Separar la canción actual de las próximas
      const reproduciendo = canciones.find(c => c.estado === 'reproduciendo');
      const enEspera = canciones.filter(c => c.estado === 'en_espera');
      
      setCancionActual(reproduciendo || null);
      setProximasCanciones(enEspera);
    });

    return () => unsubscribe();
  }, []);

  // Marcar canción como reproduciendo
  const handleReproducir = async (cancionId) => {
    try {
      // Primero, marcar la actual como reproducida y eliminarla
      if (cancionActual) {
        await deleteFromListaReproduccion(cancionActual.id);
      }
      
      // Marcar la nueva como reproduciendo
      await updateEstadoCancion(cancionId, 'reproduciendo');
    } catch (error) {
      console.error('Error al reproducir canción:', error);
      alert('Error al cambiar la canción. Intenta de nuevo.');
    }
  };

  // Eliminar canción de la lista
  const handleEliminar = async (cancionId) => {
    const confirmar = confirm('¿Eliminar esta canción de la lista?');
    if (!confirmar) return;
    
    try {
      await deleteFromListaReproduccion(cancionId);
    } catch (error) {
      console.error('Error al eliminar canción:', error);
      alert('Error al eliminar la canción.');
    }
  };

  // Mover al siguiente (DJ)
  const handleSiguiente = async () => {
    if (proximasCanciones.length === 0) {
      alert('No hay más canciones en la lista');
      return;
    }
    
    try {
      // Marcar la actual como reproducida y eliminarla
      if (cancionActual) {
        await deleteFromListaReproduccion(cancionActual.id);
      }
      
      // La primera de las próximas se marcará como reproduciendo
      await updateEstadoCancion(proximasCanciones[0].id, 'reproduciendo');
    } catch (error) {
      console.error('Error al cambiar de canción:', error);
      alert('Error al cambiar de canción. Intenta de nuevo.');
    }
  };

  // Drag and Drop handlers (solo para DJ)
  const handleDragStart = (e, index) => {
    if (!isDJ) return;
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    if (!isDJ) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    if (!isDJ || draggedItem === null || draggedItem === dropIndex) return;
    e.preventDefault();
    
    try {
      // Reordenar el array localmente primero
      const items = [...proximasCanciones];
      const draggedSong = items[draggedItem];
      items.splice(draggedItem, 1);
      items.splice(dropIndex, 0, draggedSong);
      
      // Actualizar los órdenes en Firebase con manejo de errores individual
      const updatePromises = items.map(async (item, index) => {
        try {
          await updateOrdenCancion(item.id, index);
          return { success: true };
        } catch (error) {
          // Silencioso - no mostrar errores de documentos eliminados
          return { success: false, id: item.id };
        }
      });
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error reordenando:', error);
    } finally {
      setDraggedItem(null);
    }
  };

  // Formatear duración
  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="reproduccion-actual">
      <h2>▶️ Reproducción Actual</h2>

      {/* Canción reproduciendo ahora */}
      <div className="now-playing-section">
        {cancionActual ? (
          <div className="now-playing-card">
            <div className="now-playing-badge">🎵 SONANDO AHORA</div>
            
            <img 
              src={cancionActual.albumCover} 
              alt={cancionActual.album}
              className="now-playing-cover"
            />
            
            <div className="now-playing-info">
              <h3>{cancionActual.name}</h3>
              <p className="artist">{cancionActual.artist}</p>
              <p className="album">{cancionActual.album}</p>
              <span className="duration">{formatDuration(cancionActual.duration)}</span>
            </div>

            {isDJ && (
              <div className="now-playing-controls">
                <button 
                  onClick={handleSiguiente}
                  className="btn-next"
                  disabled={proximasCanciones.length === 0}
                >
                  ⏭️ Siguiente
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="no-playing">
            <div className="no-playing-icon">🎵</div>
            <h3>No hay música reproduciéndose</h3>
            <p>Las canciones aprobadas aparecerán aquí</p>
          </div>
        )}
      </div>

      {/* Próximas canciones */}
      <div className="proximas-section">
        <h3>
          📋 Próximas Canciones ({proximasCanciones.length})
          {isDJ && proximasCanciones.length > 0 && (
            <span className="drag-hint">Arrastra para reordenar</span>
          )}
        </h3>

        {proximasCanciones.length === 0 ? (
          <div className="empty-queue">
            <p>No hay canciones en cola</p>
            <small>Las canciones aprobadas se añadirán aquí</small>
          </div>
        ) : (
          <div className="proximas-list">
            {proximasCanciones.map((cancion, index) => (
              <div
                key={`${cancion.id}-${cancion.timestamp || index}`}
                className={`proxima-card ${isDJ ? 'draggable' : ''}`}
                draggable={isDJ}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                <div className="proxima-number">{index + 1}</div>
                
                <img 
                  src={cancion.albumCover} 
                  alt={cancion.album}
                  className="proxima-cover"
                />
                
                <div className="proxima-info">
                  <h4>{cancion.name}</h4>
                  <p className="artist">{cancion.artist}</p>
                  <p className="album">{cancion.album}</p>
                  <span className="duration">{formatDuration(cancion.duration)}</span>
                </div>

                {isDJ && (
                  <div className="proxima-actions">
                    <button
                      onClick={() => handleReproducir(cancion.id)}
                      className="btn-play-now"
                      title="Reproducir ahora"
                    >
                      ▶️
                    </button>
                    <button
                      onClick={() => handleEliminar(cancion.id)}
                      className="btn-delete"
                      title="Eliminar de la lista"
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
    </div>
  );
}

export default ReproduccionActual;