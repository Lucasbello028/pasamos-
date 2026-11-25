import React from 'react';
import { ArrowRight } from 'lucide-react';
import { SafeImage } from './SafeImage';
import type { DatabaseSourceInfo, ReglasNegocio } from '../types/agro';

interface HeroSectionProps {
  reglas: ReglasNegocio;
  source: DatabaseSourceInfo;
  totalProductos: number;
  totalProveedores: number;
  onStartConsult: () => void;
  onBrowseCatalog: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  reglas,
  source,
  totalProductos,
  totalProveedores,
  onStartConsult,
  onBrowseCatalog,
}) => {
  return (
    <section className="bg-[#FFFFFF] border-b border-[#E5DEC9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between py-1">
            <div>
              <p className="text-xs font-medium tracking-wider uppercase text-[#8A7240] mb-3">
                {reglas.ubicacionPrincipal} · {reglas.monedaPredeterminada} · {source.label}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-semibold text-[#2B2B2B] leading-[1.15] tracking-tight text-balance max-w-2xl">
                Asesoría agronómica de precisión conectada a su catálogo vivo de insumos
              </h1>
              <p className="mt-4 text-[15px] sm:text-base text-[#5C564D] leading-relaxed max-w-xl">
                Consulte disponibilidad real de semillas aptas para huerta, proveedores especializados en sistemas de riego y guías técnicas de cultivo adaptadas al mercado paraguayo.
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-[#EFE9DB] flex flex-wrap items-center justify-between gap-6">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onStartConsult}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-[#2B2B2B] bg-[#D4AF37] hover:bg-[#C5A059] rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2B2B2B]"
                >
                  <span>Consultar al Asistente</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={onBrowseCatalog}
                  className="px-4 py-2.5 text-sm font-medium text-[#2B2B2B] bg-transparent hover:bg-[#F5F0EB] border border-[#D9D0BE] rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
                >
                  Explorar Catálogo
                </button>
              </div>

              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="block font-mono text-lg font-medium text-[#2B2B2B] tabular-nums">
                    {totalProductos}
                  </span>
                  <span className="text-xs text-[#666057]">Insumos activos</span>
                </div>
                <div className="h-8 w-px bg-[#E5DEC9]" aria-hidden="true" />
                <div>
                  <span className="block font-mono text-lg font-medium text-[#2B2B2B] tabular-nums">
                    {totalProveedores}
                  </span>
                  <span className="text-xs text-[#666057]">Proveedores locales</span>
                </div>
                <div className="h-8 w-px bg-[#E5DEC9]" aria-hidden="true" />
                <div>
                  <span className="block font-mono text-lg font-medium text-[#2B2B2B] tabular-nums">
                    Máx. {reglas.limiteSugerencias}
                  </span>
                  <span className="text-xs text-[#666057]">Sugerencias / consulta</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="h-64 sm:h-72 lg:h-full min-h-[260px] rounded-lg overflow-hidden border border-[#E5DEC9] bg-[#F5F0EB]">
              <SafeImage
                src="/src/assets/images/hero_agroconecta_atelier_1795625435683.jpg"
                alt="Invernadero clásico de AgroConecta AI con semillas seleccionadas, plantines de tomate y regadera de latón"
                fallbackLabel="AgroConecta AI"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
