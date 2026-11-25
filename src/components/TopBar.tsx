import React from 'react';

export type ActiveTab = 'asistente' | 'catalogo' | 'proveedores' | 'configuracion';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenNewProduct: () => void;
}

const NAV_ITEMS: { id: ActiveTab; label: string }[] = [
  { id: 'asistente', label: 'Asistente' },
  { id: 'catalogo', label: 'Catálogo' },
  { id: 'proveedores', label: 'Proveedores' },
  { id: 'configuracion', label: 'Configuración' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewProduct,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 backdrop-blur-sm border-b border-[#E5DEC9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onSelectTab('asistente')}
          className="font-display text-xl font-semibold tracking-tight text-[#2B2B2B] whitespace-nowrap shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] rounded-sm"
        >
          AgroConecta AI
        </button>

        <nav
          aria-label="Navegación principal"
          className="hidden md:flex items-center gap-7"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-2 text-sm font-medium transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059] rounded-sm ${
                  isActive
                    ? 'text-[#2B2B2B]'
                    : 'text-[#666057] hover:text-[#2B2B2B]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C5A059]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenNewProduct}
            className="px-4 py-2 text-xs font-semibold tracking-wide text-[#FFFFFF] bg-[#2B2B2B] hover:bg-[#3F3B36] border border-[#2B2B2B] rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
          >
            Registrar Insumo
          </button>
        </div>
      </div>

      <nav
        aria-label="Navegación móvil"
        className="md:hidden border-t border-[#EFE9DB] px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto bg-[#FAF7F2]"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-[#FFFFFF] text-[#2B2B2B] border border-[#D4AF37]/60'
                  : 'text-[#666057] hover:text-[#2B2B2B]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
