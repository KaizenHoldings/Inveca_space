import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { sanitizeErrorMessage } from '@/lib/errorHandler';

export async function POST(req: Request) {
  try {
    const { notas } = await req.json();

    if (!notas || !Array.isArray(notas) || notas.length === 0) {
      return NextResponse.json({ error: 'No hay datos para exportar.' }, { status: 400 });
    }

    // Ruta a la plantilla
    const templatePath = path.join(process.cwd(), 'template.xlsx');

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'El archivo template.xlsx no se encuentra en el servidor.' }, { status: 404 });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    // Se asume que se usa la primera hoja
    const worksheet = workbook.worksheets[0];
    
    if (!worksheet) {
      return NextResponse.json({ error: 'No se pudo leer la primera hoja de la plantilla.' }, { status: 500 });
    }

    // Comenzar desde la fila 2 (asumiendo fila 1 de encabezados)
    let rowIndex = 2;

    for (const nota of notas) {
      const rowData = [
        nota.codigoParada || '',          // A: CÓDIGO DE PARADA*
        nota.latitud || '',               // B: LATITUD
        nota.longitud || '',              // C: LONGITUD
        nota.direccion || '',             // D: DIRECCION*
        nota.nombreItem || '',            // E: NOMBRE ITEM*
        nota.cantidad || '',              // F: CANTIDAD*
        nota.codigoItem || '',            // G: CODIGO ITEM
        nota.fechaMinEntrega || '',       // H: FECHA MIN ENTREGA*
        nota.fechaMaxEntrega || '',       // I: FECHA MAX ENTREGA*
        nota.minVentana1 || '',           // J: MIN VENTANA HORARIA 1*
        nota.maxVentana1 || '',           // K: MAX VENTANA HORARIA 1*
        nota.minVentana2 || '',           // L: MIN VENTANA HORARIA 2
        nota.maxVentana2 || '',           // M: MAX VENTANA HORARIA 2
        nota.costoItem || '',             // N: COSTO ITEM
        nota.capacidadUno || '',          // O: CAPACIDAD UNO
        nota.capacidadDos || '',          // P: CAPACIDAD DOS
        nota.serviceTime || '',           // Q: SERVICE TIME
        nota.importancia || '',           // R: IMPORTANCIA
        nota.identificadorContacto || '', // S: IDENTIFICADOR CONTACTO*
        nota.nombreContacto || '',        // T: NOMBRE CONTACTO*
        nota.telefono || '',              // U: TELEFONO
        nota.emailContacto || '',         // V: EMAIL CONTACTO
        nota.ctOrigen || '',              // W: CT ORIGEN*
        '',                               // X: OBSERVASION (Vacío o según dato)
        ''                                // Y: TIEMPO DE DESCARGA (Vacío o según dato)
      ];

      const row = worksheet.getRow(rowIndex);
      row.values = rowData;
      // Para que se aplique correctamente
      row.commit();
      rowIndex++;
    }

    const buffer = await workbook.xlsx.writeBuffer();

    // Devolver como descarga binaria
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="sincronizacion.xlsx"`,
      },
    });

  } catch (error: any) {
    console.error('Error generando Excel:', error);
    return NextResponse.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}
