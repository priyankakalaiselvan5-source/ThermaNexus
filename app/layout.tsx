import './globals.css';
import type { Metadata } from 'next';
import { Inter, Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/sonner';
import { ErrorBoundary } from '@/components/layout/error-boundary';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  title: 'ThermaNeXus — AI-Powered Cold Chain Rescue Platform',
  description: 'Predict Risk. Protect Medicines. Deliver Safely. Enterprise AI-powered predictive cold chain logistics for healthcare.',
  openGraph: {
    title: 'ThermaNeXus — AI-Powered Cold Chain Rescue Platform',
    description: 'Predict Risk. Protect Medicines. Deliver Safely.',
    images: [{ url: 'https://bolt.new/static/og_default.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: [{ url: 'https://bolt.new/static/og_default.png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${plusJakarta.variable} font-body antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
