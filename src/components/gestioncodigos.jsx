// src/components/GestionCodigos.jsx
import { useState, useEffect } from 'react';
import {
  subscribeToCodigos,
  crearCodigoPremium,
  eliminarCodigo,
  generarCodigoAleatorio
} from '../services/peticionesService';
import './GestionCodigos.css';

function GestionCodigos() {
  const [codigos, setCodigos] = useState([]);
  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // 🔥 Estado para popup de eliminación
  const [codigoAEliminar, setCodigoAEliminar] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToCodigos((codigosActualizados) => {
      setCodigos(codigosActualizados);
    });

    return () => unsubscribe();
  }, []);

  const handleGenerarAleatorio = () => {
    const codigo = generarCodigoAleatorio();
    setNuevoCodigo(codigo);
  };

  const handleCrearCodigo = async () => {
    if (!nuevoCodigo.trim()) {
      setError('Ingresa un código');
      return;
    }

    if (nuevoCodigo.length !== 6) {
      setError('El código debe tener exactamente 6 caracteres');
      return;
    }

    const result = await crearCodigoPremium(nuevoCodigo);

    if (result.success) {
      setExito(`✅ Código ${nuevoCodigo.toUpperCase()} creado exitosamente`);
      setNuevoCodigo('');
      setError('');
      
      setTimeout(() => setExito(''), 3000);
    } else {
      setError(result.error);
    }
  };

  // 🔥 Crear 10 códigos automáticos
  const handleCrearLote = async () => {
    setError('');
    setExito('');
    const generados = [];

    try {
      for (let i = 0; i < 10; i++) {
        const codigo = generarCodigoAleatorio();
        const result = await crearCodigoPremium(codigo);
        if (result.success) {
          generados.push(codigo);
        }
      }

      if (generados.length > 0) {
        setExito(`✨ Se generaron ${generados.length} códigos automáticamente`);
        setTimeout(() => setExito(''), 3500);
      } else {
        setError('❌ No se pudo crear ningún código');
      }
    } catch (e) {
      setError('❌ Error al crear los códigos. Intenta de nuevo.');
    }
  };

  // 📥 Descargar códigos disponibles
  const handleDescargarDisponibles = () => {
    if (codigosDisponibles.length === 0) {
      alert('No hay códigos disponibles para descargar.');
      return;
    }

    const contenido = codigosDisponibles.map(c => c.codigo).join('\n');
    downloadFile(contenido, "codigos-disponibles");
  };

  // 📥 Descargar códigos usados con fecha
  const handleDescargarUsados = () => {
    if (codigosUsados.length === 0) {
      alert('No hay códigos usados para descargar.');
      return;
    }

    const contenido = codigosUsados
      .map(c => `${c.codigo} - Usado: ${formatFecha(c.fechaUso)}`)
      .join('\n');

    downloadFile(contenido, "codigos-usados");
  };

  // Helper genérico para descargar TXT
  const downloadFile = (contenido, nombre) => {
    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombre}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 🔁 Abrir popup de eliminación (en vez de window.confirm)
  const handleEliminarClick = (codigo) => {
    setCodigoAEliminar(codigo);
    setShowDeleteModal(true);
    setError('');
  };

  const handleConfirmEliminar = async () => {
    if (!codigoAEliminar) return;

    setIsDeleting(true);
    const result = await eliminarCodigo(codigoAEliminar.firebaseId);

    if (!result.success) {
      setError('Error al eliminar el código');
    }

    setIsDeleting(false);
    setShowDeleteModal(false);
    setCodigoAEliminar(null);
  };

  const handleCancelEliminar = () => {
    if (isDeleting) return;
    setShowDeleteModal(false);
    setCodigoAEliminar(null);
  };

  const formatFecha = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const codigosDisponibles = codigos.filter(c => !c.usado);
  const codigosUsados = codigos.filter(c => c.usado);

  return (
    <div className="gestion-codigos">
      <h2>🎫 Gestión de Códigos Premium</h2>

      {/* Crear Nuevo Código */}
      <div className="crear-codigo-section">
        <h3>Crear Nuevo Código</h3>
        
        <div className="crear-codigo-form">
          <input
            type="text"
            className="input-codigo"
            placeholder="Ej: ABC123"
            value={nuevoCodigo}
            onChange={(e) => setNuevoCodigo(e.target.value.toUpperCase())}
            maxLength={6}
          />
          
          <button onClick={handleGenerarAleatorio} className="btn-generar">
            🎲 Generar Aleatorio
          </button>
          
          <button onClick={handleCrearCodigo} className="btn-crear">
            ✓ Crear Código
          </button>

          <button onClick={handleCrearLote} className="btn-crear">
            ⚡ Crear 10 Automáticos
          </button>
        </div>

        {error && <p className="mensaje-error">{error}</p>}
        {exito && <p className="mensaje-exito">{exito}</p>}
      </div>

      {/* Códigos Disponibles */}
      <div className="codigos-section disponibles">
        <h3>✅ Códigos Disponibles ({codigosDisponibles.length})</h3>

        {codigosDisponibles.length > 0 && (
          <button
            onClick={handleDescargarDisponibles}
            className="btn-crear"
            style={{ marginBottom: 15 }}
          >
            📥 Descargar Códigos Disponibles
          </button>
        )}

        {codigosDisponibles.length === 0 ? (
          <p className="empty-message">No hay códigos disponibles</p>
        ) : (
          <div className="codigos-grid">
            {codigosDisponibles.map((codigo) => (
              <div key={codigo.firebaseId} className="codigo-card disponible">
                <div className="codigo-header">
                  <span className="codigo-text">{codigo.codigo}</span>
                  <span className="badge-disponible">Disponible</span>
                </div>
                <div className="codigo-footer">
                  <span className="fecha-creacion">
                    📅 {formatFecha(codigo.fechaCreacion)}
                  </span>
                  <button
                    onClick={() => handleEliminarClick(codigo)}
                    className="btn-eliminar-codigo"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Códigos Usados */}
      <div className="codigos-section usados">
        <h3>📜 Códigos Usados ({codigosUsados.length})</h3>

        {codigosUsados.length > 0 && (
          <button
            onClick={handleDescargarUsados}
            className="btn-crear"
            style={{ marginBottom: 15 }}
          >
            📥 Descargar Códigos Usados
          </button>
        )}
        
        {codigosUsados.length === 0 ? (
          <p className="empty-message">No hay códigos usados</p>
        ) : (
          <div className="codigos-grid">
            {codigosUsados.map((codigo) => (
              <div key={codigo.firebaseId} className="codigo-card usado">
                <div className="codigo-header">
                  <span className="codigo-text">{codigo.codigo}</span>
                  <span className="badge-usado">Usado</span>
                </div>
                <div className="codigo-footer">
                  <div className="codigo-fechas">
                    <span className="fecha-small">
                      Creado: {formatFecha(codigo.fechaCreacion)}
                    </span>
                    <span className="fecha-small">
                      Usado: {formatFecha(codigo.fechaUso)}
                    </span>
                  </div>
                  <button
                    onClick={() => handleEliminarClick(codigo)}
                    className="btn-eliminar-codigo"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* POPUP ELIMINAR CÓDIGO */}
      {showDeleteModal && codigoAEliminar && (
        <div
          className="modal-overlay"
          onClick={handleCancelEliminar}
        >
          <div
            className="delete-popup"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="delete-popup-header">
              <h3>Eliminar código</h3>
              <button
                className="close-btn"
                onClick={handleCancelEliminar}
                disabled={isDeleting}
              >
                ✕
              </button>
            </div>

            <div className="delete-popup-body">
              <div className="cancion-preview">
                <div className="preview-info">
                  <h4>Código: {codigoAEliminar.codigo}</h4>
                  <p>Creado: {formatFecha(codigoAEliminar.fechaCreacion)}</p>
                </div>
              </div>

              <p className="warning-text">
                ¿Seguro que deseas eliminar este código? <br />
                Esta acción <strong>no se puede deshacer</strong>.
              </p>

              <div className="delete-popup-actions">
                <button
                  className="btn-cancel"
                  onClick={handleCancelEliminar}
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  className="btn-delete-confirm"
                  onClick={handleConfirmEliminar}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar Código'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default GestionCodigos;
