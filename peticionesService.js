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
  getDoc
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
    const docRef = await addDoc(collection(db, PETICIONES_PREMIUM), {
      ...track,
      codigo,
      timestamp: new Date(), // Usar fecha local en lugar de serverTimestamp
      estado: 'pendiente'
    });
    console.log('✅ Petición premium guardada con ID:', docRef.id);
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
    const docRef = await addDoc(collection(db, LISTA_REPRODUCCION), {
      ...track,
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
      lista.push({ id: doc.id, ...doc.data() });
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
  try {
    await deleteDoc(doc(db, LISTA_REPRODUCCION, cancionId));
    return { success: true };
  } catch (error) {
    console.error('Error eliminando de lista:', error);
    return { success: false, error: error.message };
  }
}

// ==================== CÓDIGOS PREMIUM ====================

// Validar código premium
export async function validarCodigoPremium(codigo) {
  // Por ahora validación simple - en el futuro conectaremos con base de datos
  // Retorna true si el código es válido
  return codigo.length >= 6; // Validación básica por ahora
}

// Agregar código premium (para el DJ)
export async function addCodigoPremium(codigo) {
  try {
    const docRef = await addDoc(collection(db, CODIGOS_PREMIUM), {
      codigo,
      usado: false,
      fechaCreacion: new Date()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error añadiendo código premium:', error);
    return { success: false, error: error.message };
  }
}

// Marcar código como usado
export async function marcarCodigoUsado(codigoId) {
  try {
    await updateDoc(doc(db, CODIGOS_PREMIUM, codigoId), {
      usado: true,
      fechaUso: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error marcando código como usado:', error);
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