import type { Metadata } from 'next';
import { Inter, Noto_Sans_SC } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const notoSansSC = Noto_Sans_SC({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-noto-sans-sc', display: 'swap' });

export const metadata: Metadata = { title: 'XOne', description: '生活与工作的数字中枢' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-mode="personal" className={`${inter.variable} ${notoSansSC.variable} font-sans`}>
      <body>{children}</body>
    </html>
  );
}
