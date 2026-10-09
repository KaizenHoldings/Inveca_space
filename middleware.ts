import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-local-dev-replace-me';

export async function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value;
  const path = request.nextUrl.pathname;

  // Rutas públicas que no requieren autenticación
  const isPublicPath = path === '/login' || path.startsWith('/api/auth/');

  // Para assets, imágenes, y recursos estáticos, dejarlos pasar
  if (
    path.startsWith('/_next') ||
    path.startsWith('/favicon.ico') ||
    path.startsWith('/icons/')
  ) {
    return NextResponse.next();
  }

  // Si la ruta es la PÁGINA de login y el usuario ya está autenticado, redirigir al inicio
  if (path === '/login' && authToken) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(authToken, secret);
      return NextResponse.redirect(new URL('/', request.url));
    } catch (e) {
      // Token inválido, dejar que siga a la ruta pública
    }
  }

  // Si la ruta NO es pública y el usuario NO tiene token, redirigir al login
  if (!isPublicPath && !authToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si la ruta NO es pública y el usuario TIENE token, validarlo
  if (!isPublicPath && authToken) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(authToken, secret);
      
      // Restricción de acceso para el rol 'operador'
      if (payload.rol_usuario === 'operador') {
        if (path.startsWith('/solicitudes') || path.startsWith('/usuarios')) {
          return NextResponse.redirect(new URL('/', request.url));
        }
      }

      return NextResponse.next();
    } catch (error) {
      // Token expirado o inválido
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token'); // Limpiar token inválido
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
