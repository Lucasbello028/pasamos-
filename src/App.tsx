import { useCallback, useEffect, useRef, useState } from 'react';
import { TopBar, type ActiveTab } from './components/TopBar';
import { HeroSection } from './components/HeroSection';
import { AssistantWorkspace } from './components/AssistantWorkspace';
import { CatalogView } from './components/CatalogView';
import { SuppliersView } from './components/SuppliersView';
import { SettingsView } from './components/SettingsView';
import type { AgroDatabaseSnapshot } from './types/agro';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('asistente');
  const [snapshot, setSnapshot] = useState<AgroDatabaseSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateProductOpen, setIsCreateProductOpen] = useState(false);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState<string>(
    () => import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() || ''
  );

  const assistantInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const onQuotaExceeded = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuotaExceeded);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', onQuotaExceeded);
    };
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await fetch('/api/data');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Error al cargar la base de datos.');
      }
      setSnapshot(data as AgroDatabaseSnapshot);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'No se pudo conectar con el servidor de AgroConecta AI.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim()) {
      fetch('/api/maps-config')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.apiKey) {
            setMapsApiKey(String(data.apiKey));
          }
        })
        .catch(() => {
          // ignore maps config fetch error
        });
    }
  }, [fetchData]);

  const handleOpenNewProduct = () => {
    setActiveTab('catalogo');
    setIsCreateProductOpen(true);
  };

  const handleStartConsult = () => {
    setActiveTab('asistente');
    setTimeout(() => {
      assistantInputRef.current?.focus();
    }, 60);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F0EB] text-[#2B2B2B]">
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewProduct={handleOpenNewProduct}
      />

      {snapshot && (
        <HeroSection
          reglas={snapshot.reglas}
          source={snapshot.source}
          totalProductos={snapshot.productos.length}
          totalProveedores={snapshot.proveedores.length}
          onStartConsult={handleStartConsult}
          onBrowseCatalog={() => setActiveTab('catalogo')}
        />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        {loading && !snapshot ? (
          <div className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-lg p-12 text-center">
            <p className="font-display text-xl text-[#2B2B2B]">
              Sincronizando catálogo y proveedores...
            </p>
            <p className="text-sm text-[#666057] mt-2">
              Preparando el entorno de AgroConecta AI.
            </p>
          </div>
        ) : loadError && !snapshot ? (
          <div className="bg-[#FFFFFF] border border-[#E8C5C1] rounded-lg p-8 text-center">
            <p className="font-display text-xl text-[#8B2E24]">
              Error de conexión con el servidor
            </p>
            <p className="text-sm text-[#5C564D] mt-2">{loadError}</p>
            <button
              type="button"
              onClick={fetchData}
              className="mt-4 px-4 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2B2B2B] rounded-md"
            >
              Reintentar conexión
            </button>
          </div>
        ) : snapshot ? (
          <>
            {activeTab === 'asistente' && (
              <AssistantWorkspace
                snapshot={snapshot}
                onGoToSettings={() => setActiveTab('configuracion')}
                inputRef={assistantInputRef}
              />
            )}

            {activeTab === 'catalogo' && (
              <CatalogView
                productos={snapshot.productos}
                proveedores={snapshot.proveedores}
                reglas={snapshot.reglas}
                onRefresh={fetchData}
                isCreateOpen={isCreateProductOpen}
                onCloseCreate={() => setIsCreateProductOpen(false)}
                onOpenCreate={() => setIsCreateProductOpen(true)}
              />
            )}

            {activeTab === 'proveedores' && (
              <SuppliersView
                proveedores={snapshot.proveedores}
                productos={snapshot.productos}
                mapsApiKey={mapsApiKey}
                onRefresh={fetchData}
              />
            )}

            {activeTab === 'configuracion' && (
              <SettingsView
                reglas={snapshot.reglas}
                source={snapshot.source}
                onRefresh={fetchData}
              />
            )}
          </>
        ) : null}
      </main>

      <footer className="bg-[#FFFFFF] border-t border-[#E5DEC9] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#666057]">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold text-[#2B2B2B]">
              AgroConecta AI
            </span>
            <span aria-hidden="true">·</span>
            <span>Asesoría agronómica e insumos en Paraguay</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('asistente')}
              className="hover:text-[#2B2B2B] transition-colors"
            >
              Asistente
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('catalogo')}
              className="hover:text-[#2B2B2B] transition-colors"
            >
              Catálogo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('proveedores')}
              className="hover:text-[#2B2B2B] transition-colors"
            >
              Proveedores
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('configuracion')}
              className="hover:text-[#2B2B2B] transition-colors"
            >
              Reglas de Negocio
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
