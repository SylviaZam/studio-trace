import type { Metadata } from 'next';
import { Archivo, Newsreader } from 'next/font/google';
import './globals.css';

const archivo = Archivo({
  variable: '--font-archivo',
  subsets: ['latin'],
});

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'StudioTrace — Creative process, made visible',
  description: 'Document how AI participated in your creative work while keeping human judgment and authorship visible.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${newsreader.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
