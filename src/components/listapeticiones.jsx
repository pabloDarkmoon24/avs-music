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

function ListaPeticiones({ isDJ = false, estadosPeticiones = {}, setEstadosPeticiones }) {
  const [peticionesBasicas, setPeticionesBasicas] = useState([]);
  const [peticionesPremium, setPeticionesPremium] = useState([]);
  const [listaReproduccion, setListaReproduccion] = useState([]);
  const [refreshTime, setRefreshTime] = useState(Date.now());
  const [animatingIds, setAnimatingIds] = useState(new Set());
  
  // Usar el estado pasado por props (estadosPeticiones) en lugar de estado local
  // Si no hay setEstadosPeticiones (modo cliente sin App.jsx), usar estado local
  const [estadosLocales, setEstadosLocales] = useState({});
  const estadosFinal = setEstadosPeticiones ? estadosPeticiones : estadosLocales;
  const setEstadosFinal = setEstadosPeticiones || setEstadosLocales;

  useEffect(() => {
    const unsubBasicas = subscribeToPeticionesBasicas((peticiones) => {
      console.log('📦 Peticiones básicas actualizadas:', peticiones.map(p => ({
        name: p.name,
        estado: p.estado,
        id: p.id
      })));
      setPeticionesBasicas(peticiones);
      
      // Sincronizar estados con Firebase
      peticiones.forEach(p => {
        if (p.estado === 'aprobada' || p.estado === 'rechazada') {
          setEstadosFinal(prev => ({...prev, [p.id]: p.estado}));
        }
      });
    });

    const unsubPremium = subscribeToPeticionesPremium((peticiones) => {
      console.log('📦 Peticiones premium actualizadas:', peticiones.map(p => ({
        name: p.name,
        estado: p.estado,
        id: p.id
      })));
      setPeticionesPremium(peticiones);
      
      // Sincronizar estados con Firebase
      peticiones.forEach(p => {
        if (p.estado === 'aprobada' || p.estado === 'rechazada') {
          setEstadosFinal(prev => ({...prev, [p.id]: p.estado}));
        }
      });
    });

    const unsubReproduccion = subscribeToListaReproduccion((canciones) => {
      setListaReproduccion(canciones);
    });

    const intervalId = setInterval(() => {
      setRefreshTime(Date.now());
    }, 30000);

    return () => {
      unsubBasicas();
      unsubPremium();
      unsubReproduccion();
      clearInterval(intervalId);
    };
  }, [setEstadosFinal]);

  const handleAprobar = async (peticion, tipo) => {
    console.log('🟢 Aprobando:', peticion.name, 'Firebase ID:', peticion.firebaseId, 'Spotify ID:', peticion.id);
    
    // Verificar usando estado (usar firebaseId)
    if (estadosFinal[peticion.firebaseId]) {
      console.log('⚠️ Ya está procesada');
      return;
    }
    
    // Marcar como animando Y guardar estado INMEDIATAMENTE (usar firebaseId)
    setAnimatingIds(prev => new Set([...prev, peticion.firebaseId]));
    setEstadosFinal(prev => ({...prev, [peticion.firebaseId]: 'aprobada'}));
    
    // Quitar la clase animating después de 500ms (cuando termine la animación)
    setTimeout(() => {
      setAnimatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(peticion.firebaseId);
        return newSet;
      });
    }, 500);
    
    // PRIMERO: Actualizar estado en Firebase (usar firebaseId)
    console.log('📝 Actualizando estado en Firebase PRIMERO...');
    const updateResult = tipo === 'basica' 
      ? await updateEstadoPeticionBasica(peticion.firebaseId, 'aprobada')
      : await updateEstadoPeticionPremium(peticion.firebaseId, 'aprobada');
    
    console.log('📝 Resultado actualización Firebase:', updateResult);
    
    if (!updateResult.success) {
      console.error('❌ No se pudo actualizar el estado en Firebase');
    }
    
    // Esperar 500ms para que Firebase procese la actualización
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // SEGUNDO: Añadir a lista de reproducción
    const ordenesActuales = listaReproduccion.map(c => c.orden || 0);
    const siguienteOrden = ordenesActuales.length > 0 ? Math.max(...ordenesActuales) + 1 : 0;
    
    console.log('🎵 Añadiendo a reproducción con orden:', siguienteOrden);
    
    // Añadir tipo de petición al objeto
    const cancionConTipo = {
      ...peticion,
      tipoPeticion: tipo // 'basica' o 'premium'
    };
    
    const result = await addToListaReproduccion(cancionConTipo, siguienteOrden);
    
    console.log('✅ Resultado añadir a reproducción:', result);
    
    if (!result.success) {
      alert('❌ Error al aprobar la canción');
      // Revertir estado si falla
      setEstadosFinal(prev => {
        const nuevo = {...prev};
        delete nuevo[peticion.firebaseId];
        return nuevo;
      });
    } else {
      console.log('🎉 Canción aprobada exitosamente');
    }
  };

  const handleRechazar = async (firebaseId, tipo) => {
    console.log('🔴 Rechazando Firebase ID:', firebaseId);
    
    // Verificar usando estado
    if (estadosFinal[firebaseId]) {
      console.log('⚠️ Ya está procesada');
      return;
    }
    
    // Marcar como animando Y guardar estado INMEDIATAMENTE
    setAnimatingIds(prev => new Set([...prev, firebaseId]));
    setEstadosFinal(prev => ({...prev, [firebaseId]: 'rechazada'}));
    
    // Quitar la clase animating después de 600ms (cuando termine la animación de shake)
    setTimeout(() => {
      setAnimatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(firebaseId);
        return newSet;
      });
    }, 600);
    
    // Actualizar en Firebase
    console.log('📝 Actualizando estado rechazada en Firebase...');
    const updateResult = tipo === 'basica'
      ? await updateEstadoPeticionBasica(firebaseId, 'rechazada')
      : await updateEstadoPeticionPremium(firebaseId, 'rechazada');
    
    console.log('📝 Resultado actualización Firebase:', updateResult);
    
    if (!updateResult.success) {
      console.error('❌ No se pudo actualizar el estado en Firebase');
    }
    
    console.log('❌ Rechazada y guardada en Firebase');
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Justo ahora';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      let diffMs = now - date;
      
      if (diffMs < 5000) return 'Justo ahora';
      
      const diffSeconds = Math.floor(diffMs / 1000);
      const diffMinutes = Math.floor(diffSeconds / 60);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSeconds < 60) return `Hace ${diffSeconds} seg`;
      if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
      if (diffHours < 24) return `Hace ${diffHours}h`;
      return `Hace ${diffDays}d`;
    } catch (error) {
      console.error('Error formateando tiempo:', error);
      return 'Hace un momento';
    }
  };

  return (
    <div className="lista-peticiones">
      <h2>📋 Peticiones de Canciones</h2>

      <div className="peticiones-container">
        <div className="lista-seccion basica">
          <h3>
            <span className="badge-basica">BÁSICA</span>
            Lista Gratuita ({peticionesBasicas.length})
          </h3>
          
          <div className="peticiones-list">
            {peticionesBasicas.length === 0 ? (
              <p className="empty-message">No hay peticiones básicas</p>
            ) : (
              peticionesBasicas.map((peticion) => {
                // Usar estado global si existe (con firebaseId), sino usar estado de Firebase
                const estadoFinal = estadosFinal[peticion.firebaseId] || peticion.estado;
                const clases = `peticion-card ${estadoFinal === 'aprobada' ? 'aprobada' : ''} ${estadoFinal === 'rechazada' ? 'rechazada' : ''} ${animatingIds.has(peticion.firebaseId) ? 'animating' : ''}`.trim();
                console.log(`🎨 Renderizando ${peticion.name}: firebaseId="${peticion.firebaseId}", spotifyId="${peticion.id}", estadoGlobal="${estadosFinal[peticion.firebaseId]}", estadoFB="${peticion.estado}", estadoFinal="${estadoFinal}"`);
                
                return (
                <div 
                  key={peticion.firebaseId}
                  className={clases}
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
                        disabled={!!estadosFinal[peticion.firebaseId]}
                      >
                        ✓
                      </button>
                      <button 
                        onClick={() => handleRechazar(peticion.firebaseId, 'basica')}
                        className="btn-rechazar"
                        title="Rechazar petición"
                        disabled={!!estadosFinal[peticion.firebaseId]}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )})
            )}
          </div>
        </div>

        <div className="lista-seccion premium">
          <h3>
            <span className="badge-premium">⭐ PREMIUM</span>
            Lista Prioritaria ({peticionesPremium.length})
          </h3>
          
          <div className="peticiones-list">
            {peticionesPremium.length === 0 ? (
              <p className="empty-message">No hay peticiones premium</p>
            ) : (
              peticionesPremium.map((peticion) => {
                const estadoFinal = estadosFinal[peticion.firebaseId] || peticion.estado;
                const clases = `peticion-card premium-card ${estadoFinal === 'aprobada' ? 'aprobada' : ''} ${estadoFinal === 'rechazada' ? 'rechazada' : ''} ${animatingIds.has(peticion.firebaseId) ? 'animating' : ''}`.trim();
                
                return (
                <div 
                  key={peticion.firebaseId}
                  className={clases}
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
                        disabled={!!estadosFinal[peticion.firebaseId]}
                      >
                        ✓
                      </button>
                      <button 
                        onClick={() => handleRechazar(peticion.firebaseId, 'premium')}
                        className="btn-rechazar"
                        title="Rechazar petición"
                        disabled={!!estadosFinal[peticion.firebaseId]}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )})
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListaPeticiones;