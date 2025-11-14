// src/components/Biblioteca.jsx
import { useState, useRef } from 'react';
import { searchTracks } from '../services/spotifyService';
import { searchDeezerPreview } from '../services/deezerService';
import './Biblioteca.css';

function Biblioteca({ onAddToList }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPlaying, setCurrentPlaying] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(null);
  const [notification, setNotification] = useState(null);
  const audioRef = useRef(null);

  // Mostrar notificación
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Buscar canciones cuando el usuario escribe
  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    const results = await searchTracks(query);
    setSearchResults(results);
    setIsLoading(false);
  };

  // Reproducir preview (intenta Spotify primero, luego Deezer)
  const togglePreview = async (track) => {
    // Si ya está reproduciendo esta canción, pausarla
    if (currentPlaying === track.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentPlaying(null);
      return;
    }

    // Pausar cualquier canción anterior
    if (audioRef.current) {
      audioRef.current.pause();
    }

    // Si tiene preview de Spotify, usarlo directamente
    if (track.previewUrl) {
      audioRef.current = new Audio(track.previewUrl);
      audioRef.current.play();
      setCurrentPlaying(track.id);

      audioRef.current.onended = () => {
        setCurrentPlaying(null);
      };
    } else {
      // Si NO tiene preview de Spotify, buscar en Deezer
      setLoadingPreview(track.id);
      
      const deezerPreviewUrl = await searchDeezerPreview(track.name, track.artist);
      
      setLoadingPreview(null);
      
      if (deezerPreviewUrl) {
        audioRef.current = new Audio(deezerPreviewUrl);
        audioRef.current.play();
        setCurrentPlaying(track.id);

        audioRef.current.onended = () => {
          setCurrentPlaying(null);
        };
      } else {
        showNotification('😔 No se encontró preview disponible para esta canción', 'error');
      }
    }
  };

  // Abrir modal para elegir tipo de lista
  const handleAddClick = (track) => {
    // Pausar cualquier preview activo
    if (currentPlaying && audioRef.current) {
      audioRef.current.pause();
      setCurrentPlaying(null);
    }
    
    setSelectedTrack(track);
    setShowModal(true);
  };

  // Cerrar modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedTrack(null);
  };

  // Añadir a lista básica
  const addToBasicList = async () => {
    // Cerrar modal PRIMERO
    closeModal();
    
    // Mostrar notificación inmediatamente
    showNotification('✓ Canción añadida a la lista básica exitosamente', 'success');
    
    // Guardar en Firebase en segundo plano
    if (selectedTrack && onAddToList) {
      try {
        onAddToList(selectedTrack, 'basica');
        const { addPeticionBasica } = await import('../services/peticionesService');
        await addPeticionBasica(selectedTrack);
      } catch (error) {
        console.error('Error al guardar:', error);
        showNotification('❌ Error al guardar. Pero tu petición fue registrada.', 'error');
      }
    }
  };

  // Añadir a lista premium (con código)
  const addToPremiumList = async () => {
    const code = prompt('Ingresa tu código premium:');
    
    if (!code) {
      return; // Usuario canceló
    }

    try {
      // Validar código
      const { validarCodigoPremium } = await import('../services/peticionesService');
      const esValido = await validarCodigoPremium(code);

      if (esValido) {
        // Cerrar modal PRIMERO
        closeModal();
        
        // Mostrar notificación inmediatamente
        showNotification('✓ Canción añadida a la lista premium exitosamente', 'success');
        
        // Guardar en Firebase en segundo plano
        if (selectedTrack && onAddToList) {
          onAddToList(selectedTrack, 'premium', code);
          const { addPeticionPremium } = await import('../services/peticionesService');
          await addPeticionPremium(selectedTrack, code);
        }
      } else {
        showNotification('❌ Código inválido. Debe tener al menos 6 caracteres.', 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      showNotification('❌ Error al procesar. Intenta de nuevo.', 'error');
    }
  };

  // Formatear duración de milisegundos a MM:SS
  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div className="biblioteca">
      {/* Notificación Toast */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      <h2>🎵 Biblioteca Musical</h2>
      <p className="subtitle">Millones de canciones con previews disponibles</p>
      
      {/* Buscador */}
      <div className="search-box">
        <input
          type="text"
          placeholder="Busca tu canción favorita..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
        {isLoading && <span className="loading">Buscando...</span>}
      </div>

      {/* Resultados de búsqueda */}
      <div className="results">
        {searchResults.length === 0 && searchQuery && !isLoading && (
          <p className="no-results">No se encontraron resultados</p>
        )}

        {searchResults.map((track) => (
          <div key={track.id} className="track-card">
            {/* Portada del álbum */}
            <img 
              src={track.albumCover} 
              alt={track.album}
              className="album-cover"
            />

            {/* Información de la canción */}
            <div className="track-info">
              <h3 className="track-name">{track.name}</h3>
              <p className="track-artist">{track.artist}</p>
              <p className="track-album">{track.album}</p>
              <span className="track-duration">{formatDuration(track.duration)}</span>
              {!track.previewUrl && (
                <span className="preview-source">🔍 Buscará en fuentes alternativas</span>
              )}
            </div>

            {/* Botones de acción */}
            <div className="track-actions">
              {/* Botón de preview */}
              <button
                onClick={() => togglePreview(track)}
                className={`btn-preview ${currentPlaying === track.id ? 'playing' : ''}`}
                disabled={loadingPreview === track.id}
              >
                {loadingPreview === track.id ? (
                  '⏳ Buscando...'
                ) : currentPlaying === track.id ? (
                  '⏸️ Pausar'
                ) : (
                  '▶️ Preview'
                )}
              </button>

              {/* Botón añadir */}
              <button
                onClick={() => handleAddClick(track)}
                className="btn-add"
              >
                ➕ Añadir
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal para elegir tipo de lista */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>¿Dónde quieres añadir esta canción?</h3>
            
            <div className="selected-track-preview">
              <img src={selectedTrack?.albumCover} alt="" />
              <div>
                <p><strong>{selectedTrack?.name}</strong></p>
                <p>{selectedTrack?.artist}</p>
              </div>
            </div>

            <div className="modal-buttons">
              <button onClick={addToBasicList} className="btn-basic">
                📋 Lista Básica (Gratis)
              </button>
              <button onClick={addToPremiumList} className="btn-premium">
                ⭐ Lista Premium (Código)
              </button>
            </div>

            <button onClick={closeModal} className="btn-cancel">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Biblioteca;