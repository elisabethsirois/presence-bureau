import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Présence au Bureau - Planning d'Équipe",
  description: "Gestion de calendrier pour les présences au bureau et en télétravail",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}