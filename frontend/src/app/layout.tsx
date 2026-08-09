import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AXIOS Executive License Control Center',
  description: 'Enterprise Hardware Authentication & Reseller Licensing Portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
