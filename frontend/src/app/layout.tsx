import type { Metadata } from 'next';
import '../styles/globals.css';
import ContextProvider from '@/context';

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
    <html lang="en">
      <body>
        <ContextProvider cookies={cookies}>
          <div className="app-container">
            <header className="app-header">
              <div className="header-content">
                <h1 className="app-title">⚡ Scaffold-EVVM</h1>
                <p className="app-subtitle">Virtual Blockchain Testing & Debugging</p>
              </div>
            </header>
            <main className="app-main">
              {children}
            </main>
            <footer className="app-footer">
              <p>Built with Next.js, TypeScript & viem | EVVM Organization</p>
            </footer>
          </div>
        </ContextProvider>
      </body>
    </html>
  );
}
