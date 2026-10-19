export class FormatService {
  static DiccionarioUnidades: Record<string, number> = {
    "BATATA160GR": 1,
    "V0725990891": 25,
    "V0725010200": 10,
    "1141111049": 1,
    "V0725010812": 1,
    "V0725010811": 1,
    "V0725010202": 10,
    "MIX-PMY-220GR": 1,
    "V0725010211": 10,
    "V0725010997": 10,
    "V0725990890": 25,
    "OCUMO180GR": 1,
    "PLALI300GR": 1,
    "PLA34GR": 1,
    "V0725010605": 20,
    "PS140G": 1,
    "PLA300GR": 1,
    "PLA85GR": 1,
    "V0725990873": 10,
    "V0725990856": 10,
    "V0725010998": 20,
    "V0725010602": 10,
    "V0725990875": 48,
    "V0725010606": 20,
    "V0725990870": 16,
    "V0725990887": 16,
    "V0725990888": 10,
    "V0725010205": 18,
    "V0725010204": 35,
    "V0725010201": 25,
    "SALSEMADURITO80G": 1,
    "SALSE270G": 1,
    "SALSE28G": 1,
    "SALSE80G": 1,
    "V0725990885": 60,
    "V0725010208": 96,
    "V0725990881": 25,
    "V0725010206": 35,
    "V0725990879": 12,
    "V0725010809": 20,
    "V0725010805": 10,
    "V0725010806": 10,
    "V0725010810": 20,
    "V0725010807": 10,
    "V0725010808": 20,
    "V0725010603": 10,
    "YCEB180GR": 1,
    "V0725010604": 10,
    "YL180GR": 1,
    "YS28GR": 1,
    "V0725010618": 10,
    "YS180GR": 1,
    "V0725010610": 20,
    "YS70GR": 1,
    "V0725990864": 10,
    "V0725990892": 20,
    "YCEB70GR": 1,
    "V0725010612": 20,
    "V0725010611": 20,
    "V0725010802": 20,
    "V0725990865": 48,
    "V0725010800": 20,
    "YL70GR": 1,
    "BATATA45GR": 1,
    "OCUMO45GR": 1,
    "PLALI85GR": 1,
    "V0725990889": 10,
    "V0725010801": 10,
    "V0725010803": 10,
    "V0725990874": 6,
    "V0725010644": 6,
    "V0725010645": 10,
    "V0725990893": 56,
    "YS28GR-56U": 1,
    "V0725990894": 56,
    "PLA34GR-56U": 1,
    "SALSE80GR-35U": 1,
    "SALSE28GR-96U": 1,
    "V0725010210": 50,
    "V0725010993": 6,
    "V0725010996": 6,
    "V0725010212": 10,
    "V0725010995": 6,
    "V0725010994": 6,
    "V0725010213": 35,
    "V0725010646": 16,
    "V0725010215": 39,
    "V0725010214": 24,
    "MIX-OBR-180GR": 1,
    "V0725010218": 35,
    "SALSECHICHARRON-60G": 1,
    "V0725010203": 5,
    "V0725010207": 5,
    "V0725010209": 8,
    "V0725010216": 2,
    "V0725010219": 72,
    "V0725010220": 24,
    "V0725010221": 6,
    "V0725010222": 4,
    "V0725990880": 2,
    "V0725990895": 7,
    "V0725990896": 7,
    "V0725010999": 50,
    "V0725010224": 35,
    "V0725010223": 96,
    "V0725010608": 20
  };

  /**
   * Formatea los datos provenientes de la BD al formato esperado por DispatchTrack y la UI
   */
  static formatearDatos(datosCrudos: any[]) {
    if (!datosCrudos || datosCrudos.length === 0) return [];
    return datosCrudos.map((filaSql) => {
      // 1. Cálculo de Cantidad según el diccionario de unidades
      const codArticulo = filaSql.COD_ARTICULO ? filaSql.COD_ARTICULO.trim().toUpperCase() : '';
      const cantidadBd = parseFloat(filaSql.CANTIDAD) || 0;
      
      let divisor = 1;
      const unidadMapeada = this.DiccionarioUnidades[codArticulo];
      if (unidadMapeada && unidadMapeada > 0) {
        divisor = unidadMapeada;
      }

      const tipoUnidad = filaSql.UNIDAD ? filaSql.UNIDAD.trim().toUpperCase() : '';
      const cantidadCalculada = cantidadBd / (tipoUnidad === 'UNIDAD' ? divisor : 1);

      // 2. Cálculo de Coordenadas (Latitud y Longitud)
      let latitud = '';
      let longitud = '';
      const coordStr = filaSql.COORD ? filaSql.COORD.trim() : '';

      if (coordStr) {
        // Dividir por espacios y filtrar elementos vacíos
        const partesCoord = coordStr.split(' ').filter((p: string) => p.trim() !== '');
        if (partesCoord.length >= 2) {
          latitud = partesCoord[0].replace(/,/g, '');
          longitud = partesCoord[1].replace(/,/g, '');
        }
      }

      // 3. Formateo de Fechas (YYYY-MM-DD para la UI, o el formato que se prefiera)
      // Ajustamos para devolver string simple y limpio (YYYY-MM-DD para facilitar manejo en el cliente, 
      // o DD/MM/YYYY si el DispatchTrack lo requiere así estrictamente, lo mandaremos YYYY-MM-DD por defecto para compatibilidad)
      const formatearFecha = (fechaDb: any) => {
        if (!fechaDb) return '';
        const dateObj = new Date(fechaDb);
        if (isNaN(dateObj.getTime())) return '';
        return dateObj.toISOString().split('T')[0];
      };

      return {
        codigoParada: filaSql.NOTA,
        latitud: latitud,
        longitud: longitud,
        direccion: filaSql.DIRECCION_2,
        nombreItem: filaSql.ARTICULO,
        cantidad: Math.round(cantidadCalculada).toString(),
        codigoItem: codArticulo,
        fechaMinEntrega: formatearFecha(filaSql.FECHA),
        fechaMaxEntrega: formatearFecha(filaSql.VENC),
        minVentana1: '07:00',
        maxVentana1: '20:00',
        minVentana2: '',
        maxVentana2: '',
        costoItem: filaSql.PRECIO || '',
        capacidadUno: '1',
        capacidadDos: '3',
        serviceTime: '',
        importancia: filaSql.IMPORTANCIA || '', 
        identificadorContacto: filaSql.RIF,
        nombreContacto: filaSql.DESCRIPCION_CLIENTE,
        telefono: '',
        emailContacto: '',
        ctOrigen: filaSql.DESCRIPCION_ALMACEN || '',
        codigoCliente: (filaSql.CODIGO_CLIENTE || '').toString().trim(),
        cliente2k12Encontrado: Boolean(filaSql.cliente2k12Encontrado && filaSql.CODIGO_CLIENTE),
        origenBd: (filaSql.ORIGEN_BD || '').toString().trim(),
        tieneArroba2k8: Boolean(filaSql.TIENE_ARROBA_2K8),
        coordenadasDesde2k12: Boolean(filaSql.coordenadasDesde2k12),
        direccion2_2k8: filaSql.ORIGEN_BD === '2k8'
          ? (filaSql.DIRECCION_2_ORIGINAL_2K8 || filaSql.DIRECCION_2 || '').toString().trim()
          : '',
      };
    });
  }

  /**
   * Agrupa el arreglo plano de notas en el formato anidado esperado por DispatchTrack
   */
  static formatToDispatchTrack(notas: any[], petitionName: string = 'Petición desde Sincronizador') {
    const stopsMap = new Map<string, any>();

    // DispatchTrack rechaza fechas en el pasado o del mismo día si la ventana horaria (ej 07:00) ya pasó.
    // Calculamos la fecha de mañana como un mínimo seguro.
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    for (const nota of notas) {
      // Aseguramos que la fecha enviada sea por lo menos mañana
      let finalMinDate = nota.fechaMinEntrega;
      let finalMaxDate = nota.fechaMaxEntrega;

      if (!finalMinDate || finalMinDate <= new Date().toISOString().split('T')[0]) {
        finalMinDate = tomorrowStr;
      }
      if (!finalMaxDate || finalMaxDate <= new Date().toISOString().split('T')[0]) {
        finalMaxDate = tomorrowStr;
      }

      if (!stopsMap.has(nota.codigoParada)) {
        stopsMap.set(nota.codigoParada, {
          identifier: nota.codigoParada,
          latitude: parseFloat(nota.latitud) || 0,
          longitude: parseFloat(nota.longitud) || 0,
          address: nota.direccion,
          min_dispatch_date: finalMinDate,
          max_dispatch_date: finalMaxDate,
          window_one_start: nota.minVentana1,
          window_one_end: nota.maxVentana1,
          window_two_start: nota.minVentana2,
          window_two_end: nota.maxVentana2,
          service_time: nota.serviceTime || "",
          dispatch_center: nota.ctOrigen,
          items: [],
          contact: {
            name: nota.nombreContacto,
            identification: nota.identificadorContacto,
          }
        });
      }

      // Añadir el item a la parada correspondiente
      const stop = stopsMap.get(nota.codigoParada);
      
      const capacities = [];
      if (nota.capacidadUno) capacities.push(parseFloat(nota.capacidadUno) || 0);
      if (nota.capacidadDos) capacities.push(parseFloat(nota.capacidadDos) || 0);

      stop.items.push({
        code: nota.nombreItem,
        description: nota.codigoItem || '',
        quantity: parseFloat(nota.cantidad) || 0,
        cost: parseFloat(nota.costoItem) || 0,
        capacities: capacities
      });
    }

    return {
      name: petitionName,
      stops: Array.from(stopsMap.values())
    };
  }
}
