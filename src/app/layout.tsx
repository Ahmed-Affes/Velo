import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  IBM_Plex_Sans,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading",
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "VéloSf — CycloSfaxcity | Gestion de vélos en libre-service",
  description:
    "Système d'information VéloSf pour CycloSfaxcity : borne de station, back-office Responsable et application Technicien à Sfax.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${bricolage.variable} ${ibmPlex.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-[#F6F1E7] text-[#14232B]">
        {children}
      </body>
    </html>
  );
}
