import type { Metadata, Viewport } from "next";
import { Orbitron, Rajdhani, Space_Mono } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["400", "700", "900"],
});
const rajdhani = Rajdhani({
  subsets: ["latin"],
  variable: "--font-rajdhani",
  weight: ["400", "500", "600", "700"],
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "NEON INTERVIEW — Relevamiento de Datos",
  description: "Nuestra Profesión vista desde la Sociedad. UTN Facultad Regional Reconquista.",
};

export const viewport: Viewport = {
  themeColor: "#071018",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${orbitron.variable} ${rajdhani.variable} ${spaceMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}