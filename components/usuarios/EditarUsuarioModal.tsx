"use client";

import { useState, useEffect } from 'react';
import { X, Edit3, Shield, User, Lock, AlertCircle, Eye, EyeOff, Mail, CheckCircle2, XCircle, KeyRound } from 'lucide-react';
import { UsuarioDTO } from '@/services/UsuarioService';

interface EditarUsuarioModalProps {
  usuario: UsuarioDTO | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
}

/**
 * Componente Modal para que el Administrador modifique integralmente los datos
 * de una cuenta de usuario (Nombre, Login, Correo, Rol, Estado y Contraseña opcional).
 */
export default function EditarUsuarioModal({
  usuario,
  isOpen,
  onClose,
  onUserUpdated
}: EditarUsuarioModalProps) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [correo, setCorreo] = useState('');
  const [rolUsuario, setRolUsuario] = useState<'admin' | 'operador'>('operador');
  const [estaActivo, setEstaActivo] = useState(true);
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Inicializar el formulario cuando cambia el usuario seleccionado o se abre el modal
  useEffect(() => {
    if (usuario) {
      setNombreCompleto(usuario.nombre_completo || '');
      setNombreUsuario(usuario.nombre_usuario || '');
      setCorreo(usuario.correo || '');
      setRolUsuario(usuario.rol_usuario === 'admin' ? 'admin' : 'operador');
      setEstaActivo(Boolean(usuario.esta_activo));
      setNuevaContrasena('');
      setMostrarContrasena(false);
      setErrorMessage('');
    }
  }, [usuario, isOpen]);

  if (!isOpen || !usuario) return null;

  const handleClose = () => {
    setErrorMessage('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!nombreCompleto.trim() || !nombreUsuario.trim()) {
      setErrorMessage('El nombre completo y el nombre de usuario son campos obligatorios.');
      return;
    }

    if (nuevaContrasena.trim() && nuevaContrasena.trim().length < 4) {
      setErrorMessage('La nueva contraseña debe tener al menos 4 caracteres por seguridad.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario: usuario.id_usuario,
          action: 'actualizar',
          nombre_completo: nombreCompleto.trim(),
          nombre_usuario: nombreUsuario.trim().toLowerCase(),
          correo: correo.trim() || undefined,
          rol_usuario: rolUsuario,
          esta_activo: estaActivo,
          nueva_contrasena: nuevaContrasena.trim() || undefined
        })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        onUserUpdated();
      } else {
        setErrorMessage(json.message || 'No se pudo actualizar los datos del usuario.');
      }
    } catch (err) {
      console.error('Error al actualizar usuario:', err);
      setErrorMessage('Error de comunicación con el servidor al intentar modificar el usuario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#090d16]/85 backdrop-blur-md animate-[fadeIn_0.2s_ease-out] p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-[#141f33] w-full max-w-[700px] rounded-2xl border border-[#4b934e]/40 shadow-[0_0_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden animate-[scaleIn_0.2s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado del Modal */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/10 bg-[#0d1421] rounded-t-2xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-[#4b934e]/15 border border-[#4b934e]/40 rounded-xl flex items-center justify-center text-[#4b934e] shadow-[0_0_15px_rgba(75,147,78,0.25)]">
              <Edit3 size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">Modificar Usuario</h2>
                <span className="bg-[#090d16] text-[#4b934e] text-xs font-mono font-bold px-2.5 py-0.5 rounded-md border border-[#4b934e]/30">
                  ID #{usuario.id_usuario}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Edita información general, rol, estado de acceso y contraseña
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white bg-white/5 hover:bg-red-500/20 hover:border-red-500/40 border border-transparent rounded-xl p-2.5 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Formulario Principal */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[82vh]">

          {/* Nombre Completo y Correo Electrónico */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Nombre Completo */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Nombre Completo *
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={nombreCompleto}
                  onChange={e => setNombreCompleto(e.target.value)}
                  placeholder="Ej: Carlos Mendoza"
                  disabled={isSubmitting}
                  className="w-full bg-[#090d16]/90 border border-white/15 focus:border-[#4b934e] pl-11 pr-4 py-3 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4b934e]/30 placeholder-slate-500 transition-all shadow-inner"
                />
              </div>
            </div>

            {/* Correo Electrónico */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={correo}
                  onChange={e => setCorreo(e.target.value)}
                  placeholder="Ej: cmendoza@inveca.com"
                  disabled={isSubmitting}
                  className="w-full bg-[#090d16]/90 border border-white/15 focus:border-[#4b934e] pl-11 pr-4 py-3 rounded-xl text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#4b934e]/30 placeholder-slate-500 transition-all shadow-inner"
                />
              </div>
            </div>

          </div>

          {/* Nombre de Usuario (Login) y Estado de Acceso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Nombre de Usuario (Login) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Nombre de Usuario (Login) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-500">@</span>
                <input
                  type="text"
                  value={nombreUsuario}
                  onChange={e => setNombreUsuario(e.target.value)}
                  placeholder="Ej: cmendoza"
                  disabled={isSubmitting}
                  className="w-full bg-[#090d16]/90 border border-white/15 focus:border-[#4b934e] pl-10 pr-4 py-3 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#4b934e]/30 placeholder-slate-500 transition-all shadow-inner lowercase"
                />
              </div>
            </div>

            {/* Estado de Acceso (Activo / Bloqueado) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Estado de Acceso a la App *
              </label>
              <div className="grid grid-cols-2 gap-3 h-[46px]">
                
                {/* Activo */}
                <button
                  type="button"
                  onClick={() => setEstaActivo(true)}
                  disabled={isSubmitting}
                  className={`rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    estaActivo
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'bg-[#090d16]/80 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  <CheckCircle2 size={16} />
                  <span>Activo</span>
                </button>

                {/* Bloqueado */}
                <button
                  type="button"
                  onClick={() => setEstaActivo(false)}
                  disabled={isSubmitting}
                  className={`rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    !estaActivo
                      ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                      : 'bg-[#090d16]/80 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  <XCircle size={16} />
                  <span>Bloqueado</span>
                </button>

              </div>
            </div>

          </div>

          {/* Sección de Asignación de Rol */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-[#4b934e] uppercase tracking-wider flex items-center gap-1.5">
              <Shield size={16} /> Rol Asignado en el Sistema *
            </label>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Opción OPERADOR */}
              <div 
                onClick={() => setRolUsuario('operador')}
                className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  rolUsuario === 'operador'
                    ? 'bg-blue-500/15 border-blue-400/80 shadow-[0_0_20px_rgba(59,130,246,0.2)] scale-[1.01]'
                    : 'bg-[#0d1421]/60 border-white/10 hover:border-white/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-extrabold text-white tracking-wide uppercase">Rol Operador</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      rolUsuario === 'operador' ? 'border-blue-400 bg-blue-500' : 'border-slate-500 bg-transparent'
                    }`}>
                      {rolUsuario === 'operador' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    Acceso operativo a notas de entrega, sincronización hacia DispatchTrack y consultas de Profit.
                  </p>
                </div>
                <div className="mt-2.5 text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                  Acceso Operativo
                </div>
              </div>

              {/* Opción ADMIN */}
              <div 
                onClick={() => setRolUsuario('admin')}
                className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  rolUsuario === 'admin'
                    ? 'bg-[#4b934e]/20 border-[#4b934e] shadow-[0_0_20px_rgba(75,147,78,0.25)] scale-[1.01]'
                    : 'bg-[#0d1421]/60 border-white/10 hover:border-white/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-extrabold text-[#4b934e] tracking-wide uppercase">Rol Administrador</span>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      rolUsuario === 'admin' ? 'border-[#4b934e] bg-[#4b934e]' : 'border-slate-500 bg-transparent'
                    }`}>
                      {rolUsuario === 'admin' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    Control total: aprobación de coordenadas en 2k12, gestión de usuarios, roles y contraseñas.
                  </p>
                </div>
                <div className="mt-2.5 text-[11px] font-bold text-[#4b934e] uppercase tracking-wider">
                  Acceso Total Administrativo
                </div>
              </div>

            </div>
          </div>

          {/* Sección de Contraseña (Opcional) */}
          <div className="bg-[#0d1421]/90 border border-white/10 rounded-xl p-4 md:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound size={16} /> Cambiar Contraseña (Opcional)
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {nuevaContrasena.trim().length > 0 ? `${nuevaContrasena.trim().length} carac.` : 'Sin cambios'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Déjala en blanco si deseas <strong className="text-slate-200">conservar la contraseña actual</strong>. Solo escribe un valor si necesitas resetearla (mínimo 4 caracteres).
            </p>

            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={mostrarContrasena ? 'text' : 'password'}
                value={nuevaContrasena}
                onChange={e => setNuevaContrasena(e.target.value)}
                placeholder="Escribe la nueva contraseña si deseas cambiarla..."
                disabled={isSubmitting}
                className="w-full bg-[#090d16] border border-white/15 focus:border-amber-400/70 pl-11 pr-11 py-2.5 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/20 placeholder-slate-500 transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setMostrarContrasena(!mostrarContrasena)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition-colors"
                tabIndex={-1}
              >
                {mostrarContrasena ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Mensaje de Error si ocurre */}
          {errorMessage && (
            <div className="bg-red-500/15 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3 text-xs font-semibold animate-[fadeIn_0.2s_ease-out]">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Botones de Acción */}
          <div className="pt-3 border-t border-white/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="bg-[#0d1421] hover:bg-white/10 text-slate-300 hover:text-white px-5 py-3 rounded-xl border border-white/10 font-bold text-xs transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nombreCompleto.trim() || !nombreUsuario.trim()}
              className="bg-[#4b934e] hover:bg-[#3d7840] disabled:bg-[#2a3a52] disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold px-7 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(75,147,78,0.35)] hover:shadow-[0_0_30px_rgba(75,147,78,0.6)] flex items-center gap-2 text-xs"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando Cambios...
                </>
              ) : (
                <>
                  <Edit3 size={16} />
                  Guardar Modificaciones
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
