// Archivo: DatabaseService.cs
using Microsoft.Data.SqlClient;
//using Microsoft.Extensions.Configuration;
using System;
using System.Data;
using System.IO;

    public class DatabaseService
    {
        private readonly string _connectionString;
        private readonly string _connectionString2k12;

        public DatabaseService()
        {
            //var builder = new ConfigurationBuilder()
              //  .SetBasePath(AppContext.BaseDirectory)
                //.AddJsonFile("appsettings.json", optional: false, reloadOnChange: true);

            // IConfiguration configuration = builder.Build();
            // _connectionString = configuration.GetConnectionString("SqlConexion2k8");
            _connectionString = "Server=192.168.1.254;Database=EMP014_A;User Id=profit;Password=profit;TrustServerCertificate=True;";
        // _connectionString2k12 = configuration.GetConnectionString("SqlConexion2k12");
            _connectionString2k12 = "Server=192.168.1.253;Database=INVECA_AD;User Id=profit;Password=profit;TrustServerCertificate=True;";

        //_connectionString2k12 = "Server=192.168.1.253;Database=INVECA_AD;User Id=dispatchtrack;Password=DesarrolloSinveca2026!;TrustServerCertificate=True;";

        }


    // Ya no pedimos el (string version)
    public DataTable ObtenerAlmacenes()
    {
        DataTable tablaAlmacenes = new DataTable();

        try
        {
            // Nos conectamos directamente a la maestra (2k12)
            using (SqlConnection connection = new SqlConnection(_connectionString2k12))
            {
                string query = "SELECT co_alma AS Codigo, des_alma AS Descripcion FROM saAlmacen ORDER BY co_alma";

                using (SqlCommand cmd = new SqlCommand(query, connection))
                {
                    connection.Open();
                    using (SqlDataReader reader = cmd.ExecuteReader())
                    {
                        tablaAlmacenes.Load(reader);
                    }
                }
            }

            // ==========================================================
            // NUEVO: Agregamos la opción "TODOS" al principio de la tabla
            // ==========================================================
            DataRow filaTodos = tablaAlmacenes.NewRow();
            filaTodos["Codigo"] = "TODOS";
            filaTodos["Descripcion"] = "TODOS LOS ALMACENES";
            tablaAlmacenes.Rows.InsertAt(filaTodos, 0); // El 0 la coloca de primera en la lista
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"Error al inicializar almacenes desde 2k12: {ex.Message}");
        }

        return tablaAlmacenes;
    }
    public DataTable ObtenerDatosSincronizacion(string version, DateTime fecha_init, DateTime fecha_end, string almacen)
    {
        fecha_end = fecha_end.Date.AddDays(1).AddSeconds(-1);
        DataTable tablaResultados = new DataTable();
        System.Diagnostics.Debug.WriteLine("[Cruce de datos] Tabla 2k8 actualizada con éxito usando datos de 2k12.");

        if (version == "2k8")
        {
            using (SqlConnection connection = new SqlConnection(_connectionString))
            {
                // Ajustamos el parámetro del almacén en la consulta
                string query = """                     
                SELECT a.fact_num as NOTA, 
                a.fec_emis as FECHA, 
                a.fec_venc as VENC,
                a.fec_venc as VENC,
                b.rif +  ' - ' + b.cli_des as CLIENTE,
                b.rif as RIF,
                B.DIREC2 as COORD,
                b.cli_des as DESCRIPCION_CLIENTE,
                b.direc1 as DIRECCION_1,
                (CASE WHEN A.DESCRIP LIKE '%@%' THEN A.DESCRIP ELSE  A.dir_ent  END) as DIRECCION_2, 
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
                d.des_tran as TRANSPORTE, 
                ' ' as FLETE,
                a.comentario as OBSERVASION
                FROM not_ent a 
                JOIN clientes b ON a.co_cli = b.co_cli
                JOIN vendedor c ON a.co_ven = c.co_ven
                JOIN transpor d ON a.co_tran = d.co_tran
                JOIN reng_nde e ON e.fact_num = a.fact_num
                JOIN art f ON f.co_art = e.co_art
                JOIN sucursales g ON a.co_sucu = g.co_alma             
                WHERE a.FE_US_IN BETWEEN @FechaInicio AND @FechaFin                     
                AND (@Almacen = 'TODOS' OR e.co_alma = @Almacen)      
                """;

                using (SqlCommand command = new SqlCommand(query, connection))
                {
                    command.Parameters.AddWithValue("@FechaInicio", fecha_init);
                    command.Parameters.AddWithValue("@FechaFin", fecha_end);
                    command.Parameters.AddWithValue("@Almacen", almacen);

                    try
                    {
                        connection.Open();
                        using (SqlDataReader reader = command.ExecuteReader())
                        {
                            tablaResultados.Load(reader);
                        }
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine($"Error al intentar extraer el contenido 2k8: {ex.Message}");
                    }
                }
            }

            // =========================================================================
            // FASE 2: CRUCE DE DATOS - BUSCAR EN 2K12 Y ACTUALIZAR LA TABLA DE 2K8
            // =========================================================================
            HashSet<string> codigosExtraidos = new HashSet<string>();

            // 1. Extraemos todos los códigos únicos que tengan el '@'
            foreach (DataRow fila in tablaResultados.Rows)
            {
                string direccion2 = fila["DIRECCION_2"]?.ToString() ?? "";
                if (direccion2.Contains("@"))
                {
                    System.Diagnostics.Debug.WriteLine($"[Cruce de datos] Procesando dirección: {direccion2} .........................");
                    string codigo = direccion2.Split('@')[0].Trim();
                    if (!string.IsNullOrEmpty(codigo))
                    {
                        System.Diagnostics.Debug.WriteLine($"------------------los codigos estan en: {direccion2}");
                        codigosExtraidos.Add(codigo);
                    }
                }
            }

            // 2. Si hay códigos para buscar, nos conectamos a 2k12
            if (codigosExtraidos.Count > 0)
            {
                System.Diagnostics.Debug.WriteLine($"[Cruce de datos] Se encontraron {codigosExtraidos.Count} clientes cruzados. Consultando 2k12...");

                // Diccionario para guardar los datos frescos: Clave = co_cli, Valor = Fila de datos
                Dictionary<string, Dictionary<string, string>> datosClientes2k12 = new Dictionary<string, Dictionary<string, string>>();

                using (SqlConnection connection2k12 = new SqlConnection(_connectionString2k12))
                {
                    using (SqlCommand cmd2k12 = new SqlCommand())
                    {
                        cmd2k12.Connection = connection2k12;
                        List<string> nombresParametros = new List<string>();
                        int index = 0;

                        foreach (string cod in codigosExtraidos)
                        {
                            string paramName = $"@cod{index}";
                            nombresParametros.Add(paramName);
                            cmd2k12.Parameters.AddWithValue(paramName, cod);
                            index++;
                        }

                        string inClause = string.Join(", ", nombresParametros);

                        cmd2k12.CommandText = $@"
                        SELECT 
                            co_cli,
                            rif as RIF,
                            trim(rif) + ' - ' + trim(cli_des) as CLIENTE,
                            cli_des as DESCRIPCION_CLIENTE,
                            direc1 as DIRECCION_1,
                            direc2 as COORD,
                            (CASE WHEN dir_ent2 IS NULL OR TRIM(dir_ent2) = '' THEN direc1 ELSE dir_ent2 END) as DIRECCION_2
                        FROM saCliente 
                        WHERE co_cli IN ({inClause})";

                        try
                        {
                            connection2k12.Open();
                            using (SqlDataReader reader2k12 = cmd2k12.ExecuteReader())
                            {
                                while (reader2k12.Read())
                                {
                                    string codigoCli = reader2k12["co_cli"].ToString().Trim();

                                    datosClientes2k12[codigoCli] = new Dictionary<string, string>
                                {
                                    { "RIF", reader2k12["RIF"].ToString().Trim() },
                                    { "CLIENTE", reader2k12["CLIENTE"].ToString().Trim() },
                                    { "DESCRIPCION_CLIENTE", reader2k12["DESCRIPCION_CLIENTE"].ToString().Trim() },
                                    { "DIRECCION_1", reader2k12["DIRECCION_1"].ToString().Trim() },
                                    { "COORD", reader2k12["COORD"].ToString().Trim() },
                                    { "DIRECCION_2", reader2k12["DIRECCION_2"].ToString().Trim() }
                                };
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Debug.WriteLine($"Error al consultar saCliente cruzado en 2k12: {ex.Message}");
                        }
                    }
                }

                // 3. SOBREESCRIBIR LOS DATOS VIEJOS DE 2K8 CON LOS NUEVOS DE 2K12
                // =========================================================================
                // NUEVO: Quitamos el candado de "Solo Lectura" a las columnas que vamos a tocar
                // =========================================================================
                string[] columnasProtegidas = { "RIF", "CLIENTE", "DESCRIPCION_CLIENTE", "DIRECCION_1", "COORD", "DIRECCION_2" };
                foreach (string colName in columnasProtegidas)
                {
                    if (tablaResultados.Columns.Contains(colName))
                    {
                        tablaResultados.Columns[colName].ReadOnly = false; // ¡Desbloqueadas!
                    }
                }
                foreach (DataRow fila in tablaResultados.Rows)
                {
                    string direccion2 = fila["DIRECCION_2"]?.ToString() ?? "";

                    if (direccion2.Contains("@"))
                    {
                        string codigo = direccion2.Split('@')[0].Trim();

                        if (datosClientes2k12.ContainsKey(codigo))
                        {
                            var infoFresca = datosClientes2k12[codigo];

                            // Inyectamos la información actualizada directamente en la tabla
                            fila["RIF"] = infoFresca["RIF"];
                            fila["CLIENTE"] = infoFresca["CLIENTE"];
                            fila["DESCRIPCION_CLIENTE"] = infoFresca["DESCRIPCION_CLIENTE"];
                            fila["DIRECCION_1"] = infoFresca["DIRECCION_1"];
                            fila["COORD"] = infoFresca["COORD"];

                            // Opcional: reemplazar también DIRECCION_2 si quieres quitar la etiqueta código@
                            fila["DIRECCION_2"] = infoFresca["DIRECCION_2"];
                        }
                    }
                }

                System.Diagnostics.Debug.WriteLine("[Cruce de datos] Tabla 2k8 actualizada con éxito usando datos de 2k12.");
            }
        }

        if (version == "2k12")
        {
            using (SqlConnection connection = new SqlConnection(_connectionString2k12))
            {
                string query = """                     
                SELECT a.doc_num as NOTA,                             
                a.fec_emis as FECHA,                             
                a.fec_venc as VENC,                            
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
                FROM saNotaDespachoVenta a                      
                JOIN saCliente b ON a.co_cli = b.co_cli                     
                JOIN saVendedor c ON a.co_ven = c.co_ven                     
                JOIN saTransporte d ON a.co_tran = d.co_tran                     
                JOIN saNotaDespachoVentaReng e ON e.doc_num = a.doc_num                      
                JOIN saArticulo f ON f.co_art = e.co_art                     
                JOIN saUnidad g ON e.co_uni = g.co_uni                     
                JOIN saAlmacen h on e.co_alma = h.co_alma                     
                JOIN saSucursal i on h.co_sucur = i.co_sucur                     
                WHERE a.FE_US_IN BETWEEN @FechaInicio AND @FechaFin                     
                AND e.co_alma = @Almacen;                     
                """;

                using (SqlCommand command = new SqlCommand(query, connection))
                {
                    command.Parameters.AddWithValue("@FechaInicio", fecha_init);
                    command.Parameters.AddWithValue("@FechaFin", fecha_end);
                    command.Parameters.AddWithValue("@Almacen", almacen);

                    try
                    {
                        connection.Open();
                        using (SqlDataReader reader = command.ExecuteReader())
                        {
                            tablaResultados.Load(reader);
                        }
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine($"Error al intentar extraer el contenido 2k12: {ex.Message}");
                    }
                }
            }
        }

        System.Diagnostics.Debug.WriteLine($"Total de registros listos para exportar: {tablaResultados.Rows.Count}");
        /*
        foreach (DataRow fila in tablaResultados.Rows)
        {
            string textoFila = "";
            foreach (DataColumn columna in tablaResultados.Columns)
            {
                textoFila += $"{columna.ColumnName}: {fila[columna]} | ";
            }
            System.Diagnostics.Debug.WriteLine(textoFila);
        }
        ¡*/
        return tablaResultados;
    }
}