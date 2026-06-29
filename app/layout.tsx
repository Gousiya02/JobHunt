import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'JobHunt - Local Part-time Jobs & AI Pitch Resume Builder',
  description: 'Find local small jobs (cashier, delivery, kitchen help) near you and apply with instant, AI-generated custom pitches.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
