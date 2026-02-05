import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FLEUR Baden-Baden | Un Espace de Nuit',
  description: 'FLEUR Baden-Baden - Der exklusive Nightclub in Baden-Baden. Deep House, Hip-Hop, R&B. VIP Tischreservierung, Events & unvergessliche Nächte.',
  keywords: 'FLEUR, Baden-Baden, Nightclub, Club, Bar, VIP, Deep House, Hip-Hop, Events, Party',
  authors: [{ name: 'FLEUR Baden-Baden' }],
  openGraph: {
    title: 'FLEUR Baden-Baden | Un Espace de Nuit',
    description: 'Der exklusive Nightclub in Baden-Baden. VIP Tischreservierung & Events.',
    url: 'https://fleur-badenbaden.de',
    siteName: 'FLEUR Baden-Baden',
    locale: 'de_DE',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FLEUR Baden-Baden | Un Espace de Nuit',
    description: 'Der exklusive Nightclub in Baden-Baden.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link rel="icon" type="image/svg+xml" href="/img/Element 1.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
