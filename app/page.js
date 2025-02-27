"use client"
import { useState, useEffect } from 'react';

export default function Home() {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [error, setError] = useState('');

  // Fonction de mise à jour des informations reçues via SSE
  const updateNowPlaying = (npData) => {
    setNowPlaying(npData);
  };

  // Initialisation du Cast Receiver Framework
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js';
    script.async = true;
    script.onload = () => {
      const context = window.cast.framework.CastReceiverContext.getInstance();
      const playerManager = context.getPlayerManager();

      // Intercepteur sur le message LOAD pour éventuellement afficher des métadonnées issues du sender
      playerManager.setMessageInterceptor(
        window.cast.framework.messages.MessageType.LOAD,
        (request) => {
          // Ici, vous pouvez compléter l’interface avec les métadonnées du sender si nécessaire.
          return request;
        }
      );

      context.start();
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Connexion à l’API SSE d’Azuracast
  useEffect(() => {
    const sseBaseUri = "https://ourmusic-azuracast.ovh/api/live/nowplaying/sse";
    const sseUriParams = new URLSearchParams({
      cf_connect: JSON.stringify({
        subs: { "station:ourmusic": { recover: true } }
      })
    });
    const sseUri = `${sseBaseUri}?${sseUriParams.toString()}`;

    const sse = new EventSource(sseUri);
    sse.onopen = () => {
      console.log("Receiver : Connexion SSE établie vers AzuraCast.");
      setError('');
    };
    sse.onmessage = (event) => {
      if (event.data.trim() === '.') return;
      try {
        const jsonData = JSON.parse(event.data);
        // Gestion du format legacy et du format Centrifugo
        if (jsonData.connect) {
          if (jsonData.connect.data && Array.isArray(jsonData.connect.data)) {
            jsonData.connect.data.forEach(row => {
              if (row.np) {
                updateNowPlaying(row.np);
              }
            });
          } else if (jsonData.connect.subs) {
            Object.keys(jsonData.connect.subs).forEach(subName => {
              const sub = jsonData.connect.subs[subName];
              if (sub.publications && sub.publications.length > 0) {
                sub.publications.forEach(pub => {
                  updateNowPlaying(pub.data.np);
                });
              }
            });
          }
        } else if (jsonData.pub) {
          if (jsonData.pub.data && jsonData.pub.data.np) {
            updateNowPlaying(jsonData.pub.data.np);
          }
        }
      } catch (err) {
        console.error("Receiver : Erreur lors du parsing SSE :", err);
      }
    };
    sse.onerror = (err) => {
      console.error("Receiver : Erreur SSE :", err);
      setError("Erreur de connexion SSE.");
      sse.close();
    };

    return () => {
      sse.close();
    };
  }, []);

  // Extraction des informations de la station et du morceau en cours
  const station = nowPlaying?.station || { name: "Radio" };
  const currentSong = nowPlaying?.now_playing?.song || null;

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
        <h1>{station.name}</h1>
        {currentSong ? (
          <div>
            <h2>En cours : {currentSong.artist} - {currentSong.title}</h2>
            {currentSong.art && (
              <img
                src={currentSong.art}
                alt={`${currentSong.artist} - ${currentSong.title}`}
                style={{
                  display: 'block',
                  maxWidth: '300px',
                  borderRadius: '8px',
                  margin: '0 auto'
                }}
              />
            )}
          </div>
        ) : (
          <h2>En attente...</h2>
        )}
        {error && (
          <div style={{ marginTop: '10px', color: 'red' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
