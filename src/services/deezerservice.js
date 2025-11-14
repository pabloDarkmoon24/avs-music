// src/services/deezerService.js

// Buscar UNA canción específica en Deezer (para obtener preview cuando Spotify no tenga)
export async function searchDeezerPreview(trackName, artistName) {
  try {
    const query = `${trackName} ${artistName}`;
    
    // Intentar diferentes proxies CORS
    const proxies = [
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://cors-anywhere.herokuapp.com/',
    ];
    
    // Primero intentamos sin proxy (en caso de que funcione directo)
    try {
      const directResponse = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`,
        { mode: 'cors' }
      );
      if (directResponse.ok) {
        const data = await directResponse.json();
        if (data.data && data.data.length > 0) {
          return data.data[0].preview;
        }
      }
    } catch (e) {
      // Si falla, intentar con proxy
    }

    // Intentar con proxy
    const response = await fetch(
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(
        `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`
      )}`
    );

    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
      return data.data[0].preview;
    }
    
    return null;
  } catch (error) {
    console.error('Error buscando preview en Deezer:', error);
    return null;
  }
}