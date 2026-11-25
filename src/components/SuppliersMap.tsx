/// <reference types="google.maps" />
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  AdvancedMarker,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
  useApiIsLoaded,
  useApiLoadingStatus,
  APILoadingStatus,
  useMap,
} from '@vis.gl/react-google-maps';
import { Mail, MapPin, Package, Phone } from 'lucide-react';
import type { Producto, Proveedor } from '../types/agro';

interface SuppliersMapProps {
  apiKey: string;
  proveedores: Proveedor[];
  productos: Producto[];
  selectedSupplierId: string | null;
  onSelectSupplier: (id: string | null) => void;
}

const DEFAULT_CENTER = { lat: -25.302, lng: -57.568 };
const Z_INDEX_SELECTED = 1000;
const Z_INDEX_HOVER = 999;

interface MarkerWithRefProps {
  proveedor: Proveedor;
  isSelected: boolean;
  isHovered: boolean;
  zIndex: number;
  onMarkerClick: (
    proveedorId: string,
    marker: google.maps.marker.AdvancedMarkerElement
  ) => void;
  onMarkerHover: (proveedorId: string | null) => void;
  onRegisterMarker: (
    proveedorId: string,
    marker: google.maps.marker.AdvancedMarkerElement | null
  ) => void;
}

const ProviderAdvancedMarker: React.FC<MarkerWithRefProps> = ({
  proveedor,
  isSelected,
  isHovered,
  zIndex,
  onMarkerClick,
  onMarkerHover,
  onRegisterMarker,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();

  useEffect(() => {
    onRegisterMarker(proveedor.id, marker);
    return () => {
      onRegisterMarker(proveedor.id, null);
    };
  }, [proveedor.id, marker, onRegisterMarker]);

  return (
    <AdvancedMarker
      ref={markerRef}
      position={{ lat: proveedor.latitud, lng: proveedor.longitud }}
      title={`${proveedor.nombre} — ${proveedor.direccion}`}
      zIndex={isSelected ? Z_INDEX_SELECTED : isHovered ? Z_INDEX_HOVER : zIndex}
      onClick={() => {
        if (marker) {
          onMarkerClick(proveedor.id, marker);
        }
      }}
      onMouseEnter={() => onMarkerHover(proveedor.id)}
      onMouseLeave={() => onMarkerHover(null)}
    >
      <Pin
        background={isSelected ? '#2B2B2B' : '#D4AF37'}
        borderColor={isSelected ? '#D4AF37' : '#2B2B2B'}
        glyphColor={isSelected ? '#D4AF37' : '#2B2B2B'}
        scale={isSelected ? 1.22 : isHovered ? 1.12 : 1.0}
      />
    </AdvancedMarker>
  );
};

interface InnerMapContentProps {
  proveedores: Proveedor[];
  productsByProvider: Record<string, Producto[]>;
  selectedSupplierId: string | null;
  onSelectSupplier: (id: string | null) => void;
}

const InnerMapContent: React.FC<InnerMapContentProps> = ({
  proveedores,
  productsByProvider,
  selectedSupplierId,
  onSelectSupplier,
}) => {
  const map = useMap();
  const isLoaded = useApiIsLoaded();
  const status = useApiLoadingStatus();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [markerInstances, setMarkerInstances] = useState<
    Record<string, google.maps.marker.AdvancedMarkerElement | null>
  >({});

  const registerMarker = useCallback(
    (
      id: string,
      marker: google.maps.marker.AdvancedMarkerElement | null
    ) => {
      setMarkerInstances((prev) => {
        if (prev[id] === marker) return prev;
        return { ...prev, [id]: marker };
      });
    },
    []
  );

  const sortedProviders = useMemo(() => {
    return [...proveedores]
      .filter(
        (p) =>
          typeof p.latitud === 'number' &&
          Number.isFinite(p.latitud) &&
          typeof p.longitud === 'number' &&
          Number.isFinite(p.longitud)
      )
      .sort((a, b) => b.latitud - a.latitud);
  }, [proveedores]);

  useEffect(() => {
    if (!map || !selectedSupplierId) return;
    const found = sortedProviders.find((p) => p.id === selectedSupplierId);
    if (found) {
      map.panTo({ lat: found.latitud, lng: found.longitud });
      const currentZoom = map.getZoom();
      if (typeof currentZoom === 'number' && currentZoom < 13) {
        map.setZoom(13);
      }
    }
  }, [map, selectedSupplierId, sortedProviders]);

  const selectedProveedor = useMemo(
    () => sortedProviders.find((p) => p.id === selectedSupplierId) || null,
    [sortedProviders, selectedSupplierId]
  );

  const selectedMarker = selectedSupplierId
    ? markerInstances[selectedSupplierId] ?? null
    : null;

  const selectedProducts = selectedProveedor
    ? productsByProvider[selectedProveedor.id] || []
    : [];

  if (
    status === APILoadingStatus.FAILED ||
    status === APILoadingStatus.AUTH_FAILURE
  ) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF7F2] text-center p-6">
        <p className="font-display text-lg font-semibold text-[#2B2B2B]">
          No fue posible cargar Google Maps
        </p>
        <p className="text-xs text-[#666057] mt-1.5 max-w-md">
          Verifique su conexión de red o que la clave de Google Maps JavaScript API tenga permisos para este dominio.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {!isLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#FAF7F2]/90 text-xs text-[#666057]">
          Cargando mapa interactivo de proveedores...
        </div>
      )}

      <GoogleMap
        mapId="DEMO_MAP_ID"
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={12}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        style={{ width: '100%', height: '100%' }}
      >
        {sortedProviders.map((prov, index) => (
          <ProviderAdvancedMarker
            key={prov.id}
            proveedor={prov}
            isSelected={selectedSupplierId === prov.id}
            isHovered={hoverId === prov.id}
            zIndex={index}
            onMarkerClick={(id) => onSelectSupplier(id)}
            onMarkerHover={setHoverId}
            onRegisterMarker={registerMarker}
          />
        ))}

        {selectedProveedor && selectedMarker && (
          <InfoWindow
            anchor={selectedMarker}
            pixelOffset={[0, -4]}
            maxWidth={320}
            onCloseClick={() => onSelectSupplier(null)}
          >
            <div className="p-1 text-[#2B2B2B] font-sans max-w-[290px]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A7240]">
                {selectedProveedor.ciudad} · {selectedProveedor.barrio}
              </p>
              <h4 className="font-display text-base font-semibold text-[#2B2B2B] mt-0.5 leading-snug">
                {selectedProveedor.nombre}
              </h4>
              <p className="text-xs text-[#5C564D] mt-1">
                {selectedProveedor.direccion}
              </p>
              <p className="text-xs font-mono text-[#2B2B2B] mt-1 tabular-nums">
                {selectedProveedor.telefono}
              </p>
              {selectedProveedor.email && (
                <p className="text-[11px] text-[#666057] truncate">
                  {selectedProveedor.email}
                </p>
              )}

              <div className="mt-2.5 pt-2 border-t border-[#E5DEC9]">
                <p className="text-[11px] font-semibold text-[#2B2B2B] mb-1">
                  Insumos registrados ({selectedProducts.length}):
                </p>
                {selectedProducts.length === 0 ? (
                  <p className="text-[11px] text-[#666057]">
                    Sin productos cargados aún.
                  </p>
                ) : (
                  <ul className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {selectedProducts.slice(0, 5).map((prod) => (
                      <li
                        key={prod.id}
                        className="text-[11px] text-[#38342E] flex items-baseline justify-between gap-2"
                      >
                        <span className="truncate">{prod.nombre}</span>
                        <span className="font-mono text-[10px] text-[#8A7240] shrink-0 tabular-nums">
                          {new Intl.NumberFormat('es-PY').format(prod.precio_pyg)} PYG
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export const SuppliersMap: React.FC<SuppliersMapProps> = ({
  apiKey,
  proveedores,
  productos,
  selectedSupplierId,
  onSelectSupplier,
}) => {
  const productsByProvider = useMemo(() => {
    const grouped: Record<string, Producto[]> = {};
    for (const prod of productos) {
      if (!grouped[prod.proveedor_id]) {
        grouped[prod.proveedor_id] = [];
      }
      grouped[prod.proveedor_id].push(prod);
    }
    return grouped;
  }, [productos]);

  const selectedProveedor = useMemo(
    () => proveedores.find((p) => p.id === selectedSupplierId) || proveedores[0] || null,
    [proveedores, selectedSupplierId]
  );

  const selectedProducts = selectedProveedor
    ? productsByProvider[selectedProveedor.id] || []
    : [];

  return (
    <section className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-[#EFE9DB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-semibold text-[#2B2B2B]">
            Mapa Interactivo de Proveedores
          </h3>
          <p className="text-xs text-[#666057] mt-0.5">
            Seleccione un marcador dorado para consultar dirección, contacto e insumos disponibles
          </p>
        </div>
        <span className="font-mono text-xs text-[#8A7240] tabular-nums">
          {proveedores.length} ubicaciones en Paraguay
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
        <div className="lg:col-span-8 h-[360px] sm:h-[420px] lg:h-[480px] bg-[#FAF7F2] border-b lg:border-b-0 lg:border-r border-[#EFE9DB]">
          {!apiKey ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
              <MapPin className="w-7 h-7 text-[#C5A059] mb-2" aria-hidden="true" />
              <p className="font-display text-lg font-semibold text-[#2B2B2B]">
                Clave de Google Maps pendiente
              </p>
              <p className="text-xs text-[#666057] mt-1 max-w-md">
                Configure <code className="font-mono">VITE_GOOGLE_MAPS_API_KEY</code> en sus variables de entorno para visualizar el mapa interactivo.
              </p>
            </div>
          ) : (
            <APIProvider
              apiKey={apiKey}
              libraries={['marker']}
              language="es"
              region="PY"
            >
              <InnerMapContent
                proveedores={proveedores}
                productsByProvider={productsByProvider}
                selectedSupplierId={selectedSupplierId}
                onSelectSupplier={onSelectSupplier}
              />
            </APIProvider>
          )}
        </div>

        <div className="lg:col-span-4 p-5 bg-[#FAF7F2] flex flex-col justify-between">
          {selectedProveedor ? (
            <div className="space-y-4">
              <div className="pb-3 border-b border-[#E5DEC9]">
                <p className="text-xs font-medium text-[#8A7240]">
                  {selectedSupplierId ? 'Proveedor seleccionado' : 'Proveedor destacado'} ·{' '}
                  {selectedProveedor.ciudad}
                </p>
                <h4 className="font-display text-lg font-semibold text-[#2B2B2B] mt-1">
                  {selectedProveedor.nombre}
                </h4>
                <p className="text-xs text-[#5C564D] mt-0.5">
                  {selectedProveedor.categoria_principal}
                </p>
              </div>

              <dl className="space-y-2 text-xs text-[#38342E]">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#8A7240] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    {selectedProveedor.direccion} ({selectedProveedor.barrio})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#8A7240] shrink-0" aria-hidden="true" />
                  <span className="font-mono tabular-nums">{selectedProveedor.telefono}</span>
                </div>
                {selectedProveedor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#8A7240] shrink-0" aria-hidden="true" />
                    <span className="truncate">{selectedProveedor.email}</span>
                  </div>
                )}
              </dl>

              <div className="pt-3 border-t border-[#E5DEC9]">
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B2B2B]">
                    <Package className="w-3.5 h-3.5 text-[#8A7240]" aria-hidden="true" />
                    <span>Productos asociados</span>
                  </span>
                  <span className="font-mono text-xs text-[#666057] tabular-nums">
                    {selectedProducts.length}
                  </span>
                </div>

                {selectedProducts.length === 0 ? (
                  <p className="text-xs text-[#666057]">
                    No hay insumos registrados para este proveedor.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedProducts.map((prod) => (
                      <li
                        key={prod.id}
                        className="p-2.5 rounded bg-[#FFFFFF] border border-[#E5DEC9] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[#2B2B2B] truncate">
                            {prod.nombre}
                          </p>
                          <p className="text-[11px] text-[#666057]">
                            {prod.categoria} ·{' '}
                            {prod.disponible && prod.stock > 0
                              ? `${prod.stock} en stock`
                              : 'Sin stock'}
                          </p>
                        </div>
                        <span className="font-mono text-xs font-medium text-[#2B2B2B] shrink-0 tabular-nums">
                          {new Intl.NumberFormat('es-PY').format(prod.precio_pyg)} PYG
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#666057]">
              No hay proveedores registrados para mostrar en el mapa.
            </p>
          )}

          <div className="mt-4 pt-3 border-t border-[#E5DEC9] flex flex-wrap gap-1.5">
            {proveedores.map((p) => {
              const active = selectedSupplierId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectSupplier(p.id)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap truncate max-w-[160px] ${
                    active
                      ? 'bg-[#2B2B2B] text-[#FFFFFF] border-[#2B2B2B]'
                      : 'bg-[#FFFFFF] text-[#2B2B2B] border-[#D9D0BE] hover:border-[#C5A059]'
                  }`}
                >
                  {p.nombre}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
