import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppLayout from "../components/AppLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DispatchSync | Profit",
  description: "Sincronizador de Profit a Dispatch",
};

import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  let userRole = null;

  if (token) {
    try {
      const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-local-dev-replace-me';
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      userRole = payload.rol_usuario as string;
    } catch (e) {
      // Token inválido o expirado
    }
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#040810]">
        <AppLayout userRole={userRole}>
          {children}
        </AppLayout>
      </body>
    </html>
  );
}
