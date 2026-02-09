import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import ConditionalLayout from './components/ConditionalLayout';
import SmoothScroll from './components/SmoothScroll';
import "./globals.css";

export const metadata = {
  title: "VIGA by MATERIA | QA Testing Agents",
  description: "AI Orchestration for E2E Testing",
  icons: {
    icon: '/VIGA-lightlogo.png', // Fallback
    shortcut: '/VIGA-lightlogo.png',
    apple: '/VIGA-lightlogo.png',
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('viga-theme');
                  var theme = savedTheme || 'dark';
                  document.documentElement.classList.add(theme);
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <SmoothScroll />
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <ConditionalLayout>{children}</ConditionalLayout>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}