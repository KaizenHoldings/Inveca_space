import { NextResponse } from 'next/server';
import { SolicitudCoordenadaService, SolicitudCoordenada } from '@/services/SolicitudCoordenadaService';

/**
 * Endpoint GET para listar solicitudes de modificación de coordenadas.
 * Permite recibir de manera opcional el filtro de status vía query strings (?status=PENDIENTE).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    
    const solicitudes = await SolicitudCoordenadaService.obtenerSolicitudes(status);
    return NextResponse.json({ success: true, data: solicitudes }, { status: 200 });
  } catch (error) {
    console.error('Error en GET /api/solicitudes-coordenadas:', error);
    return NextResponse.json({ success: false, message: 'Error al obtener las solicitudes de coordenadas' }, { status: 500 });
  }
}

/**
 * Endpoint POST para registrar una nueva solicitud de cambio de coordenadas desde la interfaz de Consulta de Clientes.
 */
export async function POST(request: Request) {
  try {
    const body: SolicitudCoordenada = await request.json();

    if (!body.codigo_cliente || !body.rif_cliente || !body.coordenada_propuesta) {
      return NextResponse.json(
        { success: false, message: 'Faltan campos obligatorios (código de cliente, RIF o coordenada propuesta).' }, 
        { status: 400 }
      );
    }

    const resultado = await SolicitudCoordenadaService.crearSolicitud({
      ...body,
      status_solicitud: 'PENDIENTE'
    });

    return NextResponse.json(resultado, { status: 201 });
  } catch (error) {
    console.error('Error en POST /api/solicitudes-coordenadas:', error);
    return NextResponse.json({ success: false, message: 'Ocurrió un error al procesar la solicitud del cambio de coordenadas' }, { status: 500 });
  }
}

/**
 * Endpoint PUT o PATCH para actualizar el estado de una solicitud (Aprobar / Denegar) en etapas de administración.
 */
export async function PATCH(request: Request) {
  try {
    const body: { id_solicitud?: number; status_solicitud?: 'APROBADA' | 'DENEGADA' } = await request.json();

    if (!body.id_solicitud || !body.status_solicitud || !['APROBADA', 'DENEGADA'].includes(body.status_solicitud)) {
      return NextResponse.json(
        { success: false, message: 'Parámetros inválidos. Requiere id_solicitud y status_solicitud (APROBADA o DENEGADA).' },
        { status: 400 }
      );
    }

    const resultado = await SolicitudCoordenadaService.actualizarStatus(body.id_solicitud, body.status_solicitud);
    return NextResponse.json(resultado, { status: 200 });
  } catch (error) {
    console.error('Error en PATCH /api/solicitudes-coordenadas:', error);
    return NextResponse.json({ success: false, message: 'Error al actualizar el estado de la solicitud' }, { status: 500 });
  }
}
