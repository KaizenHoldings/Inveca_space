import { NextResponse } from 'next/server';
import { UsuarioService } from '@/services/UsuarioService';
import { SignJWT } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-local-dev-replace-me';

export async function POST(request: Request) {
  try {
    const { nombre_usuario, contrasena } = await request.json();

    if (!nombre_usuario || !contrasena) {
      return NextResponse.json({ error: 'Usuario y contraseña son requeridos' }, { status: 400 });
    }

    const usuario = await UsuarioService.validarCredenciales(nombre_usuario, contrasena);

    if (!usuario) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    // Firmar JWT con jose
    const secret = new TextEncoder().encode(JWT_SECRET);
    const token = await new SignJWT({ 
      id_usuario: usuario.id_usuario, 
      nombre_usuario: usuario.nombre_usuario, 
      rol_usuario: usuario.rol_usuario 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(secret);

    // Determinar si la cookie debe ser 'secure':
    // Por defecto es false para que navegadores no rechacen la cookie en HTTP (por ej. http://<IP>:3000 con Docker).
    // Solo será true si se define explícitamente COOKIE_SECURE=true en .env (para entornos con HTTPS/SSL).
    const isCookieSecure = process.env.COOKIE_SECURE === 'true';

    const response = NextResponse.json({ success: true, user: usuario });

    // Establecer la cookie HTTP-Only
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: isCookieSecure,
      sameSite: 'lax',
      maxAge: 12 * 60 * 60, // 12 hours
    });

    return response;
  } catch (error: any) {
    console.error('Error en login:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
