import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VéloSf — CycloSfaxcity | Gestion de vélos en libre-service",
  description:
    "Système d'information VéloSf pour CycloSfaxcity : borne de station, back-office Responsable et application Technicien à Sfax.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-screen bg-[#F6F1E7] text-[#14232B]">
        {children}
      </body>
    </html>
  );
}
