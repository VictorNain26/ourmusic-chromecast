"use client"
import { useEffect, useState } from 'react';

export default function Home() {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [error, setError] = useState('');

  // Met à jour les métadonnées reçues via SSE
  const updateNowPlaying = (npData) => {
    setNowPlaying(npData);
  };

  // Initialisation du Cast Receiver SDK
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js';
    script.async = true;
    script.onload = () => {
      const context = window.cast.framework.CastReceiverContext.getInstance();
      const playerManager = context.getPlayerManager();
      // Intercepteur sur le message LOAD (optionnel)
      playerManager.setMessageInterceptor(
        window.cast.framework.messages.MessageType.LOAD,
        (request) => {
          return request;
        }
      );
      context.start();
      console.log("SDK Cast initialisé.");
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Connexion SSE à AzuraCast pour recevoir les données en temps réel
  useEffect(() => {
    const sseUrl = "https://ourmusic-azuracast.ovh/api/live/nowplaying/sse";
    const sseUriParams = new URLSearchParams({
      cf_connect: JSON.stringify({ subs: { "station:ourmusic": { recover: true } } })
    });
    const fullUrl = `${sseUrl}?${sseUriParams.toString()}`;

    const sse = new EventSource(fullUrl);
    sse.onopen = () => {
      console.log("Connexion SSE établie vers AzuraCast.");
      setError('');
    };
    sse.onmessage = (event) => {
      if (event.data.trim() === '.') return;
      try {
        const jsonData = JSON.parse(event.data);
        if (jsonData.connect) {
          if (jsonData.connect.data && Array.isArray(jsonData.connect.data)) {
            jsonData.connect.data.forEach(row => {
              if (row.np) updateNowPlaying(row.np);
            });
          } else if (jsonData.connect.subs) {
            Object.values(jsonData.connect.subs).forEach(sub => {
              if (sub.publications && sub.publications.length > 0) {
                sub.publications.forEach(pub => {
                  if (pub.data && pub.data.np) updateNowPlaying(pub.data.np);
                });
              }
            });
          }
        } else if (jsonData.pub) {
          if (jsonData.pub.data && jsonData.pub.data.np) updateNowPlaying(jsonData.pub.data.np);
        }
      } catch (err) {
        console.error("Erreur lors du parsing SSE :", err);
      }
    };
    sse.onerror = (err) => {
      console.error("Erreur SSE :", err);
      setError("Erreur de connexion SSE.");
      sse.close();
    };

    return () => {
      sse.close();
    };
  }, []);

  // Lorsque nowPlaying est mis à jour, charge le flux audio s'il existe
  useEffect(() => {
    if (nowPlaying && nowPlaying.station && nowPlaying.station.listen_url) {
      const audioEl = document.getElementById('audio-player');
      if (audioEl) {
        if (audioEl.src !== nowPlaying.station.listen_url) {
          audioEl.src = nowPlaying.station.listen_url;
          audioEl.load();
          audioEl.play().catch((err) => {
            console.error("Erreur lors de la lecture du flux audio :", err);
          });
        }
      }
    }
  }, [nowPlaying]);

  // Extraction des informations à afficher
  const station = nowPlaying?.station || { name: "Radio", listen_url: null };
  const currentSong = nowPlaying?.now_playing?.song || null;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg bg-gray-800 p-6 rounded-lg shadow-lg">
        <h1 className="text-4xl font-bold mb-4 text-center">{station.name}</h1>
        {currentSong ? (
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">
              En cours : {currentSong.artist} - {currentSong.title}
            </h2>
            {currentSong.art && (
              <img 
                src={currentSong.art} 
                alt={`${currentSong.artist} - ${currentSong.title}`} 
                className="mx-auto rounded-lg max-w-xs mb-4" 
              />
            )}
          </div>
        ) : (
          <h2 className="text-xl text-center mb-4">En attente...</h2>
        )}
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
      </div>
      {/* Élément audio caché pour jouer le flux */}
      <audio id="audio-player" autoPlay className="hidden"></audio>
    </div>
  );
}
