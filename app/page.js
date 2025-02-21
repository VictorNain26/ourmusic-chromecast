"use client"
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Créer et ajouter dynamiquement le script du Cast Receiver Framework
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js';
    script.async = true;
    script.onload = () => {
      // Une fois le script chargé, initialiser le contexte du récepteur
      const context = window.cast.framework.CastReceiverContext.getInstance();
      const playerManager = context.getPlayerManager();

      // Fonction de mise à jour de l'interface avec les métadonnées
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

      // Lors du chargement du média, intercepter le message LOAD pour récupérer les métadonnées
      playerManager.setMessageInterceptor(
        window.cast.framework.messages.MessageType.LOAD,
        (request) => {
          if (request.media && request.media.metadata) {
            const metadata = request.media.metadata;
            const title = metadata.title || 'Inconnu';
            // Utiliser "subtitle" pour le nom de l'artiste
            const subtitle = metadata.subtitle || '';
            const image =
              (metadata.images && metadata.images[0] && metadata.images[0].url) || '';
            updateUI({ title, subtitle, image });
          }
          return request;
        }
      );

      // Créer un canal de messages personnalisé pour les mises à jour dynamiques
      const NAMESPACE = 'urn:x-cast:com.ourmusic.metadata';
      const messageBus = context.getCastMessageBus(NAMESPACE);
      messageBus.onMessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // data doit contenir { title, subtitle, image }
          updateUI(data);
        } catch (e) {
          console.error("Erreur lors du parsing du message personnalisé :", e);
        }
      };

      // Démarrer le contexte du récepteur
      context.start();
    };

    document.body.appendChild(script);

    // Nettoyer le script lors du démontage du composant
    return () => {
      document.body.removeChild(script);
    };
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
