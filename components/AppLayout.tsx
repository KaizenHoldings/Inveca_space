"use client";

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';

export default function AppLayout({ children, userRole }: { children: React.ReactNode, userRole?: string | null }) {
  const pathname = usePathname();

  // No mostramos el layout con Sidebar en la página de login
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-[#141f33] font-sans text-slate-50 overflow-hidden">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar userRole={userRole} />
      
      {/* Contenido principal */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#141f33] ml-64">
        {children}
      </main>
    </div>
  );
}
