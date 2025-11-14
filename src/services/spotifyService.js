// src/services/spotifyService.js

const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

let accessToken = null;
let tokenExpiration = null;

// Obtener token de acceso de Spotify
async function getAccessToken() {
  // Si ya tenemos un token válido, lo retornamos
  if (accessToken && tokenExpiration && Date.now() < tokenExpiration) {
    return accessToken;
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(CLIENT_ID + ':' + CLIENT_SECRET)
    },
    body: 'grant_type=client_credentials'
  });

  const data = await response.json();
  accessToken = data.access_token;
  // El token expira en 1 hora, guardamos el tiempo
  tokenExpiration = Date.now() + (data.expires_in * 1000);
  
  return accessToken;
}

// Buscar canciones en Spotify
export async function searchTracks(query) {
  if (!query || query.trim() === '') {
    return [];
  }

  try {
    const token = await getAccessToken();
    
    // Añadimos market=US para aumentar disponibilidad de previews
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20&market=US`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const data = await response.json();
    
    // Formatear los resultados para que sean más fáciles de usar
    return data.tracks.items.map(track => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      albumCover: track.album.images[1]?.url || track.album.images[0]?.url, // Imagen mediana
      previewUrl: track.preview_url, // URL del preview de 30 segundos
      duration: track.duration_ms,
      spotifyUrl: track.external_urls.spotify
    }));
  } catch (error) {
    console.error('Error buscando canciones:', error);
    return [];
  }
}

// Obtener detalles de una canción específica por ID
export async function getTrackById(trackId) {
  try {
    const token = await getAccessToken();
    
    const response = await fetch(
      `https://api.spotify.com/v1/tracks/${trackId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const track = await response.json();
    
    return {
      id: track.id,
      name: track.name,
      artist: track.artists.map(artist => artist.name).join(', '),
      album: track.album.name,
      albumCover: track.album.images[1]?.url || track.album.images[0]?.url,
      previewUrl: track.preview_url,
      duration: track.duration_ms,
      spotifyUrl: track.external_urls.spotify
    };
  } catch (error) {
    console.error('Error obteniendo detalles de la canción:', error);
    return null;
  }
}