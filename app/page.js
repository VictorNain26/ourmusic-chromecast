"use client";

import { useEffect, useState, useRef } from "react";

export default function Home() {
  const [nowPlaying, setNowPlaying] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sseRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const audioRef = useRef(null);

  // Fonction pour connecter le SSE
  const connectSSE = () => {
    const sseUrl = "https://ourmusic-azuracast.ovh/api/live/nowplaying/sse";
    const sseParams = new URLSearchParams({
      cf_connect: JSON.stringify({ subs: { "station:ourmusic": { recover: true } } }),
    });
    const fullUrl = `${sseUrl}?${sseParams.toString()}`;

    const sse = new EventSource(fullUrl);
    sseRef.current = sse;

    sse.onopen = () => {
      console.log("✅ Connexion SSE établie.");
      setError("");
    };

    sse.onmessage = (event) => {
      if (event.data.trim() === ".") return; // Keep-alive
      try {
        const jsonData = JSON.parse(event.data);
        if (jsonData.connect) {
          const rows = jsonData.connect.data || [];
          rows.forEach((row) => {
            if (row.np) setNowPlaying(row.np);
          });
        } else if (jsonData.pub && jsonData.pub.data?.np) {
          setNowPlaying(jsonData.pub.data.np);
        }
      } catch (err) {
        console.error("❌ Erreur parsing SSE :", err);
      }
    };

    sse.onerror = () => {
      console.error("❌ Erreur SSE, tentative de reconnexion...");
      setError("Erreur de connexion SSE.");
      sse.close();
      reconnectTimeoutRef.current = setTimeout(() => {
        connectSSE();
      }, 3000);
    };
  };

  // Connexion SSE au montage
  useEffect(() => {
    connectSSE();
    return () => {
      if (sseRef.current) sseRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  // Mise à jour de l'audio
  useEffect(() => {
    if (nowPlaying?.station?.listen_url && audioRef.current) {
      const audioEl = audioRef.current;
      if (audioEl.src !== nowPlaying.station.listen_url) {
        audioEl.src = nowPlaying.station.listen_url;
        audioEl.load();
        audioEl.play().catch((err) => {
          console.error("❌ Erreur lecture flux audio :", err);
        });
      }
      setLoading(false);
    }
  }, [nowPlaying]);

  const station = nowPlaying?.station || { name: "Radio", listen_url: null };
  const currentSong = nowPlaying?.now_playing?.song || null;

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Fond flouté */}
      {currentSong?.art && (
        <div
          className="absolute inset-0 bg-cover bg-center filter blur-lg"
          style={{ backgroundImage: `url(${currentSong.art})` }}
        ></div>
      )}
      {/* Overlay */}
      <div className="absolute inset-0 bg-black opacity-40"></div>

      {/* Contenu */}
      <div className="relative z-10 text-center">
        <h1 className="text-5xl font-bold text-white mb-8">{station.name}</h1>

        {loading ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white"></div>
            <p className="text-white mt-4">Chargement...</p>
          </div>
        ) : currentSong ? (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-semibold text-white mb-4">
              {currentSong.artist} - {currentSong.title}
            </h2>
            {currentSong.art && (
              <img
                src={currentSong.art}
                alt={`${currentSong.artist} - ${currentSong.title}`}
                className="w-64 rounded-lg shadow-md"
              />
            )}
          </div>
        ) : (
          <p className="text-2xl text-gray-300">En attente...</p>
        )}

        {error && (
          <p className="text-red-500 mt-6">{error}</p>
        )}
      </div>

      {/* Audio player caché */}
      <audio ref={audioRef} autoPlay className="hidden"></audio>
    </div>
  );
}
