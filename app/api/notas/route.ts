import { NextResponse } from 'next/server';
import { ProfitService } from '../../../services/ProfitService';
import { FormatService } from '../../../services/FormatService';
import { sanitizeErrorMessage } from '@/lib/errorHandler';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { profitVersion, fechaMin, fechaMax, almacen, minParada, maxParada, excluirAnuladas } = body;

    if (!profitVersion || !fechaMin || !fechaMax || !almacen) {
      return NextResponse.json({ error: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    // Extraer datos crudos de la base de datos a través de ProfitService
    const notasOriginales = await ProfitService.getDatosSincronizacion(
      profitVersion, 
      fechaMin, 
      fechaMax, 
      almacen,
      minParada,
      maxParada,
      excluirAnuladas !== undefined ? excluirAnuladas : true
    );

    // Formatear los datos usando la lógica del ExcelService en el FormatService
    const notasFormateadas = FormatService.formatearDatos(notasOriginales);

    return NextResponse.json({ data: notasFormateadas }, { status: 200 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}
