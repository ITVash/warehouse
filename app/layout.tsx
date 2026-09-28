import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Складской учёт — ИП Новиков / Негоциант',
  description: 'Полноценная система складского учёта для двух складов с поддержкой Telegram-авторизации, сканирования штрихкодов, работы с заказами, приходами, остатками и отчетами.',
  openGraph: {
    title: 'Складской учёт — ИП Новиков / Негоциант',
    description: 'Полноценная система складского учёта для двух складов с поддержкой Telegram-авторизации, сканирования штрихкодов, работы с заказами, приходами, остатками и отчетами.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Складской учёт — ИП Новиков / Негоциант',
    description: 'Полноценная система складского учёта для двух складов с поддержкой Telegram-авторизации, сканирования штрихкодов, работы с заказами, приходами, остатками и отчетами.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'СкладУчёт',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-slate-900 text-slate-100 antialiased min-h-screen font-sans selection:bg-blue-600 selection:text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
