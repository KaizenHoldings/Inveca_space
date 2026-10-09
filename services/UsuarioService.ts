import { getAppPool } from '@/lib/db/mssql';
import bcrypt from 'bcryptjs';

/**
 * Interfaz de transferencia para el usuario sin datos sensibles (sin hash de contraseña).
 */
export interface UsuarioDTO {
  id_usuario: number;
  nombre_completo: string;
  nombre_usuario: string;
  rol_usuario: 'admin' | 'operador' | string;
  esta_activo: boolean;
}

/**
 * Interfaz para la creación de un nuevo usuario en la base de datos de la app.
 */
export interface CrearUsuarioInput {
  nombre_completo: string;
  nombre_usuario: string;
  contrasena: string;
  rol_usuario: 'admin' | 'operador';
}

/**
 * Servicio encargado de gestionar los usuarios, roles y autenticación de la aplicación.
 * Opera exclusivamente sobre la base de datos interna de la aplicación (tabla Usuarios).
 */
export class UsuarioService {
  /**
   * Obtiene la lista completa de usuarios del sistema, excluyendo sus contraseñas por seguridad.
   */
  static async obtenerTodos(): Promise<UsuarioDTO[]> {
    try {
      const pool = await getAppPool();
      const result = await pool.request().query(`
        SELECT id_usuario, nombre_completo, nombre_usuario, rol_usuario, esta_activo 
        FROM Usuarios 
        ORDER BY id_usuario DESC
      `);
      return result.recordset as UsuarioDTO[];
    } catch (error) {
      console.error('Error en UsuarioService.obtenerTodos:', error);
      throw new Error('No se pudo obtener la lista de usuarios desde la base de datos.');
    }
  }

  /**
   * Obtiene un usuario por su nombre de usuario, incluyendo el hash para validaciones internas.
   * @param nombreUsuario Nombre de usuario único para inicio de sesión.
   */
  static async obtenerPorNombreUsuario(nombreUsuario: string) {
    const pool = await getAppPool();
    const result = await pool.request()
      .input('nombre_usuario', nombreUsuario)
      .query(`
        SELECT id_usuario, nombre_completo, nombre_usuario, contrasena_hash, rol_usuario, esta_activo 
        FROM Usuarios 
        WHERE nombre_usuario = @nombre_usuario
      `);

    return result.recordset[0] || null;
  }

  /**
   * Crea un nuevo usuario en la tabla Usuarios.
   * Verifica duplicidad en nombre_usuario y genera el hash seguro de la contraseña.
   * @param data Objeto con nombre completo, usuario, contraseña y rol (admin o operador).
   */
  static async crearUsuario(data: CrearUsuarioInput): Promise<{ success: boolean; message: string; usuario?: UsuarioDTO }> {
    try {
      const pool = await getAppPool();

      // 1. Verificar si el nombre de usuario ya existe
      const existeResult = await pool.request()
        .input('nombre_usuario', data.nombre_usuario.trim())
        .query(`SELECT id_usuario FROM Usuarios WHERE nombre_usuario = @nombre_usuario`);

      if (existeResult.recordset.length > 0) {
        return { success: false, message: 'El nombre de usuario ingresado ya está en uso por otra cuenta.' };
      }

      // 2. Generar el hash bcrypt con costo 10
      const contrasenaHash = bcrypt.hashSync(data.contrasena, 10);

      // 3. Insertar el nuevo usuario en estado activo (1)
      const insertResult = await pool.request()
        .input('nombre_completo', data.nombre_completo.trim())
        .input('nombre_usuario', data.nombre_usuario.trim())
        .input('contrasena_hash', contrasenaHash)
        .input('rol_usuario', data.rol_usuario)
        .query(`
          INSERT INTO Usuarios (nombre_completo, nombre_usuario, contrasena_hash, rol_usuario, esta_activo)
          OUTPUT INSERTED.id_usuario, INSERTED.nombre_completo, INSERTED.nombre_usuario, INSERTED.rol_usuario, INSERTED.esta_activo
          VALUES (@nombre_completo, @nombre_usuario, @contrasena_hash, @rol_usuario, 1)
        `);

      const nuevoUsuario = insertResult.recordset[0] as UsuarioDTO;

      return {
        success: true,
        message: `Usuario '${nuevoUsuario.nombre_usuario}' creado exitosamente con el rol de ${nuevoUsuario.rol_usuario.toUpperCase()}.`,
        usuario: nuevoUsuario
      };
    } catch (error) {
      console.error('Error en UsuarioService.crearUsuario:', error);
      throw new Error('Ocurrió un error al intentar crear el nuevo usuario.');
    }
  }

  /**
   * Actualiza la contraseña de un usuario existente.
   * CUMPLE REGLA ESTRICTA: Incluye la cláusula WHERE id_usuario = @id_usuario.
   * @param idUsuario ID único del usuario al que se le cambiará la clave.
   * @param nuevaContrasena Nueva contraseña plana a cifrar con bcrypt.
   */
  static async actualizarContrasena(idUsuario: number, nuevaContrasena: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!nuevaContrasena || nuevaContrasena.trim().length < 4) {
        return { success: false, message: 'La nueva contraseña debe tener al menos 4 caracteres.' };
      }

      const pool = await getAppPool();
      const contrasenaHash = bcrypt.hashSync(nuevaContrasena.trim(), 10);

      const request = pool.request()
        .input('id_usuario', idUsuario)
        .input('contrasena_hash', contrasenaHash);

      // QUERY DE MODIFICACIÓN CON WHERE OBLIGATORIO
      const result = await request.query(`
        UPDATE Usuarios
        SET contrasena_hash = @contrasena_hash
        WHERE id_usuario = @id_usuario
      `);

      if (result.rowsAffected[0] === 0) {
        return { success: false, message: 'No se encontró el usuario solicitado para cambiar la contraseña.' };
      }

      return { success: true, message: 'La contraseña del usuario fue modificada exitosamente.' };
    } catch (error) {
      console.error('Error en UsuarioService.actualizarContrasena:', error);
      throw new Error('No se pudo actualizar la contraseña en la base de datos.');
    }
  }

  /**
   * Actualiza el rol de un usuario del sistema (admin u operador).
   * CUMPLE REGLA ESTRICTA: Incluye la cláusula WHERE id_usuario = @id_usuario.
   * @param idUsuario ID único del usuario a modificar.
   * @param nuevoRol Nuevo rol asignado ('admin' | 'operador').
   */
  static async actualizarRol(idUsuario: number, nuevoRol: 'admin' | 'operador'): Promise<{ success: boolean; message: string }> {
    try {
      if (!['admin', 'operador'].includes(nuevoRol)) {
        return { success: false, message: 'Rol inválido. Los roles permitidos son "admin" y "operador".' };
      }

      const pool = await getAppPool();
      const request = pool.request()
        .input('id_usuario', idUsuario)
        .input('rol_usuario', nuevoRol);

      // QUERY DE MODIFICACIÓN CON WHERE OBLIGATORIO
      const result = await request.query(`
        UPDATE Usuarios
        SET rol_usuario = @rol_usuario
        WHERE id_usuario = @id_usuario
      `);

      if (result.rowsAffected[0] === 0) {
        return { success: false, message: 'No se encontró el usuario para cambiar su rol.' };
      }

      return { success: true, message: `El rol del usuario fue actualizado a ${nuevoRol.toUpperCase()} correctamente.` };
    } catch (error) {
      console.error('Error en UsuarioService.actualizarRol:', error);
      throw new Error('Error al intentar actualizar el rol del usuario.');
    }
  }

  /**
   * Activa o desactiva la cuenta de un usuario en el sistema.
   * CUMPLE REGLA ESTRICTA: Incluye la cláusula WHERE id_usuario = @id_usuario.
   * @param idUsuario ID único del usuario.
   * @param estaActivo Booleano indicando si quedará activo (true) o inactivo/bloqueado (false).
   */
  static async cambiarEstadoActivo(idUsuario: number, estaActivo: boolean): Promise<{ success: boolean; message: string }> {
    try {
      const pool = await getAppPool();
      const request = pool.request()
        .input('id_usuario', idUsuario)
        .input('esta_activo', estaActivo ? 1 : 0);

      // QUERY DE MODIFICACIÓN CON WHERE OBLIGATORIO
      const result = await request.query(`
        UPDATE Usuarios
        SET esta_activo = @esta_activo
        WHERE id_usuario = @id_usuario
      `);

      if (result.rowsAffected[0] === 0) {
        return { success: false, message: 'Usuario no encontrado para cambiar su estado.' };
      }

      const estadoText = estaActivo ? 'habilitado (activo)' : 'deshabilitado (inactivo)';
      return { success: true, message: `El usuario ha sido ${estadoText} con éxito.` };
    } catch (error) {
      console.error('Error en UsuarioService.cambiarEstadoActivo:', error);
      throw new Error('Error al modificar el estado del usuario en la base de datos.');
    }
  }

  /**
   * Valida las credenciales de un usuario y retorna la cuenta si los datos son correctos.
   * @param nombreUsuario Usuario ingresado.
   * @param contrasenaPlana Contraseña en texto plano para cotejar con bcrypt.
   */
  static async validarCredenciales(nombreUsuario: string, contrasenaPlana: string) {
    const usuario = await this.obtenerPorNombreUsuario(nombreUsuario);
    
    if (!usuario) {
      return null;
    }

    if (!usuario.esta_activo) {
      throw new Error('La cuenta de usuario está inactiva o deshabilitada en el sistema.');
    }

    // Validar contraseña con bcrypt
    const esValida = await bcrypt.compare(contrasenaPlana, usuario.contrasena_hash);
    
    if (esValida) {
      // Retornamos la info sin el hash por seguridad
      const { contrasena_hash, ...infoUsuario } = usuario;
      return infoUsuario;
    }
    
    return null;
  }
}
