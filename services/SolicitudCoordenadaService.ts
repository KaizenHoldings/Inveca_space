import { getAppPool } from '@/lib/db/mssql';

/**
 * Interfaz que representa una solicitud de cambio de coordenada de un cliente en el sistema local.
 */
export interface SolicitudCoordenada {
  id_solicitud?: number;
  codigo_cliente: string;
  rif_cliente: string;
  descripcion_cliente: string;
  direccion_cliente?: string;
  coordenada_original?: string;
  coordenada_propuesta: string;
  status_solicitud?: 'PENDIENTE' | 'APROBADA' | 'DENEGADA';
  fecha_creacion?: Date;
}

/**
 * Servicio encargado de gestionar las solicitudes de cambio de coordenadas para los clientes de Profit.
 * Esta información reside en la base de datos de la aplicación para su posterior moderación por un administrador.
 */
export class SolicitudCoordenadaService {
  /**
   * Registra una nueva solicitud de cambio de coordenadas en estado PENDIENTE.
   * 
   * @param data Datos del cliente y de las coordenadas origen y propuesta.
   * @returns La solicitud insertada o el resultado de la operación.
   */
  static async crearSolicitud(data: SolicitudCoordenada): Promise<{ success: boolean; message: string }> {
    try {
      const pool = await getAppPool();
      const request = pool.request();

      request.input('codigo_cliente', data.codigo_cliente);
      request.input('rif_cliente', data.rif_cliente);
      request.input('descripcion_cliente', data.descripcion_cliente);
      request.input('direccion_cliente', data.direccion_cliente || '');
      request.input('coordenada_original', data.coordenada_original || '');
      request.input('coordenada_propuesta', data.coordenada_propuesta);
      request.input('status_solicitud', data.status_solicitud || 'PENDIENTE');

      await request.query(`
        INSERT INTO SolicitudesCoordenadas (
          codigo_cliente, 
          rif_cliente, 
          descripcion_cliente, 
          direccion_cliente, 
          coordenada_original, 
          coordenada_propuesta, 
          status_solicitud, 
          fecha_creacion
        ) VALUES (
          @codigo_cliente, 
          @rif_cliente, 
          @descripcion_cliente, 
          @direccion_cliente, 
          @coordenada_original, 
          @coordenada_propuesta, 
          @status_solicitud, 
          GETDATE()
        )
      `);

      return { success: true, message: 'Solicitud de cambio de coordenada registrada exitosamente en estado PENDIENTE.' };
    } catch (error) {
      console.error('Error en SolicitudCoordenadaService.crearSolicitud:', error);
      throw new Error('No se pudo registrar la solicitud de modificación de coordenada.');
    }
  }

  /**
   * Obtiene el listado de solicitudes registradas en el sistema, opcionalmente filtradas por su status.
   * Ideal para la tabla y panel de administración posterior.
   * 
   * @param status Filtro opcional ('PENDIENTE', 'APROBADA', 'DENEGADA'). Si se omite, retorna todas.
   * @returns Lista de solicitudes de coordenadas.
   */
  static async obtenerSolicitudes(status?: string): Promise<SolicitudCoordenada[]> {
    try {
      const pool = await getAppPool();
      const request = pool.request();
      
      let query = `SELECT * FROM SolicitudesCoordenadas`;
      
      if (status && status.trim() !== '') {
        request.input('status', status.trim());
        query += ` WHERE status_solicitud = @status`;
      }

      query += ` ORDER BY fecha_creacion DESC`;

      const result = await request.query(query);
      return result.recordset as SolicitudCoordenada[];
    } catch (error) {
      console.error('Error en SolicitudCoordenadaService.obtenerSolicitudes:', error);
      return [];
    }
  }

  /**
   * Actualiza el status de una solicitud existente (para aprobación o denegación por administrador).
   * CUMPLE REGLA DE SISTEMA: Siempre incluye cláusula WHERE id_solicitud = @id_solicitud para evitar modificaciones accidentales en masa.
   * 
   * @param idSolicitud ID único de la solicitud a modificar.
   * @param nuevoStatus Nuevo estado atribuido ('APROBADA' o 'DENEGADA').
   * @returns Objeto indicando el éxito u error de la actualización.
   */
  static async actualizarStatus(idSolicitud: number, nuevoStatus: 'APROBADA' | 'DENEGADA'): Promise<{ success: boolean; message: string }> {
    try {
      const pool = await getAppPool();
      const request = pool.request();

      request.input('id_solicitud', idSolicitud);
      request.input('status_solicitud', nuevoStatus);

      // QUERY DE MODIFICACION CON WHERE OBLIGATORIO POR REGLAS
      const result = await request.query(`
        UPDATE SolicitudesCoordenadas
        SET status_solicitud = @status_solicitud
        WHERE id_solicitud = @id_solicitud
      `);

      if (result.rowsAffected[0] === 0) {
        return { success: false, message: 'No se encontró la solicitud especificada o el ID es incorrecto.' };
      }

      return { success: true, message: `El status de la solicitud ha sido cambiado a ${nuevoStatus} correctamente.` };
    } catch (error) {
      console.error('Error en SolicitudCoordenadaService.actualizarStatus:', error);
      throw new Error('Error al intentar modificar el status de la solicitud.');
    }
  }
}
