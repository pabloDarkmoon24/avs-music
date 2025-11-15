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
  const [draggedIndex, setDraggedIndex] = useState(null); // Índice de la canción siendo arrastrada
  const [showDeletePopup, setShowDeletePopup] = useState(false); // Mostrar popup de eliminación
  const [cancionToDelete, setCancionToDelete] = useState(null); // Canción a eliminar

  useEffect(() => {
    // Suscribirse a la cola de reproducción (canciones pendientes)
    const unsubCola = subscribeToListaReproduccion((canciones) => {
      console.log('🔄 Canciones recibidas de Firebase:', canciones.map(c => ({
        firebaseId: c.firebaseId,
        spotifyId: c.id,
        name: c.name
      })));
      
      // Ordenar por orden
      const ordenadas = canciones.sort((a, b) => (a.orden || 0) - (b.orden || 0));
      setColaReproduccion(ordenadas);
    });

    // Suscribirse al historial (canciones reproducidas)
    const unsubHistorial = subscribeToHistorialReproduccion((canciones) => {
      console.log('📜 Historial recibido de Firebase:', canciones.length, 'canciones');
      
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
    
    console.log('🎯 Intentando marcar como reproducida:', {
      firebaseId: cancion.firebaseId,
      spotifyId: cancion.id,
      name: cancion.name,
      cancionCompleta: cancion
    });
    
    try {
      // Importar función para mover a historial
      const { marcarComoReproducida } = await import('../services/peticionesService');
      const resultado = await marcarComoReproducida(cancion);
      
      console.log('✅ Resultado:', resultado);
      
      if (resultado.success) {
        console.log('✅ Canción marcada como reproducida exitosamente');
      } else {
        console.error('❌ Error:', resultado.error);
        alert('Error al marcar la canción: ' + resultado.error);
      }
    } catch (error) {
      console.error('❌ Error al marcar como reproducida:', error);
      alert('Error al marcar la canción. Intenta de nuevo.');
    }
  };

  // Eliminar canción de la cola
  const handleEliminar = (cancion) => {
    if (!isDJ) return;
    
    // Mostrar popup de confirmación
    setCancionToDelete(cancion);
    setShowDeletePopup(true);
  };

  // Confirmar eliminación desde el popup
  const confirmarEliminar = async () => {
    if (!cancionToDelete) return;

    try {
      await deleteFromListaReproduccion(cancionToDelete.firebaseId || cancionToDelete.id);
      console.log('✅ Canción eliminada');
      
      // Cerrar popup
      setShowDeletePopup(false);
      setCancionToDelete(null);
    } catch (error) {
      console.error('Error al eliminar:', error);
      alert('Error al eliminar la canción. Intenta de nuevo.');
    }
  };

  // Cancelar eliminación
  const cancelarEliminar = () => {
    setShowDeletePopup(false);
    setCancionToDelete(null);
  };

  // === DRAG & DROP HANDLERS ===
  
  const handleDragStart = (e, index) => {
    if (!isDJ) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedIndex(null);
  };

  const handleDragOver = (e) => {
    if (!isDJ) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    if (!isDJ || draggedIndex === null || draggedIndex === dropIndex) return;
    e.preventDefault();

    try {
      // Crear copia del array
      const items = [...colaReproduccion];
      
      // Remover el elemento arrastrado
      const [draggedItem] = items.splice(draggedIndex, 1);
      
      // Insertar en la nueva posición
      items.splice(dropIndex, 0, draggedItem);

      // Actualizar el estado local inmediatamente para feedback visual
      setColaReproduccion(items);

      // Actualizar los órdenes en Firebase
      const { updateOrdenCancion } = await import('../services/peticionesService');
      
      const updatePromises = items.map((item, index) => 
        updateOrdenCancion(item.firebaseId, index)
      );

      await Promise.all(updatePromises);
      
      console.log('✅ Orden actualizado en Firebase');
    } catch (error) {
      console.error('Error reordenando:', error);
      alert('Error al reordenar. Intenta de nuevo.');
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
              <div 
                key={cancion.firebaseId || cancion.id} 
                className={`cancion-card ${draggedIndex === index ? 'dragging' : ''}`}
                draggable={isDJ}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
              >
                {/* Número de orden */}
                <div className="orden-numero">
                  {isDJ && <span className="drag-handle">⋮⋮</span>}
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
                      onClick={() => handleEliminar(cancion)}
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

      {/* POPUP DE CONFIRMACIÓN DE ELIMINACIÓN */}
      {showDeletePopup && cancionToDelete && (
        <div className="modal-overlay" onClick={cancelarEliminar}>
          <div className="delete-popup" onClick={(e) => e.stopPropagation()}>
            <div className="delete-popup-header">
              <h3>🗑️ Eliminar Canción</h3>
              <button className="close-btn" onClick={cancelarEliminar}>✕</button>
            </div>
            
            <div className="delete-popup-body">
              <div className="cancion-preview">
                <img 
                  src={cancionToDelete.albumCover} 
                  alt={cancionToDelete.album}
                  className="preview-cover"
                />
                <div className="preview-info">
                  <h4>{cancionToDelete.name}</h4>
                  <p>{cancionToDelete.artist}</p>
                </div>
              </div>
              
              <p className="warning-text">
                ¿Estás seguro de eliminar esta canción de la cola de reproducción?
              </p>
              
              <div className="delete-popup-actions">
                <button onClick={cancelarEliminar} className="btn-cancel">
                  Cancelar
                </button>
                <button onClick={confirmarEliminar} className="btn-delete-confirm">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReproduccionActual;