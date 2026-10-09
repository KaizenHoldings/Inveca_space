import { NextResponse } from 'next/server';
import { UsuarioService, CrearUsuarioInput } from '@/services/UsuarioService';

/**
 * Endpoint GET para obtener la lista de todos los usuarios del sistema.
 */
export async function GET() {
  try {
    const usuarios = await UsuarioService.obtenerTodos();
    return NextResponse.json({ success: true, data: usuarios }, { status: 200 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error interno al consultar usuarios';
    console.error('Error en GET /api/usuarios:', errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

/**
 * Endpoint POST para registrar un nuevo usuario y asignarle un rol (admin o operador).
 */
export async function POST(request: Request) {
  try {
    const body: CrearUsuarioInput = await request.json();

    if (!body.nombre_completo || !body.nombre_usuario || !body.contrasena || !body.rol_usuario) {
      return NextResponse.json(
        { success: false, message: 'Todos los campos son obligatorios: Nombre completo, usuario, contraseña y rol.' },
        { status: 400 }
      );
    }

    if (!['admin', 'operador'].includes(body.rol_usuario)) {
      return NextResponse.json(
        { success: false, message: 'El rol especificado no es válido. Debe ser "admin" o "operador".' },
        { status: 400 }
      );
    }

    const resultado = await UsuarioService.crearUsuario(body);

    if (!resultado.success) {
      return NextResponse.json(resultado, { status: 400 });
    }

    return NextResponse.json(resultado, { status: 201 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Ocurrió un error al registrar el usuario';
    console.error('Error en POST /api/usuarios:', errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}

/**
 * Interfaz de la carga útil esperada al actualizar un usuario.
 */
interface PatchUsuarioBody {
  id_usuario?: number;
  action?: 'password' | 'rol' | 'estado';
  nueva_contrasena?: string;
  nuevo_rol?: 'admin' | 'operador';
  esta_activo?: boolean;
}

/**
 * Endpoint PATCH para modificar propiedades de un usuario existente:
 * - action = 'password': cambia la contraseña.
 * - action = 'rol': cambia entre 'admin' y 'operador'.
 * - action = 'estado': activa o bloquea al usuario.
 */
export async function PATCH(request: Request) {
  try {
    const body: PatchUsuarioBody = await request.json();

    if (!body.id_usuario || typeof body.id_usuario !== 'number') {
      return NextResponse.json({ success: false, message: 'Se requiere un ID de usuario válido.' }, { status: 400 });
    }

    if (!body.action) {
      return NextResponse.json({ success: false, message: 'Se debe especificar la acción (password, rol o estado).' }, { status: 400 });
    }

    let resultado: { success: boolean; message: string };

    switch (body.action) {
      case 'password':
        if (!body.nueva_contrasena) {
          return NextResponse.json({ success: false, message: 'Debes proporcionar la nueva contraseña.' }, { status: 400 });
        }
        resultado = await UsuarioService.actualizarContrasena(body.id_usuario, body.nueva_contrasena);
        break;

      case 'rol':
        if (!body.nuevo_rol || !['admin', 'operador'].includes(body.nuevo_rol)) {
          return NextResponse.json({ success: false, message: 'Debes proporcionar un rol válido (admin u operador).' }, { status: 400 });
        }
        resultado = await UsuarioService.actualizarRol(body.id_usuario, body.nuevo_rol);
        break;

      case 'estado':
        if (typeof body.esta_activo !== 'boolean') {
          return NextResponse.json({ success: false, message: 'Debes indicar el estado activo (verdadero o falso).' }, { status: 400 });
        }
        resultado = await UsuarioService.cambiarEstadoActivo(body.id_usuario, body.esta_activo);
        break;

      default:
        return NextResponse.json({ success: false, message: 'Acción no soportada.' }, { status: 400 });
    }

    if (!resultado.success) {
      return NextResponse.json(resultado, { status: 400 });
    }

    return NextResponse.json(resultado, { status: 200 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Error al modificar el usuario';
    console.error('Error en PATCH /api/usuarios:', errorMsg);
    return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
  }
}
