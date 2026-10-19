import { getAppPool } from '@/lib/db/mssql';
import { ProfitService } from './ProfitService';

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
   * Al APROBAR, actualiza automáticamente las coordenadas del cliente en la base de datos de Profit 2k12.
   * CUMPLE REGLA DE SISTEMA: Siempre incluye cláusula WHERE en las consultas de actualización.
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

      // 1. Obtener los datos de la solicitud
      const checkResult = await request.query(`
        SELECT id_solicitud, codigo_cliente, coordenada_propuesta, status_solicitud
        FROM SolicitudesCoordenadas
        WHERE id_solicitud = @id_solicitud
      `);

      if (!checkResult.recordset || checkResult.recordset.length === 0) {
        return { success: false, message: 'No se encontró la solicitud especificada o el ID es incorrecto.' };
      }

      const solicitud = checkResult.recordset[0];

      // 2. Si se aprueba, actualizar la coordenada en la BD Profit 2k12 (saCliente.direc2)
      if (nuevoStatus === 'APROBADA') {
        const codigoCliente = (solicitud.codigo_cliente || '').trim();
        const coordenadaPropuesta = (solicitud.coordenada_propuesta || '').trim();

        if (!codigoCliente || !coordenadaPropuesta) {
          return {
            success: false,
            message: 'La solicitud no contiene un código de cliente o coordenada propuesta válida.'
          };
        }

        // Ejecutar UPDATE en Profit 2k12 con WHERE explícito
        const actualizadoEn2k12 = await ProfitService.actualizarCoordenadaCliente2k12(codigoCliente, coordenadaPropuesta);

        if (!actualizadoEn2k12) {
          return {
            success: false,
            message: `No se pudo actualizar el cliente con código "${codigoCliente}" en Profit 2k12. Verifique que exista en saCliente.`
          };
        }
      }

      // 3. Actualizar el status de la solicitud en la base de datos local
      const updateReq = pool.request();
      updateReq.input('id_solicitud', idSolicitud);
      updateReq.input('status_solicitud', nuevoStatus);

      // QUERY DE MODIFICACION CON WHERE OBLIGATORIO POR REGLAS
      const result = await updateReq.query(`
        UPDATE SolicitudesCoordenadas
        SET status_solicitud = @status_solicitud
        WHERE id_solicitud = @id_solicitud
      `);

      if (result.rowsAffected[0] === 0) {
        return { success: false, message: 'No se pudo actualizar el registro de la solicitud.' };
      }

      const mensaje = nuevoStatus === 'APROBADA'
        ? 'Solicitud APROBADA y coordenada actualizada con éxito en Profit 2k12.'
        : `El status de la solicitud ha sido cambiado a ${nuevoStatus} correctamente.`;

      return { success: true, message: mensaje };
    } catch (error: any) {
      console.error('Error en SolicitudCoordenadaService.actualizarStatus:', error);
      throw new Error(error.message || 'Error al intentar modificar el status de la solicitud.');
    }
  }
}
