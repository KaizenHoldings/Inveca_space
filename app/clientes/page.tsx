"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, MapPin, Building, User, ChevronLeft } from 'lucide-react';
import Swal from 'sweetalert2';
import Link from 'next/link';
import DetalleClienteModal from '@/components/DetalleClienteModal';
import { sanitizeErrorMessage } from '@/lib/errorHandler';

interface Cliente {
  CODIGO: string;
  RIF: string;
  DESCRIPCION: string;
  'DIRECCION FISCAL': string;
  'DIRECCION DE ENTREGA': string;
  COORDENADAS?: string;
}

const TooltipCell = ({ value, isBold = false }: { value: string | number | null | undefined, isBold?: boolean }) => {
  const strVal = value ? String(value).trim() : '';
  const isInvalid = !strVal || strVal === '-' || strVal.toUpperCase() === 'NULL' || strVal === '0' || strVal === '0, 0';
  const displayValue = isInvalid ? '-' : strVal;
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

function ClientesContent() {
  const searchParams = useSearchParams();
  const paramCodigo = searchParams.get('codigo') || '';
  const paramRif = searchParams.get('rif') || '';
  const paramDesc = searchParams.get('descripcion') || '';
  const paramTab = (searchParams.get('tab') as 'detalles' | 'configuracion') || 'detalles';

  const [searchQuery, setSearchQuery] = useState(paramDesc);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'detalles' | 'configuracion'>(paramTab);
  const [isSearching, setIsSearching] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Filtros y paginación en el servidor
  const [filterCodigo, setFilterCodigo] = useState(paramCodigo);
  const [filterRif, setFilterRif] = useState(paramRif);
  const [filterDireccion, setFilterDireccion] = useState('');
  const [excluirCadenas, setExcluirCadenas] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalFiltrados, setTotalFiltrados] = useState(0);
  const [totalConCoordenadas, setTotalConCoordenadas] = useState(0);
  const [totalSinCoordenadas, setTotalSinCoordenadas] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 10;

  const fetchClientes = async (page: number, customFilters?: {
    descripcion?: string;
    codigo?: string;
    rif?: string;
    direccion?: string;
    excluirCadenas?: boolean;
  }) => {
    setIsSearching(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          descripcion: customFilters?.descripcion !== undefined ? customFilters.descripcion : searchQuery.trim(),
          codigo: customFilters?.codigo !== undefined ? customFilters.codigo : filterCodigo.trim(),
          rif: customFilters?.rif !== undefined ? customFilters.rif : filterRif.trim(),
          direccion: customFilters?.direccion !== undefined ? customFilters.direccion : filterDireccion.trim(),
          excluirCadenas: customFilters?.excluirCadenas !== undefined ? customFilters.excluirCadenas : excluirCadenas,
          page,
          pageSize
        })
      });

      const json = await res.json();

      if (!res.ok) {
        Swal.fire({
          icon: 'error',
          title: 'Error de consulta',
          text: json.error || 'Ocurrió un error inesperado al consultar los clientes.',
          confirmButtonColor: '#4b934e'
        });
        return null;
      }

      setClientes(json.data || []);
      setTotalRecords(json.total || 0);
      setTotalFiltrados(json.totalFiltrados !== undefined ? json.totalFiltrados : (json.total || 0));
      setTotalConCoordenadas(json.totalConCoordenadas || 0);
      setTotalSinCoordenadas(json.totalSinCoordenadas || 0);
      setTotalPages(json.totalPages || 1);
      setCurrentPage(page);
      setHasLoaded(true);
      return json;
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: sanitizeErrorMessage(error),
        confirmButtonColor: '#4b934e'
      });
      return null;
    } finally {
      setIsSearching(false);
    }
  };

  // Precarga inicial del directorio al entrar a la pantalla o abrir por parámetro de URL
  useEffect(() => {
    const loadInitialData = async () => {
      const hasSpecificParam = Boolean(paramCodigo || paramRif || paramDesc);
      const customFilters = hasSpecificParam ? {
        codigo: paramCodigo,
        rif: paramRif,
        descripcion: paramDesc,
      } : undefined;

      const result = await fetchClientes(1, customFilters);

      if (hasSpecificParam && result && result.data && result.data.length > 0) {
        // Encontrar la mejor coincidencia exacta
        const match = result.data.find((c: Cliente) => 
          (paramCodigo && c.CODIGO.trim().toUpperCase() === paramCodigo.trim().toUpperCase()) ||
          (paramRif && c.RIF.trim().toUpperCase() === paramRif.trim().toUpperCase())
        ) || result.data[0];

        setSelectedClient(match);
        setModalInitialTab(paramTab);
      }
    };

    loadInitialData();
  }, [paramCodigo, paramRif, paramDesc, paramTab]);

  // Búsqueda en servidor con debounce al escribir o cambiar check de exclusión
  useEffect(() => {
    if (!hasLoaded) return;
    const timer = setTimeout(() => {
      fetchClientes(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [filterCodigo, filterRif, filterDireccion, excluirCadenas]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    fetchClientes(1);
  };

  return (
    <div className="px-4 py-10 sm:px-8 flex flex-col relative min-h-full">
      
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="bg-[#141f33] hover:bg-[#1f2d47] border border-white/10 p-2 rounded-lg transition-colors text-white">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <User className="text-[#4b934e]" /> Consulta de Clientes
            </h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              Búsqueda directa en base de datos Profit 2k12
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto space-y-6">
        
        {/* Nota informativa de origen de datos Profit 2k12 */}
        <div className="bg-[#141f33]/90 border border-[#4b934e]/40 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex items-center gap-3">
            <div className="bg-[#4b934e]/20 p-2.5 rounded-lg text-[#4b934e] shrink-0 border border-[#4b934e]/30">
              <Building className="w-5 h-5" />
            </div>
            <div className="text-sm leading-relaxed">
              <span className="font-bold text-white">Origen de datos:</span>{' '}
              <span className="text-slate-300">
                Los clientes, sucursales y coordenadas mostrados en este módulo provienen directamente del servidor maestro de{' '}
                <strong className="text-[#4b934e] font-semibold">Profit 2k12</strong> (tabla <code className="bg-black/50 text-[#4b934e] font-mono px-1.5 py-0.5 rounded text-xs">saCliente</code>).
              </span>
            </div>
          </div>
          <span className="text-xs bg-[#4b934e]/10 text-[#4b934e] font-mono border border-[#4b934e]/30 px-3 py-1 rounded-full whitespace-nowrap self-start sm:self-center font-bold">
            Servidor Profit 2k12
          </span>
        </div>

        {/* Search Bar */}
        <div className="bg-[#090d16] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#4b934e]" />
          
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Escribe la descripción del cliente (ej. INVERSIONES...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#141f33] border border-white/10 focus:border-[#4b934e]/50 pl-11 pr-4 py-3 rounded-xl text-white placeholder-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-[#4b934e]/20"
              />
            </div>
            
            <button
              type="submit"
              disabled={isSearching}
              className="bg-[#4b934e] hover:bg-[#3d7840] disabled:bg-[#4b934e]/50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(75,147,78,0.3)] hover:shadow-[0_0_25px_rgba(75,147,78,0.5)] flex items-center justify-center min-w-[120px]"
            >
              {isSearching ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Buscar'
              )}
            </button>
          </form>
        </div>

        {/* Results Table */}
        <div className="bg-[#0d1421]/70 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-[fadeInUp_0.8s_ease-out_forwards]">
          <div className="bg-[#0d1421] p-5 border-b border-white/5 flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-white font-bold text-base tracking-wide flex items-center gap-2.5">
                <Building size={20} className="text-[#4b934e]" />
                Directorio de Clientes
              </h2>
              
              {/* Indicadores de Geolocalización (Con / Sin Coordenadas) */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-[#141f33]/90 border border-white/10 rounded-lg px-4 py-2 shadow-md flex flex-col min-w-[120px]">
                  <span className="text-slate-400 text-[11px] uppercase tracking-wide font-semibold block">Total Clientes</span>
                  <span className="text-xl font-bold text-white leading-none mt-1">{totalRecords.toLocaleString()}</span>
                </div>
                <div className="bg-[#141f33]/90 border border-[#4b934e]/30 rounded-lg px-4 py-2 shadow-md flex flex-col min-w-[130px]">
                  <span className="text-[#4b934e] text-[11px] uppercase tracking-wide font-semibold block">Con Coordenadas</span>
                  <span className="text-xl font-bold text-white leading-none mt-1">{totalConCoordenadas.toLocaleString()}</span>
                </div>
                <div className="bg-[#141f33]/90 border border-red-500/30 rounded-lg px-4 py-2 shadow-md flex flex-col min-w-[130px]">
                  <span className="text-red-400 text-[11px] uppercase tracking-wide font-semibold block">Sin Coordenadas</span>
                  <span className="text-xl font-bold text-white leading-none mt-1">{totalSinCoordenadas.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Filtros en Servidor y Checkbox para excluir casas matrices */}
            <div className="bg-[#141f33]/50 p-4 rounded-xl border border-white/5 flex flex-col gap-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Filtrar por Código..."
                  value={filterCodigo}
                  onChange={(e) => setFilterCodigo(e.target.value)}
                  className="bg-[#090d16] border border-white/10 focus:border-[#4b934e]/50 px-3.5 py-2.5 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#4b934e]/30 placeholder-slate-500 transition-colors"
                />
                <input
                  type="text"
                  placeholder="Filtrar por RIF..."
                  value={filterRif}
                  onChange={(e) => setFilterRif(e.target.value)}
                  className="bg-[#090d16] border border-white/10 focus:border-[#4b934e]/50 px-3.5 py-2.5 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#4b934e]/30 placeholder-slate-500 transition-colors"
                />
                <input
                  type="text"
                  placeholder="Filtrar por Dirección..."
                  value={filterDireccion}
                  onChange={(e) => setFilterDireccion(e.target.value)}
                  className="bg-[#090d16] border border-white/10 focus:border-[#4b934e]/50 px-3.5 py-2.5 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#4b934e]/30 placeholder-slate-500 transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5">
                <label className="flex items-center gap-2.5 cursor-pointer group select-none">
                  <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all duration-200 ${
                    excluirCadenas 
                      ? 'bg-[#4b934e] border-[#4b934e] text-white shadow-[0_0_12px_rgba(75,147,78,0.5)]' 
                      : 'bg-[#090d16] border-white/20 group-hover:border-[#4b934e]/60 text-transparent'
                  }`}>
                    <input
                      type="checkbox"
                      checked={excluirCadenas}
                      onChange={(e) => setExcluirCadenas(e.target.checked)}
                      className="sr-only"
                    />
                    <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xs md:text-sm font-bold text-slate-300 group-hover:text-white transition-colors">
                    Excluir cadenas principales y casas matrices (<code className="text-amber-400 font-mono bg-black/40 px-1.5 py-0.5 rounded text-xs">-000</code>)
                  </span>
                </label>

                {totalFiltrados !== totalRecords && (
                  <span className="text-xs font-semibold text-slate-400 bg-[#090d16] border border-white/10 px-3 py-1 rounded-lg">
                    Resultados del filtro actual: <strong className="text-[#4b934e] font-mono text-sm">{totalFiltrados.toLocaleString()}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr>
                  {["CÓDIGO", "RIF", "DESCRIPCIÓN", "DIRECCIÓN FISCAL", "DIRECCIÓN DE ENTREGA", "COORDENADAS"].map((header, index) => (
                    <th key={index} className="bg-[#090d16]/60 px-6 py-5 font-semibold text-xs tracking-wider text-[#4b934e] border-b border-white/10 uppercase">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isSearching && !hasLoaded ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <div className="w-10 h-10 border-4 border-[#4b934e]/30 border-t-[#4b934e] rounded-full animate-spin mb-4" />
                        <p className="text-lg text-slate-300 font-medium">Cargando directorio de clientes...</p>
                        <p className="text-sm text-slate-500 mt-1">Consultando base de datos y preparando paginación</p>
                      </div>
                    </td>
                  </tr>
                ) : clientes.length > 0 ? (
                  clientes.map((cliente, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => setSelectedClient(cliente)}
                      className="transition-all hover:bg-[#4b934e]/20 cursor-pointer border-b border-white/5 last:border-b-0"
                    >
                      <TooltipCell value={cliente.CODIGO} isBold={true} />
                      <TooltipCell value={cliente.RIF} />
                      <TooltipCell value={cliente.DESCRIPCION} />
                      <TooltipCell value={cliente['DIRECCION FISCAL']} />
                      <TooltipCell value={cliente['DIRECCION DE ENTREGA']} />
                      <TooltipCell value={cliente.COORDENADAS} />
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center p-12 text-slate-400 text-lg">
                      La búsqueda en este filtro no arrojó resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Controles de Paginación en Servidor */}
          {totalPages > 0 && (
            <div className="bg-[#0d1421] p-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-xs text-slate-400">
                Mostrando registros del <span className="text-white font-semibold">{totalFiltrados === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> al <span className="text-white font-semibold">{Math.min(currentPage * pageSize, totalFiltrados)}</span> de <span className="text-white font-semibold">{totalFiltrados.toLocaleString()}</span> coincidencias (de un total de <span className="text-[#4b934e] font-bold">{totalRecords.toLocaleString()}</span> clientes en 2k12)
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fetchClientes(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || isSearching}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#4b934e] hover:bg-[#3d7840] rounded-md disabled:bg-[#141f33] disabled:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  Anterior
                </button>
                <div className="text-sm text-slate-400 font-medium px-2">
                  Página <strong className="text-white">{currentPage}</strong> de <strong className="text-white">{totalPages}</strong>
                </div>
                <button
                  onClick={() => fetchClientes(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || totalPages === 0 || isSearching}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#4b934e] hover:bg-[#3d7840] rounded-md disabled:bg-[#141f33] disabled:text-slate-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>

      </main>

      {/* Modal para ver detalles y solicitar modificación de coordenadas */}
      <DetalleClienteModal 
        selectedClient={selectedClient} 
        onClose={() => setSelectedClient(null)} 
        initialTab={modalInitialTab}
      />
    </div>
  );
}

export default function ClientesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-[#4b934e]/30 border-t-[#4b934e] rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium">Cargando módulo de clientes...</p>
      </div>
    }>
      <ClientesContent />
    </Suspense>
  );
}
