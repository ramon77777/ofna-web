import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OFNA Web Partner',
  description: 'Dashboard web partenaire OFNA',
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