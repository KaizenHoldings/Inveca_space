'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const res = await fetch(`${basePath}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nombre_usuario: nombreUsuario, contrasena }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ocurrió un error al iniciar sesión');
      }

      // Redirigir a la aplicación
      router.push('/');
      router.refresh(); // Para asegurar que el middleware y layout re-evalúan estado
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#090d16] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#142338] via-[#090d16] to-[#04060a]">
      <div className="w-full max-w-md p-8 bg-[#0d1421]/80 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden">
        
        {/* Adornos visuales de fondo */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#4b934e]/0 via-[#4b934e] to-[#4b934e]/0"></div>
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-[#4b934e]/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-[#4b934e]/10 rounded-full blur-2xl"></div>

        <div className="relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white mb-2">Bienvenido</h1>
            <p className="text-slate-400 text-sm">Inicia sesión en tu cuenta para continuar</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium animate-[fadeIn_0.3s_ease-out]">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Usuario</label>
              <input
                type="text"
                required
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
                className="w-full bg-[#141f33]/80 border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-[#4b934e] focus:ring-2 focus:ring-[#4b934e]/30 transition-all"
                placeholder="Ingresa tu nombre de usuario"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-300">Contraseña</label>
              <input
                type="password"
                required
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                className="w-full bg-[#141f33]/80 border border-white/10 text-white px-4 py-3 rounded-lg focus:outline-none focus:border-[#4b934e] focus:ring-2 focus:ring-[#4b934e]/30 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#4b934e] to-[#3d7840] hover:from-[#58ab5b] hover:to-[#4b934e] text-white font-bold py-3.5 px-4 rounded-lg shadow-lg hover:shadow-[#4b934e]/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
