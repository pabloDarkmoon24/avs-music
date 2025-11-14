// src/components/ListaPeticiones.jsx
import { useState, useEffect } from 'react';
import { 
  subscribeToPeticionesBasicas, 
  subscribeToPeticionesPremium,
  deletePeticionBasica,
  deletePeticionPremium,
  updateEstadoPeticionBasica,
  updateEstadoPeticionPremium,
  addToListaReproduccion,
  subscribeToListaReproduccion
} from '../services/peticionesService';
import './ListaPeticiones.css';

function ListaPeticiones({ isDJ = false }) {
  const [peticionesBasicas, setPeticionesBasicas] = useState([]);
  const [peticionesPremium, setPeticionesPremium] = useState([]);
  const [listaReproduccion, setListaReproduccion] = useState([]);
  const [refreshTime, setRefreshTime] = useState(Date.now());
  const [animatingIds, setAnimatingIds] = useState(new Set()); // IDs que están animando

  useEffect(() => {
    // Suscribirse a cambios en tiempo real
    const unsubBasicas = subscribeToPeticionesBasicas((peticiones) => {
      setPeticionesBasicas(peticiones);
    });

    const unsubPremium = subscribeToPeticionesPremium((peticiones) => {
      setPeticionesPremium(peticiones);
    });

    const unsubReproduccion = subscribeToListaReproduccion((canciones) => {
      setListaReproduccion(canciones);
    });

    // Actualizar los tiempos cada 30 segundos
    const intervalId = setInterval(() => {
      setRefreshTime(Date.now());
    }, 30000);

    // Cleanup al desmontar
    return () => {
      unsubBasicas();
      unsubPremium();
      unsubReproduccion();
      clearInterval(intervalId);
    };
  }, []);

  // Aprobar petición (mover a lista de reproducción)
  const handleAprobar = async (peticion, tipo) => {
    // Verificar que no esté ya procesada
    if (peticion.estado === 'aprobada' || peticion.estado === 'rechazada') {
      return;
    }
    
    // Marcar como animando
    setAnimatingIds(prev => new Set([...prev, peticion.id]));
    
    // Guardar estado como 'aprobada' en Firebase (para que TODOS lo vean)
    const updateResult = tipo === 'basica' 
      ? await updateEstadoPeticionBasica(peticion.id, 'aprobada')
      : await updateEstadoPeticionPremium(peticion.id, 'aprobada');
    
    // Si el documento ya no existe, salir
    if (!updateResult.success) {
      setAnimatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(peticion.id);
        return newSet;
      });
      return;
    }
    
    // Obtener el orden más alto actual
    const ordenesActuales = listaReproduccion.map(c => c.orden || 0);
    const siguienteOrden = ordenesActuales.length > 0 ? Math.max(...ordenesActuales) + 1 : 0;
    
    // Añadir a lista de reproducción
    const result = await addToListaReproduccion(peticion, siguienteOrden);
    
    if (!result.success) {
      alert('❌ Error al aprobar la canción');
      // Revertir estado si falla
      if (tipo === 'basica') {
        await updateEstadoPeticionBasica(peticion.id, 'pendiente');
      } else {
        await updateEstadoPeticionPremium(peticion.id, 'pendiente');
      }
      setAnimatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(peticion.id);
        return newSet;
      });
    }
  };

  // Rechazar petición
  const handleRechazar = async (peticionId, tipo) => {
    // Buscar la petición en el array correspondiente para verificar estado
    const peticion = tipo === 'basica' 
      ? peticionesBasicas.find(p => p.id === peticionId)
      : peticionesPremium.find(p => p.id === peticionId);
    
    // Verificar que no esté ya procesada
    if (!peticion || peticion.estado === 'aprobada' || peticion.estado === 'rechazada') {
      return;
    }
    
    // Marcar como animando
    setAnimatingIds(prev => new Set([...prev, peticionId]));
    
    // Guardar estado como 'rechazada' en Firebase (para que TODOS lo vean)
    if (tipo === 'basica') {
      await updateEstadoPeticionBasica(peticionId, 'rechazada');
    } else {
      await updateEstadoPeticionPremium(peticionId, 'rechazada');
    }
  };

  // Formatear duración
  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Formatear tiempo relativo (hace cuánto se solicitó)
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Justo ahora';
    
    try {
      // Convertir Firestore Timestamp a Date
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      
      // Calcular diferencia en milisegundos
      let diffMs = now - date;
      
      // Si la diferencia es negativa o muy pequeña (menos de 5 segundos), mostrar "Justo ahora"
      if (diffMs < 5000) {
        return 'Justo ahora';
      }
      
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) {
        return `Hace ${diffSeconds} seg`;
      } else if (diffMinutes < 60) {
        return `Hace ${diffMinutes} min`;
      } else if (diffHours < 24) {
        return `Hace ${diffHours}h`;
      } else {
        return `Hace ${diffDays}d`;
      }
    } catch (error) {
      console.error('Error formateando tiempo:', error);
      return 'Hace un momento';
    }
  };

  return (
    <div className="lista-peticiones">
      <h2>📋 Peticiones de Canciones</h2>

      <div className="peticiones-container">
        {/* Lista Básica */}
        <div className="lista-seccion basica">
          <h3>
            <span className="badge-basica">BÁSICA</span>
            Lista Gratuita ({peticionesBasicas.length})
          </h3>
          
          <div className="peticiones-list">
            {peticionesBasicas.length === 0 ? (
              <p className="empty-message">No hay peticiones básicas</p>
            ) : (
              peticionesBasicas.map((peticion) => (
                <div 
                  key={peticion.id} 
                  className={`peticion-card ${peticion.estado === 'aprobada' ? 'aprobada' : ''} ${peticion.estado === 'rechazada' ? 'rechazada' : ''} ${animatingIds.has(peticion.id) ? 'animating' : ''}`}
                >
                  <img src={peticion.albumCover} alt={peticion.album} className="peticion-cover" />
                  
                  <div className="peticion-info">
                    <h4>{peticion.name}</h4>
                    <p className="artist">{peticion.artist}</p>
                    <p className="album">{peticion.album}</p>
                    <div className="peticion-meta">
                      <span className="duration">{formatDuration(peticion.duration)}</span>
                      <span className="timestamp">🕒 {formatTimeAgo(peticion.timestamp)}</span>
                    </div>
                  </div>

                  {isDJ && (
                    <div className="peticion-actions">
                      <button 
                        onClick={() => handleAprobar(peticion, 'basica')}
                        className="btn-aprobar"
                        title="Aprobar y añadir a lista de reproducción"
                        disabled={peticion.estado === 'aprobada' || peticion.estado === 'rechazada'}
                      >
                        ✓
                      </button>
                      <button 
                        onClick={() => handleRechazar(peticion.id, 'basica')}
                        className="btn-rechazar"
                        title="Rechazar petición"
                        disabled={peticion.estado === 'aprobada' || peticion.estado === 'rechazada'}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Lista Premium */}
        <div className="lista-seccion premium">
          <h3>
            <span className="badge-premium">⭐ PREMIUM</span>
            Lista Prioritaria ({peticionesPremium.length})
          </h3>
          
          <div className="peticiones-list">
            {peticionesPremium.length === 0 ? (
              <p className="empty-message">No hay peticiones premium</p>
            ) : (
              peticionesPremium.map((peticion) => (
                <div 
                  key={peticion.id} 
                  className={`peticion-card premium-card ${peticion.estado === 'aprobada' ? 'aprobada' : ''} ${peticion.estado === 'rechazada' ? 'rechazada' : ''} ${animatingIds.has(peticion.id) ? 'animating' : ''}`}
                >
                  <img src={peticion.albumCover} alt={peticion.album} className="peticion-cover" />
                  
                  <div className="peticion-info">
                    <h4>{peticion.name}</h4>
                    <p className="artist">{peticion.artist}</p>
                    <p className="album">{peticion.album}</p>
                    <div className="peticion-meta">
                      <span className="duration">{formatDuration(peticion.duration)}</span>
                      <span className="timestamp">🕒 {formatTimeAgo(peticion.timestamp)}</span>
                    </div>
                    {isDJ && <span className="codigo-badge">Código: {peticion.codigo}</span>}
                  </div>

                  {isDJ && (
                    <div className="peticion-actions">
                      <button 
                        onClick={() => handleAprobar(peticion, 'premium')}
                        className="btn-aprobar"
                        title="Aprobar y añadir a lista de reproducción"
                        disabled={peticion.estado === 'aprobada' || peticion.estado === 'rechazada'}
                      >
                        ✓
                      </button>
                      <button 
                        onClick={() => handleRechazar(peticion.id, 'premium')}
                        className="btn-rechazar"
                        title="Rechazar petición"
                        disabled={peticion.estado === 'aprobada' || peticion.estado === 'rechazada'}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListaPeticiones;