// src/components/ListasDJ.jsx
import { useState, useEffect } from 'react';
import {
  subscribeToListasDJ,
  crearListaDJ,
  deleteLista,
  removeCancionFromLista,
  cargarListaAReproduccion
} from '../services/peticionesService';
import './ListasDJ.css';

function ListasDJ({ djUserId }) {
  const [listas, setListas] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [nombreNuevaLista, setNombreNuevaLista] = useState('');
  const [listaExpandida, setListaExpandida] = useState(null);

  useEffect(() => {
    if (!djUserId) return;

    const unsubscribe = subscribeToListasDJ(djUserId, (listasActualizadas) => {
      setListas(listasActualizadas);
    });

    return () => unsubscribe();
  }, [djUserId]);

  const handleCrearLista = async (e) => {
    e.preventDefault();
    
    if (!nombreNuevaLista.trim()) {
      alert('Por favor ingresa un nombre para la lista');
      return;
    }

    const result = await crearListaDJ(nombreNuevaLista, djUserId);
    
    if (result.success) {
      setNombreNuevaLista('');
      setShowCreateModal(false);
      alert('✓ Lista creada exitosamente');
    } else {
      alert('❌ Error al crear la lista');
    }
  };

  const handleEliminarLista = async (listaId, nombreLista) => {
    const confirmar = confirm(`¿Eliminar la lista "${nombreLista}"? Esta acción no se puede deshacer.`);
    if (!confirmar) return;

    const result = await deleteLista(listaId);
    if (result.success) {
      alert('✓ Lista eliminada');
    } else {
      alert('❌ Error al eliminar la lista');
    }
  };

  const handleEliminarCancion = async (listaId, cancionId) => {
    const confirmar = confirm('¿Eliminar esta canción de la lista?');
    if (!confirmar) return;

    const result = await removeCancionFromLista(listaId, cancionId);
    if (result.success) {
      alert('✓ Canción eliminada de la lista');
    } else {
      alert('❌ Error al eliminar la canción');
    }
  };

  const handleCargarAReproduccion = async (listaId, nombreLista) => {
    const confirmar = confirm(`¿Cargar toda la lista "${nombreLista}" a la reproducción actual?`);
    if (!confirmar) return;

    const result = await cargarListaAReproduccion(listaId);
    
    if (result.success) {
      alert(`✓ ${result.cantidadCanciones} canciones cargadas a reproducción`);
    } else {
      alert(`❌ ${result.error}`);
    }
  };

  const toggleExpandir = (listaId) => {
    setListaExpandida(listaExpandida === listaId ? null : listaId);
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="listas-dj">
      <div className="listas-header">
        <h2>📚 Mis Listas de Reproducción</h2>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn-crear-lista"
        >
          ➕ Nueva Lista
        </button>
      </div>

      {listas.length === 0 ? (
        <div className="empty-listas">
          <div className="empty-icon">📚</div>
          <h3>No tienes listas guardadas</h3>
          <p>Crea tu primera lista para empezar a organizar tu música</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn-crear-primera"
          >
            ➕ Crear Mi Primera Lista
          </button>
        </div>
      ) : (
        <div className="listas-grid">
          {listas.map((lista) => (
            <div key={lista.id} className="lista-card">
              <div className="lista-card-header">
                <div className="lista-info-header">
                  <h3>{lista.nombre}</h3>
                  <p className="lista-meta">
                    {lista.canciones?.length || 0} canciones • 
                    Creada: {formatFecha(lista.fechaCreacion)}
                  </p>
                </div>
                
                <div className="lista-actions-header">
                  <button
                    onClick={() => handleCargarAReproduccion(lista.id, lista.nombre)}
                    className="btn-cargar"
                    title="Cargar a reproducción"
                    disabled={!lista.canciones || lista.canciones.length === 0}
                  >
                    ▶️
                  </button>
                  <button
                    onClick={() => toggleExpandir(lista.id)}
                    className="btn-expandir"
                  >
                    {listaExpandida === lista.id ? '🔼' : '🔽'}
                  </button>
                  <button
                    onClick={() => handleEliminarLista(lista.id, lista.nombre)}
                    className="btn-eliminar-lista"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {listaExpandida === lista.id && (
                <div className="lista-canciones">
                  {!lista.canciones || lista.canciones.length === 0 ? (
                    <p className="empty-canciones">
                      Esta lista está vacía. Busca canciones en la Biblioteca y añádelas aquí.
                    </p>
                  ) : (
                    lista.canciones.map((cancion, index) => (
                      <div key={`${cancion.id}-${index}`} className="cancion-item">
                        <span className="cancion-numero">{index + 1}</span>
                        <img 
                          src={cancion.albumCover} 
                          alt={cancion.album}
                          className="cancion-cover-small"
                        />
                        <div className="cancion-info-small">
                          <p className="cancion-nombre">{cancion.name}</p>
                          <p className="cancion-artista">{cancion.artist}</p>
                        </div>
                        <span className="cancion-duracion">
                          {formatDuration(cancion.duration)}
                        </span>
                        <button
                          onClick={() => handleEliminarCancion(lista.id, cancion.id)}
                          className="btn-eliminar-cancion"
                          title="Eliminar de la lista"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal para crear lista */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Crear Nueva Lista</h3>
            <form onSubmit={handleCrearLista}>
              <input
                type="text"
                value={nombreNuevaLista}
                onChange={(e) => setNombreNuevaLista(e.target.value)}
                placeholder="Nombre de la lista (ej: Fiesta Viernes)"
                className="input-nombre-lista"
                maxLength={50}
                autoFocus
              />
              <div className="modal-buttons">
                <button type="submit" className="btn-confirmar">
                  ✓ Crear Lista
                </button>
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)} 
                  className="btn-cancelar"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListasDJ;