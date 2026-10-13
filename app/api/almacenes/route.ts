import { NextResponse } from 'next/server';
import { ProfitService } from '../../../services/ProfitService';
import { sanitizeErrorMessage } from '@/lib/errorHandler';

export async function GET() {
  try {
    const almacenes = await ProfitService.getAlmacenes();
    return NextResponse.json({ data: almacenes }, { status: 200 });
  } catch (error: any) {
    console.error('API Error obteniendo almacenes:', error);
    return NextResponse.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}
