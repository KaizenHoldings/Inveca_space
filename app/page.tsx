"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import Sidebar from '../components/Sidebar';
import DetalleNotaModal from '../components/DetalleNotaModal';
import { sanitizeErrorMessage } from '@/lib/errorHandler';

// Componente para celdas con Tooltip personalizado
const TooltipCell = ({ value, isBold = false }: { value: string | number | null | undefined, isBold?: boolean }) => {
  const displayValue = value || '-';
  return (
    <td className={`px-6 py-4 text-sm ${isBold ? 'font-semibold text-white' : 'text-slate-300'} max-w-[250px] relative group`}>
      <div className="truncate cursor-default">{displayValue}</div>
      {/* Tooltip */}
      <div className="absolute left-6 bottom-full mb-2 hidden group-hover:block w-max max-w-[400px] whitespace-normal bg-[#090d16] text-white text-[13px] px-4 py-3 rounded-lg shadow-2xl z-50 pointer-events-none border border-[#4b934e] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {displayValue}
        {/* Flecha del Tooltip */}
        <div className="absolute top-full left-4 border-[6px] border-transparent border-t-[#4b934e]" />
      </div>
    </td>
  );
};

// Función auxiliar para obtener la fecha de hoy en formato YYYY-MM-DD local
const getFechaHoyISO = () => {
  const hoy = new Date();
  const year = hoy.getFullYear();
  const month = String(hoy.getMonth() + 1).padStart(2, '0');
  const day = String(hoy.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Home() {
  const [profitVersion, setProfitVersion] = useState('2k8');
  const [almacen, setAlmacen] = useState('TODOS');
  const [fechaMin, setFechaMin] = useState(getFechaHoyISO);
  const [fechaMax, setFechaMax] = useState(getFechaHoyISO);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Lista dinámica de almacenes
  const [almacenesList, setAlmacenesList] = useState<{Codigo: string, Descripcion: string}[]>([
    { Codigo: 'TODOS', Descripcion: 'TODOS LOS ALMACENES' }
  ]);

  useEffect(() => {
    // Asegurar que inicie con la fecha local de hoy del cliente
    const hoy = getFechaHoyISO();
    setFechaMin(hoy);
    setFechaMax(hoy);

    // Establecer nombre por defecto con fecha y hora
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setPetitionName(`Sincronizacion Profit ${dateStr} ${timeStr}`);

    // Cargar almacenes dinámicamente al montar el componente
    fetch('/api/almacenes')
      .then(res => res.json())
      .then(json => {
        if (json.data && json.data.length > 0) {
          setAlmacenesList(json.data);
        }
      })
      .catch(err => console.error('Error fetching almacenes:', err));
  }, []);

  // Array de notas de entrega (ahora inicialmente vacío, esperando los datos reales)
  const [notasEntrega, setNotasEntrega] = useState<any[]>([]);

  // Paginación y Filtros
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [geoFilter, setGeoFilter] = useState<'todos' | 'con-coords' | 'sin-coords'>('todos');
  const [filterVendedor, setFilterVendedor] = useState('');
  const [filterCiudad, setFilterCiudad] = useState('');
  const [filterItem, setFilterItem] = useState('');
  const [filterCodigoParada, setFilterCodigoParada] = useState('');
  const [useRangoParada, setUseRangoParada] = useState(false);
  const [minParada, setMinParada] = useState('');
  const [maxParada, setMaxParada] = useState('');
  const [excluirAnuladas, setExcluirAnuladas] = useState(true);
  const [petitionName, setPetitionName] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const pageSize = 10;
  const router = useRouter();

  const handleUpdateImportancia = (codigoParada: string, newValue: string) => {
    // Actualizar en la lista principal
    setNotasEntrega(prev => prev.map(nota => 
      nota.codigoParada === codigoParada ? { ...nota, importancia: newValue } : nota
    ));
    
    // Actualizar en el modal abierto
    if (selectedRow && selectedRow.codigoParada === codigoParada) {
      setSelectedRow((prev: any) => ({ ...prev, importancia: newValue }));
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(false); // No mostrar "No se encontraron resultados" mientras carga
    setNotasEntrega([]); // Limpiar la tabla antes de buscar
    setCurrentPage(1);   // Reiniciar paginación al buscar
    setSearchTerm('');   // Reiniciar filtros
    setGeoFilter('todos');
    setFilterVendedor('');
    setFilterCiudad('');
    setFilterItem('');
    setFilterCodigoParada('');
    setFilterCodigoParada('');

    const controller = new AbortController();
    const signal = controller.signal;

    Swal.fire({
      title: 'Consultando a la BD...',
      html: 'Cargando información de base de datos,<br>por favor espera.',
      allowOutsideClick: false,
      showCancelButton: true,
      cancelButtonText: 'Cancelar',
      cancelButtonColor: '#d33',
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.cancel) {
        controller.abort();
      }
    });

    try {
      const res = await fetch('/api/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: signal,
        body: JSON.stringify({
          profitVersion,
          almacen,
          fechaMin,
          fechaMax,
          ...(useRangoParada ? { minParada, maxParada } : {}),
          excluirAnuladas
        })
      });

      const json = await res.json();

      if (!res.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Error consultando a BD',
          text: sanitizeErrorMessage(json.error || 'Ocurrió un error inesperado al consultar los datos.'),
          confirmButtonColor: '#4b934e'
        });
        setHasSearched(false);
        return;
      }

      setNotasEntrega(json.data || []);
      setHasSearched(true);
      Swal.close();

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // La petición fue cancelada por el usuario
        setHasSearched(false);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error de red o servidor',
          text: sanitizeErrorMessage(error),
          confirmButtonColor: '#4b934e'
        });
        setHasSearched(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSyncDispatchTrack = async () => {
    const finalPetitionName = petitionName.trim() || `Sincronización ${almacen} - ${new Date().toLocaleDateString()}`;
    const cantidadRegistros = filteredNotas.length;

    // Modal de confirmación previo al envío
    const confirmacion = await Swal.fire({
      title: '¿Confirmar envío a DispatchTrack?',
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          <p style="margin-bottom: 12px;">
            La información que se muestra en el cuadro (<strong>${cantidadRegistros}</strong> registro${cantidadRegistros === 1 ? '' : 's'}) será enviada a <strong>DispatchTrack</strong> bajo el nombre de:
          </p>
          <div style="background: rgba(20, 31, 51, 0.9); border: 1px solid rgba(75, 147, 78, 0.4); border-radius: 8px; padding: 10px 14px; font-weight: 600; color: #4b934e; word-break: break-word; text-align: center; font-size: 15px; margin-bottom: 14px;">
            "${finalPetitionName}"
          </div>
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">
            ¿Deseas proceder con el envío?
          </p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Enviar a DispatchTrack',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#4b934e',
      cancelButtonColor: '#64748b',
      background: '#0d1421',
      color: '#ffffff',
      reverseButtons: true,
    });

    if (!confirmacion.isConfirmed) {
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch('/api/dispatchTrack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          notas: filteredNotas, 
          petitionName: finalPetitionName 
        })
      });

      const json = await res.json();
      
      if (!res.ok) {
        throw new Error(json.error || 'Error enviando datos a DispatchTrack');
      }

      Swal.fire({
        icon: 'success',
        title: '¡Sincronización Iniciada!',
        html: `Se ha enviado la petición a DispatchTrack con éxito.<br><br><b>ID de Seguimiento:</b> ${json.trackingId}`,
        confirmButtonColor: '#4b934e',
        background: '#0d1421',
        color: '#ffffff',
      }).then(() => {
        setNotasEntrega([]);
        setHasSearched(false);
        setCurrentPage(1);
      });
    } catch (error: any) {
      console.error(error);
      Swal.fire({
        icon: 'error',
        title: 'Error en la sincronización',
        text: sanitizeErrorMessage(error),
        confirmButtonColor: '#4b934e',
        background: '#0d1421',
        color: '#ffffff',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsMenuOpen(false);
    
    if (filteredNotas.length === 0) {
      Swal.fire({ icon: 'error', title: 'Sin datos', text: 'No hay datos para exportar.', confirmButtonColor: '#4b934e' });
      return;
    }

    try {
      Swal.fire({
        title: 'Generando Excel...',
        html: 'Preparando archivo de descarga',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
      });

      const res = await fetch('/api/download-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notas: filteredNotas })
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Error al generar el Excel');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dateStr = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear().toString().slice(-2)}`;
      const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      
      a.download = `Sincronizacion_${profitVersion}_${dateStr}_${timeStr}.xlsx`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      Swal.close();

    } catch (error: any) {
      console.error(error);
      Swal.fire({ icon: 'error', title: 'Error de descarga', text: sanitizeErrorMessage(error), confirmButtonColor: '#4b934e' });
    }
  };

  // Extraer valores únicos para los filtros desplegables
  const uniqueVendedores = Array.from(new Set(notasEntrega.map(n => n.identificadorContacto).filter(Boolean))).sort();
  const uniqueCiudades = Array.from(new Set(notasEntrega.map(n => n.ctOrigen).filter(Boolean))).sort();
  const uniqueItems = Array.from(new Set(notasEntrega.map(n => n.nombreItem).filter(Boolean))).sort();
  const uniqueCodigoParada = Array.from(new Set(notasEntrega.map(n => String(n.codigoParada)).filter(Boolean))).sort();

  // Manejar el cambio de coordenadas locales
  const handleUpdateCoordenadas = (codigoParada: string, lat: string, lng: string) => {
    setNotasEntrega(prev => prev.map(nota => {
      if (nota.codigoParada === codigoParada) {
        const updatedNota = { ...nota, latitud: lat, longitud: lng };
        if (selectedRow && selectedRow.codigoParada === codigoParada) {
          setSelectedRow(updatedNota);
        }
        return updatedNota;
      }
      return nota;
    }));
  };

  // Manejar el cambio de dirección local
  const handleUpdateDireccion = (codigoParada: string, direccion: string) => {
    setNotasEntrega(prev => prev.map(nota => {
      if (nota.codigoParada === codigoParada) {
        const updatedNota = { ...nota, direccion };
        if (selectedRow && selectedRow.codigoParada === codigoParada) {
          setSelectedRow(updatedNota);
        }
        return updatedNota;
      }
      return nota;
    }));
  };

  // Lógica de Filtrado
  const filteredNotas = notasEntrega.filter(nota => {
    // 1. Filtro de Coordenadas
    const hasCoords = nota.latitud && nota.latitud !== '-' && nota.longitud && nota.longitud !== '-';
    if (geoFilter === 'con-coords' && !hasCoords) return false;
    if (geoFilter === 'sin-coords' && hasCoords) return false;
    
    // 2. Filtros de Desplegables
    if (filterVendedor && nota.identificadorContacto !== filterVendedor) return false;
    if (filterCiudad && nota.ctOrigen !== filterCiudad) return false;
    if (filterItem && nota.nombreItem !== filterItem) return false;
    if (filterCodigoParada && String(nota.codigoParada) !== filterCodigoParada) return false;



    // 3. Filtro de Búsqueda Global (busca en campos clave)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const match = 
        String(nota.codigoParada || '').toLowerCase().includes(term) ||
        String(nota.direccion || '').toLowerCase().includes(term) ||
        String(nota.nombreItem || '').toLowerCase().includes(term) ||
        String(nota.identificadorContacto || '').toLowerCase().includes(term) ||
        String(nota.nombreContacto || '').toLowerCase().includes(term);
      if (!match) return false;
    }
    return true;
  });

  // Cálculos estadísticos (agrupados por código de parada)
  const uniqueGroups = new Set(notasEntrega.map(n => n.codigoParada));
  const totalGenerales = uniqueGroups.size;
  
  const gruposConCoords = new Set(
    notasEntrega
      .filter(n => n.latitud && n.latitud !== '-' && n.longitud && n.longitud !== '-')
      .map(n => n.codigoParada)
  );
  const totalConCoordenadas = gruposConCoords.size;

  // Lógica de Paginación (sobre la data filtrada)
  const totalElements = filteredNotas.length;
  const totalPages = Math.ceil(totalElements / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentItems = filteredNotas.slice(startIndex, startIndex + pageSize);

  const paginationControls = totalPages > 1 && (
    <div className="flex justify-center items-center gap-6">
      <button
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="px-4 py-2 text-sm font-semibold text-white bg-[#4b934e] hover:bg-[#3d7840] rounded-md disabled:bg-[#2a3a52] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        Anterior
      </button>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-300">
          Página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong>
        </span>
      </div>
      <button
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="px-4 py-2 text-sm font-semibold text-white bg-[#4b934e] hover:bg-[#3d7840] rounded-md disabled:bg-[#2a3a52] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        Siguiente
      </button>
    </div>
  );

  return (
        <div className="px-4 py-10 sm:px-8 flex flex-col items-center relative min-h-full">
          
          <header className="text-center mb-8 animate-[fadeInDown_0.8s_ease-out]">
            <h1 className="text-4xl md:text-5xl font-extrabold text-[#4b934e] mb-2 flex items-center justify-center gap-3">
              <img src="/images/isologo.png" alt="Logo Sincronizador" className="w-12 h-12 object-contain" />
              Sincronizador
            </h1>
            <p className="text-lg text-slate-400">Sistema para obtener Formato para sistema Dispatch de Profit 2k8 y 2k12</p>
          </header>

      <div className="flex flex-col gap-6 mb-4 bg-[#0d1421]/70 p-6 sm:p-8 rounded-xl border border-white/10 shadow-xl w-full max-w-[1400px] animate-[fadeInUp_0.8s_ease-out]">

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Versión de Profit */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Selecciona la versión de Profit
            </span>
            <div className="flex gap-6 bg-[#141f33]/80 border border-white/10 px-4 py-3 rounded-lg h-[42px] items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="profitVersion"
                  value="2k12"
                  checked={profitVersion === '2k12'}
                  onChange={() => setProfitVersion('2k12')}
                  className="accent-[#4b934e] w-4 h-4"
                />
                <span className="text-sm">2k12</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="profitVersion"
                  value="2k8"
                  checked={profitVersion === '2k8'}
                  onChange={() => setProfitVersion('2k8')}
                  className="accent-[#4b934e] w-4 h-4"
                />
                <span className="text-sm">2k8</span>
              </label>
            </div>
          </div>

          {/* Almacén */}
          <div className="flex flex-col gap-3">
            <label htmlFor="almacen" className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Seleccione el Almacén
            </label>
            <select 
              id="almacen"
              value={almacen}
              onChange={(e) => setAlmacen(e.target.value)}
              className="bg-[#141f33]/80 border border-white/20 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-[#4b934e] focus:ring-2 focus:ring-[#4b934e]/30 transition-all h-[42px] appearance-none"
            >
              {almacenesList.map((alm) => (
                <option key={alm.Codigo} value={alm.Codigo}>
                  {alm.Codigo === 'TODOS' ? alm.Descripcion : `${alm.Codigo} - ${alm.Descripcion}`}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Min */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Fecha Mínima
            </span>
            <input
              type="date"
              className="bg-[#141f33]/80 border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#4b934e] focus:ring-2 focus:ring-[#4b934e]/30 transition-all [color-scheme:dark] h-[42px] w-full text-sm"
              value={fechaMin}
              onChange={(e) => setFechaMin(e.target.value)}
            />
          </div>

          {/* Fecha Max */}
          <div className="flex flex-col gap-3">
            <span className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
              Fecha Máxima
            </span>
            <input
              type="date"
              className="bg-[#141f33]/80 border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#4b934e] focus:ring-2 focus:ring-[#4b934e]/30 transition-all [color-scheme:dark] h-[42px] w-full text-sm"
              value={fechaMax}
              onChange={(e) => setFechaMax(e.target.value)}
            />
          </div>
        </div>
        
        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Filtro Rango Código de Parada (Opcional - a nivel BD) */}
          <div className="flex flex-col gap-3 justify-start">
            <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap h-[20px] mt-1">
              <input 
                type="checkbox" 
                checked={useRangoParada}
                onChange={(e) => setUseRangoParada(e.target.checked)}
                className="accent-[#4b934e] w-4 h-4 rounded"
              />
              <span className="text-sm font-semibold text-slate-300">Rango Código de Parada</span>
            </label>
            
            {useRangoParada && (
              <div className="flex items-center gap-2 animate-[fadeIn_0.3s_ease-out]">
                <input 
                  type="number" 
                  placeholder="Mínimo (ej. 100984)"
                  value={minParada}
                  onChange={(e) => setMinParada(e.target.value)}
                  className="bg-[#141f33]/80 border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#4b934e] focus:ring-2 focus:ring-[#4b934e]/30 transition-all text-sm w-full h-[42px]"
                />
                <span className="text-slate-400">-</span>
                <input 
                  type="number" 
                  placeholder="Máximo"
                  value={maxParada}
                  onChange={(e) => setMaxParada(e.target.value)}
                  className="bg-[#141f33]/80 border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#4b934e] focus:ring-2 focus:ring-[#4b934e]/30 transition-all text-sm w-full h-[42px]"
                />
              </div>
            )}
          </div>

          {/* Filtro Excluir Anuladas (Siempre a nivel BD) */}
          <div className="flex flex-col gap-3 justify-start">
            <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap h-[20px] mt-1">
              <input 
                type="checkbox" 
                checked={excluirAnuladas}
                onChange={(e) => setExcluirAnuladas(e.target.checked)}
                className="accent-[#4b934e] w-4 h-4 rounded"
              />
              <span className="text-sm font-semibold text-slate-300">Excluir Notas Anuladas</span>
            </label>
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-2">Las fechas hacen referencia al día en el que se registraron las notas de entrega.</p>

        <div className="flex justify-center items-center mt-4 pt-6 border-t border-white/10">
          <button
            className="bg-[#2a3a52] text-white px-6 rounded-lg font-semibold hover:-translate-y-0.5 hover:shadow-lg transition-all h-[42px] disabled:opacity-50 disabled:hover:translate-y-0 disabled:cursor-not-allowed border border-white/10"
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? 'Consultando BD...' : 'Visualizar Notas de Entrega'}
          </button>
        </div>
      </div>

      {/* Renderizado Condicional del Contenido */}
      {!hasSearched ? (
        <div className="w-full max-w-[1400px] bg-[#0d1421]/70 border border-white/10 rounded-2xl p-16 text-center shadow-xl animate-[fadeInUp_0.8s_ease-out_forwards]">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 mx-auto mb-4 text-[#4b934e] opacity-80" viewBox="0 0 16 16">
            <path d="M0 0h16v16H0z" fill="none" />
            <path fill="currentColor" d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0a5.5 5.5 0 0 1 11 0" />
          </svg>
          <h2 className="text-2xl font-bold text-white mb-2">Sistema listo para consultar</h2>
          <p className="text-slate-400">Ajuste los parámetros en el panel superior y presione <strong className="text-white">"Visualizar Notas de Entrega"</strong>.</p>
        </div>
      ) : loading ? null : notasEntrega.length === 0 ? (
        <div className="w-full max-w-[1400px] bg-[#0d1421]/70 border border-white/10 rounded-2xl p-16 text-center shadow-xl animate-[fadeInUp_0.8s_ease-out_forwards]">
          <span className="text-6xl mb-4 block opacity-80">📭</span>
          <h2 className="text-2xl font-bold text-white mb-2">No se encontraron resultados</h2>
          <p className="text-slate-400">La consulta a la base de datos no arrojó ninguna nota de entrega para las fechas y versión seleccionada.</p>
        </div>
      ) : (
        <>
          {/* Panel de Estadísticas y Filtros */}
          <div className="w-full max-w-[1400px] mb-4 flex flex-col gap-4 animate-[fadeInUp_0.8s_ease-out_forwards] bg-[#0d1421]/70 border border-white/10 rounded-2xl p-4 shadow-xl">
            
            {/* Fila Superior: Estadísticas y Paginación */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
              <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                <div className="bg-[#141f33]/80 border border-white/10 rounded-lg px-4 py-2 shadow-md flex flex-col">
                  <span className="text-slate-400 text-xs uppercase tracking-wide font-semibold block">Puntos de Entrega</span>
                  <span className="text-xl font-bold text-white leading-none mt-1">{totalGenerales}</span>
                </div>
                <div className="bg-[#141f33]/80 border border-white/10 rounded-lg px-4 py-2 shadow-md flex flex-col">
                  <span className="text-slate-400 text-xs uppercase tracking-wide font-semibold block">Con Coordenadas</span>
                  <span className="text-xl font-bold text-[#4b934e] leading-none mt-1">{totalConCoordenadas}</span>
                </div>
                <div className="bg-[#141f33]/80 border border-white/10 rounded-lg px-4 py-2 shadow-md flex flex-col">
                  <span className="text-slate-400 text-xs uppercase tracking-wide font-semibold block">Sin Coordenadas</span>
                  <span className="text-xl font-bold text-red-400 leading-none mt-1">{totalGenerales - totalConCoordenadas}</span>
                </div>
                
                {totalElements > 0 && (
                  <div className="text-sm text-slate-400 ml-2 mt-2 md:mt-0">
                    Mostrando del <span className="text-white font-medium">{startIndex + 1}</span> al <span className="text-white font-medium">{Math.min(startIndex + pageSize, totalElements)}</span> de <span className="text-white font-medium">{totalElements}</span> resultados
                  </div>
                )}
              </div>

            </div>

            {/* Fila Inferior: Filtros de Tabla */}
            {notasEntrega.length > 0 && (
              <div className="flex flex-col gap-4 border-t border-white/10 pt-4 mt-2">
                
                {/* Buscador Global */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Buscar por código, dirección, cliente o artículo..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // volver a la pag 1 al filtrar
                      }}
                      className="w-full bg-[#141f33]/80 border border-white/20 text-white pl-4 pr-10 py-2 rounded-lg focus:outline-none focus:border-[#4b934e] focus:ring-2 focus:ring-[#4b934e]/30 transition-all h-[42px] text-sm placeholder-slate-500"
                    />
                    {searchTerm && (
                      <button 
                        onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        title="Limpiar búsqueda"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtros de Columnas Desplegables */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Geolocalización</label>
                    <select
                      value={geoFilter}
                      onChange={(e) => {
                        setGeoFilter(e.target.value as 'todos' | 'con-coords' | 'sin-coords');
                        setCurrentPage(1);
                      }}
                      className="bg-[#141f33]/80 border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#4b934e] transition-all text-sm appearance-none cursor-pointer"
                    >
                      <option value="todos">Todas las notas</option>
                      <option value="con-coords">Solo Geolocalizadas</option>
                      <option value="sin-coords">No Geolocalizadas</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Código de Parada*</label>
                    <select 
                      value={filterCodigoParada}
                      onChange={(e) => { setFilterCodigoParada(e.target.value); setCurrentPage(1); }}
                      className="bg-[#141f33]/80 border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#4b934e] transition-all text-sm appearance-none"
                    >
                      <option value="">Todos los códigos</option>
                      {uniqueCodigoParada.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Contacto / Vendedor</label>
                    <select 
                      value={filterVendedor}
                      onChange={(e) => { setFilterVendedor(e.target.value); setCurrentPage(1); }}
                      className="bg-[#141f33]/80 border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#4b934e] transition-all text-sm appearance-none"
                    >
                      <option value="">Todos los contactos</option>
                      {uniqueVendedores.map((v, i) => <option key={i} value={v}>{v}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ciudad (Origen)</label>
                    <select 
                      value={filterCiudad}
                      onChange={(e) => { setFilterCiudad(e.target.value); setCurrentPage(1); }}
                      className="bg-[#141f33]/80 border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#4b934e] transition-all text-sm appearance-none"
                    >
                      <option value="">Todas las ciudades</option>
                      {uniqueCiudades.map((c, i) => <option key={i} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Artículo (Ítem)</label>
                    <select 
                      value={filterItem}
                      onChange={(e) => { setFilterItem(e.target.value); setCurrentPage(1); }}
                      className="bg-[#141f33]/80 border border-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-[#4b934e] transition-all text-sm appearance-none"
                    >
                      <option value="">Todos los artículos</option>
                      {uniqueItems.map((item, i) => <option key={i} value={item}>{item}</option>)}
                    </select>
                  </div>
                </div>

                {/* Filtro Rango Código de Parada */}
                <div className="flex flex-col sm:flex-row gap-4 items-center p-3 bg-[#141f33]/40 border border-white/10 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={useRangoParada}
                      onChange={(e) => {
                        setUseRangoParada(e.target.checked);
                        setCurrentPage(1);
                      }}
                      className="accent-[#4b934e] w-4 h-4 rounded"
                    />
                    <span className="text-sm font-semibold text-slate-300">Rango Código de Parada</span>
                  </label>
                  
                  {useRangoParada && (
                    <div className="flex items-center gap-2 flex-1 animate-[fadeIn_0.3s_ease-out]">
                      <input 
                        type="number" 
                        placeholder="Mínimo"
                        value={minParada}
                        onChange={(e) => { setMinParada(e.target.value); setCurrentPage(1); }}
                        className="bg-[#141f33]/80 border border-white/20 text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#4b934e] text-sm w-full sm:w-32"
                      />
                      <span className="text-slate-400">-</span>
                      <input 
                        type="number" 
                        placeholder="Máximo"
                        value={maxParada}
                        onChange={(e) => { setMaxParada(e.target.value); setCurrentPage(1); }}
                        className="bg-[#141f33]/80 border border-white/20 text-white px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#4b934e] text-sm w-full sm:w-32"
                      />
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* Controles sobre la tabla (Paginación a la izquierda y DispatchTrack a la derecha) */}
          <div className="w-full max-w-[1400px] flex flex-col md:flex-row justify-between items-center gap-4 mb-4 animate-[fadeInUp_0.8s_ease-out_forwards] relative z-20">
            
            <div className="w-full md:w-auto">
              {paginationControls}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <input 
                type="text" 
                value={petitionName}
                onChange={e => setPetitionName(e.target.value)}
                placeholder="Nombre de la petición"
                title="Nombre de la petición en DispatchTrack"
                className="bg-[#0d1421]/70 border border-white/20 text-white px-4 py-2 rounded-lg focus:outline-none focus:border-[#4b934e] transition-all text-sm w-full sm:w-[260px] h-[42px] shadow-lg"
              />
              
              <div className="flex items-center gap-2">
                <button
                  className="bg-[#4b934e] text-white px-8 rounded-lg font-semibold hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(75,147,78,0.4)] transition-all h-[42px] flex items-center justify-center gap-2 disabled:!bg-[#2a3a52] disabled:!shadow-none disabled:!cursor-not-allowed disabled:!transform-none disabled:opacity-70 shadow-lg"
                  onClick={handleSyncDispatchTrack}
                  disabled={syncing || totalElements === 0}
                >
                  {syncing ? 'Sincronizando...' : 'Enviar a DispatchTrack'}
                </button>

                {/* Dropdown Menu */}
                <div className="relative">
                  <button 
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="h-[42px] w-[42px] bg-[#141f33]/80 border border-white/20 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors shadow-lg focus:outline-none"
                    disabled={totalElements === 0}
                    title="Opciones"
                  >
                    <img src="/icons/moreVert.svg" alt="Menú" className="w-6 h-6 text-white brightness-0 invert" />
                  </button>

                  {isMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setIsMenuOpen(false)}
                      ></div>
                      <div className="absolute right-0 mt-2 w-56 bg-[#090d16] border border-[#4b934e]/50 rounded-lg shadow-2xl z-50 overflow-hidden animate-[fadeInDown_0.2s_ease-out]">
                        <button 
                          onClick={handleDownloadExcel}
                          className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#4b934e]">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          Descargar Excel notas de entrega
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[1400px] bg-[#0d1421]/70 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col animate-[fadeInUp_0.8s_ease-out_forwards]">
            <div className="w-full overflow-x-auto">
              <table className="w-full border-collapse text-left whitespace-nowrap">
                <thead>
                  <tr>
                    {["CÓDIGO DE PARADA*", "LATITUD", "LONGITUD", "DIRECCION*", "NOMBRE ITEM*", "CANTIDAD*", "CODIGO ITEM", "FECHA MIN ENTREGA*", "FECHA MAX ENTREGA*", "MIN VENTANA HORARIA 1*", "MAX VENTANA HORARIA 1*", "MIN VENTANA HORARIA 2", "MAX VENTANA HORARIA 2", "COSTO ITEM", "CAPACIDAD UNO", "CAPACIDAD DOS", "SERVICE TIME", "IMPORTANCIA", "IDENTIFICADOR CONTACTO*", "NOMBRE CONTACTO*", "TELEFONO", "EMAIL CONTACTO", "CT ORIGEN*"].map((header, index) => (
                      <th key={index} className="bg-[#090d16]/60 px-6 py-5 font-semibold text-xs tracking-wider text-[#4b934e] border-b border-white/10 uppercase">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((nota, i) => (
                      <tr key={i} onClick={() => setSelectedRow(nota)} className="transition-all hover:bg-[#4b934e]/20 cursor-pointer border-b border-white/5 last:border-b-0">
                        <TooltipCell value={nota.codigoParada} isBold={true} />
                        <TooltipCell value={nota.latitud} />
                        <TooltipCell value={nota.longitud} />
                        <TooltipCell value={nota.direccion} />
                        <TooltipCell value={nota.nombreItem} />
                        <TooltipCell value={nota.cantidad} />
                        <TooltipCell value={nota.codigoItem} />
                        <TooltipCell value={nota.fechaMinEntrega} />
                        <TooltipCell value={nota.fechaMaxEntrega} />
                        <TooltipCell value={nota.minVentana1} />
                        <TooltipCell value={nota.maxVentana1} />
                        <TooltipCell value={nota.minVentana2} />
                        <TooltipCell value={nota.maxVentana2} />
                        <TooltipCell value={nota.costoItem} />
                        <TooltipCell value={nota.capacidadUno} />
                        <TooltipCell value={nota.capacidadDos} />
                        <TooltipCell value={nota.serviceTime} />
                        <TooltipCell value={nota.importancia} />
                        <TooltipCell value={nota.identificadorContacto} />
                        <TooltipCell value={nota.nombreContacto} />
                        <TooltipCell value={nota.telefono} />
                        <TooltipCell value={nota.emailContacto} />
                        <TooltipCell value={nota.ctOrigen} />
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={23} className="text-center p-12 text-slate-400 text-lg">
                        La búsqueda en este filtro no arrojó resultados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Controles de Paginación (Abajo) */}
            {totalPages > 1 && (
              <div className="border-t border-white/10 p-4 bg-[#090d16]/40">
                {paginationControls}
              </div>
            )}
          </div>
        </>
      )}

      {/* Overlay de Sincronización */}
      {syncing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090d16]/70 backdrop-blur-md animate-[fadeIn_0.3s_ease-out_forwards]">
          <img src="/icons/loader.svg" alt="Sincronizando" className="w-24 h-24 mb-6 drop-shadow-[0_0_15px_rgba(75,147,78,0.6)]" />
          <h2 className="text-3xl font-bold text-white tracking-wide">Enviando a DispatchTrack</h2>
          <p className="text-slate-300 mt-2 text-lg">Por favor, espera un momento...</p>
        </div>
      )}

      {/* Modal de Detalle de Fila usando el nuevo componente */}
      <DetalleNotaModal 
        selectedRow={selectedRow} 
        onClose={() => setSelectedRow(null)} 
        onUpdateImportancia={handleUpdateImportancia} 
        onUpdateCoordenadas={handleUpdateCoordenadas}
        onUpdateDireccion={handleUpdateDireccion}
      />

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
        </div>
  );
}
