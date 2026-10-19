import { getPool2k8, getPool2k12 } from '../lib/db/mssql';
import sql from 'mssql';

export class ProfitService {
  /**
   * Obtiene la lista de almacenes disponibles desde 2k12
   */
  static async getAlmacenes() {
    try {
      const pool = await getPool2k12();
      const result = await pool.request().query(`
        SELECT co_alma AS Codigo, des_alma AS Descripcion 
        FROM saAlmacen WITH (NOLOCK)
        ORDER BY co_alma
      `);

      const almacenes = [
        { Codigo: 'TODOS', Descripcion: 'TODOS LOS ALMACENES' },
        ...result.recordset
      ];

      return almacenes;
    } catch (error) {
      console.error('Error obteniendo almacenes de 2k12:', error);
      return [{ Codigo: 'TODOS', Descripcion: 'TODOS LOS ALMACENES' }];
    }
  }

  /**
   * Obtiene los datos de sincronización cruzando información si es necesario
   */
  static async getDatosSincronizacion(version: string, fechaInit: string, fechaEnd: string, almacen: string, minParada?: string, maxParada?: string, excluirAnuladas: boolean = true) {
    // Configurar fechas
    const initDate = new Date(fechaInit);
    initDate.setHours(0, 0, 0, 0);

    const endDate = new Date(fechaEnd);
    endDate.setHours(23, 59, 59, 999);

    if (version === '2k8') {
      return await this.getData2k8(initDate, endDate, almacen, minParada, maxParada, excluirAnuladas);
    } else if (version === '2k12') {
      return await this.getData2k12(initDate, endDate, almacen, minParada, maxParada, excluirAnuladas);
    }

    throw new Error('Versión no soportada');
  }

  private static async getData2k8(fechaInit: Date, fechaEnd: Date, almacen: string, minParada?: string, maxParada?: string, excluirAnuladas: boolean = true) {
    try {
      const pool2k8 = await getPool2k8();

      const query = `
        SELECT a.fact_num as NOTA, 
        a.fec_emis as FECHA, 
        a.fec_venc as VENC,
        b.rif +  ' - ' + b.cli_des as CLIENTE,
        b.rif as RIF,
        B.DIREC2 as COORD,
        b.cli_des as DESCRIPCION_CLIENTE,
        b.direc1 as DIRECCION_1,
        (CASE WHEN A.DESCRIP LIKE '%@%' THEN A.DESCRIP ELSE A.dir_ent END) as DIRECCION_2, 
        c.co_ven + ' - ' + c.ven_des as VENDEDOR,
        d.des_tran as TRANSPORTE,
        f.co_art as COD_ARTICULO,
        f.co_art + ' ' + f.art_des as ARTICULO,
        f.modelo as MODELO,
        e.co_alma as ALMACEN,
        (case when upper(g.alma_des) like '%VIGIA%' then 'Almacen El Vigia' else 'Almacen Mariche' end) as DESCRIPCION_ALMACEN,
        CAST(e.total_art AS INT) as CANTIDAD,
        e.uni_venta as UNIDAD,
        e.prec_vta as PRECIO,
        e.cant_imp as IMPUESTO,
        e.des_art as DESCUENTO,
        e.reng_neto as NETO,
        a.anulada as ANULADA,
        a.descrip as DESCRIPCION,
        ' ' as FECHA_DESPCHO, 
        ' ' as RUTA,
        ' ' as RUTA1, 
        d.des_tran as TRANSPORTE_DESPACHO, 
        ' ' as FLETE,
        a.comentario as OBSERVASION
        FROM not_ent a WITH (NOLOCK)
        JOIN clientes b WITH (NOLOCK) ON a.co_cli = b.co_cli
        JOIN vendedor c WITH (NOLOCK) ON a.co_ven = c.co_ven
        JOIN transpor d WITH (NOLOCK) ON a.co_tran = d.co_tran
        JOIN reng_nde e WITH (NOLOCK) ON e.fact_num = a.fact_num
        JOIN art f WITH (NOLOCK) ON f.co_art = e.co_art
        JOIN sucursales g WITH (NOLOCK) ON a.co_sucu = g.co_alma             
        WHERE a.FE_US_IN BETWEEN @FechaInicio AND @FechaFin                     
        AND (@Almacen = 'TODOS' OR e.co_alma = @Almacen)
        AND (@MinParada IS NULL OR a.fact_num >= @MinParada)
        AND (@MaxParada IS NULL OR a.fact_num <= @MaxParada)
        AND (@ExcluirAnuladas = 0 OR a.anulada = 0)
      `;

      const request = pool2k8.request();
      request.input('FechaInicio', sql.DateTime, fechaInit);
      request.input('FechaFin', sql.DateTime, fechaEnd);
      request.input('Almacen', sql.VarChar, almacen);
      request.input('MinParada', sql.BigInt, minParada && minParada.trim() !== '' ? parseInt(minParada, 10) : null);
      request.input('MaxParada', sql.BigInt, maxParada && maxParada.trim() !== '' ? parseInt(maxParada, 10) : null);
      request.input('ExcluirAnuladas', sql.Bit, excluirAnuladas ? 1 : 0);

      const result = await request.query(query);
      const notas = result.recordset;

      // Inicializar cada nota con origen 2k8 y detectar si tiene '@'
      for (const nota of notas) {
        nota.ORIGEN_BD = '2k8';
        const dir2 = (nota.DIRECCION_2 || '').trim();
        const desc = (nota.DESCRIPCION || '').trim();
        nota.TIENE_ARROBA_2K8 = dir2.includes('@') || desc.includes('@');
        nota.DIRECCION_2_ORIGINAL_2K8 = dir2;
        nota.CODIGO_CLIENTE = '';
        nota.cliente2k12Encontrado = false;
        nota.coordenadasDesde2k12 = false;
      }

      // FASE 2: Cruce de datos con 2k12 a través de DIRECCION_2 cuando contiene '@'
      const codigosExtraidos = new Set<string>();

      for (const nota of notas) {
        if (nota.TIENE_ARROBA_2K8) {
          const dir2 = (nota.DIRECCION_2 || '').trim();
          const desc = (nota.DESCRIPCION || '').trim();
          const fuente = dir2.includes('@') ? dir2 : desc;
          const codigo = fuente.split('@')[0].trim();
          if (codigo) {
            codigosExtraidos.add(codigo);
          }
        }
      }

      if (codigosExtraidos.size > 0) {
        const codigos = Array.from(codigosExtraidos);
        const pool2k12 = await getPool2k12();

        // Armar el query IN seguro
        const req2k12 = pool2k12.request();
        const variables = codigos.map((cod, i) => {
          req2k12.input(`cod${i}`, sql.VarChar, cod);
          return `@cod${i}`;
        });

        const inClause = variables.join(', ');
        const query2k12 = `
          SELECT 
              co_cli,
              rif as RIF,
              trim(rif) + ' - ' + trim(cli_des) as CLIENTE,
              cli_des as DESCRIPCION_CLIENTE,
              direc1 as DIRECCION_1,
              direc2 as COORD,
              (CASE WHEN dir_ent2 IS NULL OR TRIM(dir_ent2) = '' THEN direc1 ELSE dir_ent2 END) as DIRECCION_2
          FROM saCliente WITH (NOLOCK)
          WHERE co_cli IN (${inClause})
        `;

        const res2k12 = await req2k12.query(query2k12);
        const clientesFrescos = new Map(res2k12.recordset.map(c => [c.co_cli.trim(), c]));

        // Sobreescribir notas 2k8 con datos de 2k12 SOLO si el código existe en saCliente
        for (const nota of notas) {
          if (nota.TIENE_ARROBA_2K8) {
            const dir2 = (nota.DIRECCION_2 || '').trim();
            const desc = (nota.DESCRIPCION || '').trim();
            const fuente = dir2.includes('@') ? dir2 : desc;
            const codigo = fuente.split('@')[0].trim();
            const clienteFresco = clientesFrescos.get(codigo);
            if (clienteFresco) {
              nota.RIF = clienteFresco.RIF;
              nota.CLIENTE = clienteFresco.CLIENTE;
              nota.DESCRIPCION_CLIENTE = clienteFresco.DESCRIPCION_CLIENTE;
              nota.DIRECCION_1 = clienteFresco.DIRECCION_1;
              nota.COORD = clienteFresco.COORD;
              nota.DIRECCION_2 = clienteFresco.DIRECCION_2;
              nota.CODIGO_CLIENTE = clienteFresco.co_cli ? clienteFresco.co_cli.trim() : codigo;
              nota.cliente2k12Encontrado = true;
              nota.coordenadasDesde2k12 = true;
            } else {
              nota.CODIGO_CLIENTE = '';
              nota.cliente2k12Encontrado = false;
              nota.coordenadasDesde2k12 = false;
            }
          } else {
            nota.CODIGO_CLIENTE = '';
            nota.cliente2k12Encontrado = false;
            nota.coordenadasDesde2k12 = false;
          }
        }
      }

      return notas;

    } catch (error) {
      console.error('Error extrañendo datos 2k8:', error);
      throw error;
    }
  }

  private static async getData2k12(fechaInit: Date, fechaEnd: Date, almacen: string, minParada?: string, maxParada?: string, excluirAnuladas: boolean = true) {
    try {
      const pool2k12 = await getPool2k12();

      // En 2k12 el cruce de almacén es estricto en la app original, pero podemos añadir el 'TODOS'
      const query = `
        SELECT a.doc_num as NOTA,                             
        a.fec_emis as FECHA,                             
        a.fec_venc as VENC,                            
        b.co_cli as CODIGO_CLIENTE,
        b.rif as RIF,                            
        trim(b.rif) + ' - ' + trim(b.cli_des) as CLIENTE,                            
        b.cli_des as DESCRIPCION_CLIENTE,                            
        b.direc1 as DIRECCION_1,                            
        b.direc2 as COORD,                            
        b.dir_ent2 as DIRECCION_2,                             
        trim(c.co_ven) + ' - ' + c.ven_des as VENDEDOR,                            
        d.des_tran as TRANSPORTE,                             
        f.co_art as COD_ARTICULO,                             
        trim(f.co_art) + ' ' + f.art_des as ARTICULO,                            
        f.modelo as MODELO,                            
        e.co_alma as ALMACEN,                            
        i.sucur_des as DESCRIPCION_ALMACEN,                             
        e.total_art as CANTIDAD,                            
        g.des_uni as UNIDAD,                            
        e.prec_vta as PRECIO,                            
        e.monto_imp as IMPUESTO,                            
        e.monto_desc as DESCUENTO,                            
        e.reng_neto as NETO,                            
        a.anulado as ANULADA,                            
        a.descrip as DESCRIPCION,                            
        ' ' as FECHA_DESPCHO,                             
        ' ' as RUTA,                             
        ' ' as RUTA1,                             
        d.des_tran as TRANSPORTE_DESPACHO,                             
        ' ' as FLETE,                             
        ' ' as OBSERVASION                      
        FROM saNotaDespachoVenta a WITH (NOLOCK)                      
        JOIN saCliente b WITH (NOLOCK) ON a.co_cli = b.co_cli                     
        JOIN saVendedor c WITH (NOLOCK) ON a.co_ven = c.co_ven                     
        JOIN saTransporte d WITH (NOLOCK) ON a.co_tran = d.co_tran                     
        JOIN saNotaDespachoVentaReng e WITH (NOLOCK) ON e.doc_num = a.doc_num                      
        JOIN saArticulo f WITH (NOLOCK) ON f.co_art = e.co_art                     
        JOIN saUnidad g WITH (NOLOCK) ON e.co_uni = g.co_uni                     
        JOIN saAlmacen h WITH (NOLOCK) on e.co_alma = h.co_alma                     
        JOIN saSucursal i WITH (NOLOCK) on h.co_sucur = i.co_sucur                     
        WHERE a.FE_US_IN BETWEEN @FechaInicio AND @FechaFin                     
        AND (@Almacen = 'TODOS' OR e.co_alma = @Almacen)
        AND (@MinParada IS NULL OR a.doc_num >= @MinParada)
        AND (@MaxParada IS NULL OR a.doc_num <= @MaxParada)
        AND (@ExcluirAnuladas = 0 OR a.anulado = 0); 
      `;

      const request = pool2k12.request();
      request.input('FechaInicio', sql.DateTime, fechaInit);
      request.input('FechaFin', sql.DateTime, fechaEnd);
      request.input('Almacen', sql.VarChar, almacen);
      request.input('MinParada', sql.BigInt, minParada && minParada.trim() !== '' ? parseInt(minParada, 10) : null);
      request.input('MaxParada', sql.BigInt, maxParada && maxParada.trim() !== '' ? parseInt(maxParada, 10) : null);
      request.input('ExcluirAnuladas', sql.Bit, excluirAnuladas ? 1 : 0);

      const result = await request.query(query);
      return result.recordset.map(row => ({
        ...row,
        ORIGEN_BD: '2k12',
        TIENE_ARROBA_2K8: false,
        coordenadasDesde2k12: false,
        CODIGO_CLIENTE: (row.CODIGO_CLIENTE || '').toString().trim(),
        cliente2k12Encontrado: Boolean((row.CODIGO_CLIENTE || '').toString().trim())
      }));

    } catch (error) {
      console.error('Error extrañendo datos 2k12:', error);
      throw error;
    }
  }

  /**
   * Busca y pagina clientes en la base de datos 2k12 con opción de excluir cadenas principales (-000)
   */
  static async buscarClientes2k12(params: {
    descripcion?: string;
    codigo?: string;
    rif?: string;
    direccion?: string;
    excluirCadenas?: boolean;
    page?: number;
    pageSize?: number;
  } | string): Promise<{
    total: number;
    totalFiltrado: number;
    totalConCoordenadas: number;
    totalSinCoordenadas: number;
    records: any[];
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const pool2k12 = await getPool2k12();

      let descripcion = '';
      let codigo = '';
      let rif = '';
      let direccion = '';
      let excluirCadenas = false;
      let page = 1;
      let pageSize = 10;

      if (typeof params === 'string') {
        descripcion = params;
      } else if (params) {
        descripcion = params.descripcion || '';
        codigo = params.codigo || '';
        rif = params.rif || '';
        direccion = params.direccion || '';
        excluirCadenas = Boolean(params.excluirCadenas);
        page = Math.max(1, Number(params.page) || 1);
        pageSize = Math.max(1, Math.min(100, Number(params.pageSize) || 10));
      }

      const offset = (page - 1) * pageSize;

      // Base de condiciones del WHERE (excluyendo únicamente RIF en blanco o especiales)
      let whereConditions = `
        WHERE a.rif IS NOT NULL AND LTRIM(RTRIM(a.rif)) <> '' 
        AND a.rif NOT IN ('V105363628' , 'V223823609', 'V284762823')
      `;

      // Si el usuario marcó el check de excluir cadenas principales / casas matrices (-000)
      if (excluirCadenas) {
        whereConditions += ` AND RIGHT(LTRIM(RTRIM(a.co_cli)), 3) <> '000'`;
      }

      const request = pool2k12.request();

      if (descripcion.trim()) {
        whereConditions += ` AND a.cli_des LIKE @Descripcion`;
        request.input('Descripcion', sql.VarChar, `%${descripcion.trim()}%`);
      }
      if (codigo.trim()) {
        whereConditions += ` AND a.co_cli LIKE @Codigo`;
        request.input('Codigo', sql.VarChar, `%${codigo.trim()}%`);
      }
      if (rif.trim()) {
        whereConditions += ` AND a.rif LIKE @Rif`;
        request.input('Rif', sql.VarChar, `%${rif.trim()}%`);
      }
      if (direccion.trim()) {
        whereConditions += ` AND (a.direc1 LIKE @Direccion OR a.dir_ent2 LIKE @Direccion OR a.direc2 LIKE @Direccion)`;
        request.input('Direccion', sql.VarChar, `%${direccion.trim()}%`);
      }

      request.input('Offset', sql.Int, offset);
      request.input('PageSize', sql.Int, pageSize);

      // QUERY 1: Estadística Total GLOBAL en saCliente (Sin filtros, para reflejar el conteo total real como en SSMS)
      // QUERY 2: Conteo de registros que coinciden con los filtros actuales (para la paginación)
      // QUERY 3: Los 10 registros de la página actual
      const query = `
        SELECT 
          count(1) as total,
          sum(case when a.direc2 is not null and LTRIM(RTRIM(a.direc2)) <> '' and LTRIM(RTRIM(a.direc2)) <> '-' and UPPER(LTRIM(RTRIM(a.direc2))) <> 'NULL' and LTRIM(RTRIM(a.direc2)) <> '0' and LTRIM(RTRIM(a.direc2)) <> '0, 0' then 1 else 0 end) as totalConCoordenadas,
          sum(case when a.direc2 is null or LTRIM(RTRIM(a.direc2)) = '' or LTRIM(RTRIM(a.direc2)) = '-' or UPPER(LTRIM(RTRIM(a.direc2))) = 'NULL' or LTRIM(RTRIM(a.direc2)) = '0' or LTRIM(RTRIM(a.direc2)) = '0, 0' then 1 else 0 end) as totalSinCoordenadas
        FROM saCliente a WITH (NOLOCK);

        SELECT count(1) as totalFiltrated FROM saCliente a WITH (NOLOCK) ${whereConditions};

        WITH PagedClientes AS (
          SELECT 
            trim(a.co_cli) as 'CODIGO',
            trim(a.rif) as 'RIF',
            trim(a.cli_des) as 'DESCRIPCION',
            trim(a.direc1) as 'DIRECCION FISCAL',
            trim(a.dir_ent2) as 'DIRECCION DE ENTREGA',
            CASE 
              WHEN a.direc2 IS NULL OR LTRIM(RTRIM(a.direc2)) = '' OR LTRIM(RTRIM(a.direc2)) = '-' OR UPPER(LTRIM(RTRIM(a.direc2))) = 'NULL' OR LTRIM(RTRIM(a.direc2)) = '0' OR LTRIM(RTRIM(a.direc2)) = '0, 0' THEN '' 
              ELSE trim(a.direc2) 
            END as 'COORDENADAS',
            ROW_NUMBER() OVER (ORDER BY a.cli_des ASC, a.co_cli ASC) as RowNum
          FROM saCliente a WITH (NOLOCK)
          ${whereConditions}
        )
        SELECT CODIGO, RIF, DESCRIPCION, [DIRECCION FISCAL], [DIRECCION DE ENTREGA], COORDENADAS
        FROM PagedClientes
        WHERE RowNum BETWEEN (@Offset + 1) AND (@Offset + @PageSize)
        ORDER BY RowNum ASC;
      `;

      const result = await request.query(query);
      const recordsets = Object.values(result.recordsets || {});

      // Estadísticas Globales
      const summaryRow = recordsets[0]?.[0] || { total: 0, totalConCoordenadas: 0, totalSinCoordenadas: 0 };
      const total = summaryRow.total || 0;
      const totalConCoordenadas = summaryRow.totalConCoordenadas || 0;
      const totalSinCoordenadas = summaryRow.totalSinCoordenadas || 0;

      // Conteo específico del filtro actual para determinar total de páginas
      const filteredRow = recordsets[1]?.[0] || { totalFiltrated: 0 };
      const totalFiltrated = filteredRow.totalFiltrated || 0;

      // Registros Paginados
      const rawRecords = recordsets[2] || [];
      const records = rawRecords.map((r: any) => {
        const coord = r.COORDENADAS && String(r.COORDENADAS).trim();
        const esInvalida = !coord || coord === '-' || coord.toUpperCase() === 'NULL' || coord === '0' || coord === '0, 0';
        return {
          ...r,
          COORDENADAS: esInvalida ? '' : coord
        };
      });

      return {
        total,
        totalFiltrado: totalFiltrated,
        totalConCoordenadas,
        totalSinCoordenadas,
        records,
        page,
        pageSize,
        totalPages: Math.ceil(totalFiltrated / pageSize) || 1
      };

    } catch (error) {
      console.error('Error buscando clientes en 2k12:', error);
      throw error;
    }
  }

  /**
   * Actualiza las coordenadas de un cliente directamente en la base de datos Profit 2k12 (saCliente.direc2).
   * CUMPLE REGLAS DE SEGURIDAD: Siempre incluye cláusula WHERE co_cli = @codigoCliente con parámetro seguro.
   *
   * @param codigoCliente Código único del cliente en 2k12 (saCliente.co_cli)
   * @param coordenadas Cadena con las nuevas coordenadas a guardar (saCliente.direc2)
   * @returns boolean true si se actualizó al menos una fila
   */
  static async actualizarCoordenadaCliente2k12(codigoCliente: string, coordenadas: string): Promise<boolean> {
    try {
      const pool = await getPool2k12();
      const request = pool.request();

      request.input('codigoCliente', sql.VarChar, codigoCliente.trim());
      request.input('coordenadas', sql.VarChar, coordenadas.trim());

      const query = `
        UPDATE saCliente
        SET direc2 = @coordenadas
        WHERE co_cli = @codigoCliente;
      `;

      const result = await request.query(query);
      return (result.rowsAffected[0] ?? 0) > 0;
    } catch (error) {
      console.error('Error actualizando coordenada en saCliente de Profit 2k12:', error);
      throw error;
    }
  }
}

