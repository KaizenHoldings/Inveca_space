using System;
using System.Data;
using System.IO;
using System.Collections.Generic;
using ClosedXML.Excel;

public class ExcelService
{
    public Dictionary<string, int> DiccionarioUnidades = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)
    {
        { "BATATA160GR", 1 },
        { "V0725990891", 25 },
        { "V0725010200", 10 },
        { "1141111049", 1 },
        { "V0725010812", 1 },
        { "V0725010811", 1 },
        { "V0725010202", 10 },
        { "MIX-PMY-220GR", 1 },
        { "V0725010211", 10 },
        { "V0725010997", 10 },
        { "V0725990890", 25 },
        { "OCUMO180GR", 1 },
        { "PLALI300GR", 1 },
        { "PLA34GR", 1 },
        { "V0725010605", 20 },
        { "PS140G", 1 },
        { "PLA300GR", 1 },
        { "PLA85GR", 1 },
        { "V0725990873", 10 },
        { "V0725990856", 10 },
        { "V0725010998", 20 },
        { "V0725010602", 10 },
        { "V0725990875", 48 },
        { "V0725010606", 20 },
        { "V0725990870", 16 },
        { "V0725990887", 16 },
        { "V0725990888", 10 },
        { "V0725010205", 18 },
        { "V0725010204", 35 },
        { "V0725010201", 25 },
        { "SALSEMADURITO80G", 1 },
        { "SALSE270G", 1 },
        { "SALSE28G", 1 },
        { "SALSE80G", 1 },
        { "V0725990885", 60 },
        { "V0725010208", 96 },
        { "V0725990881", 25 },
        { "V0725010206", 35 },
        { "V0725990879", 12 },
        { "V0725010809", 20 },
        { "V0725010805", 10 },
        { "V0725010806", 10 },
        { "V0725010810", 20 },
        { "V0725010807", 10 },
        { "V0725010808", 20 },
        { "V0725010603", 10 },
        { "YCEB180GR", 1 },
        { "V0725010604", 10 },
        { "YL180GR", 1 },
        { "YS28GR", 1 },
        { "V0725010618", 10 },
        { "YS180GR", 1 },
        { "V0725010610", 20 },
        { "YS70GR", 1 },
        { "V0725990864", 10 },
        { "V0725990892", 20 },
        { "YCEB70GR", 1 },
        { "V0725010612", 20 },
        { "V0725010611", 20 },
        { "V0725010802", 20 },
        { "V0725990865", 48 },
        { "V0725010800", 20 },
        { "YL70GR", 1 },
        { "BATATA45GR", 1 },
        { "OCUMO45GR", 1 },
        { "PLALI85GR", 1 },
        { "V0725990889", 10 },
        { "V0725010801", 10 },
        { "V0725010803", 10 },
        { "V0725990874", 6 },
        { "V0725010644", 6 },
        { "V0725010645", 10 },
        { "V0725990893", 56 },
        { "YS28GR-56U", 1 },
        { "V0725990894", 56 },
        { "PLA34GR-56U", 1 },
        { "SALSE80GR-35U", 1 },
        { "SALSE28GR-96U", 1 },
        { "V0725010210", 50 },
        { "V0725010993", 6 },
        { "V0725010996", 6 },
        { "V0725010212", 10 },
        { "V0725010995", 6 },
        { "V0725010994", 6 },
        { "V0725010213", 35 },
        { "V0725010646", 16 },
        { "V0725010215", 39 },
        { "V0725010214", 24 },
        { "MIX-OBR-180GR", 1 },
        { "V0725010218", 35 },
        { "SALSECHICHARRON-60G", 1 },
        { "V0725010203", 5 },
        { "V0725010207", 5 },
        { "V0725010209", 8 },
        { "V0725010216", 2 },
        { "V0725010219", 72 },
        { "V0725010220", 24 },
        { "V0725010221", 6 },
        { "V0725010222", 4 },
        { "V0725990880", 2 },
        { "V0725990895", 7 },
        { "V0725990896", 7 },
        { "V0725010999", 50 },
        { "V0725010224", 35 },
        { "V0725010223", 96 },
        { "V0725010608", 20 }
    };

    public void LlenarPlantillaMapeada(DataTable datos, string rutaPlantilla, string rutaDestino, int timeBox = 5)
    {
        int cantidadFilas = datos != null ? datos.Rows.Count : 0;
        System.Diagnostics.Debug.WriteLine($"[EXCEL SERVICE] Filas recibidas para procesar: {cantidadFilas}");

        if (!File.Exists(rutaPlantilla))
        {
            throw new FileNotFoundException($"No se encontró el archivo de formato en: {rutaPlantilla}");
        }
        if (timeBox == 0)
        {
            throw new DivideByZeroException("El valor del TimeBox no puede ser cero para calcular el Service Time.");
        }

        if (datos == null || datos.Rows.Count == 0)
        {
            throw new ArgumentException("No hay registros disponibles para procesar. Verifique la fecha y versión de profit seleccionada.");
        }

        using (var workbook = new XLWorkbook(rutaPlantilla))
        {
            var worksheet = workbook.Worksheet(1);

            Dictionary<string, int> mapaColumnas = new Dictionary<string, int>();
            int ultimaColumna = worksheet.LastColumnUsed()?.ColumnNumber() ?? 20;

            for (int c = 1; c <= ultimaColumna; c++)
            {
                string encabezado = worksheet.Cell(1, c).GetString().Trim().ToUpper();
                if (!string.IsNullOrEmpty(encabezado))
                {
                    mapaColumnas[encabezado] = c;
                }
            }

            int filaActual = 2;

            foreach (DataRow filaSql in datos.Rows)
            {
                void EscribirCelda(string columnaExcel, object valor)
                {
                    if (mapaColumnas.TryGetValue(columnaExcel, out int numCol))
                    {
                        worksheet.Cell(filaActual, numCol).Value = valor?.ToString() ?? "";
                    }
                }

                string codArticulo = filaSql.Table.Columns.Contains("COD_ARTICULO") ? filaSql["COD_ARTICULO"].ToString().Trim() : "";

                decimal cantidadBd = 0;
                decimal.TryParse(filaSql["CANTIDAD"]?.ToString(), out cantidadBd);

                int divisor = 1;
                if (DiccionarioUnidades.TryGetValue(codArticulo, out int unidadesMapeadas))
                {
                    if (unidadesMapeadas > 0)
                    {
                        divisor = unidadesMapeadas;
                    }
                }

                //System.Diagnostics.Debug.WriteLine($"cod art que llega: {filaSql["COD_ARTICULO"]}");
                //System.Diagnostics.Debug.WriteLine($"Cantidad que llega: {filaSql["CANTIDAD"]}");
                //System.Diagnostics.Debug.WriteLine($"UNIDAD:  {filaSql["UNIDAD"]}");
                //System.Diagnostics.Debug.WriteLine($"Divisor: {divisor}");

                string tipoUnidad = filaSql.Table.Columns.Contains("UNIDAD") ? filaSql["UNIDAD"]?.ToString().Trim().ToUpper() : "";

                decimal cantidadCalculada = cantidadBd / (tipoUnidad == "UNIDAD" ? divisor : 1);

                // =========================================================================
                // NUEVA LÓGICA: PROCESAMIENTO DE COORDENADAS (COORD) -> LATITUD Y LONGITUD
                // =========================================================================
                string coordStr = filaSql.Table.Columns.Contains("COORD") ? filaSql["COORD"]?.ToString().Trim() : "";
                string latitud = "";
                string longitud = "";

                if (!string.IsNullOrEmpty(coordStr))
                {
                    // Dividimos usando el espacio como delimitador, descartando espacios en blanco consecutivos
                    string[] partesCoord = coordStr.Split(new char[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);

                    // Aseguramos que existan al menos los dos bloques de texto indispensables
                    if (partesCoord.Length >= 2)
                    {
                        latitud = partesCoord[0].Trim().Replace(",", "");
                        longitud = partesCoord[1].Trim().Replace(",", "");
                    }
                }
                // =========================================================================

                EscribirCelda("CÓDIGO DE PARADA*", filaSql["NOTA"]);
                EscribirCelda("LATITUD", latitud);   // Inyectamos la latitud extraída
                EscribirCelda("LONGITUD", longitud); // Inyectamos la longitud extraída
                EscribirCelda("DIRECCION*", filaSql["DIRECCION_2"]);
                EscribirCelda("NOMBRE ITEM*", filaSql["ARTICULO"]);
                EscribirCelda("CANTIDAD*", cantidadCalculada);

                decimal serviceTime = timeBox;

                string fechaMinFormateada = DateTime.TryParse(filaSql["FECHA"].ToString(), out DateTime fechaMin)
                    ? fechaMin.ToString("dd/MM/yyyy")
                    : "";
                EscribirCelda("FECHA MIN ENTREGA*", fechaMinFormateada);

                string fechaMaxFormateada = DateTime.TryParse(filaSql["VENC"].ToString(), out DateTime fechaMax)
                    ? fechaMax.ToString("dd/MM/yyyy")
                    : "";
                EscribirCelda("FECHA MAX ENTREGA*", fechaMaxFormateada);

                EscribirCelda("MIN VENTANA HORARIA 1*", "07:00");
                EscribirCelda("MAX VENTANA HORARIA 1*", "20:00");
                EscribirCelda("CAPACIDAD UNO", "1");
                EscribirCelda("CAPACIDAD DOS", "3");
                //EscribirCelda("SERVICE TIME", serviceTime * cantidadCalculada);
                EscribirCelda("IDENTIFICADOR CONTACTO*", filaSql["RIF"]);
                EscribirCelda("NOMBRE CONTACTO*", filaSql["DESCRIPCION_CLIENTE"]);

                string ctOrigen = filaSql.Table.Columns.Contains("DESCRIPCION_ALMACEN") ? filaSql["DESCRIPCION_ALMACEN"].ToString() : "";
                EscribirCelda("CT ORIGEN*", ctOrigen);
                EscribirCelda("OBSERVASION", filaSql["OBSERVASION"]);

                filaActual++;
            }

            workbook.SaveAs(rutaDestino);
        }
    }
}