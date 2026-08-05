import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AXIOS KEY MANAGEMENT PANEL",
  description: "Admin panel for Axios Mod Menu Key Authentication System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-purple-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
