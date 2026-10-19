"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { MapPin, LayoutList, X, Navigation, Settings, ExternalLink, AlertCircle, Info } from 'lucide-react';

// Importar el mapa deshabilitando SSR ya que Leaflet interactúa con window
const MapWrapper = dynamic(() => import('./MapWrapper'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-[#0d1421] border border-white/5 rounded-lg animate-pulse">
      <MapPin size={32} className="text-[#4b934e] mb-3 opacity-50" />
      <span className="text-slate-400 font-medium">Cargando mapa interactivo...</span>
    </div>
  )
});

interface DetalleNotaModalProps {
  selectedRow: any;
  onClose: () => void;
  onUpdateImportancia?: (codigoParada: string, newValue: string) => void;
  onUpdateCoordenadas?: (codigoParada: string, lat: string, lng: string) => void;
  onUpdateDireccion?: (codigoParada: string, direccion: string) => void;
}

export default function DetalleNotaModal({ selectedRow, onClose, onUpdateImportancia }: DetalleNotaModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'detalles' | 'mapa'>('detalles');

  // Estados para la visualización del Mapa
  const [mapCoords, setMapCoords] = useState<[number, number] | null>(null);
  const [showMarker, setShowMarker] = useState(true);

  const latNum = selectedRow?.latitud && selectedRow.latitud !== '-' ? parseFloat(selectedRow.latitud) : null;
  const lngNum = selectedRow?.longitud && selectedRow.longitud !== '-' ? parseFloat(selectedRow.longitud) : null;
  const hasCoords = latNum !== null && lngNum !== null && !isNaN(latNum) && !isNaN(lngNum) && latNum !== 0 && lngNum !== 0;

  // Origen de base de datos
  const is2k8 = selectedRow?.origenBd === '2k8';
  const is2k12 = selectedRow?.origenBd === '2k12';

  // Si viene desde 2k12, usa directamente el co_cli (almacenado en codigoCliente)
  // Si viene desde 2k8, requiere haber encontrado el cliente en 2k12 a través de DIRECCION_2 con '@'
  const hasValidCliente = is2k12
    ? Boolean(selectedRow?.codigoCliente)
    : Boolean(selectedRow?.codigoCliente && selectedRow?.cliente2k12Encontrado);

  const tieneArroba2k8 = Boolean(selectedRow?.tieneArroba2k8);
  const mostrarBadgeCoordenadas2k12 = is2k8 && tieneArroba2k8;
  const codigo2k12Mostrar = selectedRow?.codigoCliente || '';

  useEffect(() => {
    if (activeTab === 'mapa' && selectedRow) {
      if (hasCoords && latNum !== null && lngNum !== null) {
        setMapCoords([latNum, lngNum]);
        setShowMarker(true);
      } else {
        // Fallback a Caracas como vista general si no hay coordenadas, sin marcador
        setMapCoords([10.4806, -66.9036]);
        setShowMarker(false);
      }
    }
  }, [activeTab, selectedRow, hasCoords, latNum, lngNum]);

  if (!selectedRow) return null;

  // Redirigir a consulta de clientes abriendo directamente la pestaña de configuración
  const handleRedirectToClient = () => {
    if (!hasValidCliente) return;

    // Si viene de 2k12, usa co_cli directamente; si es 2k8, el código 2k12 extraído y verificado
    const codigo = selectedRow.codigoCliente || '';
    const rif = selectedRow.identificadorContacto || '';
    const descripcion = selectedRow.nombreContacto || '';

    const params = new URLSearchParams();
    if (codigo) {
      params.set('codigo', codigo);
    } else if (rif) {
      params.set('rif', rif);
    } else if (descripcion) {
      params.set('descripcion', descripcion);
    }
    params.set('tab', 'configuracion');

    onClose();
    router.push(`/clientes?${params.toString()}`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#090d16]/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" onClick={onClose}>
      <div
        className="bg-[#141f33] w-[95%] max-w-[1200px] h-[90vh] rounded-xl border border-[#4b934e]/30 shadow-2xl flex flex-col animate-[scaleIn_0.2s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-[#0d1421] rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-[#4b934e]">Detalle de Nota de Entrega</span>
              <span className="bg-[#4b934e]/20 text-[#4b934e] text-sm px-3 py-1 rounded-full font-mono">{selectedRow.codigoParada}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-white/5 hover:bg-[#ff4d4f]/20 hover:border-[#ff4d4f]/50 border border-transparent rounded-lg p-2 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pestañas (Tabs) */}
        <div className="flex px-6 border-b border-white/5 shrink-0 bg-[#0d1421]/50 justify-between items-center">
          <div className="flex">
            <button
              onClick={() => setActiveTab('detalles')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all relative ${activeTab === 'detalles'
                ? 'text-[#4b934e] bg-white/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
            >
              <LayoutList size={18} />
              Datos Generales
              {activeTab === 'detalles' && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#4b934e] shadow-[0_-2px_8px_rgba(75,147,78,0.5)]"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('mapa')}
              className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all relative ${activeTab === 'mapa'
                ? 'text-[#4b934e] bg-white/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
            >
              <MapPin size={18} />
              Geolocalización
              <span className="text-[10px] bg-white/10 text-slate-300 px-1.5 py-0.5 rounded font-normal">
                Solo Lectura
              </span>
              {activeTab === 'mapa' && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#4b934e] shadow-[0_-2px_8px_rgba(75,147,78,0.5)]"></span>
              )}
            </button>
          </div>

          <button
            onClick={handleRedirectToClient}
            disabled={!hasValidCliente}
            className={`hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${hasValidCliente
                ? 'bg-[#4b934e]/15 hover:bg-[#4b934e]/25 text-[#4b934e] border-[#4b934e]/40 cursor-pointer'
                : 'bg-white/5 text-slate-500 border-white/10 cursor-not-allowed opacity-60'
              }`}
            title={
              !hasValidCliente
                ? (is2k8 ? "El campo de descripción no contiene un código de un cliente o sucursal en 2k12." : "No se identificó el código de cliente en la nota.")
                : "Ir a configurar la coordenada en el catálogo de clientes"
            }
          >
            <Settings size={14} />
            Configurar Coordenada de Cliente
            <ExternalLink size={12} />
          </button>
        </div>

        {/* Área de Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#141f33] relative">

          {/* Pestaña: Detalles */}
          {activeTab === 'detalles' && (
            <div className="p-6 md:p-8 animate-[fadeIn_0.3s_ease-out]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(selectedRow).map(([key, value]) => {
                  if (
                    key === 'codigoParada' ||
                    key === 'id' ||
                    key === 'codigoCliente' ||
                    key === 'cliente2k12Encontrado' ||
                    key === 'origenBd' ||
                    key === 'tieneArroba2k8' ||
                    key === 'coordenadasDesde2k12' ||
                    (key === 'direccion2_2k8' && !is2k8)
                  ) return null;

                  if (key === 'direccion2_2k8') {
                    return (
                      <div key={key} className="flex flex-col border-b border-white/5 pb-3 lg:col-span-2 md:col-span-2">
                        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                          DIRECCIÓN 2 (PROFIT 2K8)
                        </span>
                        <span className="text-[15px] text-slate-100 font-mono font-medium break-words leading-relaxed bg-[#0d1421] p-2.5 rounded-lg border border-amber-500/20">
                          {value !== undefined && value !== null && value !== '' ? String(value) : <span className="text-slate-500 italic font-sans text-sm">Vacío</span>}
                        </span>
                      </div>
                    );
                  }

                  const formattedKey = key.replace(/([A-Z])/g, ' $1').toUpperCase();
                  const isLongText = key === 'direccion' || key === 'nombreItem' || key === 'nombreContacto' || key === 'descripcionCliente' || key === 'observasion';

                  if (key === 'importancia') {
                    return (
                      <div key={key} className="flex flex-col border-b border-white/5 pb-3 md:col-span-2 lg:col-span-2">
                        <span className="text-[11px] font-bold text-[#4b934e] uppercase tracking-wider mb-2">Asignar Importancia (0 - 9)</span>
                        <div className="flex flex-col gap-2 w-full pr-4">
                          <input
                            type="range"
                            min="0"
                            max="9"
                            value={value !== undefined && value !== null && value !== '' ? String(value) : '0'}
                            onChange={(e) => onUpdateImportancia?.(selectedRow.codigoParada, e.target.value)}
                            className="w-full accent-[#4b934e] cursor-pointer"
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex justify-between text-xs text-slate-400 font-semibold px-1 flex-1">
                              <span>0 (Baja)</span><span>9 (Alta)</span>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <span className="text-[#4b934e] text-sm font-bold bg-[#0d1421] px-3 py-1 rounded-md border border-[#4b934e]/30">
                                {value !== '' && value !== null && value !== undefined ? String(value) : 'En blanco'}
                              </span>
                              <button
                                onClick={() => onUpdateImportancia?.(selectedRow.codigoParada, '')}
                                className="text-xs text-red-400 hover:text-red-300 underline outline-none cursor-pointer"
                                title="Dejar en blanco"
                              >
                                Limpiar
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={key} className={`flex flex-col border-b border-white/5 pb-3 ${isLongText ? 'lg:col-span-2 md:col-span-2' : ''}`}>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{formattedKey}</span>
                      <span className="text-[15px] text-slate-100 font-medium break-words leading-relaxed">
                        {value !== undefined && value !== null && value !== '' ? String(value) : <span className="text-slate-600">-</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pestaña: Mapa (Solo Lectura) */}
          {activeTab === 'mapa' && (
            <div className="p-6 md:p-8 h-full animate-[fadeIn_0.3s_ease-out]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-[500px]">

                {/* Columna Izquierda: Datos de Coordenadas */}
                <div className="col-span-1 flex flex-col gap-4">
                  {/* Tarjetas de Coordenadas Informativas */}
                  <div className="bg-[#0d1421] border border-[#4b934e]/40 rounded-xl p-5 shadow-[0_0_15px_rgba(75,147,78,0.1)] flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Navigation className="text-[#4b934e]" size={20} />
                        <h3 className="text-white font-bold text-base">Coordenadas del Cliente</h3>
                      </div>
                      {hasCoords ? (
                        <span className="bg-[#4b934e]/20 text-[#4b934e] text-xs font-semibold px-2.5 py-0.5 rounded-full border border-[#4b934e]/30">
                          Asignadas
                        </span>
                      ) : (
                        <span className="bg-red-500/20 text-red-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-red-500/30">
                          Sin Asignar
                        </span>
                      )}
                    </div>

                    {mostrarBadgeCoordenadas2k12 && (
                      <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-2.5 flex items-center justify-between text-xs text-sky-200">
                        <div className="flex items-center gap-2">
                          <Info className="w-4 h-4 text-sky-400 shrink-0" />
                          <span className="font-semibold">Coordenadas traidas desde 2k12</span>
                        </div>
                        {codigo2k12Mostrar && (
                          <span className="bg-sky-500/20 text-sky-300 font-mono font-bold px-2 py-0.5 rounded border border-sky-500/40 text-[11px]">
                            {codigo2k12Mostrar}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="bg-[#141f33] border border-white/10 p-3 rounded-lg">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Latitud</label>
                        <div className="text-white font-mono text-base font-semibold">
                          {selectedRow.latitud && selectedRow.latitud !== '-' ? selectedRow.latitud : <span className="text-slate-500 italic text-sm font-sans">No registrada</span>}
                        </div>
                      </div>

                      <div className="bg-[#141f33] border border-white/10 p-3 rounded-lg">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Longitud</label>
                        <div className="text-white font-mono text-base font-semibold">
                          {selectedRow.longitud && selectedRow.longitud !== '-' ? selectedRow.longitud : <span className="text-slate-500 italic text-sm font-sans">No registrada</span>}
                        </div>
                      </div>
                    </div>

                    {/* Botón de redirección hacia configuración de cliente */}
                    <div className="pt-2">
                      {!hasValidCliente ? (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-200">
                          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <strong className="block text-amber-300 font-semibold mb-0.5">
                              {is2k8 ? 'Cliente 2k12 no identificado' : 'Cliente sin código'}
                            </strong>
                            {is2k8
                              ? 'El campo de descripción no contiene un código de un cliente o sucursal en 2k12.'
                              : 'No se encontró un código de cliente válido en la nota de entrega.'}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
                          {is2k12
                            ? `Cliente Profit 2k12 (${selectedRow.codigoCliente}). Para asignar o corregir las coordenadas de este cliente, dirígete al módulo de clientes:`
                            : 'Para asignar o corregir las coordenadas de este cliente, dirígete al módulo de clientes:'}
                        </p>
                      )}

                      <button
                        onClick={handleRedirectToClient}
                        disabled={!hasValidCliente}
                        className={`w-full mt-3 py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-sm ${hasValidCliente
                            ? 'bg-[#4b934e] hover:bg-[#3d7840] text-white shadow-[0_0_15px_rgba(75,147,78,0.3)] hover:shadow-[0_0_20px_rgba(75,147,78,0.5)] cursor-pointer'
                            : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed opacity-60'
                          }`}
                        title={
                          !hasValidCliente
                            ? (is2k8 ? "El campo de descripción no contiene un código de un cliente o sucursal en 2k12." : "No se identificó el código de cliente en la nota.")
                            : "Configurar en catálogo de clientes"
                        }
                      >
                        <Settings size={16} />
                        Configurar Coordenada de Cliente
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Tarjeta de Dirección */}
                  <div className="bg-[#0d1421] border border-white/10 rounded-xl p-5 flex-1 flex flex-col">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block mb-2">Dirección Registrada</span>
                    <p className="text-slate-300 leading-relaxed text-sm flex-1">
                      {selectedRow.direccion || <span className="italic text-slate-500">Sin dirección especificada.</span>}
                    </p>

                    {/* Si es 2k8, mostrar siempre el campo DIRECCION_2; en caso de 2k12 NO */}
                    {is2k8 && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <span className="text-[11px] text-amber-400/90 uppercase font-bold block mb-1">
                          Campo de Descripción (Profit 2k8)
                        </span>
                        <p className="text-slate-200 text-sm font-mono bg-white/5 p-2 rounded-lg border border-white/10 break-words">
                          {selectedRow.direccion2_2k8 || <span className="text-slate-500 italic font-sans text-xs">Sin información registrada</span>}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-white/5 flex flex-col gap-1">
                      <span className="text-[11px] text-slate-500 uppercase font-bold">Cliente / Contacto</span>
                      <span className="text-white font-medium text-sm">{selectedRow.nombreContacto || '-'}</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <span className="text-[11px] text-slate-500 uppercase font-bold block mb-1">Ciudad (Origen)</span>
                      <span className="text-white font-medium">{selectedRow.ctOrigen || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Mapa Informativo */}
                <div className="col-span-1 lg:col-span-2 relative rounded-xl overflow-hidden border-2 border-white/10 bg-[#0d1421] flex flex-col">
                  {/* Banner de estado del mapa */}
                  <div className="bg-[#141f33] border-b border-white/10 px-4 py-3 flex items-center justify-between text-xs shrink-0">
                    <div className="flex items-center gap-2 text-slate-300 font-medium">
                      <MapPin size={16} className={hasCoords ? "text-[#4b934e]" : "text-amber-400"} />
                      {hasCoords ? (
                        <span>Punto geográfico asignado a la entrega</span>
                      ) : !hasValidCliente ? (
                        <span className="text-amber-300">
                          {is2k8 ? 'El campo de descripción no contiene un código de un cliente o sucursal en 2k12.' : 'Cliente sin código registrado.'}
                        </span>
                      ) : (
                        <span className="text-amber-300">Este cliente aún no posee coordenadas registradas</span>
                      )}
                      {mostrarBadgeCoordenadas2k12 && (
                        <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[11px] font-semibold px-2 py-0.5 rounded-md ml-2 shrink-0 inline-flex items-center gap-1.5">
                          <span>Coordenadas traidas desde 2k12</span>
                          {codigo2k12Mostrar && (
                            <span className="bg-sky-400/20 text-sky-200 px-1.5 py-0.2 rounded font-mono font-bold">
                              {codigo2k12Mostrar}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    {!hasCoords && hasValidCliente && (
                      <button
                        onClick={handleRedirectToClient}
                        className="text-[#4b934e] hover:text-[#3d7840] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        Asignar Coordenada →
                      </button>
                    )}
                  </div>

                  {/* Contenedor del Mapa (Solo visualización) */}
                  <div className="flex-1 relative">
                    {mapCoords && (
                      <MapWrapper
                        lat={mapCoords[0]}
                        lng={mapCoords[1]}
                        popupTitle={selectedRow.nombreContacto || 'Punto de Entrega'}
                        popupSubtitle={selectedRow.direccion}
                        showMarker={showMarker}
                      />
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#090d16] border-t border-white/5 p-4 flex justify-between items-center gap-3 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            {selectedRow.identificadorContacto && (
              <span>RIF: <strong className="text-slate-300 font-mono">{selectedRow.identificadorContacto}</strong></span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg text-sm font-semibold transition-colors bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 cursor-pointer"
            >
              Cerrar
            </button>
            <button
              onClick={handleRedirectToClient}
              disabled={!hasValidCliente}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${hasValidCliente
                  ? 'bg-[#4b934e] hover:bg-[#3d7840] text-white shadow-lg cursor-pointer'
                  : 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed opacity-60'
                }`}
              title={
                !hasValidCliente
                  ? (is2k8 ? "El campo de descripción no contiene un código de un cliente o sucursal en 2k12." : "No se identificó el código de cliente en la nota.")
                  : "Configurar Coordenada de Cliente"
              }
            >
              <Settings size={16} /> Configurar Coordenada de Cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
