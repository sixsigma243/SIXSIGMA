import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIX SIGMA ERP | La constance dans la qualité",
  description: "Portail ERP d'entreprise - BTP, Génie Civil, Construction Métallique, Logistique & Engins",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-[#090D16] text-slate-100 antialiased selection:bg-red-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
