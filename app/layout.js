import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Custom Chromecast Receiver",
  description: "Receiver personnalisé pour OurMusic Chromecast",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Chargement du SDK Cast Receiver Framework */}
        <Script
          src="https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js"
          strategy="beforeInteractive"
        />
        {/* Initialisation du Cast Receiver dès le chargement avec timeout et heartbeats */}
        <Script
          id="cast-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', function() {
                const context = cast.framework.CastReceiverContext.getInstance();
                // Facultatif : configurer le niveau de log pour le debugging
                context.setLoggerLevel(cast.framework.LoggerLevel.DEBUG);
                context.setInactivityTimeout(6000); // Timeout étendu à 100 minutes
                context.start();
                console.log("Cast Receiver démarré avec timeout d'inactivité étendu");
              });
            `,
          }}
        />
        {/* Heartbeat pour maintenir la session active */}
        <Script
          id="cast-heartbeat"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('load', function() {
                const context = cast.framework.CastReceiverContext.getInstance();
                const interval = 30000; // Heartbeat toutes les 30 secondes

                setInterval(() => {
                  context.sendCustomMessage('urn:x-cast:com.google.cast.sample.heartbeat', undefined, {
                    type: 'HEARTBEAT'
                  });
                  console.log('Heartbeat envoyé');
                }, interval);
              });
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
