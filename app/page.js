"use client"
import { useEffect, useState } from 'react';

export default function Home() {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [error, setError] = useState('');

  // Mise à jour des métadonnées reçues via SSE
  const updateNowPlaying = (npData) => {
    setNowPlaying(npData);
  };

  // Connexion SSE à AzuraCast pour récupérer les données en temps réel
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

  // Charge le flux audio dès qu'une nouvelle URL est disponible
  useEffect(() => {
    if (nowPlaying && nowPlaying.station && nowPlaying.station.listen_url) {
      const audioEl = document.getElementById('audio-player');
      if (audioEl && audioEl.src !== nowPlaying.station.listen_url) {
        audioEl.src = nowPlaying.station.listen_url;
        audioEl.load();
        audioEl.play().catch((err) => {
          console.error("Erreur lors de la lecture du flux audio :", err);
        });
      }
    }
  }, [nowPlaying]);

  const station = nowPlaying?.station || { name: "Radio", listen_url: null };
  const currentSong = nowPlaying?.now_playing?.song || null;

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Image d'album en fond, avec flou */}
      {currentSong?.art && (
        <div 
          className="absolute inset-0 bg-cover bg-center filter blur-lg"
          style={{ backgroundImage: `url(${currentSong.art})` }}
        ></div>
      )}
      {/* Overlay noir plus transparent */}
      <div className="absolute inset-0 bg-black opacity-40"></div>

      {/* Contenu principal */}
      <div className="relative z-10 w-full max-w-2xl bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="mb-6 text-center">
          <h1 className="text-5xl font-bold text-white">{station.name}</h1>
        </div>
        <div className="mb-6 text-center">
          {currentSong ? (
            <div className="flex flex-col items-center">
              <h2 className="text-2xl font-semibold text-white mb-4">
                {currentSong.artist} - {currentSong.title}
              </h2>
              {/* Image d'album affichée dans la carte */}
              {currentSong.art && (
                <img 
                  src={currentSong.art} 
                  alt={`${currentSong.artist} - ${currentSong.title}`} 
                  className="w-64 rounded-lg shadow-md mx-auto" 
                />
              )}
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-2xl text-gray-300">En attente...</h2>
            </div>
          )}
        </div>
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}
      </div>

      {/* Élément audio caché pour jouer le flux */}
      <audio id="audio-player" autoPlay className="hidden"></audio>
    </div>
  );
}
