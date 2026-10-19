"use client";

import { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, UserPlus, Search, Key, Shield, User, RefreshCw, AlertCircle, CheckCircle2, XCircle, ChevronLeft, ChevronRight, UserCheck, Lock, Unlock, ArrowRightLeft, Mail, Edit3 } from 'lucide-react';
import Swal from 'sweetalert2';
import { UsuarioDTO } from '@/services/UsuarioService';
import CrearUsuarioModal from '@/components/usuarios/CrearUsuarioModal';
import CambiarContrasenaModal from '@/components/usuarios/CambiarContrasenaModal';
import EditarUsuarioModal from '@/components/usuarios/EditarUsuarioModal';

/**
 * Página principal de Gestión y Administración de Usuarios.
 * Permite crear nuevas cuentas, asignar roles de Admin vs Operador y resetear contraseñas en tiempo real.
 */
export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRolFilter, setSelectedRolFilter] = useState<string>('TODOS');
  
  // Estados para modales
  const [isCrearOpen, setIsCrearOpen] = useState(false);
  const [usuarioParaClave, setUsuarioParaClave] = useState<UsuarioDTO | null>(null);
  const [usuarioParaEditar, setUsuarioParaEditar] = useState<UsuarioDTO | null>(null);
  const [isEditarOpen, setIsEditarOpen] = useState(false);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  /**
   * Carga la lista oficial de usuarios de la base de datos de la app
   */
  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios');
      const json = await res.json();

      if (res.ok && json.success) {
        setUsuarios(json.data || []);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error de consulta',
          text: json.message || 'No se pudieron cargar los usuarios.',
          confirmButtonColor: '#4b934e',
          background: '#0d1421',
          color: '#fff'
        });
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'No se pudo contactar con el servidor de la aplicación.',
        confirmButtonColor: '#4b934e',
        background: '#0d1421',
        color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  /**
   * Cambia el rol de un usuario alternando entre 'admin' y 'operador' con confirmación previa
   */
  const handleCambiarRol = async (user: UsuarioDTO) => {
    const nuevoRol = user.rol_usuario === 'admin' ? 'operador' : 'admin';
    const colorButton = nuevoRol === 'admin' ? '#4b934e' : '#3b82f6';
    
    const result = await Swal.fire({
      title: '¿Modificar rol de usuario?',
      html: `Estás a punto de cambiar el rol del usuario <strong>@${user.nombre_usuario}</strong> a <br/><span style="color: ${colorButton}; font-weight: bold; text-transform: uppercase;">${nuevoRol}</span>.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: colorButton,
      cancelButtonColor: '#2a3a52',
      confirmButtonText: `Sí, asignar como ${nuevoRol.toUpperCase()}`,
      cancelButtonText: 'Cancelar',
      background: '#0d1421',
      color: '#fff'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch('/api/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario: user.id_usuario, action: 'rol', nuevo_rol: nuevoRol })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Rol actualizado!',
          text: json.message || `El usuario ahora tiene el rol de ${nuevoRol.toUpperCase()}.`,
          confirmButtonColor: '#4b934e',
          background: '#0d1421',
          color: '#fff'
        });
        fetchUsuarios();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error de actualización',
          text: json.message || 'No se pudo actualizar el rol en la base de datos.',
          confirmButtonColor: '#4b934e',
          background: '#0d1421',
          color: '#fff'
        });
      }
    } catch (err) {
      console.error('Error al cambiar rol:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error de red',
        text: 'Falla al comunicar el cambio al backend.',
        confirmButtonColor: '#4b934e',
        background: '#0d1421',
        color: '#fff'
      });
    }
  };

  /**
   * Alterna entre habilitar (1) y bloquear (0) a una cuenta de usuario
   */
  const handleCambiarEstado = async (user: UsuarioDTO) => {
    const nuevoEstado = !user.esta_activo;
    const accionText = nuevoEstado ? 'habilitar (activar)' : 'bloquear (deshabilitar)';
    const colorButton = nuevoEstado ? '#4b934e' : '#ff4d4f';

    const result = await Swal.fire({
      title: `¿${accionText === 'habilitar (activar)' ? 'Activar' : 'Bloquear'} cuenta?`,
      html: `¿Estás seguro de que deseas <strong>${accionText}</strong> el acceso del usuario <strong>@${user.nombre_usuario}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: colorButton,
      cancelButtonColor: '#2a3a52',
      confirmButtonText: `Sí, ${nuevoEstado ? 'Activar' : 'Bloquear'}`,
      cancelButtonText: 'Cancelar',
      background: '#0d1421',
      color: '#fff'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch('/api/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario: user.id_usuario, action: 'estado', esta_activo: nuevoEstado })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Estado Modificado!',
          text: json.message || `La cuenta fue ${nuevoEstado ? 'habilitada' : 'deshabilitada'}.`,
          confirmButtonColor: '#4b934e',
          background: '#0d1421',
          color: '#fff'
        });
        fetchUsuarios();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al cambiar estado',
          text: json.message || 'No se pudo cambiar el estado de la cuenta.',
          confirmButtonColor: '#4b934e',
          background: '#0d1421',
          color: '#fff'
        });
      }
    } catch (err) {
      console.error('Error en cambio de estado:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Ocurrió un fallo en la solicitud de cambio al servidor.',
        confirmButtonColor: '#4b934e',
        background: '#0d1421',
        color: '#fff'
      });
    }
  };

  /**
   * Cálculo para tarjetas estadísticas del módulo
   */
  const stats = useMemo(() => {
    const total = usuarios.length;
    const administradores = usuarios.filter(u => u.rol_usuario === 'admin').length;
    const operadores = usuarios.filter(u => u.rol_usuario === 'operador').length;
    const activos = usuarios.filter(u => u.esta_activo).length;
    return { total, administradores, operadores, activos };
  }, [usuarios]);

  /**
   * Filtrado en memoria (búsqueda + botones de rol)
   */
  const filteredUsuarios = useMemo(() => {
    let list = usuarios;
    if (selectedRolFilter !== 'TODOS') {
      list = list.filter(u => u.rol_usuario === selectedRolFilter.toLowerCase());
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;

    return list.filter(u => 
      (u.nombre_completo || '').toLowerCase().includes(q) ||
      (u.nombre_usuario || '').toLowerCase().includes(q) ||
      (u.correo || '').toLowerCase().includes(q) ||
      (u.rol_usuario || '').toLowerCase().includes(q)
    );
  }, [usuarios, selectedRolFilter, searchQuery]);

  // Paginación en cliente
  const totalPages = Math.max(1, Math.ceil(filteredUsuarios.length / pageSize));
  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsuarios.slice(start, start + pageSize);
  }, [filteredUsuarios, currentPage]);

  return (
    <div className="p-6 md:p-8 w-full flex flex-col gap-6 animate-[fadeInUp_0.4s_ease-out]">
      
      {/* Encabezado del Módulo con Todo el Ancho */}
      <div className="w-full bg-[#0d1421]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-7 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#4b934e]/15 border border-[#4b934e]/40 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_25px_rgba(75,147,78,0.25)]">
            <ShieldCheck className="text-[#4b934e] w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Gestión de Usuarios y Accesos
            </h1>
            <p className="text-sm md:text-base text-slate-400 mt-1 font-medium">
              Administración de cuentas, asignación de roles (Admin / Operador) y control de seguridad • <span className="text-[#4b934e] font-semibold">Sistema Inveca</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
          <button
            onClick={fetchUsuarios}
            disabled={loading}
            className="bg-[#141f33] hover:bg-[#1f2d47] text-slate-300 hover:text-white p-3.5 rounded-xl border border-white/15 hover:border-[#4b934e]/50 transition-all shadow-lg disabled:opacity-50"
            title="Actualizar tabla"
          >
            <RefreshCw size={18} className={`text-[#4b934e] ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => setIsCrearOpen(true)}
            className="bg-[#4b934e] hover:bg-[#3d7840] text-white px-6 py-3 rounded-xl border border-[#4b934e] hover:border-transparent font-extrabold text-sm transition-all shadow-[0_0_25px_rgba(75,147,78,0.4)] hover:shadow-[0_0_35px_rgba(75,147,78,0.6)] flex items-center gap-2.5"
          >
            <UserPlus size={20} className="stroke-[2.5]" />
            <span>+ Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* Tarjetas Estadísticas KPI Widescreen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
        
        {/* Total Usuarios */}
        <div 
          onClick={() => { setSelectedRolFilter('TODOS'); setCurrentPage(1); }}
          className={`cursor-pointer bg-[#0d1421]/80 backdrop-blur-md p-6 rounded-2xl border transition-all duration-300 shadow-xl flex items-center justify-between group ${
            selectedRolFilter === 'TODOS'
              ? 'border-[#4b934e] bg-[#0d1421] shadow-[0_0_25px_rgba(75,147,78,0.2)] scale-[1.01]' 
              : 'border-white/10 hover:border-white/25 hover:bg-[#0d1421]'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Total Cuentas</span>
            <span className="text-4xl font-extrabold text-white leading-none tracking-tight">{stats.total}</span>
          </div>
          <div className="w-13 h-13 p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 group-hover:border-slate-400/40 flex items-center justify-center transition-colors">
            <User className="w-7 h-7 text-slate-300" />
          </div>
        </div>

        {/* Administradores */}
        <div 
          onClick={() => { setSelectedRolFilter('ADMIN'); setCurrentPage(1); }}
          className={`cursor-pointer bg-[#0d1421]/80 backdrop-blur-md p-6 rounded-2xl border transition-all duration-300 shadow-xl flex items-center justify-between group ${
            selectedRolFilter === 'ADMIN'
              ? 'border-[#4b934e] bg-[#0d1421] shadow-[0_0_25px_rgba(75,147,78,0.3)] scale-[1.01]' 
              : 'border-[#4b934e]/30 hover:border-[#4b934e]/60 hover:bg-[#0d1421]'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-[#4b934e] uppercase tracking-wider block mb-1.5">Administradores</span>
            <span className="text-4xl font-extrabold text-white leading-none tracking-tight">{stats.administradores}</span>
          </div>
          <div className="w-13 h-13 p-3 rounded-xl bg-[#4b934e]/15 border border-[#4b934e]/30 group-hover:border-[#4b934e]/60 flex items-center justify-center transition-colors">
            <Shield className="w-7 h-7 text-[#4b934e]" />
          </div>
        </div>

        {/* Operadores */}
        <div 
          onClick={() => { setSelectedRolFilter('OPERADOR'); setCurrentPage(1); }}
          className={`cursor-pointer bg-[#0d1421]/80 backdrop-blur-md p-6 rounded-2xl border transition-all duration-300 shadow-xl flex items-center justify-between group ${
            selectedRolFilter === 'OPERADOR'
              ? 'border-blue-400 bg-[#0d1421] shadow-[0_0_25px_rgba(59,130,246,0.25)] scale-[1.01]' 
              : 'border-blue-500/30 hover:border-blue-400/60 hover:bg-[#0d1421]'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider block mb-1.5">Operadores</span>
            <span className="text-4xl font-extrabold text-white leading-none tracking-tight">{stats.operadores}</span>
          </div>
          <div className="w-13 h-13 p-3 rounded-xl bg-blue-500/15 border border-blue-500/30 group-hover:border-blue-400/60 flex items-center justify-center transition-colors">
            <UserCheck className="w-7 h-7 text-blue-400" />
          </div>
        </div>

        {/* Cuentas Activas */}
        <div className="bg-[#0d1421]/80 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1.5">Cuentas Activas</span>
            <span className="text-4xl font-extrabold text-white leading-none tracking-tight">{stats.activos}</span>
          </div>
          <div className="w-13 h-13 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
        </div>

      </div>

      {/* Contenedor Principal de la Tabla */}
      <div className="w-full bg-[#0d1421]/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Barra de Filtros y Búsqueda */}
        <div className="bg-[#090d16]/90 p-5 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Shield size={14} className="text-[#4b934e]" /> Filtrar por Rol:
            </span>
            {[
              { label: 'Todos los Roles', value: 'TODOS', count: stats.total },
              { label: 'Administradores', value: 'ADMIN', count: stats.administradores },
              { label: 'Operadores', value: 'OPERADOR', count: stats.operadores },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => { setSelectedRolFilter(tab.value); setCurrentPage(1); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all uppercase flex items-center gap-2 ${
                  selectedRolFilter === tab.value
                    ? 'bg-[#4b934e] text-white shadow-lg shadow-[#4b934e]/30 border border-white/20'
                    : 'bg-[#141f33] text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${selectedRolFilter === tab.value ? 'bg-black/20 text-white' : 'bg-black/30 text-[#4b934e]'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-96">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar por nombre de usuario o login..."
              className="w-full bg-[#141f33]/80 border border-white/15 focus:border-[#4b934e] pl-11 pr-10 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4b934e]/30 placeholder-slate-400 transition-all shadow-inner"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold">
                ✕
              </button>
            )}
          </div>

        </div>

        {/* Tabla Dinámica de Usuarios */}
        <div className={`w-full overflow-x-auto ${loading || filteredUsuarios.length === 0 ? 'min-h-[280px]' : ''}`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-24 gap-4 text-slate-400">
              <div className="w-12 h-12 border-4 border-white/10 border-t-[#4b934e] rounded-full animate-spin"></div>
              <p className="text-base font-semibold text-slate-300">Cargando directorio de usuarios...</p>
            </div>
          ) : filteredUsuarios.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-24 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-extrabold text-white">No hay cuentas que mostrar</h3>
              <p className="text-slate-400 text-sm max-w-md">
                No se han encontrado usuarios con el filtro <span className="font-bold text-[#4b934e]">{selectedRolFilter}</span> actualmente.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr className="bg-[#090d16] border-b border-white/10 text-slate-400 uppercase text-[11px] font-extrabold tracking-wider">
                  <th className="py-5 px-6 text-[#4b934e] w-20">ID</th>
                  <th className="py-5 px-6 text-[#4b934e]">NOMBRE COMPLETO</th>
                  <th className="py-5 px-6 text-[#4b934e]">USUARIO (LOGIN)</th>
                  <th className="py-5 px-6 text-[#4b934e]">CORREO ELECTRÓNICO</th>
                  <th className="py-5 px-6 text-[#4b934e]">ROL ASIGNADO</th>
                  <th className="py-5 px-6 text-[#4b934e]">ESTADO DE ACCESO</th>
                  <th className="py-5 px-6 text-[#4b934e] text-center">ADMINISTRAR CUENTA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {pagedRecords.map((user) => {
                  const esAdmin = user.rol_usuario === 'admin';
                  
                  return (
                    <tr key={user.id_usuario} className="transition-all hover:bg-[#4b934e]/10 duration-150">
                      
                      {/* ID */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-400 text-sm">
                        #{user.id_usuario}
                      </td>

                      {/* NOMBRE COMPLETO */}
                      <td className="px-6 py-4 font-extrabold text-white text-base max-w-[250px] truncate">
                        {user.nombre_completo}
                      </td>

                      {/* USUARIO / LOGIN */}
                      <td className="px-6 py-4 font-mono text-sm text-[#4b934e] font-bold">
                        <span className="bg-[#090d16]/80 px-3 py-1.5 rounded-lg border border-white/10 inline-flex items-center gap-1.5 shadow-sm">
                          <User size={14} className="text-slate-500" /> @{user.nombre_usuario}
                        </span>
                      </td>

                      {/* CORREO ELECTRÓNICO */}
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {user.correo ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
                            <Mail size={14} className="text-[#4b934e]" />
                            {user.correo}
                          </span>
                        ) : (
                          <span className="text-slate-600 italic text-xs">No registrado</span>
                        )}
                      </td>

                      {/* ROL ASIGNADO */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold border shadow-sm uppercase ${
                          esAdmin 
                            ? 'bg-[#4b934e]/20 text-[#4b934e] border-[#4b934e]/50'
                            : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                        }`}>
                          {esAdmin ? <Shield size={14} /> : <UserCheck size={14} />}
                          <span>{user.rol_usuario}</span>
                        </span>
                      </td>

                      {/* ESTADO */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border ${
                          user.esta_activo
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                        }`}>
                          {user.esta_activo ? (
                            <>
                              <CheckCircle2 size={13} />
                              <span>Activo</span>
                            </>
                          ) : (
                            <>
                              <XCircle size={13} />
                              <span>Bloqueado</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* ACCIONES DE ADMINISTRACIÓN */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2.5">
                          
                          {/* Modificar Datos Completos */}
                          <button
                            onClick={() => {
                              setUsuarioParaEditar(user);
                              setIsEditarOpen(true);
                            }}
                            className="bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white border border-blue-500/40 hover:border-transparent px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 shadow-md hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                            title="Modificar datos del usuario (Nombre, login, correo, rol, estado y contraseña)"
                          >
                            <Edit3 size={15} />
                            <span>Editar</span>
                          </button>

                          {/* Cambiar Contraseña */}
                          <button
                            onClick={() => setUsuarioParaClave(user)}
                            className="bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-slate-950 border border-amber-500/40 hover:border-transparent px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 shadow-md hover:shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                            title="Cambiar contraseña del usuario"
                          >
                            <Key size={15} />
                            <span>Contraseña</span>
                          </button>

                          {/* Alternar Rol */}
                          <button
                            onClick={() => handleCambiarRol(user)}
                            className="bg-[#141f33] hover:bg-white/15 text-white border border-white/20 hover:border-white/40 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-md"
                            title="Alternar entre Administrador y Operador"
                          >
                            <ArrowRightLeft size={14} className="text-[#4b934e]" />
                            <span>Cambiar Rol</span>
                          </button>

                          {/* Bloquear / Desbloquear */}
                          <button
                            onClick={() => handleCambiarEstado(user)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-200 flex items-center gap-1 shadow-sm ${
                              user.esta_activo
                                ? 'bg-red-500/15 hover:bg-red-500/90 text-red-400 hover:text-white border-red-500/30 hover:border-transparent'
                                : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border-emerald-500/40'
                            }`}
                            title={user.esta_activo ? 'Deshabilitar cuenta' : 'Habilitar cuenta'}
                          >
                            {user.esta_activo ? <Lock size={14} /> : <Unlock size={14} />}
                            <span>{user.esta_activo ? 'Bloquear' : 'Activar'}</span>
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación y Pie */}
        {filteredUsuarios.length > 0 && (
          <div className="bg-[#090d16] p-4 md:px-7 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs md:text-sm text-slate-400 font-medium">
              Mostrando del <span className="text-white font-bold">{(currentPage - 1) * pageSize + 1}</span> al <span className="text-white font-bold">{Math.min(currentPage * pageSize, filteredUsuarios.length)}</span> de <span className="text-[#4b934e] font-extrabold text-base">{filteredUsuarios.length}</span> usuarios
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="bg-[#141f33] hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-2 rounded-lg border border-white/10 transition-all flex items-center gap-1.5 text-xs font-bold"
              >
                <ChevronLeft size={16} className="text-[#4b934e]" />
                Anterior
              </button>

              <span className="px-3.5 py-1.5 bg-[#141f33] rounded-lg border border-white/10 text-xs font-bold text-white">
                Pág. {currentPage} de {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="bg-[#141f33] hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-2 rounded-lg border border-white/10 transition-all flex items-center gap-1.5 text-xs font-bold"
              >
                Siguiente
                <ChevronRight size={16} className="text-[#4b934e]" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Componentes Modales (Lógica Componentizada) */}
      <CrearUsuarioModal
        isOpen={isCrearOpen}
        onClose={() => setIsCrearOpen(false)}
        onUserCreated={() => {
          setIsCrearOpen(false);
          Swal.fire({
            icon: 'success',
            title: '¡Usuario Registrado!',
            text: 'La nueva cuenta ha sido creada exitosamente en el sistema.',
            confirmButtonColor: '#4b934e',
            background: '#0d1421',
            color: '#fff'
          });
          fetchUsuarios();
        }}
      />

      <CambiarContrasenaModal
        usuario={usuarioParaClave}
        onClose={() => setUsuarioParaClave(null)}
        onSuccess={() => {
          setUsuarioParaClave(null);
        }}
      />

      <EditarUsuarioModal
        usuario={usuarioParaEditar}
        isOpen={isEditarOpen}
        onClose={() => {
          setIsEditarOpen(false);
          setUsuarioParaEditar(null);
        }}
        onUserUpdated={() => {
          setIsEditarOpen(false);
          setUsuarioParaEditar(null);
          Swal.fire({
            icon: 'success',
            title: '¡Usuario Actualizado!',
            text: 'Los datos del usuario han sido modificados exitosamente.',
            confirmButtonColor: '#4b934e',
            background: '#0d1421',
            color: '#fff'
          });
          fetchUsuarios();
        }}
      />

    </div>
  );
}
