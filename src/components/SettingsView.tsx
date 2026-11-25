import React, { useState } from 'react';
import { Check, Copy, Database, Save } from 'lucide-react';
import type {
  CategoriaInsumo,
  DatabaseSourceInfo,
  ReglasNegocio,
} from '../types/agro';

interface SettingsViewProps {
  reglas: ReglasNegocio;
  source: DatabaseSourceInfo;
  onRefresh: () => Promise<void>;
}

const ALL_CATEGORIES: CategoriaInsumo[] = [
  'Semillas',
  'Herramientas',
  'Fertilizantes',
  'Sistemas de Riego',
  'Tierras/Abonos',
];

const SUPABASE_SQL_SCHEMA = `-- Esquema PostgreSQL para Supabase (AgroConecta AI)
CREATE TABLE IF NOT EXISTS proveedores (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria_principal TEXT NOT NULL,
  ciudad TEXT NOT NULL DEFAULT 'Asunción',
  barrio TEXT NOT NULL DEFAULT '',
  direccion TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT DEFAULT '',
  horario TEXT DEFAULT '',
  latitud DOUBLE PRECISION DEFAULT -25.2968,
  longitud DOUBLE PRECISION DEFAULT -57.5850,
  notas TEXT DEFAULT ''
);

ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS latitud DOUBLE PRECISION DEFAULT -25.2968;
ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS longitud DOUBLE PRECISION DEFAULT -57.5850;

CREATE TABLE IF NOT EXISTS productos (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN (
    'Semillas', 'Herramientas', 'Fertilizantes', 'Sistemas de Riego', 'Tierras/Abonos'
  )),
  subtipo TEXT NOT NULL,
  proveedor_id TEXT REFERENCES proveedores(id) ON DELETE CASCADE,
  precio_pyg NUMERIC NOT NULL DEFAULT 0,
  precio_usd NUMERIC NOT NULL DEFAULT 0,
  unidad TEXT NOT NULL DEFAULT 'Unidad',
  stock INTEGER NOT NULL DEFAULT 0,
  disponible BOOLEAN NOT NULL DEFAULT TRUE,
  apto_huerta BOOLEAN NOT NULL DEFAULT FALSE,
  descripcion TEXT DEFAULT '',
  imagen_url TEXT DEFAULT ''
);`;

export const SettingsView: React.FC<SettingsViewProps> = ({
  reglas,
  source,
  onRefresh,
}) => {
  const [moneda, setMoneda] = useState<ReglasNegocio['monedaPredeterminada']>(
    reglas.monedaPredeterminada
  );
  const [ubicacion, setUbicacion] = useState(reglas.ubicacionPrincipal);
  const [tipos, setTipos] = useState<CategoriaInsumo[]>(reglas.tiposPermitidos);
  const [limite, setLimite] = useState(reglas.limiteSugerencias);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const toggleTipo = (cat: CategoriaInsumo) => {
    setTipos((prev) => {
      if (prev.includes(cat)) {
        return prev.length > 1 ? prev.filter((c) => c !== cat) : prev;
      }
      return [...prev, cat];
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    try {
      const res = await fetch('/api/reglas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monedaPredeterminada: moneda,
          ubicacionPrincipal: ubicacion,
          tiposPermitidos: tipos,
          limiteSugerencias: limite,
        }),
      });
      if (res.ok) {
        await onRefresh();
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <form
        onSubmit={handleSave}
        className="lg:col-span-7 bg-[#FFFFFF] border border-[#E5DEC9] rounded-lg p-6 space-y-6"
      >
        <div className="pb-4 border-b border-[#EFE9DB]">
          <h2 className="font-display text-2xl font-semibold text-[#2B2B2B]">
            Reglas Editables del Negocio
          </h2>
          <p className="text-sm text-[#666057] mt-1">
            Estas directivas ajustan el comportamiento, filtrado de catálogo y moneda del asistente AgroConecta AI.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="rule-currency"
              className="block text-xs font-semibold text-[#2B2B2B] mb-1.5"
            >
              Moneda predeterminada
            </label>
            <select
              id="rule-currency"
              value={moneda}
              onChange={(e) =>
                setMoneda(e.target.value as ReglasNegocio['monedaPredeterminada'])
              }
              className="w-full px-3.5 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded-md focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
            >
              <option value="PYG / USD">Guaraníes (PYG) / USD</option>
              <option value="PYG">Solo Guaraníes (PYG)</option>
              <option value="USD">Solo Dólares (USD)</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="rule-location"
              className="block text-xs font-semibold text-[#2B2B2B] mb-1.5"
            >
              Ubicación geográfica principal
            </label>
            <input
              id="rule-location"
              type="text"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded-md focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
            />
          </div>
        </div>

        <div>
          <span className="block text-xs font-semibold text-[#2B2B2B] mb-2">
            Tipos de insumos permitidos en recomendaciones
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ALL_CATEGORIES.map((cat) => {
              const checked = tipos.includes(cat);
              return (
                <label
                  key={cat}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md border text-sm cursor-pointer transition-colors ${
                    checked
                      ? 'bg-[#FAF7F2] border-[#C5A059] text-[#2B2B2B] font-medium'
                      : 'bg-[#FFFFFF] border-[#E5DEC9] text-[#666057]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTipo(cat)}
                    className="accent-[#C5A059] w-4 h-4"
                  />
                  <span>{cat}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="rule-limit"
              className="text-xs font-semibold text-[#2B2B2B]"
            >
              Límite de sugerencias por consulta
            </label>
            <span className="font-mono text-sm font-semibold text-[#2B2B2B] tabular-nums">
              Máximo {limite} opciones destacadas
            </span>
          </div>
          <input
            id="rule-limit"
            type="range"
            min={3}
            max={5}
            step={1}
            value={limite}
            onChange={(e) => setLimite(Number(e.target.value))}
            className="w-full accent-[#C5A059]"
          />
          <div className="flex justify-between text-[11px] font-mono text-[#666057] mt-1">
            <span>3 opciones</span>
            <span>4 opciones</span>
            <span>5 opciones</span>
          </div>
        </div>

        <div className="pt-4 border-t border-[#EFE9DB] flex items-center justify-between gap-4">
          <div className="text-xs text-[#2E5A36] font-medium">
            {savedNotice && 'Reglas actualizadas y aplicadas al asistente.'}
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-[#FFFFFF] bg-[#2B2B2B] hover:bg-[#3F3B36] disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            <span>{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
          </button>
        </div>
      </form>

      <div className="lg:col-span-5 bg-[#FFFFFF] border border-[#E5DEC9] rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#EFE9DB]">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#8A7240]" aria-hidden="true" />
            <h3 className="font-display text-lg font-semibold text-[#2B2B2B]">
              Arquitectura PostgreSQL / Supabase
            </h3>
          </div>
          <span className="font-mono text-xs text-[#666057]">
            {source.mode === 'supabase' ? 'En vivo' : 'Local'}
          </span>
        </div>

        <p className="text-xs text-[#5C564D] leading-relaxed">
          Estado actual: <strong className="text-[#2B2B2B]">{source.label}</strong>.
          Cuando las variables de entorno <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> y{' '}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> (o{' '}
          <code className="font-mono">SUPABASE_URL</code> /{' '}
          <code className="font-mono">SUPABASE_ANON_KEY</code>) están definidas en{' '}
          <strong>Settings &gt; Secrets</strong> con las tablas siguientes, las consultas leen y escriben directamente en PostgreSQL.
        </p>

        <div className="relative">
          <button
            type="button"
            onClick={handleCopySql}
            className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-[#2B2B2B] bg-[#FFFFFF] border border-[#D9D0BE] rounded hover:bg-[#F5F0EB]"
          >
            {copiedSql ? (
              <>
                <Check className="w-3 h-3 text-[#2E5A36]" aria-hidden="true" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" aria-hidden="true" />
                <span>Copiar SQL</span>
              </>
            )}
          </button>

          <pre className="p-4 pt-10 rounded bg-[#FAF7F2] border border-[#EFE9DB] font-mono text-[11px] leading-relaxed text-[#38342E] overflow-x-auto">
            {SUPABASE_SQL_SCHEMA}
          </pre>
        </div>
      </div>
    </div>
  );
};
