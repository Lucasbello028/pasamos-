import React, { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { SafeImage } from './SafeImage';
import type {
  CategoriaInsumo,
  Producto,
  Proveedor,
  ReglasNegocio,
} from '../types/agro';

interface CatalogViewProps {
  productos: Producto[];
  proveedores: Proveedor[];
  reglas: ReglasNegocio;
  onRefresh: () => Promise<void>;
  isCreateOpen: boolean;
  onCloseCreate: () => void;
  onOpenCreate: () => void;
}

const ALL_CATEGORIES: CategoriaInsumo[] = [
  'Semillas',
  'Sistemas de Riego',
  'Herramientas',
  'Tierras/Abonos',
  'Fertilizantes',
];

function getDefaultImageForCategory(categoria: CategoriaInsumo): string {
  switch (categoria) {
    case 'Semillas':
      return '/src/assets/images/cat_semillas_huerta_1795625434754.jpg';
    case 'Sistemas de Riego':
      return '/src/assets/images/cat_riego_herramientas_1795625435315.jpg';
    case 'Herramientas':
    case 'Tierras/Abonos':
    case 'Fertilizantes':
    default:
      return '/src/assets/images/cat_tierras_abonos_1795625435645.jpg';
  }
}

function formatPyg(value: number): string {
  return `${new Intl.NumberFormat('es-PY').format(value)} PYG`;
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)} USD`;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  productos,
  proveedores,
  reglas,
  onRefresh,
  isCreateOpen,
  onCloseCreate,
  onOpenCreate,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'Todas' | CategoriaInsumo>('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyGarden, setOnlyGarden] = useState(false);
  const [currencyView, setCurrencyView] = useState<'PYG' | 'USD' | 'PYG / USD'>(
    reglas.monedaPredeterminada
  );
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formState, setFormState] = useState<{
    nombre: string;
    categoria: CategoriaInsumo;
    subtipo: string;
    proveedor_id: string;
    precio_pyg: string;
    precio_usd: string;
    unidad: string;
    stock: string;
    disponible: boolean;
    apto_huerta: boolean;
    descripcion: string;
  }>({
    nombre: '',
    categoria: 'Semillas',
    subtipo: 'Semillas de Huerta',
    proveedor_id: proveedores[0]?.id || '',
    precio_pyg: '20000',
    precio_usd: '2.70',
    unidad: 'Sobre 5g',
    stock: '25',
    disponible: true,
    apto_huerta: true,
    descripcion: '',
  });

  const providerMap = useMemo(() => {
    const map = new Map<string, Proveedor>();
    proveedores.forEach((p) => map.set(p.id, p));
    return map;
  }, [proveedores]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return productos.filter((prod) => {
      if (selectedCategory !== 'Todas' && prod.categoria !== selectedCategory) {
        return false;
      }
      if (onlyAvailable && (!prod.disponible || prod.stock <= 0)) {
        return false;
      }
      if (onlyGarden && !prod.apto_huerta) {
        return false;
      }
      if (q) {
        const prov = providerMap.get(prod.proveedor_id);
        const haystack = [
          prod.nombre,
          prod.categoria,
          prod.subtipo,
          prod.descripcion,
          prov?.nombre || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [productos, selectedCategory, onlyAvailable, onlyGarden, searchQuery, providerMap]);

  const openEditModal = (product: Producto) => {
    setEditingProduct(product);
    setFormError(null);
    setFormState({
      nombre: product.nombre,
      categoria: product.categoria,
      subtipo: product.subtipo,
      proveedor_id: product.proveedor_id,
      precio_pyg: String(product.precio_pyg),
      precio_usd: String(product.precio_usd),
      unidad: product.unidad,
      stock: String(product.stock),
      disponible: product.disponible,
      apto_huerta: product.apto_huerta,
      descripcion: product.descripcion,
    });
  };

  const resetCreateForm = () => {
    setFormError(null);
    setFormState({
      nombre: '',
      categoria: 'Semillas',
      subtipo: 'Semillas de Huerta',
      proveedor_id: proveedores[0]?.id || '',
      precio_pyg: '22000',
      precio_usd: '2.95',
      unidad: 'Sobre 5g',
      stock: '30',
      disponible: true,
      apto_huerta: true,
      descripcion: '',
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formState.nombre.trim() || !formState.proveedor_id) {
      setFormError('Complete el nombre del producto y seleccione un proveedor.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nombre: formState.nombre.trim(),
        categoria: formState.categoria,
        subtipo: formState.subtipo.trim() || formState.categoria,
        proveedor_id: formState.proveedor_id,
        precio_pyg: Number(formState.precio_pyg) || 0,
        precio_usd: Number(formState.precio_usd) || 0,
        unidad: formState.unidad.trim() || 'Unidad',
        stock: Math.max(0, Number(formState.stock) || 0),
        disponible: formState.disponible && Number(formState.stock) > 0,
        apto_huerta: formState.apto_huerta,
        descripcion: formState.descripcion.trim(),
        imagen_url: getDefaultImageForCategory(formState.categoria),
      };

      const url = editingProduct
        ? `/api/productos/${editingProduct.id}`
        : '/api/productos';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Error al guardar el producto.');
      }

      await onRefresh();
      setEditingProduct(null);
      onCloseCreate();
      resetCreateForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await onRefresh();
      }
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  const handleToggleStock = async (product: Producto) => {
    const nextDisponible = !product.disponible;
    const nextStock = nextDisponible && product.stock === 0 ? 15 : product.stock;
    await fetch(`/api/productos/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        disponible: nextDisponible,
        stock: nextStock,
      }),
    });
    await onRefresh();
  };

  const showModal = isCreateOpen || editingProduct !== null;

  return (
    <div className="space-y-6">
      <div className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#EFE9DB]">
          <div>
            <h2 className="font-display text-2xl font-semibold text-[#2B2B2B]">
              Catálogo Dinámico de Insumos
            </h2>
            <p className="text-sm text-[#666057] mt-1">
              Inventario sincronizado con el asistente inteligente ·{' '}
              {filteredProducts.length} de {productos.length} insumos mostrados
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-[#F5F0EB] border border-[#E5DEC9] rounded-md">
              {(['PYG', 'USD', 'PYG / USD'] as const).map((curr) => (
                <button
                  key={curr}
                  type="button"
                  onClick={() => setCurrencyView(curr)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    currencyView === curr
                      ? 'bg-[#FFFFFF] text-[#2B2B2B] border border-[#D4AF37]/60'
                      : 'text-[#666057] hover:text-[#2B2B2B]'
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                resetCreateForm();
                onOpenCreate();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#2B2B2B] bg-[#D4AF37] hover:bg-[#C5A059] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Nuevo Insumo</span>
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setSelectedCategory('Todas')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === 'Todas'
                  ? 'bg-[#2B2B2B] text-[#FFFFFF]'
                  : 'bg-[#FAF7F2] text-[#5C564D] hover:text-[#2B2B2B] border border-[#E5DEC9]'
              }`}
            >
              Todas
            </button>
            {ALL_CATEGORIES.map((cat) => {
              const isPermitted = reglas.tiposPermitidos.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#2B2B2B] text-[#FFFFFF]'
                      : 'bg-[#FAF7F2] text-[#5C564D] hover:text-[#2B2B2B] border border-[#E5DEC9]'
                  } ${!isPermitted ? 'opacity-60' : ''}`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search
                className="w-4 h-4 text-[#8C8478] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar semilla, riego o proveedor..."
                aria-label="Buscar en catálogo"
                className="w-full pl-9 pr-3 py-1.5 text-sm text-[#2B2B2B] bg-[#FAF7F2] border border-[#D9D0BE] rounded-md focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-xs text-[#2B2B2B] cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="accent-[#C5A059] w-4 h-4"
              />
              <span>Solo en stock</span>
            </label>

            <label className="inline-flex items-center gap-2 text-xs text-[#2B2B2B] cursor-pointer select-none whitespace-nowrap">
              <input
                type="checkbox"
                checked={onlyGarden}
                onChange={(e) => setOnlyGarden(e.target.checked)}
                className="accent-[#C5A059] w-4 h-4"
              />
              <span>Aptos para huerta</span>
            </label>
          </div>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-lg p-12 text-center">
          <h3 className="font-display text-xl font-semibold text-[#2B2B2B]">
            No hay insumos que coincidan con el filtro actual
          </h3>
          <p className="text-sm text-[#666057] mt-2">
            Ajuste los criterios de búsqueda o registre un nuevo producto en el catálogo.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('Todas');
              setSearchQuery('');
              setOnlyAvailable(false);
              setOnlyGarden(false);
            }}
            className="mt-4 px-4 py-2 text-xs font-medium text-[#2B2B2B] border border-[#D9D0BE] rounded hover:bg-[#FAF7F2] transition-colors"
          >
            Restablecer filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((prod) => {
            const prov = providerMap.get(prod.proveedor_id);
            const inStock = prod.disponible && prod.stock > 0;
            const imgSrc =
              prod.imagen_url || getDefaultImageForCategory(prod.categoria);

            return (
              <article
                key={prod.id}
                className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-lg overflow-hidden flex flex-col justify-between transition-transform duration-150 hover:-translate-y-0.5"
              >
                <div>
                  <div className="aspect-[4/3] w-full bg-[#FAF7F2] border-b border-[#EFE9DB] overflow-hidden">
                    <SafeImage
                      src={imgSrc}
                      alt={prod.nombre}
                      fallbackLabel={prod.categoria}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-5">
                    <div className="flex items-center gap-1.5 text-xs text-[#666057]">
                      <span className="font-medium text-[#8A7240]">{prod.categoria}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{prod.subtipo}</span>
                      {prod.apto_huerta && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="shrink-0">Apta huerta</span>
                        </>
                      )}
                    </div>

                    <h3 className="font-display text-lg font-semibold text-[#2B2B2B] mt-1.5 leading-snug">
                      {prod.nombre}
                    </h3>

                    <p className="text-sm text-[#5C564D] mt-2 leading-relaxed line-clamp-2">
                      {prod.descripcion}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 border-t border-[#EFE9DB] space-y-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <div>
                      {(currencyView === 'PYG' || currencyView === 'PYG / USD') && (
                        <span className="block font-mono text-base font-semibold text-[#2B2B2B] tabular-nums">
                          {formatPyg(prod.precio_pyg)}
                        </span>
                      )}
                      {(currencyView === 'USD' || currencyView === 'PYG / USD') && (
                        <span className="block font-mono text-xs text-[#666057] tabular-nums">
                          {formatUsd(prod.precio_usd)}
                        </span>
                      )}
                      <span className="text-xs text-[#666057]">{prod.unidad}</span>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-semibold tabular-nums ${
                          inStock ? 'text-[#2E5A36]' : 'text-[#8B2E24]'
                        }`}
                      >
                        {inStock ? `Disponible · ${prod.stock} u.` : 'Sin stock'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F4EFE4] flex items-center justify-between gap-2 text-xs text-[#5C564D]">
                    <span className="truncate font-medium text-[#2B2B2B]">
                      {prov ? prov.nombre : 'Proveedor local'}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleStock(prod)}
                        className="px-2 py-1 text-xs font-medium text-[#5C564D] hover:text-[#2B2B2B] hover:bg-[#F5F0EB] rounded transition-colors"
                      >
                        {inStock ? 'Pausar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(prod)}
                        aria-label={`Editar ${prod.nombre}`}
                        className="p-1.5 text-[#5C564D] hover:text-[#2B2B2B] hover:bg-[#F5F0EB] rounded transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(prod.id)}
                        aria-label={`Eliminar ${prod.nombre}`}
                        className="p-1.5 text-[#8B2E24] hover:bg-[#FDF4F3] rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={editingProduct ? 'Editar insumo' : 'Registrar nuevo insumo'}
          className="fixed inset-0 z-50 bg-[#2B2B2B]/50 flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-[#EFE9DB] flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold text-[#2B2B2B]">
                {editingProduct ? 'Editar Insumo Agrícola' : 'Registrar Nuevo Insumo'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  onCloseCreate();
                }}
                className="text-xs font-medium text-[#666057] hover:text-[#2B2B2B]"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded bg-[#FDF4F3] border border-[#E8C5C1] text-xs text-[#8B2E24]">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                  Nombre del producto
                </label>
                <input
                  type="text"
                  required
                  value={formState.nombre}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, nombre: e.target.value }))
                  }
                  placeholder="Ej. Semillas de Tomate Platense"
                  className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                    Categoría
                  </label>
                  <select
                    value={formState.categoria}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        categoria: e.target.value as CategoriaInsumo,
                      }))
                    }
                    className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                  >
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                    Subtipo / Especialidad
                  </label>
                  <input
                    type="text"
                    value={formState.subtipo}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, subtipo: e.target.value }))
                    }
                    placeholder="Ej. Herramientas de riego"
                    className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                  Proveedor registrado
                </label>
                <select
                  value={formState.proveedor_id}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, proveedor_id: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                >
                  {proveedores.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} ({p.ciudad})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                    Precio (PYG)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formState.precio_pyg}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, precio_pyg: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                    Precio (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formState.precio_usd}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, precio_usd: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                    Stock disponible
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formState.stock}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, stock: e.target.value }))
                    }
                    className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                  Presentación / Unidad
                </label>
                <input
                  type="text"
                  value={formState.unidad}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, unidad: e.target.value }))
                  }
                  placeholder="Ej. Sobre 5g, Bolsa 25 kg"
                  className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                  Descripción agronómica
                </label>
                <textarea
                  rows={2}
                  value={formState.descripcion}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, descripcion: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#D9D0BE] rounded focus:outline-none focus:bg-[#FFFFFF] focus:border-[#C5A059]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="inline-flex items-center gap-2 text-sm text-[#2B2B2B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.disponible}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, disponible: e.target.checked }))
                    }
                    className="accent-[#C5A059] w-4 h-4"
                  />
                  <span>Disponible para venta</span>
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-[#2B2B2B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formState.apto_huerta}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, apto_huerta: e.target.checked }))
                    }
                    className="accent-[#C5A059] w-4 h-4"
                  />
                  <span>Apto para huerta familiar</span>
                </label>
              </div>

              <div className="pt-4 border-t border-[#EFE9DB] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    onCloseCreate();
                  }}
                  className="px-4 py-2 text-xs font-medium text-[#5C564D] hover:text-[#2B2B2B] border border-[#D9D0BE] rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-semibold text-[#FFFFFF] bg-[#2B2B2B] hover:bg-[#3F3B36] disabled:opacity-50 rounded-md"
                >
                  {saving ? 'Guardando...' : 'Guardar en catálogo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
