import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_SC } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const notoSansSC = Noto_Sans_SC({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-noto-sans-sc', display: 'swap' });

export const metadata: Metadata = { title: 'XOne', description: '生活与工作的数字中枢' };

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-mode="personal" data-theme="light" className={`${inter.variable} ${notoSansSC.variable} font-sans`}>
      <head>
        {/* Preconnect to Google Fonts for faster font loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* 立即应用保存的主题和模式，防止页面闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){try{
                var t=localStorage.getItem('xone-theme');
                if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);
                var m=localStorage.getItem('xone-mode');
                if(m==='personal'||m==='work')document.documentElement.setAttribute('data-mode',m);
              }catch(e){}})()
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
