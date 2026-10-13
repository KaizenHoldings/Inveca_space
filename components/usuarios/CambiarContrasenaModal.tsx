"use client";

import { useState } from 'react';
import { X, Lock, Key, Eye, EyeOff, AlertCircle, Check, User } from 'lucide-react';
import { UsuarioDTO } from '@/services/UsuarioService';
import Swal from 'sweetalert2';

interface CambiarContrasenaModalProps {
  usuario: UsuarioDTO | null;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Componente Modal especializado en la actualización segura de contraseñas de usuarios por parte del Administrador.
 */
export default function CambiarContrasenaModal({ usuario, onClose, onSuccess }: CambiarContrasenaModalProps) {
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!usuario) return null;

  const handleReset = () => {
    setNuevaContrasena('');
    setConfirmarContrasena('');
    setErrorMsg('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!nuevaContrasena.trim() || !confirmarContrasena.trim()) {
      setErrorMsg('Debes ingresar y confirmar la nueva contraseña.');
      return;
    }

    if (nuevaContrasena.trim().length < 4) {
      setErrorMsg('La contraseña nueva debe tener como mínimo 4 caracteres.');
      return;
    }

    if (nuevaContrasena.trim() !== confirmarContrasena.trim()) {
      setErrorMsg('Las contraseñas ingresadas no coinciden. Verifícalas.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_usuario: usuario.id_usuario,
          action: 'password',
          nueva_contrasena: nuevaContrasena.trim()
        })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        handleReset();
        onClose();
        Swal.fire({
          icon: 'success',
          title: '¡Contraseña Actualizada!',
          text: `La clave del usuario @${usuario.nombre_usuario} ha sido modificada satisfactoriamente.`,
          confirmButtonColor: '#4b934e',
          background: '#0d1421',
          color: '#fff'
        });
        onSuccess();
      } else {
        setErrorMsg(json.message || 'Error del servidor al intentar actualizar la contraseña.');
      }
    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      setErrorMsg('Error de conexión con el backend del sistema.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-[#090d16]/85 backdrop-blur-md animate-[fadeIn_0.2s_ease-out] p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-[#141f33] w-full max-w-[500px] rounded-2xl border border-amber-400/40 shadow-[0_0_35px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-[scaleIn_0.2s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/10 bg-[#0d1421] rounded-t-2xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 bg-amber-500/15 border border-amber-500/40 rounded-xl flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.25)]">
              <Key size={22} />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Cambiar Contraseña</h2>
              <p className="text-xs text-slate-400 font-medium">Actualización de credenciales de acceso</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white bg-white/5 hover:bg-red-500/20 hover:border-red-500/40 border border-transparent rounded-xl p-2.5 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 md:p-7 space-y-5">
          
          {/* Tarjeta de Información de Usuario Objetivo */}
          <div className="bg-[#0d1421]/80 border border-white/10 rounded-xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-[#4b934e]/20 border border-[#4b934e]/30 flex items-center justify-center text-[#4b934e] shrink-0 font-bold">
              <User size={20} />
            </div>
            <div className="overflow-hidden">
              <div className="text-xs text-slate-400 uppercase font-semibold">Cuenta de Usuario</div>
              <div className="text-white font-extrabold text-base truncate">{usuario.nombre_completo}</div>
              <div className="text-[#4b934e] text-xs font-mono">@{usuario.nombre_usuario} • <span className="uppercase">{usuario.rol_usuario}</span></div>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Nueva Contraseña *
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={nuevaContrasena}
                onChange={e => setNuevaContrasena(e.target.value)}
                placeholder="Mínimo 4 caracteres..."
                disabled={isSubmitting}
                className="w-full bg-[#090d16]/90 border border-white/15 focus:border-amber-400 pl-11 pr-11 py-2.5 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/30 placeholder-slate-500 transition-all shadow-inner"
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 transition-colors"
                tabIndex={-1}
              >
                {mostrarPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirmar Contraseña */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Confirmar Contraseña *
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={mostrarPassword ? 'text' : 'password'}
                value={confirmarContrasena}
                onChange={e => setConfirmarContrasena(e.target.value)}
                placeholder="Repite la nueva contraseña..."
                disabled={isSubmitting}
                className="w-full bg-[#090d16]/90 border border-white/15 focus:border-amber-400 pl-11 pr-4 py-2.5 rounded-xl text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/30 placeholder-slate-500 transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Feedback */}
          {errorMsg && (
            <div className="bg-red-500/15 border border-red-500/50 text-red-400 p-3.5 rounded-xl flex items-center gap-3 text-xs font-semibold">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Botones de Pie de Modal */}
          <div className="pt-2 border-t border-white/10 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="bg-[#0d1421] hover:bg-white/10 text-slate-300 hover:text-white px-5 py-2.5 rounded-xl border border-white/10 font-bold text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nuevaContrasena.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl transition-all shadow-[0_0_20px_rgba(251,191,36,0.35)] hover:shadow-[0_0_28px_rgba(251,191,36,0.5)] flex items-center gap-2 text-xs"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check size={16} className="stroke-[3]" />
                  Actualizar Contraseña
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
