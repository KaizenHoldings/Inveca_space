import { NextResponse } from 'next/server';
import { ProfitService } from '../../../services/ProfitService';

export async function GET() {
  try {
    const almacenes = await ProfitService.getAlmacenes();
    return NextResponse.json({ data: almacenes }, { status: 200 });
  } catch (error: any) {
    console.error('API Error obteniendo almacenes:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
