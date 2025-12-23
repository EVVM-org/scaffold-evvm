import type { Metadata } from 'next';
import '../styles/globals.css';
import ContextProvider from '@/context';
import { ThemeProvider } from '@/context/ThemeProvider';
import { Navigation } from '@/components/Navigation';

export const metadata: Metadata = {
  title: 'Scaffold-EVVM',
  description: 'Testing & debugging framework for EVVM virtual blockchains',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { headers } = await import('next/headers');
  const headersData = await headers();
  const cookies = headersData.get('cookie');

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ContextProvider cookies={cookies}>
            <div className="app-container">
              <Navigation />
              <main className="app-main">
                {children}
              </main>
              <footer className="app-footer">
                <p>By EVVM with ❤️</p>
              </footer>
            </div>
          </ContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
