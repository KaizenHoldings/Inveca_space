"use client";

import { useState, useEffect, useMemo } from 'react';
import { MapPin, Search, CheckCircle2, XCircle, Clock, AlertCircle, ShieldCheck, Filter, RefreshCw, Building, ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { SolicitudCoordenada } from '@/services/SolicitudCoordenadaService';

interface TooltipCellProps {
  value?: string | null;
  isBold?: boolean;
  highlight?: 'green' | 'red' | 'normal' | 'yellow';
  maxWidth?: string;
}

const TooltipCell = ({ value, isBold = false, highlight = 'normal', maxWidth = 'max-w-[250px]' }: TooltipCellProps) => {
  const strVal = value ? String(value).trim() : '';
  const isInvalid = !strVal || strVal === '-' || strVal.toUpperCase() === 'NULL' || strVal === '0' || strVal === '0, 0';
  const displayValue = isInvalid ? '-' : strVal;

  let textColor = 'text-slate-300';
  if (highlight === 'green') textColor = 'text-[#4b934e] font-bold font-mono text-[15px] bg-[#4b934e]/10 px-2.5 py-1 rounded border border-[#4b934e]/30';
  if (highlight === 'red') textColor = 'text-red-400 font-mono';
  if (highlight === 'yellow') textColor = 'text-amber-400 font-mono font-semibold';
  if (isBold && highlight === 'normal') textColor = 'text-white font-bold text-[15px]';

  return (
    <td className={`px-6 py-4.5 text-sm ${textColor} ${maxWidth} relative group`}>
      <div className="truncate cursor-default inline-block max-w-full">{displayValue}</div>
      <div className="absolute left-6 bottom-full mb-2 hidden group-hover:block w-max max-w-[400px] whitespace-normal bg-[#090d16] text-white text-[13px] px-4 py-3 rounded-lg shadow-2xl z-50 pointer-events-none border border-[#4b934e] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        {displayValue}
      </div>
    </td>
  );
};

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudCoordenada[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('TODAS');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  /**
   * Carga la lista de solicitudes desde la base de datos local de la aplicación
   */
  const fetchSolicitudes = async () => {
    setLoading(true);
    try {
      const url = selectedStatus === 'TODAS' 
        ? '/api/solicitudes-coordenadas' 
        : `/api/solicitudes-coordenadas?status=${selectedStatus}`;
        
      const res = await fetch(url);
      const json = await res.json();

      if (res.ok && json.success) {
        setSolicitudes(json.data || []);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error de consulta',
          text: json.message || 'No se pudieron cargar las solicitudes.',
          confirmButtonColor: '#4b934e',
          background: '#0d1421',
          color: '#fff'
        });
      }
    } catch (error) {
      console.error('Error cargando solicitudes:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'Ocurrió un error al intentar comunicar con el servidor.',
        confirmButtonColor: '#4b934e',
        background: '#0d1421',
        color: '#fff'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolicitudes();
    setCurrentPage(1);
  }, [selectedStatus]);

  /**
   * Cambia el estado de una solicitud ('APROBADA' o 'DENEGADA')
   */
  const handleUpdateStatus = async (id_solicitud: number | undefined, nuevoStatus: 'APROBADA' | 'DENEGADA', clienteDesc: string) => {
    if (!id_solicitud) return;

    const accionText = nuevoStatus === 'APROBADA' ? 'aprobar' : 'denegar';
    const colorButton = nuevoStatus === 'APROBADA' ? '#4b934e' : '#ff4d4f';

    const result = await Swal.fire({
      title: `¿Confirmar acción?`,
      html: `¿Estás seguro de <strong>${accionText}</strong> la propuesta de coordenadas del cliente <br/><span style="color:#4b934e; font-weight:bold;">${clienteDesc}</span>?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: colorButton,
      cancelButtonColor: '#2a3a52',
      confirmButtonText: `Sí, ${accionText.toUpperCase()}`,
      cancelButtonText: 'Cancelar',
      background: '#0d1421',
      color: '#fff'
    });

    if (!result.isConfirmed) return;

    setProcessingId(id_solicitud);
    try {
      const res = await fetch('/api/solicitudes-coordenadas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_solicitud, status_solicitud: nuevoStatus })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        Swal.fire({
          icon: 'success',
          title: '¡Estado actualizado!',
          text: json.message || `La solicitud fue modificada exitosamente a ${nuevoStatus}.`,
          confirmButtonColor: '#4b934e',
          background: '#0d1421',
          color: '#fff'
        });
        fetchSolicitudes();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al modificar',
          text: json.message || 'No se pudo modificar el estado de la solicitud.',
          confirmButtonColor: '#4b934e',
          background: '#0d1421',
          color: '#fff'
        });
      }
    } catch (err) {
      console.error('Error al modificar status:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error de red',
        text: 'Falla de comunicación al intentar actualizar la base de datos local.',
        confirmButtonColor: '#4b934e',
        background: '#0d1421',
        color: '#fff'
      });
    } finally {
      setProcessingId(null);
    }
  };

  /**
   * Cálculo para indicadores de tarjetas
   */
  const stats = useMemo(() => {
    const total = solicitudes.length;
    const pendientes = solicitudes.filter(s => s.status_solicitud === 'PENDIENTE').length;
    const aprobadas = solicitudes.filter(s => s.status_solicitud === 'APROBADA').length;
    const denegadas = solicitudes.filter(s => s.status_solicitud === 'DENEGADA').length;
    return { total, pendientes, aprobadas, denegadas };
  }, [solicitudes]);

  /**
   * Lista filtrada según input text
   */
  const filteredSolicitudes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return solicitudes;
    return solicitudes.filter(item => 
      (item.codigo_cliente || '').toLowerCase().includes(q) ||
      (item.descripcion_cliente || '').toLowerCase().includes(q) ||
      (item.rif_cliente || '').toLowerCase().includes(q) ||
      (item.coordenada_propuesta || '').toLowerCase().includes(q)
    );
  }, [solicitudes, searchQuery]);

  // Paginación del lado del cliente
  const totalPages = Math.max(1, Math.ceil(filteredSolicitudes.length / pageSize));
  const pagedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredSolicitudes.slice(startIndex, startIndex + pageSize);
  }, [filteredSolicitudes, currentPage]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(p => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(p => p + 1);
  };

  return (
    <div className="p-6 md:p-8 w-full flex flex-col gap-6 animate-[fadeInUp_0.4s_ease-out]">
        
      {/* Encabezado Principal del Panel */}
      <div className="w-full bg-[#0d1421]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 md:p-7 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#4b934e]/15 border border-[#4b934e]/40 rounded-2xl flex items-center justify-center shrink-0 shadow-[0_0_25px_rgba(75,147,78,0.25)]">
            <MapPin className="text-[#4b934e] w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              Panel de Moderación de Coordenadas
            </h1>
            <p className="text-sm md:text-base text-slate-400 mt-1 font-medium">
              Revisión, aprobación y control de cambios de geolocalización de clientes • <span className="text-[#4b934e] font-semibold">Sistema Inveca</span>
            </p>
          </div>
        </div>
        <button 
          onClick={fetchSolicitudes}
          disabled={loading}
          className="self-start sm:self-auto bg-[#141f33] hover:bg-[#1f2d47] text-white px-5 py-3 rounded-xl border border-white/15 hover:border-[#4b934e]/50 flex items-center gap-2.5 text-sm font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 shrink-0"
          title="Refrescar listado en vivo"
        >
          <RefreshCw size={18} className={`text-[#4b934e] ${loading ? 'animate-spin' : ''}`} />
          Actualizar Datos
        </button>
      </div>

      {/* Tarjetas de Indicadores Estadísticos con Todo el Ancho */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
        
        {/* Total Solicitudes */}
        <div 
          onClick={() => { setSelectedStatus('TODAS'); setCurrentPage(1); }}
          className={`cursor-pointer bg-[#0d1421]/80 backdrop-blur-md p-6 rounded-2xl border transition-all duration-300 shadow-xl flex items-center justify-between group ${
            selectedStatus === 'TODAS' 
              ? 'border-[#4b934e] bg-[#0d1421] shadow-[0_0_25px_rgba(75,147,78,0.2)] scale-[1.01]' 
              : 'border-white/10 hover:border-white/25 hover:bg-[#0d1421]'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Total Solicitudes</span>
            <span className="text-4xl font-extrabold text-white leading-none tracking-tight">{stats.total}</span>
          </div>
          <div className="w-13 h-13 p-3 rounded-xl bg-slate-500/10 border border-slate-500/20 group-hover:border-slate-400/40 flex items-center justify-center transition-colors">
            <MapPin className="w-7 h-7 text-slate-300" />
          </div>
        </div>

        {/* Pendientes */}
        <div 
          onClick={() => { setSelectedStatus('PENDIENTE'); setCurrentPage(1); }}
          className={`cursor-pointer bg-[#0d1421]/80 backdrop-blur-md p-6 rounded-2xl border transition-all duration-300 shadow-xl flex items-center justify-between group ${
            selectedStatus === 'PENDIENTE' 
              ? 'border-amber-400 bg-[#0d1421] shadow-[0_0_25px_rgba(251,191,36,0.25)] scale-[1.01]' 
              : 'border-amber-500/30 hover:border-amber-400/60 hover:bg-[#0d1421]'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1.5">Pendientes de Revisar</span>
            <span className="text-4xl font-extrabold text-white leading-none tracking-tight">{stats.pendientes}</span>
          </div>
          <div className="w-13 h-13 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 group-hover:border-amber-400/60 flex items-center justify-center transition-colors">
            <Clock className="w-7 h-7 text-amber-400 animate-pulse" />
          </div>
        </div>

        {/* Aprobadas */}
        <div 
          onClick={() => { setSelectedStatus('APROBADA'); setCurrentPage(1); }}
          className={`cursor-pointer bg-[#0d1421]/80 backdrop-blur-md p-6 rounded-2xl border transition-all duration-300 shadow-xl flex items-center justify-between group ${
            selectedStatus === 'APROBADA' 
              ? 'border-[#4b934e] bg-[#0d1421] shadow-[0_0_25px_rgba(75,147,78,0.3)] scale-[1.01]' 
              : 'border-[#4b934e]/30 hover:border-[#4b934e]/60 hover:bg-[#0d1421]'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-[#4b934e] uppercase tracking-wider block mb-1.5">Solicitudes Aprobadas</span>
            <span className="text-4xl font-extrabold text-white leading-none tracking-tight">{stats.aprobadas}</span>
          </div>
          <div className="w-13 h-13 p-3 rounded-xl bg-[#4b934e]/15 border border-[#4b934e]/30 group-hover:border-[#4b934e]/60 flex items-center justify-center transition-colors">
            <CheckCircle2 className="w-7 h-7 text-[#4b934e]" />
          </div>
        </div>

        {/* Denegadas */}
        <div 
          onClick={() => { setSelectedStatus('DENEGADA'); setCurrentPage(1); }}
          className={`cursor-pointer bg-[#0d1421]/80 backdrop-blur-md p-6 rounded-2xl border transition-all duration-300 shadow-xl flex items-center justify-between group ${
            selectedStatus === 'DENEGADA' 
              ? 'border-red-500 bg-[#0d1421] shadow-[0_0_25px_rgba(239,68,68,0.25)] scale-[1.01]' 
              : 'border-red-500/30 hover:border-red-500/60 hover:bg-[#0d1421]'
          }`}
        >
          <div>
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider block mb-1.5">Solicitudes Denegadas</span>
            <span className="text-4xl font-extrabold text-white leading-none tracking-tight">{stats.denegadas}</span>
          </div>
          <div className="w-13 h-13 p-3 rounded-xl bg-red-500/15 border border-red-500/30 group-hover:border-red-400/60 flex items-center justify-center transition-colors">
            <XCircle className="w-7 h-7 text-red-400" />
          </div>
        </div>
          
      </div>

      {/* Contenedor Principal de la Tabla */}
      <div className="w-full bg-[#0d1421]/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Barra de Herramientas Superior de la Tabla */}
        <div className="bg-[#090d16]/90 p-5 md:p-6 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Botones / Pestañas de Filtrado */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1.5 uppercase tracking-wider">
              <Filter size={14} className="text-[#4b934e]" /> Filtro de Vista:
            </span>
            {[
              { label: 'Todas las Solicitudes', value: 'TODAS', count: stats.total },
              { label: 'Pendientes', value: 'PENDIENTE', count: stats.pendientes },
              { label: 'Aprobadas', value: 'APROBADA', count: stats.aprobadas },
              { label: 'Denegadas', value: 'DENEGADA', count: stats.denegadas },
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => { setSelectedStatus(tab.value); setCurrentPage(1); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition-all uppercase flex items-center gap-2 ${
                  selectedStatus === tab.value
                    ? 'bg-[#4b934e] text-white shadow-lg shadow-[#4b934e]/30 border border-white/20'
                    : 'bg-[#141f33] text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono ${selectedStatus === tab.value ? 'bg-black/20 text-white' : 'bg-black/30 text-[#4b934e]'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Buscador de Tabla */}
          <div className="relative w-full md:w-96">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Buscar por nombre, código o RIF..."
              className="w-full bg-[#141f33]/80 border border-white/15 focus:border-[#4b934e] pl-11 pr-4 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#4b934e]/30 placeholder-slate-400 transition-all shadow-inner"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs font-bold">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tabla de Datos de Ancho Total (Altura ajustable a la cantidad de filas) */}
        <div className={`w-full overflow-x-auto ${loading || filteredSolicitudes.length === 0 ? 'min-h-[280px]' : ''}`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center p-24 gap-4 text-slate-400">
              <div className="w-12 h-12 border-4 border-white/10 border-t-[#4b934e] rounded-full animate-spin"></div>
              <p className="text-base font-semibold text-slate-300">Cargando registros del panel administrativo...</p>
            </div>
          ) : filteredSolicitudes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-24 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Sin coincidencias para mostrar</h3>
              <p className="text-slate-400 text-sm max-w-md">
                No hay solicitudes en estado <span className="font-bold text-[#4b934e]">{selectedStatus}</span> que coincidan con la búsqueda.
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-left whitespace-nowrap">
              <thead>
                <tr className="bg-[#090d16] border-b border-white/10 text-slate-400 uppercase text-[11px] font-extrabold tracking-wider">
                  <th className="py-5 px-6 text-[#4b934e]">CÓDIGO CLIENTE</th>
                  <th className="py-5 px-6 text-[#4b934e]">RAZÓN SOCIAL / DESCRIPCIÓN</th>
                  <th className="py-5 px-6 text-[#4b934e]">RIF</th>
                  <th className="py-5 px-6 text-[#4b934e]">COORD. ACTUAL / ORIGIN</th>
                  <th className="py-5 px-6 text-[#4b934e]">PROPUESTA NUEVA</th>
                  <th className="py-5 px-6 text-[#4b934e]">ESTADO ACTUAL</th>
                  <th className="py-5 px-6 text-[#4b934e]">FECHA REGISTRO</th>
                  <th className="py-5 px-6 text-[#4b934e] text-center">ACCIONES DISPONIBLES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {pagedRecords.map((item) => {
                  const status = item.status_solicitud || 'PENDIENTE';
                  const isProcessing = processingId === item.id_solicitud;
                  const fechaFormat = item.fecha_creacion 
                    ? new Date(item.fecha_creacion).toLocaleString('es-VE', { dateStyle: 'medium', timeStyle: 'short' })
                    : '-';

                  return (
                    <tr key={item.id_solicitud} className="transition-all hover:bg-[#4b934e]/10 duration-150">
                        
                      {/* CÓDIGO */}
                      <TooltipCell value={item.codigo_cliente} isBold={true} maxWidth="max-w-[160px]" />

                      {/* RAZÓN SOCIAL */}
                      <TooltipCell value={item.descripcion_cliente} isBold={true} maxWidth="max-w-[280px]" />

                      {/* RIF */}
                      <TooltipCell value={item.rif_cliente} maxWidth="max-w-[150px]" />

                      {/* COORDENADA ORIGINAL */}
                      <TooltipCell value={item.coordenada_original} highlight="normal" maxWidth="max-w-[200px]" />

                      {/* PROPUESTA NUEVA */}
                      <TooltipCell value={item.coordenada_propuesta} highlight="green" maxWidth="max-w-[220px]" />

                      {/* ESTADO ACTUAL */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border shadow-sm ${
                          status === 'PENDIENTE'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 animate-pulse'
                            : status === 'APROBADA'
                            ? 'bg-[#4b934e]/20 text-[#4b934e] border-[#4b934e]/50'
                            : 'bg-red-500/20 text-red-400 border-red-500/50'
                        }`}>
                          {status === 'PENDIENTE' && <Clock size={13} />}
                          {status === 'APROBADA' && <CheckCircle2 size={14} />}
                          {status === 'DENEGADA' && <XCircle size={14} />}
                          <span>{status}</span>
                        </span>
                      </td>

                      {/* FECHA */}
                      <td className="px-6 py-4 text-slate-300 text-xs font-mono">
                        {fechaFormat}
                      </td>

                      {/* ACCIONES */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2.5">
                          <button
                            onClick={() => handleUpdateStatus(item.id_solicitud, 'APROBADA', item.descripcion_cliente)}
                            disabled={isProcessing || status === 'APROBADA'}
                            className="bg-[#4b934e]/25 hover:bg-[#4b934e] text-[#4b934e] hover:text-white disabled:opacity-25 disabled:pointer-events-none border border-[#4b934e]/50 hover:border-transparent px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-md hover:shadow-[0_0_15px_rgba(75,147,78,0.5)]"
                            title="Aprobar cambio de coordenada"
                          >
                            <Check size={16} />
                            <span>Aprobación</span>
                          </button>
                            
                          <button
                            onClick={() => handleUpdateStatus(item.id_solicitud, 'DENEGADA', item.descripcion_cliente)}
                            disabled={isProcessing || status === 'DENEGADA'}
                            className="bg-red-500/20 hover:bg-red-600 text-red-400 hover:text-white disabled:opacity-25 disabled:pointer-events-none border border-red-500/40 hover:border-transparent px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shadow-md hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                            title="Denegar o rechazar propuesta"
                          >
                            <X size={16} />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Paginación y Pie de Tabla */}
        {filteredSolicitudes.length > 0 && (
          <div className="bg-[#090d16] p-4 md:px-7 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs md:text-sm text-slate-400 font-medium">
              Mostrando del <span className="text-white font-bold">{(currentPage - 1) * pageSize + 1}</span> al <span className="text-white font-bold">{Math.min(currentPage * pageSize, filteredSolicitudes.length)}</span> de un total de <span className="text-[#4b934e] font-extrabold text-base">{filteredSolicitudes.length}</span> solicitudes
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="bg-[#141f33] hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-2 rounded-lg border border-white/10 transition-all flex items-center gap-1.5 text-xs font-bold"
              >
                <ChevronLeft size={16} className="text-[#4b934e]" />
                Anterior
              </button>

              <span className="px-3.5 py-1.5 bg-[#141f33] rounded-lg border border-white/10 text-xs font-bold text-white">
                Pág. {currentPage} de {totalPages}
              </span>

              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="bg-[#141f33] hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed text-white px-3.5 py-2 rounded-lg border border-white/10 transition-all flex items-center gap-1.5 text-xs font-bold"
              >
                Siguiente
                <ChevronRight size={16} className="text-[#4b934e]" />
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
