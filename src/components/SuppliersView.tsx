import React, { useMemo, useRef, useState } from 'react';
import { Mail, MapPin, Phone, Plus } from 'lucide-react';
import { SuppliersMap } from './SuppliersMap';
import type { Producto, Proveedor } from '../types/agro';

interface SuppliersViewProps {
  proveedores: Proveedor[];
  productos: Producto[];
  mapsApiKey: string;
  onRefresh: () => Promise<void>;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  proveedores,
  productos,
  mapsApiKey,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    proveedores[0]?.id ?? null
  );
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState({
    nombre: '',
    categoria_principal: 'Semillas y Vivero',
    ciudad: 'Asunción',
    barrio: '',
    direccion: '',
    telefono: '',
    email: '',
    horario: 'Lun a Sáb · 08:00 a 18:00',
    latitud: '-25.2968',
    longitud: '-57.5850',
    notas: '',
  });

  const productCountByProvider = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of productos) {
      counts[p.proveedor_id] = (counts[p.proveedor_id] || 0) + 1;
    }
    return counts;
  }, [productos]);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return proveedores;
    return proveedores.filter((prov) =>
      [
        prov.nombre,
        prov.categoria_principal,
        prov.ciudad,
        prov.barrio,
        prov.direccion,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [proveedores, search]);

  const handleFocusOnMap = (id: string) => {
    setSelectedSupplierId(id);
    mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.nombre.trim() || !form.direccion.trim() || !form.telefono.trim()) {
      setError('Nombre, dirección y teléfono son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          latitud: Number(form.latitud),
          longitud: Number(form.longitud),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo registrar el proveedor.');
      }
      await onRefresh();
      setSelectedSupplierId(data.id);
      setShowModal(false);
      setForm({
        nombre: '',
        categoria_principal: 'Semillas y Vivero',
        ciudad: 'Asunción',
        barrio: '',
        direccion: '',
        telefono: '',
        email: '',
        horario: 'Lun a Sáb · 08:00 a 18:00',
        latitud: '-25.2968',
        longitud: '-57.5850',
        notas: '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-lg p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-[#2B2B2B]">
            Directorio y Mapa de Proveedores
          </h2>
          <p className="text-sm text-[#666057] mt-1">
            {proveedores.length} establecimientos verificados con coordenadas, contacto e insumos en Paraguay
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nombre, barrio o rubro..."
            aria-label="Filtrar proveedores"
            className="w-full sm:w-64 px-3.5 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded-md focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
          />
          <button
            type="button"
            onClick={() => {
              setError(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#2B2B2B] bg-[#D4AF37] hover:bg-[#C5A059] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Registrar Proveedor</span>
          </button>
        </div>
      </div>

      <div ref={mapContainerRef}>
        <SuppliersMap
          apiKey={mapsApiKey}
          proveedores={filteredSuppliers}
          productos={productos}
          selectedSupplierId={selectedSupplierId}
          onSelectSupplier={setSelectedSupplierId}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredSuppliers.map((prov) => {
          const itemCount = productCountByProvider[prov.id] || 0;
          const isSelected = selectedSupplierId === prov.id;
          return (
            <article
              key={prov.id}
              className={`bg-[#FFFFFF] border rounded-lg p-6 flex flex-col justify-between transition-colors ${
                isSelected ? 'border-[#C5A059]' : 'border-[#E5DEC9]'
              }`}
            >
              <div>
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-xs font-medium text-[#8A7240]">
                    {prov.ciudad} · {prov.barrio}
                  </span>
                  <span className="font-mono text-xs text-[#666057] tabular-nums shrink-0">
                    {itemCount} {itemCount === 1 ? 'insumo' : 'insumos'}
                  </span>
                </div>

                <h3 className="font-display text-xl font-semibold text-[#2B2B2B] mt-1.5">
                  {prov.nombre}
                </h3>

                <p className="text-sm font-medium text-[#4A453E] mt-1">
                  {prov.categoria_principal}
                </p>

                {prov.notas && (
                  <p className="text-sm text-[#5C564D] mt-2.5 leading-relaxed">
                    {prov.notas}
                  </p>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-[#EFE9DB] space-y-3">
                <dl className="space-y-2 text-sm text-[#38342E]">
                  <div className="flex items-start gap-2.5">
                    <MapPin
                      className="w-4 h-4 text-[#8A7240] shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <span>{prov.direccion}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone
                      className="w-4 h-4 text-[#8A7240] shrink-0"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-xs tabular-nums">
                      {prov.telefono}
                    </span>
                    <span className="text-[#666057] text-xs">· {prov.horario}</span>
                  </div>
                  {prov.email && (
                    <div className="flex items-center gap-2.5">
                      <Mail
                        className="w-4 h-4 text-[#8A7240] shrink-0"
                        aria-hidden="true"
                      />
                      <span className="text-xs text-[#5C564D]">{prov.email}</span>
                    </div>
                  )}
                </dl>

                <div className="pt-2 flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono text-[11px] text-[#666057] tabular-nums">
                    {prov.latitud.toFixed(4)}, {prov.longitud.toFixed(4)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleFocusOnMap(prov.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                      isSelected
                        ? 'bg-[#2B2B2B] text-[#FFFFFF] border-[#2B2B2B]'
                        : 'bg-[#FAF7F2] text-[#2B2B2B] border-[#D9D0BE] hover:border-[#C5A059]'
                    }`}
                  >
                    {isSelected ? 'Seleccionado en mapa' : 'Ver en mapa'}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Registrar nuevo proveedor"
          className="fixed inset-0 z-50 bg-[#2B2B2B]/50 flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#EFE9DB] flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-[#2B2B2B]">
                Registrar Nuevo Proveedor
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-xs font-medium text-[#666057] hover:text-[#2B2B2B]"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded bg-[#FDF4F3] border border-[#E8C5C1] text-xs text-[#8B2E24]">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                  Nombre comercial o razón social
                </label>
                <input
                  type="text"
                  required
                  value={form.nombre}
                  onChange={(e) => setForm((s) => ({ ...s, nombre: e.target.value }))}
                  placeholder="Ej. Vivero Botánico Luque"
                  className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                  Especialidad / Rubro principal
                </label>
                <input
                  type="text"
                  value={form.categoria_principal}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, categoria_principal: e.target.value }))
                  }
                  placeholder="Ej. Sistemas de Riego y Herramientas de riego"
                  className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={form.ciudad}
                    onChange={(e) => setForm((s) => ({ ...s, ciudad: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                    Barrio / Zona
                  </label>
                  <input
                    type="text"
                    value={form.barrio}
                    onChange={(e) => setForm((s) => ({ ...s, barrio: e.target.value }))}
                    placeholder="Ej. Villa Morra"
                    className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                  Dirección exacta
                </label>
                <input
                  type="text"
                  required
                  value={form.direccion}
                  onChange={(e) => setForm((s) => ({ ...s, direccion: e.target.value }))}
                  placeholder="Av. España 1234"
                  className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                    Latitud
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={form.latitud}
                    onChange={(e) => setForm((s) => ({ ...s, latitud: e.target.value }))}
                    className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                    Longitud
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={form.longitud}
                    onChange={(e) => setForm((s) => ({ ...s, longitud: e.target.value }))}
                    className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                    Teléfono de contacto
                  </label>
                  <input
                    type="text"
                    required
                    value={form.telefono}
                    onChange={(e) => setForm((s) => ({ ...s, telefono: e.target.value }))}
                    placeholder="+595 21 000 000"
                    className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    placeholder="contacto@vivero.com.py"
                    className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                  Notas comerciales
                </label>
                <textarea
                  rows={2}
                  value={form.notas}
                  onChange={(e) => setForm((s) => ({ ...s, notas: e.target.value }))}
                  className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                />
              </div>

              <div className="pt-4 border-t border-[#EFE9DB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-[#5C564D] border border-[#D9D0BE] rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2B2B2B] hover:bg-[#3F3B36] disabled:opacity-50 rounded-md"
                >
                  {saving ? 'Registrando...' : 'Guardar proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
