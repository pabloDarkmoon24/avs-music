// src/services/peticionesService.js
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc,
  query,
  orderBy,
  getDoc,
  getDocs,
  where
} from 'firebase/firestore';
import { db } from './firebase';

// Colecciones de Firebase
const PETICIONES_BASICAS = 'peticiones_basicas';
const PETICIONES_PREMIUM = 'peticiones_premium';
const LISTA_REPRODUCCION = 'lista_reproduccion';
const CODIGOS_PREMIUM = 'codigos_premium';
const LISTAS_DJ = 'listas_dj'; // Nueva colección para listas guardadas del DJ

// ==================== PETICIONES BÁSICAS ====================

// Añadir petición básica
export async function addPeticionBasica(track) {
  console.log('🔥 Intentando guardar en Firebase:', track);
  try {
    const docRef = await addDoc(collection(db, PETICIONES_BASICAS), {
      ...track,
      timestamp: new Date(), // Usar fecha local en lugar de serverTimestamp
      estado: 'pendiente' // pendiente, aprobada, rechazada
    });
    console.log('✅ Guardado exitosamente con ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('❌ Error añadiendo petición básica:', error);
    return { success: false, error: error.message };
  }
}

// Escuchar cambios en peticiones básicas (tiempo real)
export function subscribeToPeticionesBasicas(callback) {
  const q = query(
    collection(db, PETICIONES_BASICAS),
    orderBy('timestamp', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const peticiones = [];
    snapshot.forEach((doc) => {
      peticiones.push({ 
        firebaseId: doc.id,  // ID del documento de Firebase
        ...doc.data()        // Datos incluyendo el id de Spotify
      });
    });
    callback(peticiones);
  });
}

// Eliminar petición básica
export async function deletePeticionBasica(peticionId) {
  try {
    await deleteDoc(doc(db, PETICIONES_BASICAS, peticionId));
    return { success: true };
  } catch (error) {
    console.error('Error eliminando petición básica:', error);
    return { success: false, error: error.message };
  }
}

// Actualizar estado de petición básica (aprobada/rechazada)
export async function updateEstadoPeticionBasica(peticionId, nuevoEstado) {
  console.log(`🔄 Actualizando petición ${peticionId} a estado: ${nuevoEstado}`);
  try {
    const docRef = doc(db, PETICIONES_BASICAS, peticionId);
    
    // Primero verificar que existe
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.error(`❌ El documento ${peticionId} NO EXISTE en Firebase`);
      return { success: false, error: 'Documento no existe' };
    }
    
    console.log(`✓ Documento encontrado, actualizando estado...`);
    
    // Actualizar SOLO el campo estado
    await updateDoc(docRef, {
      estado: nuevoEstado
    });
    
    console.log(`✅ Estado actualizado exitosamente a: ${nuevoEstado}`);
    
    // Verificar que se actualizó
    const docVerify = await getDoc(docRef);
    console.log(`🔍 Verificación - Estado actual en Firebase:`, docVerify.data().estado);
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Error actualizando estado:`, error);
    return { success: false, error: error.message };
  }
}

// ==================== PETICIONES PREMIUM ====================

// Añadir petición premium
export async function addPeticionPremium(track, codigo) {
  console.log('🔥 Intentando guardar petición premium en Firebase:', track, 'Código:', codigo);
  try {
    // Guardar la petición
    const docRef = await addDoc(collection(db, PETICIONES_PREMIUM), {
      ...track,
      codigo,
      timestamp: new Date(),
      estado: 'pendiente'
    });
    console.log('✅ Petición premium guardada con ID:', docRef.id);
    
    // Marcar el código como usado
    await marcarCodigoComoUsado(codigo);
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('❌ Error añadiendo petición premium:', error);
    return { success: false, error: error.message };
  }
}

// Escuchar cambios en peticiones premium (tiempo real)
export function subscribeToPeticionesPremium(callback) {
  const q = query(
    collection(db, PETICIONES_PREMIUM),
    orderBy('timestamp', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const peticiones = [];
    snapshot.forEach((doc) => {
      peticiones.push({ 
        firebaseId: doc.id,  // ID del documento de Firebase
        ...doc.data()        // Datos incluyendo el id de Spotify
      });
    });
    callback(peticiones);
  });
}

// Eliminar petición premium
export async function deletePeticionPremium(peticionId) {
  try {
    await deleteDoc(doc(db, PETICIONES_PREMIUM, peticionId));
    return { success: true };
  } catch (error) {
    console.error('Error eliminando petición premium:', error);
    return { success: false, error: error.message };
  }
}

// Actualizar estado de petición premium (aprobada/rechazada)
export async function updateEstadoPeticionPremium(peticionId, nuevoEstado) {
  console.log(`🔄 Actualizando petición premium ${peticionId} a estado: ${nuevoEstado}`);
  try {
    const docRef = doc(db, PETICIONES_PREMIUM, peticionId);
    
    // Primero verificar que existe
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      console.error(`❌ El documento premium ${peticionId} NO EXISTE en Firebase`);
      return { success: false, error: 'Documento no existe' };
    }
    
    console.log(`✓ Documento premium encontrado, actualizando estado...`);
    
    // Actualizar SOLO el campo estado
    await updateDoc(docRef, {
      estado: nuevoEstado
    });
    
    console.log(`✅ Estado premium actualizado exitosamente a: ${nuevoEstado}`);
    
    // Verificar que se actualizó
    const docVerify = await getDoc(docRef);
    console.log(`🔍 Verificación - Estado actual en Firebase:`, docVerify.data().estado);
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Error actualizando estado premium:`, error);
    return { success: false, error: error.message };
  }
}

// ==================== LISTA DE REPRODUCCIÓN ====================

// Añadir canción a lista de reproducción (cuando DJ aprueba)
export async function addToListaReproduccion(track, orden = 0) {
  try {
    // Excluir firebaseId del track (ya que es el ID de la petición, no de la lista)
    const { firebaseId, ...trackData } = track;
    
    const docRef = await addDoc(collection(db, LISTA_REPRODUCCION), {
      ...trackData,
      orden,
      timestamp: new Date(), // Usar fecha local
      estado: 'en_espera' // en_espera, reproduciendo, reproducida
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error añadiendo a lista de reproducción:', error);
    return { success: false, error: error.message };
  }
}

// Escuchar cambios en lista de reproducción (tiempo real)
export function subscribeToListaReproduccion(callback) {
  const q = query(
    collection(db, LISTA_REPRODUCCION),
    orderBy('orden', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const lista = [];
    snapshot.forEach((doc) => {
      lista.push({ 
        firebaseId: doc.id,  // ID del documento de Firebase
        ...doc.data()        // Datos incluyendo el id de Spotify
      });
    });
    callback(lista);
  });
}

// Actualizar orden de canción en lista
export async function updateOrdenCancion(cancionId, nuevoOrden) {
  try {
    const docRef = doc(db, LISTA_REPRODUCCION, cancionId);
    
    // Verificar si el documento existe antes de actualizar
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      // Silencioso - no mostrar en consola
      return { success: false, error: 'Documento no existe' };
    }
    
    await updateDoc(docRef, {
      orden: nuevoOrden
    });
    return { success: true };
  } catch (error) {
    // Solo mostrar errores reales, no documentos inexistentes
    if (error.code !== 'not-found') {
      console.error('Error actualizando orden:', error);
    }
    return { success: false, error: error.message };
  }
}

// Actualizar estado de canción (reproduciendo, reproducida)
export async function updateEstadoCancion(cancionId, nuevoEstado) {
  try {
    const docRef = doc(db, LISTA_REPRODUCCION, cancionId);
    
    // Verificar si el documento existe antes de actualizar
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      // Silencioso - no mostrar en consola
      return { success: false, error: 'Documento no existe' };
    }
    
    await updateDoc(docRef, {
      estado: nuevoEstado
    });
    return { success: true };
  } catch (error) {
    // Solo mostrar errores reales
    if (error.code !== 'not-found') {
      console.error('Error actualizando estado:', error);
    }
    return { success: false, error: error.message };
  }
}

// Eliminar canción de lista de reproducción
export async function deleteFromListaReproduccion(cancionId) {
  console.log('🗑️ Intentando eliminar de lista de reproducción. ID recibido:', cancionId);
  try {
    const docRef = doc(db, LISTA_REPRODUCCION, cancionId);
    console.log('📄 Referencia del documento:', docRef.path);
    
    await deleteDoc(docRef);
    
    console.log('✅ Documento eliminado exitosamente de la colección:', LISTA_REPRODUCCION);
    return { success: true };
  } catch (error) {
    console.error('❌ Error eliminando de lista:', error);
    console.error('❌ ID que se intentó eliminar:', cancionId);
    console.error('❌ Colección:', LISTA_REPRODUCCION);
    return { success: false, error: error.message };
  }
}

// ==================== CÓDIGOS PREMIUM ====================

// Validar código premium contra la base de datos
export async function validarCodigoPremium(codigo) {
  try {
    console.log('🔍 Validando código:', codigo);
    
    // Buscar el código en la base de datos
    const q = query(
      collection(db, CODIGOS_PREMIUM),
      where('codigo', '==', codigo.toUpperCase())
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('❌ Código no encontrado');
      return false;
    }
    
    // Verificar si el código ya fue usado
    const codigoDoc = snapshot.docs[0];
    const codigoData = codigoDoc.data();
    
    if (codigoData.usado) {
      console.log('❌ Código ya fue usado');
      return false;
    }
    
    console.log('✅ Código válido');
    return true;
  } catch (error) {
    console.error('Error validando código:', error);
    return false;
  }
}

// Marcar código como usado
export async function marcarCodigoComoUsado(codigo) {
  try {
    console.log('📝 Marcando código como usado:', codigo);
    
    const q = query(
      collection(db, CODIGOS_PREMIUM),
      where('codigo', '==', codigo.toUpperCase())
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return { success: false, error: 'Código no encontrado' };
    }
    
    const codigoDoc = snapshot.docs[0];
    await updateDoc(codigoDoc.ref, {
      usado: true,
      fechaUso: new Date()
    });
    
    console.log('✅ Código marcado como usado');
    return { success: true };
  } catch (error) {
    console.error('Error marcando código como usado:', error);
    return { success: false, error: error.message };
  }
}

// Crear código premium (para el DJ)
export async function crearCodigoPremium(codigo) {
  try {
    // Verificar que el código tenga 6 caracteres
    if (codigo.length !== 6) {
      return { success: false, error: 'El código debe tener exactamente 6 caracteres' };
    }
    
    // Verificar si el código ya existe
    const q = query(
      collection(db, CODIGOS_PREMIUM),
      where('codigo', '==', codigo.toUpperCase())
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      return { success: false, error: 'Este código ya existe' };
    }
    
    // Crear el código
    const docRef = await addDoc(collection(db, CODIGOS_PREMIUM), {
      codigo: codigo.toUpperCase(),
      usado: false,
      fechaCreacion: new Date()
    });
    
    console.log('✅ Código creado:', codigo.toUpperCase());
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creando código:', error);
    return { success: false, error: error.message };
  }
}

// Generar código aleatorio
export function generarCodigoAleatorio() {
  const caracteres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return codigo;
}

// Obtener todos los códigos (para el DJ)
export function subscribeToCodigos(callback) {
  const q = query(
    collection(db, CODIGOS_PREMIUM),
    orderBy('fechaCreacion', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const codigos = [];
    snapshot.forEach((doc) => {
      codigos.push({ 
        firebaseId: doc.id, 
        ...doc.data() 
      });
    });
    callback(codigos);
  });
}

// Eliminar código
export async function eliminarCodigo(codigoId) {
  try {
    await deleteDoc(doc(db, CODIGOS_PREMIUM, codigoId));
    console.log('✅ Código eliminado');
    return { success: true };
  } catch (error) {
    console.error('Error eliminando código:', error);
    return { success: false, error: error.message };
  }
}

// ==================== LISTAS GUARDADAS DEL DJ ====================

// Crear nueva lista
export async function crearListaDJ(nombreLista, djUserId) {
  try {
    const docRef = await addDoc(collection(db, LISTAS_DJ), {
      nombre: nombreLista,
      djUserId,
      canciones: [],
      fechaCreacion: new Date(),
      fechaModificacion: new Date()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creando lista:', error);
    return { success: false, error: error.message };
  }
}

// Obtener todas las listas del DJ
export function subscribeToListasDJ(djUserId, callback) {
  const q = query(
    collection(db, LISTAS_DJ),
    orderBy('fechaCreacion', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const listas = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Solo incluir listas del DJ actual
      if (data.djUserId === djUserId) {
        listas.push({ id: doc.id, ...data });
      }
    });
    callback(listas);
  });
}

// Añadir canción a una lista
export async function addCancionToLista(listaId, cancion) {
  try {
    const listaRef = doc(db, LISTAS_DJ, listaId);
    const listaDoc = await getDoc(listaRef);
    
    if (!listaDoc.exists()) {
      return { success: false, error: 'Lista no encontrada' };
    }

    const listaData = listaDoc.data();
    const cancionesActuales = listaData.canciones || [];
    
    // Verificar si la canción ya está en la lista
    const yaExiste = cancionesActuales.some(c => c.id === cancion.id);
    if (yaExiste) {
      return { success: false, error: 'La canción ya está en esta lista' };
    }

    await updateDoc(listaRef, {
      canciones: [...cancionesActuales, cancion],
      fechaModificacion: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error('Error añadiendo canción a lista:', error);
    return { success: false, error: error.message };
  }
}

// Eliminar canción de una lista
export async function removeCancionFromLista(listaId, cancionId) {
  try {
    const listaRef = doc(db, LISTAS_DJ, listaId);
    const listaDoc = await getDoc(listaRef);
    
    if (!listaDoc.exists()) {
      return { success: false, error: 'Lista no encontrada' };
    }

    const listaData = listaDoc.data();
    const cancionesFiltradas = listaData.canciones.filter(c => c.id !== cancionId);

    await updateDoc(listaRef, {
      canciones: cancionesFiltradas,
      fechaModificacion: new Date()
    });

    return { success: true };
  } catch (error) {
    console.error('Error eliminando canción de lista:', error);
    return { success: false, error: error.message };
  }
}

// Eliminar lista completa
export async function deleteLista(listaId) {
  try {
    await deleteDoc(doc(db, LISTAS_DJ, listaId));
    return { success: true };
  } catch (error) {
    console.error('Error eliminando lista:', error);
    return { success: false, error: error.message };
  }
}

// Cargar lista completa a reproducción actual
export async function cargarListaAReproduccion(listaId) {
  try {
    const listaRef = doc(db, LISTAS_DJ, listaId);
    const listaDoc = await getDoc(listaRef);
    
    if (!listaDoc.exists()) {
      return { success: false, error: 'Lista no encontrada' };
    }

    const listaData = listaDoc.data();
    const canciones = listaData.canciones || [];

    if (canciones.length === 0) {
      return { success: false, error: 'La lista está vacía' };
    }

    // Añadir cada canción a la lista de reproducción
    for (let i = 0; i < canciones.length; i++) {
      await addToListaReproduccion(canciones[i], i);
    }

    return { success: true, cantidadCanciones: canciones.length };
  } catch (error) {
    console.error('Error cargando lista a reproducción:', error);
    return { success: false, error: error.message };
  }
}

// ========================================
// HISTORIAL DE REPRODUCCIÓN
// ========================================

const HISTORIAL_REPRODUCCION = 'historial_reproduccion';

// Marcar canción como reproducida (mover de cola a historial)
export async function marcarComoReproducida(cancion) {
  try {
    console.log('📝 Marcando como reproducida:', {
      firebaseId: cancion.firebaseId,
      spotifyId: cancion.id,
      name: cancion.name
    });

    // 1. Añadir al historial
    const historialDoc = await addDoc(collection(db, HISTORIAL_REPRODUCCION), {
      ...cancion,
      reproducidaAt: new Date(),
      tipoPeticion: cancion.tipoPeticion || 'basica' // Asegurar que tenga tipo
    });
    console.log('✅ Añadida al historial con ID:', historialDoc.id);

    // 2. Eliminar de la cola de reproducción usando firebaseId
    const firebaseIdToDelete = cancion.firebaseId;
    
    if (!firebaseIdToDelete) {
      console.error('❌ ERROR CRÍTICO: No hay firebaseId para eliminar!');
      console.error('Canción completa:', cancion);
      throw new Error('No se puede eliminar: falta firebaseId');
    }
    
    console.log('🗑️ Eliminando de cola con firebaseId:', firebaseIdToDelete);
    
    const deleteResult = await deleteFromListaReproduccion(firebaseIdToDelete);
    
    if (!deleteResult.success) {
      console.error('❌ Error al eliminar de la cola:', deleteResult.error);
      throw new Error('No se pudo eliminar de la cola: ' + deleteResult.error);
    }
    
    console.log('✅ Eliminada de la cola');

    console.log('🎉 Canción movida a historial exitosamente');
    return { success: true };
  } catch (error) {
    console.error('❌ Error marcando como reproducida:', error);
    return { success: false, error: error.message };
  }
}

// Escuchar cambios en el historial de reproducción
export function subscribeToHistorialReproduccion(callback) {
  const q = query(
    collection(db, HISTORIAL_REPRODUCCION),
    orderBy('reproducidaAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const historial = [];
    snapshot.forEach((doc) => {
      historial.push({ 
        firebaseId: doc.id,
        ...doc.data() 
      });
    });
    callback(historial);
  });
}

// Limpiar historial (opcional, para el DJ)
export async function limpiarHistorial() {
  try {
    const q = query(collection(db, HISTORIAL_REPRODUCCION));
    const snapshot = await getDocs(q);
    
    const deletePromises = [];
    snapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    
    console.log('✅ Historial limpiado');
    return { success: true };
  } catch (error) {
    console.error('Error limpiando historial:', error);
    return { success: false, error: error.message };
  }
}

// Limpiar cola de reproducción
export async function limpiarColaReproduccion() {
  try {
    const q = query(collection(db, LISTA_REPRODUCCION));
    const snapshot = await getDocs(q);
    
    const deletePromises = [];
    snapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    
    console.log('✅ Cola de reproducción limpiada');
    return { success: true };
  } catch (error) {
    console.error('Error limpiando cola:', error);
    return { success: false, error: error.message };
  }
}

// Limpiar peticiones básicas
export async function limpiarPeticionesBasicas() {
  try {
    const q = query(collection(db, PETICIONES_BASICAS));
    const snapshot = await getDocs(q);
    
    const deletePromises = [];
    snapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    
    console.log('✅ Peticiones básicas limpiadas');
    return { success: true };
  } catch (error) {
    console.error('Error limpiando peticiones básicas:', error);
    return { success: false, error: error.message };
  }
}

// Limpiar peticiones premium
export async function limpiarPeticionesPremium() {
  try {
    const q = query(collection(db, PETICIONES_PREMIUM));
    const snapshot = await getDocs(q);
    
    const deletePromises = [];
    snapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    
    console.log('✅ Peticiones premium limpiadas');
    return { success: true };
  } catch (error) {
    console.error('Error limpiando peticiones premium:', error);
    return { success: false, error: error.message };
  }
}

// Limpiar TODO (función maestra)
export async function limpiarTodo() {
  try {
    console.log('🗑️ Limpiando TODA la base de datos...');
    
    // Ejecutar todas las limpiezas en paralelo
    const resultados = await Promise.all([
      limpiarColaReproduccion(),
      limpiarHistorial(),
      limpiarPeticionesBasicas(),
      limpiarPeticionesPremium()
    ]);
    
    // Verificar si todas fueron exitosas
    const todasExitosas = resultados.every(r => r.success);
    
    if (todasExitosas) {
      console.log('🎉 Base de datos completamente limpiada');
      return { success: true };
    } else {
      console.error('⚠️ Algunas colecciones no se pudieron limpiar');
      return { success: false, error: 'Error parcial al limpiar' };
    }
  } catch (error) {
    console.error('❌ Error limpiando todo:', error);
    return { success: false, error: error.message };
  }
}