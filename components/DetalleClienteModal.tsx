"use client";

import { useState, useEffect } from 'react';
import { LayoutList, Settings, X, CheckCircle, AlertCircle, Send, Building } from 'lucide-react';

/**
 * Estructura de datos que recibe el modal (correspondiente a un cliente de la tabla de Profit 2k12)
 */
export interface ClienteModalData {
  CODIGO: string;
  RIF: string;
  DESCRIPCION: string;
  'DIRECCION FISCAL': string;
  'DIRECCION DE ENTREGA': string;
  COORDENADAS?: string;
}

interface DetalleClienteModalProps {
  selectedClient: ClienteModalData | null;
  onClose: () => void;
}

/**
 * Componente Modal para mostrar el detalle de un cliente de Profit y gestionar sus configuraciones,
 * como la solicitud de actualización de coordenadas geográficas en el sistema local.
 */
export default function DetalleClienteModal({ selectedClient, onClose }: DetalleClienteModalProps) {
  const [activeTab, setActiveTab] = useState<'detalles' | 'configuracion'>('detalles');
  const [coordenadaPropuesta, setCoordenadaPropuesta] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Sincronizar el campo de texto y reiniciar mensajes al cambiar o abrir el cliente
  useEffect(() => {
    if (selectedClient) {
      setActiveTab('detalles');
      setCoordenadaPropuesta('');
      setSuccessMessage('');
      setErrorMessage('');
    }
  }, [selectedClient]);

  if (!selectedClient) return null;

  const tieneCoordenadaValida = selectedClient.COORDENADAS && 
    selectedClient.COORDENADAS.trim() !== '' && 
    selectedClient.COORDENADAS.trim() !== '-' && 
    selectedClient.COORDENADAS.trim().toUpperCase() !== 'NULL' && 
    selectedClient.COORDENADAS.trim() !== '0' && 
    selectedClient.COORDENADAS.trim() !== '0, 0';

  /**
   * Manejador del envío de la nueva propuesta de coordenada hacia la API de almacenamiento local
   */
  const handleEnviarSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!coordenadaPropuesta.trim()) {
      setErrorMessage('Por favor ingresa una coordenada válida en el campo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const direccionPrincipal = selectedClient['DIRECCION DE ENTREGA'] || selectedClient['DIRECCION FISCAL'] || '';
      
      const payload = {
        codigo_cliente: selectedClient.CODIGO,
        rif_cliente: selectedClient.RIF,
        descripcion_cliente: selectedClient.DESCRIPCION,
        direccion_cliente: direccionPrincipal,
        coordenada_original: tieneCoordenadaValida ? selectedClient.COORDENADAS : '',
        coordenada_propuesta: coordenadaPropuesta.trim(),
        status_solicitud: 'PENDIENTE'
      };

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const res = await fetch(`${basePath}/api/solicitudes-coordenadas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setSuccessMessage('¡Solicitud de cambio de coordenada enviada con éxito! Queda registrada en estado PENDIENTE para aprobación administrativa.');
        setCoordenadaPropuesta('');
      } else {
        setErrorMessage(json.message || 'Error al enviar la solicitud al servidor.');
      }
    } catch (err) {
      console.error('Error enviando solicitud de coordenadas:', err);
      setErrorMessage('Error de conexión al intentar comunicar con el servidor.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#090d16]/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out] p-4" 
      onClick={onClose}
    >
      <div
        className="bg-[#141f33] w-full max-w-[900px] h-auto max-h-[85vh] rounded-xl border border-[#4b934e]/30 shadow-2xl flex flex-col overflow-hidden animate-[scaleIn_0.2s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Encabezado del Modal */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-[#0d1421] rounded-t-xl shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
            <Building className="text-[#4b934e] h-6 w-6 shrink-0" />
            <span className="text-[#4b934e]">Detalle de Cliente</span>
            <span className="bg-[#4b934e]/20 text-[#4b934e] font-mono text-xs sm:text-sm px-3 py-1 rounded-full border border-[#4b934e]/30">
              {selectedClient.CODIGO}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white bg-white/5 hover:bg-[#ff4d4f]/20 hover:border-[#ff4d4f]/50 border border-transparent rounded-lg p-2 transition-colors"
            aria-label="Cerrar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Pestañas de navegación interna (Tabs) */}
        <div className="flex px-6 border-b border-white/5 shrink-0 bg-[#0d1421]/50">
          <button
            onClick={() => setActiveTab('detalles')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all relative ${
              activeTab === 'detalles'
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
            onClick={() => setActiveTab('configuracion')}
            className={`flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all relative ${
              activeTab === 'configuracion'
                ? 'text-[#4b934e] bg-white/5'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Settings size={18} />
            Configuración de Clientes
            {activeTab === 'configuracion' && (
              <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#4b934e] shadow-[0_-2px_8px_rgba(75,147,78,0.5)]"></span>
            )}
          </button>
        </div>

        {/* Contenedor con scroll para las pestañas */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#141f33] relative">
          
          {/* Vista 1: Datos Generales */}
          {activeTab === 'detalles' && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="bg-[#090d16]/60 p-4 rounded-lg border border-white/5 flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Código del Cliente</span>
                  <p className="text-white font-mono font-semibold text-lg">{selectedClient.CODIGO}</p>
                </div>

                <div className="bg-[#090d16]/60 p-4 rounded-lg border border-white/5 flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">RIF / Identificación Fiscal</span>
                  <p className="text-white font-mono font-semibold text-lg">{selectedClient.RIF}</p>
                </div>

                <div className="md:col-span-2 bg-[#090d16]/60 p-4 rounded-lg border border-white/5 flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-[#4b934e] uppercase tracking-wider">Descripción / Razón Social</span>
                  <p className="text-white font-bold text-xl">{selectedClient.DESCRIPCION}</p>
                </div>

                <div className="bg-[#090d16]/60 p-4 rounded-lg border border-white/5 flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dirección Fiscal</span>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-normal break-words">
                    {selectedClient['DIRECCION FISCAL'] || <span className="italic text-slate-500">No especificada en sistema</span>}
                  </p>
                </div>

                <div className="bg-[#090d16]/60 p-4 rounded-lg border border-white/5 flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dirección de Entrega</span>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-normal break-words">
                    {selectedClient['DIRECCION DE ENTREGA'] || <span className="italic text-slate-500">No especificada en sistema</span>}
                  </p>
                </div>

                <div className="md:col-span-2 bg-[#090d16]/60 p-4 rounded-lg border border-[#4b934e]/30 flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-[#4b934e] uppercase tracking-wider">Coordenada Geográfica Actual (Campo direc2)</span>
                  <p className="text-white font-mono font-bold text-base">
                    {tieneCoordenadaValida ? (
                      selectedClient.COORDENADAS
                    ) : (
                      <span className="text-slate-500 font-sans italic font-normal">No tiene coordinates asociadas en este momento.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Vista 2: Configuración de Clientes */}
          {activeTab === 'configuracion' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-[fadeIn_0.3s_ease-out]">
              
              <div className="bg-[#090d16]/80 p-5 rounded-xl border border-white/10 space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Settings className="text-[#4b934e] w-5 h-5" />
                  Solicitud de Modificación de Coordenadas
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para modificar o agregar la posición de este cliente en el mapa y en DispatchTrack, ingresa las nuevas coordenadas en el campo de texto. Esta solicitud será enviada al servidor en estado <span className="text-[#4b934e] font-bold">PENDIENTE</span> y será revisada posteriormente en el panel administrativo.
                </p>
              </div>

              {/* Información actual vs propuesta */}
              <form onSubmit={handleEnviarSolicitud} className="space-y-6">
                
                <div className="bg-[#0d1421]/70 p-4 rounded-lg border border-white/5">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Coordenada Original en Sistema
                  </label>
                  <div className="text-sm font-mono font-semibold text-slate-300">
                    {tieneCoordenadaValida ? (
                      selectedClient.COORDENADAS
                    ) : (
                      <span className="italic text-slate-500 font-sans">Sin coordenada inicial</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="nueva-coordenada" className="block text-xs font-bold text-[#4b934e] uppercase tracking-wider">
                    Nueva Coordenada Propuesta (Latitud, Longitud) *
                  </label>
                  <input
                    id="nueva-coordenada"
                    type="text"
                    value={coordenadaPropuesta}
                    onChange={(e) => setCoordenadaPropuesta(e.target.value)}
                    placeholder="Ejemplo: 10.504899, -66.891986"
                    disabled={isSubmitting}
                    className="w-full bg-[#090d16] border border-white/20 focus:border-[#4b934e] px-4 py-3 rounded-xl text-white font-mono text-sm placeholder-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-[#4b934e]/30 shadow-inner"
                  />
                  <p className="text-[11px] text-slate-500">
                    Introduce la latitud y longitud separadas por una coma. No se guardará directamente en Profit hasta ser aprobada por el administrador.
                  </p>
                </div>

                {/* Mensajes de feedback */}
                {successMessage && (
                  <div className="bg-[#4b934e]/15 border border-[#4b934e]/50 text-[#4b934e] p-4 rounded-xl flex items-start gap-3 text-sm font-medium">
                    <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="bg-[#ff4d4f]/15 border border-[#ff4d4f]/50 text-[#ff4d4f] p-4 rounded-xl flex items-start gap-3 text-sm font-medium">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !coordenadaPropuesta.trim()}
                    className="bg-[#4b934e] hover:bg-[#3d7840] disabled:bg-[#2a3a52] disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(75,147,78,0.3)] hover:shadow-[0_0_25px_rgba(75,147,78,0.5)] disabled:shadow-none flex items-center gap-2 text-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando Solicitud...
                      </>
                    ) : (
                      <>
                        <Send size={16} />
                        Enviar Solicitud al Sistema
                      </>
                    )}
                  </button>
                </div>

              </form>

            </div>
          )}

        </div>

        {/* Pie de página con botón de cierre */}
        <div className="px-6 py-4 bg-[#0d1421] border-t border-white/5 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white font-semibold text-sm px-6 py-2 rounded-lg transition-colors"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
}
