"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, LayoutList, X, Navigation, AlertCircle } from 'lucide-react';

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
  onUpdateImportancia: (codigoParada: string, newValue: string) => void;
  onUpdateCoordenadas?: (codigoParada: string, lat: string, lng: string) => void;
  onUpdateDireccion?: (codigoParada: string, direccion: string) => void;
}

export default function DetalleNotaModal({ selectedRow, onClose, onUpdateImportancia, onUpdateCoordenadas, onUpdateDireccion }: DetalleNotaModalProps) {
  const [activeTab, setActiveTab] = useState<'detalles' | 'mapa'>('detalles');

  // Estados para la lógica del Mapa
  const [mapCoords, setMapCoords] = useState<[number, number] | null>(null);
  const [flyToCoords, setFlyToCoords] = useState<[number, number] | null>(null);
  const [showMarker, setShowMarker] = useState(true);
  const [mapZoom, setMapZoom] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (activeTab === 'mapa' && selectedRow) {
      const lat = selectedRow.latitud && selectedRow.latitud !== '-' ? parseFloat(selectedRow.latitud) : null;
      const lng = selectedRow.longitud && selectedRow.longitud !== '-' ? parseFloat(selectedRow.longitud) : null;
      const hasCoords = lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng);

      if (hasCoords) {
        setMapCoords([lat, lng]);
        setShowMarker(true);
      } else {
        // Fallback genérico a Caracas si no hay coordenadas, sin marcador
        setMapCoords([10.4806, -66.9036]);
        setShowMarker(false);
      }
    }
  }, [activeTab, selectedRow]);

  const handleMapClick = (lat: number, lng: number) => {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));

    setMapCoords([roundedLat, roundedLng]);
    setShowMarker(true);

    if (onUpdateCoordenadas) {
      onUpdateCoordenadas(selectedRow.codigoParada, String(roundedLat), String(roundedLng));
    }
  };

  const handleSearch = (isManual = true) => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Venezuela')}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          setMapCoords([lat, lng]);
          setFlyToCoords([lat, lng]); // Disparamos el vuelo del mapa solo aquí
          setShowMarker(true);
          setMapZoom(16); // Acercar cámara al lugar encontrado
          // Actualizamos automáticamente los campos Lat/Lng
          onUpdateCoordenadas?.(selectedRow.codigoParada, String(lat.toFixed(6)), String(lng.toFixed(6)));
        } else if (isManual) {
          alert("No se encontraron resultados para esta búsqueda.");
        }
      })
      .catch(() => {
        if (isManual) alert("Ocurrió un error en la búsqueda.");
      })
      .finally(() => setIsSearching(false));
  };

  // Efecto para buscar automáticamente después de dejar de escribir (Debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim().length > 3) {
        handleSearch(false);
      }
    }, 1200);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  if (!selectedRow) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#090d16]/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]" onClick={onClose}>
      <div
        className="bg-[#141f33] w-[95%] max-w-[1200px] h-[90vh] rounded-xl border border-[#4b934e]/30 shadow-2xl flex flex-col animate-[scaleIn_0.2s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-[#0d1421] rounded-t-xl shrink-0">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-[#4b934e]">Detalle de Nota de Entrega</span>
            <span className="bg-[#4b934e]/20 text-[#4b934e] text-sm px-3 py-1 rounded-full">{selectedRow.codigoParada}</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-white/5 hover:bg-[#ff4d4f]/20 hover:border-[#ff4d4f]/50 border border-transparent rounded-lg p-2 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pestañas (Tabs) */}
        <div className="flex px-6 border-b border-white/5 shrink-0 bg-[#0d1421]/50">
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
            {activeTab === 'mapa' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#4b934e] shadow-[0_-2px_8px_rgba(75,147,78,0.5)]"></span>
            )}
          </button>
        </div>

        {/* Área de Contenido con Scroll */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#141f33] relative">

          {/* Pestaña: Detalles */}
          {activeTab === 'detalles' && (
            <div className="p-6 md:p-8 animate-[fadeIn_0.3s_ease-out]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Object.entries(selectedRow).map(([key, value]) => {
                  if (key === 'codigoParada' || key === 'id') return null;

                  const formattedKey = key.replace(/([A-Z])/g, ' $1').toUpperCase();
                  const isLongText = key === 'direccion' || key === 'nombreItem' || key === 'nombreContacto' || key === 'descripcionCliente' || key === 'observasion';

                  if (key === 'importancia') {
                    return (
                      <div key={key} className="flex flex-col border-b border-white/5 pb-3">
                        <span className="text-[11px] font-bold text-[#4b934e] uppercase tracking-wider mb-2">Asignar Importancia (0 - 9)</span>
                        <div className="flex flex-col gap-2 w-full pr-4">
                          <input
                            type="range"
                            min="0"
                            max="9"
                            value={value !== undefined && value !== null && value !== '' ? String(value) : '0'}
                            onChange={(e) => onUpdateImportancia(selectedRow.codigoParada, e.target.value)}
                            className="w-full accent-[#4b934e]"
                          />
                          <div className="flex items-center justify-between">
                            <div className="flex justify-between text-xs text-slate-400 font-semibold px-1 flex-1">
                              <span>0</span><span>9</span>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <span className="text-[#4b934e] text-sm font-bold bg-[#0d1421] px-3 py-1 rounded-md border border-[#4b934e]/30">
                                {value !== '' && value !== null && value !== undefined ? String(value) : 'En blanco'}
                              </span>
                              <button
                                onClick={() => onUpdateImportancia(selectedRow.codigoParada, '')}
                                className="text-xs text-red-400 hover:text-red-300 underline outline-none"
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

          {/* Pestaña: Mapa */}
          {activeTab === 'mapa' && (
            <div className="p-6 md:p-8 h-full animate-[fadeIn_0.3s_ease-out]">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-[500px]">

                {/* Columna Izquierda: Datos */}
                <div className="col-span-1 flex flex-col gap-4">
                  {/* Tarjetas de Coordenadas */}
                  <div className="bg-[#0d1421] border border-[#4b934e]/40 rounded-xl p-5 shadow-[0_0_15px_rgba(75,147,78,0.1)]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Navigation className="text-[#4b934e]" size={20} />
                        <h3 className="text-white font-bold text-base">Coordenadas (Editables)</h3>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Latitud</label>
                        <input
                          type="text"
                          value={selectedRow.latitud && selectedRow.latitud !== '-' ? selectedRow.latitud : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newLat = parseFloat(val);
                            if (!isNaN(newLat)) {
                              setMapCoords([newLat, mapCoords ? mapCoords[1] : 0]);
                              setShowMarker(true);
                              onUpdateCoordenadas?.(selectedRow.codigoParada, val, selectedRow.longitud && selectedRow.longitud !== '-' ? selectedRow.longitud : '-');
                            } else if (val === '' || val === '-') {
                              // Permitir borrar
                              onUpdateCoordenadas?.(selectedRow.codigoParada, '-', selectedRow.longitud && selectedRow.longitud !== '-' ? selectedRow.longitud : '-');
                            }
                          }}
                          className="w-full bg-[#141f33] border border-white/20 focus:border-[#4b934e] px-3 py-2 rounded-lg text-white font-mono text-sm tracking-wide focus:outline-none transition-colors"
                          placeholder="Ej: 10.4806"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">Longitud</label>
                        <input
                          type="text"
                          value={selectedRow.longitud && selectedRow.longitud !== '-' ? selectedRow.longitud : ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newLng = parseFloat(val);
                            if (!isNaN(newLng)) {
                              setMapCoords([mapCoords ? mapCoords[0] : 0, newLng]);
                              setShowMarker(true);
                              onUpdateCoordenadas?.(selectedRow.codigoParada, selectedRow.latitud && selectedRow.latitud !== '-' ? selectedRow.latitud : '-', val);
                            } else if (val === '' || val === '-') {
                              onUpdateCoordenadas?.(selectedRow.codigoParada, selectedRow.latitud && selectedRow.latitud !== '-' ? selectedRow.latitud : '-', '-');
                            }
                          }}
                          className="w-full bg-[#141f33] border border-white/20 focus:border-[#4b934e] px-3 py-2 rounded-lg text-white font-mono text-sm tracking-wide focus:outline-none transition-colors"
                          placeholder="Ej: -66.9036"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta de Dirección */}
                  <div className="bg-[#0d1421] border border-white/10 rounded-xl p-5 flex-1 flex flex-col">
                    <span className="text-xs text-slate-400 uppercase tracking-wider font-bold block mb-2">Dirección Registrada</span>
                    <p className="text-slate-300 leading-relaxed text-sm flex-1">
                      {selectedRow.direccion || <span className="italic text-slate-500">Sin dirección especificada.</span>}
                    </p>
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <span className="text-[11px] text-slate-500 uppercase font-bold block mb-1">Ciudad (Origen)</span>
                      <span className="text-white font-medium">{selectedRow.ctOrigen || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Mapa */}
                <div className="col-span-1 lg:col-span-2 relative rounded-xl overflow-hidden border-2 border-white/10 bg-[#0d1421] flex flex-col">
                  {/* Buscador del Mapa */}
                  <div className="bg-[#141f33] border-b border-white/10 p-3 flex flex-col sm:flex-row gap-2 z-10 relative shrink-0">
                    <input
                      type="text"
                      placeholder="Buscar ciudad, calle o lugar (Ej: Altamira, Caracas)"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSearch(true)}
                      className="flex-1 bg-[#090d16] border border-white/20 focus:border-[#4b934e] px-3 py-2 rounded-lg text-sm text-white focus:outline-none"
                    />
                    <button
                      onClick={() => handleSearch(true)}
                      disabled={isSearching}
                      className="bg-[#4b934e] hover:bg-[#3d7840] disabled:bg-[#4b934e]/50 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                      {isSearching ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MapPin size={16} />}
                      Buscar
                    </button>
                  </div>

                  {/* Indicador de ayuda clickeable */}
                  <div className="bg-[#4b934e]/10 text-[#4b934e] border-b border-[#4b934e]/20 p-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shrink-0">
                    Haz clic en el mapa para asignar las coordenadas a esta nota
                  </div>

                  {/* Contenedor del Mapa */}
                  <div className="flex-1 relative">
                    {mapCoords && (
                      <MapWrapper 
                        lat={mapCoords[0]} 
                        lng={mapCoords[1]} 
                        zoom={mapZoom}
                        flyToCoords={flyToCoords}
                        popupTitle={selectedRow.nombreContacto || 'Punto de Entrega'}
                        popupSubtitle={selectedRow.direccion}
                        onLocationSelect={handleMapClick}
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
        <div className="bg-[#090d16] border-t border-white/5 p-4 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-semibold transition-colors bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10"
          >
            Cerrar
          </button>
          <button 
            onClick={() => {
              // Aquí en el futuro se podría agregar una notificación de éxito o lógica de guardado adicional
              onClose();
            }}
            className="bg-[#4b934e] hover:bg-[#3d7840] text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg flex items-center gap-2"
          >
            <MapPin size={16} /> Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
