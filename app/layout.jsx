// BORRA EL 'use client' DE AQUÍ ARRIBA
import { AuthProvider } from './contexts/AuthContext'; 
import { ThemeProvider } from './contexts/ThemeContext';
import LayoutContent from './components/LayoutContent'; 
import "./globals.css";

// Esto solo funciona en Server Components (sin 'use client')
export const metadata = {
  title: "VIGA - Autonomous QA",
  description: "AI Orchestration for E2E Testing",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning className="scroll-smooth">
      <body className="antialiased">
        <AuthProvider>
          <ThemeProvider>
            <LayoutContent>{children}</LayoutContent>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}