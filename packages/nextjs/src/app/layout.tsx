import type { Metadata } from 'next';
import { Fira_Sans, Fira_Code } from 'next/font/google';
import '../styles/globals.css';
import ContextProvider from '@/context';
import { ThemeProvider } from '@/context/ThemeProvider';
import { AppShell } from '@/components/shell/AppShell';

// Project fonts — recommended by ui-ux-pro-max skill for the Financial /
// Analytics Dashboard product classification. Exposed as CSS variables so
// global styles and CSS modules can read them with var(--font-sans) etc.
const firaSans = Fira_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fira-sans',
  display: 'swap',
});

const firaCode = Fira_Code({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-fira-code',
  display: 'swap',
});

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
    <html lang="en" className={`${firaSans.variable} ${firaCode.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <ContextProvider cookies={cookies}>
            <AppShell>{children}</AppShell>
          </ContextProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
