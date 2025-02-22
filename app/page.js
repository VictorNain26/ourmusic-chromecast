"use client"
import { useEffect } from 'react';

export default function Home() {
  // Fonction de mise à jour de l'interface du receiver avec les métadonnées
  const updateUI = (data) => {
    const titleEl = document.getElementById('title');
    const subtitleEl = document.getElementById('subtitle');
    const artEl = document.getElementById('art');

    if (titleEl) titleEl.textContent = data.title || 'Inconnu';
    if (subtitleEl) subtitleEl.textContent = data.subtitle || '';
    if (artEl) {
      if (data.image) {
        artEl.src = data.image;
        artEl.style.display = 'block';
      } else {
        artEl.style.display = 'none';
      }
    }
  };

  // Initialisation du Cast Receiver Framework
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js';
    script.async = true;
    script.onload = () => {
      const context = window.cast.framework.CastReceiverContext.getInstance();
      const playerManager = context.getPlayerManager();

      // Intercepteur sur les messages LOAD (optionnel)
      playerManager.setMessageInterceptor(
        window.cast.framework.messages.MessageType.LOAD,
        (request) => {
          if (request.media && request.media.metadata) {
            const metadata = request.media.metadata;
            const title = metadata.title || 'Inconnu';
            const subtitle = metadata.subtitle || '';
            const image =
              (metadata.images && metadata.images[0] && metadata.images[0].url) || '';
            updateUI({ title, subtitle, image });
          }
          return request;
        }
      );

      context.start();
    };
    document.body.appendChild(script);
    return () => document.body.removeChild(script);
  }, []);

  // Connexion SSE directe vers AzuraCast
  useEffect(() => {
    // URL SSE d'AzuraCast (connexion directe, sans passer par le backend)
    const azuraSSEUrl = "https://ourmusic-azuracast.ovh/api/live/nowplaying/sse";
    const sse = new EventSource(azuraSSEUrl);
    sse.onopen = () => {
      console.log("Receiver : connexion SSE établie directement vers AzuraCast.");
    };
    sse.onmessage = (event) => {
      if (event.data.trim() === '.') return;
      try {
        const jsonData = JSON.parse(event.data);
        // Gestion des formats attendus
        if (jsonData.pub && jsonData.pub.data && jsonData.pub.data.np) {
          const np = jsonData.pub.data.np;
          if (np.now_playing && np.now_playing.song) {
            const song = np.now_playing.song;
            updateUI({ title: song.title, subtitle: song.artist, image: song.art || "" });
          }
        } else if (jsonData.connect && Array.isArray(jsonData.connect.data)) {
          jsonData.connect.data.forEach(row => {
            if (row.np && row.np.now_playing && row.np.now_playing.song) {
              const song = row.np.now_playing.song;
              updateUI({ title: song.title, subtitle: song.artist, image: song.art || "" });
            }
          });
        }
      } catch (err) {
        console.error("Receiver : erreur de parsing SSE :", err);
      }
    };
    sse.onerror = (error) => {
      console.error("Receiver : erreur SSE :", error);
      sse.close();
    };
    return () => sse.close();
  }, []);

  return (
    <div
      style={{
        backgroundColor: '#000',
        color: '#fff',
        fontFamily: 'sans-serif',
        textAlign: 'center',
        padding: '20px',
      }}
    >
      <div id="metadata">
        <h1 id="title">En attente...</h1>
        <h2 id="subtitle"></h2>
        <img
          id="art"
          src=""
          alt="Album Art"
          style={{ display: 'none', maxWidth: '300px', borderRadius: '8px' }}
        />
      </div>
    </div>
  );
}
