import type { Metadata } from 'next';
import './globals.css';
// PASTIKAN IMPORT DARI CONTEXTS, BUKAN COMPONENTS
import { AuthProvider } from '@/contexts/AuthContext'; 

export const metadata: Metadata = {
  title: 'StudyLab',
  description: 'Aplikasi StudyLab',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}