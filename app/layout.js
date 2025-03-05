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
        {/* Chargement du SDK Cast Receiver et initialisation via onLoad */}
        <Script
          src="https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js"
          strategy="beforeInteractive"
          onLoad={() => {
            if (typeof cast !== "undefined" && cast.framework) {
              const context = cast.framework.CastReceiverContext.getInstance();
              context.setLoggerLevel(cast.framework.LoggerLevel.DEBUG);
              context.setInactivityTimeout(6000); // Timeout étendu à 100 minutes
              context.start();
              console.log("Cast Receiver initialisé avec timeout d'inactivité étendu.");

              // Envoi d'un heartbeat toutes les 10 secondes pour maintenir la session active
              const heartbeatInterval = 10000; // 10 secondes
              setInterval(() => {
                context.sendCustomMessage(
                  "urn:x-cast:com.google.cast.sample.heartbeat",
                  undefined,
                  { type: "HEARTBEAT" }
                );
                console.log("Heartbeat envoyé");
              }, heartbeatInterval);
            } else {
              console.error("Le SDK Cast n'est pas disponible.");
            }
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
