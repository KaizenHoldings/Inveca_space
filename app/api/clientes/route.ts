import { NextResponse } from 'next/server';
import { ProfitService } from '../../../services/ProfitService';
import { sanitizeErrorMessage } from '@/lib/errorHandler';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const resultado = await ProfitService.buscarClientes2k12(body || {});

    return NextResponse.json({ 
      data: resultado.records,
      total: resultado.total,
      totalFiltrados: resultado.totalFiltrado,
      totalConCoordenadas: resultado.totalConCoordenadas,
      totalSinCoordenadas: resultado.totalSinCoordenadas,
      page: resultado.page,
      pageSize: resultado.pageSize,
      totalPages: resultado.totalPages
    }, { status: 200 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}
