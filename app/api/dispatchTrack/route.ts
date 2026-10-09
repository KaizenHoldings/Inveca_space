import { NextResponse } from 'next/server';
import { FormatService } from '../../../services/FormatService';

export async function POST(request: Request) {
  try {
    const { notas, petitionName } = await request.json();

    const payload = FormatService.formatToDispatchTrack(notas, petitionName || 'Petición desde Sincronizador');

    const dispatchUrl = process.env.DISPATCHTRACK_URL;
    const keyName = process.env.DISPATCHTRACK_KEYNAME || '';
    const keySecret = process.env.DISPATCHTRACK_KEYSECRET || '';

    let trackingId = '';

    if (!dispatchUrl || !keyName) {
      console.warn('Advertencia: Credenciales o URL de DispatchTrack incompletas. Simulando petición...');
      // Simulación de delay de red
      await new Promise((resolve) => setTimeout(resolve, 1500));
      trackingId = `mock-track-${Math.random().toString(36).substring(2, 9)}`;
    } else {
      // Petición real usando Basic Auth (requerido para DispatchTrack Planner API)
      const base64Auth = Buffer.from(`${keyName}:${keySecret}`).toString('base64');
      
      const response = await fetch(dispatchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${base64Auth}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error en DispatchTrack: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      // Asumiendo que devuelve un campo "id" o "tracking_id"
      trackingId = result.id || result.tracking_id || `ok-${Date.now()}`;
    }

    return NextResponse.json({ success: true, trackingId }, { status: 200 });

  } catch (error: any) {
    console.error('API Error DispatchTrack:', error);
    return NextResponse.json({ error: error.message || 'Error interno enviando a DispatchTrack' }, { status: 500 });
  }
}
