"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings, LogOut, Users, MapPin, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Sidebar({ userRole }: { userRole?: string | null }) {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      // 1. Borrar cookie del lado del cliente inmediatamente por si acaso
      document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      
      // 2. Hacer la petición a la API
      await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
      
      // 3. Redirigir haciendo hard reload con bypass de caché del navegador
      window.location.href = '/login?clear=' + new Date().getTime();
    } catch (e) {
      console.error(e);
      window.location.href = '/login?clear=' + new Date().getTime();
    }
  };

  let navItems = [
    { name: 'Cargar a Dispatch', href: '/', icon: LayoutDashboard },
    { name: 'Consulta Clientes', href: '/clientes', icon: Users },
    { name: 'Solicitudes Coordenadas', href: '/solicitudes', icon: MapPin },
    { name: 'Gestión de Usuarios', href: '/usuarios', icon: ShieldCheck },
  ];

  if (userRole === 'operador') {
    navItems = navItems.filter(item => item.href !== '/solicitudes' && item.href !== '/usuarios');
  }

  return (
    <aside className="w-64 bg-[#090d16] border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform duration-300">
      
      {/* Header del Sidebar */}
      <div className="h-24 flex items-center gap-3 px-6 border-b border-white/5">
        <img src="/images/isologo.png" alt="Logo Sincronizador" className="w-10 h-10 object-contain drop-shadow-md" />
        <div>
          <h2 className="text-[#4b934e] font-bold text-lg leading-tight tracking-wide">Sistema Inveca</h2>
          <p className="text-slate-500 text-[11px] font-medium tracking-wider">PROFIT A DISPATCH</p>
        </div>
      </div>

      {/* Navegación Principal */}
      <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
        <p className="text-slate-500 text-xs font-semibold px-2 mb-2 uppercase tracking-wider">Menú Principal</p>
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all duration-300 group ${
                isActive 
                  ? 'bg-[#4b934e] text-white shadow-lg shadow-[#4b934e]/30' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={18} className={`transition-transform duration-200 ${isActive ? 'scale-110 text-white' : 'group-hover:scale-110 text-slate-400 group-hover:text-white'}`} />
              <span className="text-sm">{item.name}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer / User Info */}
      <div className="p-4 border-t border-white/5 bg-[#0d1421]/50">
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            Swal.fire({
              title: 'Cerrando sesión...',
              allowOutsideClick: false,
              background: '#0d1421',
              color: '#fff',
              didOpen: () => {
                Swal.showLoading();
              }
            });
            handleLogout();
          }}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-[#ff4d4f]/10 hover:border-[#ff4d4f]/30 border border-transparent rounded-lg font-medium transition-all text-sm group"
        >
          <LogOut size={18} className="group-hover:text-[#ff4d4f] transition-colors" />
          <span className="group-hover:text-[#ff4d4f] transition-colors">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}
