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
        {/* SDK Cast Receiver Framework */}
        <Script
          src="https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js"
          strategy="beforeInteractive"
        />
        {/* Initialisation Chromecast */}
        <Script id="cast-init" strategy="afterInteractive">
          {`
            (function initCast() {
              function startCast() {
                if (typeof cast !== "undefined" && cast.framework) {
                  const context = cast.framework.CastReceiverContext.getInstance();
                  context.setLoggerLevel(cast.framework.LoggerLevel.WARNING); // Log minimal

                  // ✅ Désactiver le timeout standard
                  context.setInactivityTimeout(0);

                  // ✅ Enregistrement d'un faux media pour empêcher l'idle timeout
                  const playerManager = context.getPlayerManager();
                  playerManager.setMediaPlaybackInfo({
                    autoResumeDuration: 3600, // 1 heure
                    autoResumeEnabled: true,
                  });

                  context.start();
                  console.log("✅ Cast Receiver initialisé avec protection anti-coupure.");
                } else {
                  console.error("❌ SDK Cast non disponible.");
                }
              }

              if (document.readyState === 'complete') {
                startCast();
              } else {
                window.addEventListener('load', startCast);
              }
            })();
          `}
        </Script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
