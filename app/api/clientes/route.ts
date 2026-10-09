import { NextResponse } from 'next/server';
import { ProfitService } from '../../../services/ProfitService';

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
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}
