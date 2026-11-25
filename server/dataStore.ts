import fs from 'fs';
import path from 'path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AgroDatabaseSnapshot,
  CategoriaInsumo,
  Producto,
  Proveedor,
  ReglasNegocio,
} from '../src/types/agro.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'agroconecta-db.json');

interface PersistedState {
  proveedores: Proveedor[];
  productos: Producto[];
  reglas: ReglasNegocio;
}

const DEFAULT_REGLAS: ReglasNegocio = {
  monedaPredeterminada: 'PYG / USD',
  ubicacionPrincipal: 'Paraguay / Asunción',
  tiposPermitidos: [
    'Semillas',
    'Herramientas',
    'Fertilizantes',
    'Sistemas de Riego',
    'Tierras/Abonos',
  ],
  limiteSugerencias: 5,
};

const SEED_PROVEEDORES: Proveedor[] = [
  {
    id: 'prov-01',
    nombre: 'Vivero El Dorado Asunción',
    categoria_principal: 'Semillas, Tierras/Abonos y Plantines',
    ciudad: 'Asunción',
    barrio: 'Villa Morra',
    direccion: 'Av. Mariscal López 3420 casi Dr. Morra',
    telefono: '+595 21 604 820',
    email: 'ventas@viveroeldorado.com.py',
    horario: 'Lun a Sáb · 08:00 a 18:00',
    latitud: -25.2917,
    longitud: -57.5812,
    notas: 'Especialistas en horticultura urbana, semillas certificadas y sustratos finos.',
  },
  {
    id: 'prov-02',
    nombre: 'Riego Guaraní S.A.',
    categoria_principal: 'Sistemas de Riego y Herramientas de riego',
    ciudad: 'Asunción',
    barrio: 'Carmelitas',
    direccion: 'Av. España 1850 esquina Senador Long',
    telefono: '+595 21 612 490',
    email: 'contacto@riegoguarani.com.py',
    horario: 'Lun a Vie · 08:00 a 17:30 · Sáb · 08:30 a 12:30',
    latitud: -25.2836,
    longitud: -57.5718,
    notas: 'Asesoramiento técnico en riego por goteo, aspersión en bronce y automatización.',
  },
  {
    id: 'prov-03',
    nombre: 'Semillería Paraguaya del Sur',
    categoria_principal: 'Semillas Certificadas y Fertilizantes',
    ciudad: 'Asunción',
    barrio: 'San Pablo / Abasto',
    direccion: 'Av. Defensores del Chaco 1120',
    telefono: '+595 21 520 315',
    email: 'pedidos@semilleriadelsur.com.py',
    horario: 'Lun a Sáb · 07:00 a 17:00',
    latitud: -25.3248,
    longitud: -57.5624,
    notas: 'Distribución mayorista y minorista de variedades adaptadas al clima subtropical.',
  },
  {
    id: 'prov-04',
    nombre: 'Agroveterinaria & Huerta Villa Morra',
    categoria_principal: 'Herramientas, Riego y Semillas Orgánicas',
    ciudad: 'Asunción',
    barrio: 'Las Mercedes',
    direccion: 'Padre Cardozo 645 casi Av. España',
    telefono: '+595 981 445 210',
    email: 'asesoria@huertavillamorra.com.py',
    horario: 'Lun a Sáb · 08:30 a 18:30',
    latitud: -25.2825,
    longitud: -57.6083,
    notas: 'Herramientas de acero forjado, lanzas de riego en latón y semillas de polinización abierta.',
  },
  {
    id: 'prov-05',
    nombre: 'Tierra Fértil Central',
    categoria_principal: 'Tierras/Abonos Orgánicos y Nutrición Vegetal',
    ciudad: 'San Lorenzo / Gran Asunción',
    barrio: 'Centro',
    direccion: 'Ruta Mcal. Estigarribia Km 11.5',
    telefono: '+595 21 584 900',
    email: 'logistica@tierrafertil.com.py',
    horario: 'Lun a Sáb · 07:30 a 17:30',
    latitud: -25.3396,
    longitud: -57.5112,
    notas: 'Producción propia de humus de lombriz roja californiana y compost madurado.',
  },
];

const SEED_PRODUCTOS: Producto[] = [
  {
    id: 'prod-01',
    nombre: 'Semillas de Tomate Santa Clara',
    categoria: 'Semillas',
    subtipo: 'Semillas de Huerta · Tomate',
    proveedor_id: 'prov-01',
    precio_pyg: 18000,
    precio_usd: 2.4,
    unidad: 'Sobre 5g (~1.200 semillas)',
    stock: 48,
    disponible: true,
    apto_huerta: true,
    descripcion: 'Variedad vigorosa de fruto firme y excelente adaptación al calor húmedo de Asunción. Ideal para almácigo y trasplante.',
    imagen_url: '/src/assets/images/cat_semillas_huerta_1795625434754.jpg',
  },
  {
    id: 'prod-02',
    nombre: 'Semillas de Tomate Cherry Perita Dorado',
    categoria: 'Semillas',
    subtipo: 'Semillas de Huerta · Tomate',
    proveedor_id: 'prov-03',
    precio_pyg: 24000,
    precio_usd: 3.2,
    unidad: 'Sobre 2g (~500 semillas)',
    stock: 32,
    disponible: true,
    apto_huerta: true,
    descripcion: 'Tomate cherry dulce de alta productividad en huertas urbanas y macetas profundas con tutorado.',
    imagen_url: '/src/assets/images/cat_semillas_huerta_1795625434754.jpg',
  },
  {
    id: 'prod-03',
    nombre: 'Semillas de Lechuga Crespa Grand Rapids',
    categoria: 'Semillas',
    subtipo: 'Semillas de Huerta · Hoja Verde',
    proveedor_id: 'prov-01',
    precio_pyg: 14000,
    precio_usd: 1.85,
    unidad: 'Sobre 10g',
    stock: 65,
    disponible: true,
    apto_huerta: true,
    descripcion: 'Ciclo rápido de 45 a 55 días. Hojas tiernas resistentes al espigado prematuro en medias sombras.',
    imagen_url: '/src/assets/images/cat_semillas_huerta_1795625434754.jpg',
  },
  {
    id: 'prod-04',
    nombre: 'Semillas de Locote California Wonder',
    categoria: 'Semillas',
    subtipo: 'Semillas de Huerta · Pimiento',
    proveedor_id: 'prov-04',
    precio_pyg: 19500,
    precio_usd: 2.6,
    unidad: 'Sobre 5g',
    stock: 28,
    disponible: true,
    apto_huerta: true,
    descripcion: 'Pimiento dulce de paredes gruesas, cuatro lóbulos y excelente desempeño en tablones abonados.',
    imagen_url: '/src/assets/images/cat_semillas_huerta_1795625434754.jpg',
  },
  {
    id: 'prod-05',
    nombre: 'Semillas de Albahaca Genovesa Aromática',
    categoria: 'Semillas',
    subtipo: 'Semillas de Huerta · Aromática',
    proveedor_id: 'prov-04',
    precio_pyg: 15000,
    precio_usd: 2.0,
    unidad: 'Sobre 5g',
    stock: 40,
    disponible: true,
    apto_huerta: true,
    descripcion: 'Cultivo compañero ideal para proteger huertas de tomates contra plagas de forma natural.',
    imagen_url: '/src/assets/images/cat_semillas_huerta_1795625434754.jpg',
  },
  {
    id: 'prod-06',
    nombre: 'Semillas de Zanahoria Nantesa Mejorada',
    categoria: 'Semillas',
    subtipo: 'Semillas de Huerta · Raíz',
    proveedor_id: 'prov-03',
    precio_pyg: 16000,
    precio_usd: 2.15,
    unidad: 'Sobre 10g',
    stock: 0,
    disponible: false,
    apto_huerta: true,
    descripcion: 'Raíz cilíndrica sin corazón leñoso. Actualmente sin stock en depósito hasta la próxima reposición.',
    imagen_url: '/src/assets/images/cat_semillas_huerta_1795625434754.jpg',
  },
  {
    id: 'prod-07',
    nombre: 'Semilla de Maíz Híbrido Extensivo 20kg',
    categoria: 'Semillas',
    subtipo: 'Semilla Agrícola Extensiva',
    proveedor_id: 'prov-03',
    precio_pyg: 680000,
    precio_usd: 90.0,
    unidad: 'Bolsa 20 kg',
    stock: 15,
    disponible: true,
    apto_huerta: false,
    descripcion: 'Semilla tratada para siembra mecanizada en parcelas extensivas. No recomendada para huertas domésticas.',
    imagen_url: '/src/assets/images/cat_semillas_huerta_1795625434754.jpg',
  },
  {
    id: 'prod-08',
    nombre: 'Kit de Riego por Goteo para Huerta 25m²',
    categoria: 'Sistemas de Riego',
    subtipo: 'Herramientas de riego · Goteo',
    proveedor_id: 'prov-02',
    precio_pyg: 285000,
    precio_usd: 38.0,
    unidad: 'Kit completo (40 goteros regulables)',
    stock: 18,
    disponible: true,
    apto_huerta: true,
    descripcion: 'Incluye tubería principal de 16mm, microtubos, goteros autocompensantes y conectores de bronce. Reduce el consumo de agua en un 60%.',
    imagen_url: '/src/assets/images/cat_riego_herramientas_1795625435315.jpg',
  },
  {
    id: 'prod-09',
    nombre: 'Aspersor de Bronce Regulable 360°',
    categoria: 'Sistemas de Riego',
    subtipo: 'Herramientas de riego · Aspersión',
    proveedor_id: 'prov-02',
    precio_pyg: 135000,
    precio_usd: 18.0,
    unidad: 'Unidad rosca 1/2"',
    stock: 26,
    disponible: true,
    apto_huerta: true,
    descripcion: 'Cabezal de impacto en latón macizo resistente a la corrosión solar, con sectorización ajustable de 20° a 360°.',
    imagen_url: '/src/assets/images/cat_riego_herramientas_1795625435315.jpg',
  },
  {
    id: 'prod-10',
    nombre: 'Lanza Pistola de Riego en Latón Macizo',
    categoria: 'Sistemas de Riego',
    subtipo: 'Herramientas de riego · Manual',
    proveedor_id: 'prov-04',
    precio_pyg: 115000,
    precio_usd: 15.3,
    unidad: 'Unidad con acople rápido',
    stock: 22,
    disponible: true,
    apto_huerta: true,
    descripcion: 'Boquilla regulable de niebla fina para almácigos delicados hasta chorro direccional. Cuerpo sólido de bronce cepillado.',
    imagen_url: '/src/assets/images/cat_riego_herramientas_1795625435315.jpg',
  },
  {
    id: 'prod-11',
    nombre: 'Manguera Microperforada Exudante 30m',
    categoria: 'Sistemas de Riego',
    subtipo: 'Herramientas de riego · Exudación',
    proveedor_id: 'prov-01',
    precio_pyg: 210000,
    precio_usd: 28.0,
    unidad: 'Rollo 30 metros',
    stock: 14,
    disponible: true,
    apto_huerta: true,
    descripcion: 'Riego uniforme directamente en la zona radicular sin mojar el follaje del tomate, previniendo hongos foliares.',
    imagen_url: '/src/assets/images/cat_riego_herramientas_1795625435315.jpg',
  },
  {
    id: 'prod-12',
    nombre: 'Humus de Lombriz Orgánico Tamizado 25kg',
    categoria: 'Tierras/Abonos',
    subtipo: 'Abono Orgánico',
    proveedor_id: 'prov-05',
    precio_pyg: 75000,
    precio_usd: 10.0,
    unidad: 'Bolsa 25 kg',
    stock: 54,
    disponible: true,
    apto_huerta: true,
    descripcion: 'Enmienda biológica rica en ácidos húmicos y flora microbiana benéfica para preparar suelos de huerta.',
    imagen_url: '/src/assets/images/cat_tierras_abonos_1795625435645.jpg',
  },
  {
    id: 'prod-13',
    nombre: 'Sustrato Fértil para Almácigos 20L',
    categoria: 'Tierras/Abonos',
    subtipo: 'Sustrato Estéril',
    proveedor_id: 'prov-01',
    precio_pyg: 48000,
    precio_usd: 6.4,
    unidad: 'Bolsa 20 litros',
    stock: 38,
    disponible: true,
    apto_huerta: true,
    descripcion: 'Mezcla aireada de turba, perlita y compost maduro con pH 6.3, ideal para germinación de tomates y hortalizas.',
    imagen_url: '/src/assets/images/cat_tierras_abonos_1795625435645.jpg',
  },
  {
    id: 'prod-14',
    nombre: 'Pala de Trasplante Acero Forjado y Fresno',
    categoria: 'Herramientas',
    subtipo: 'Herramienta Manual de Huerta',
    proveedor_id: 'prov-04',
    precio_pyg: 98000,
    precio_usd: 13.0,
    unidad: 'Unidad',
    stock: 19,
    disponible: true,
    apto_huerta: true,
    descripcion: 'Hoja graduada en centímetros en acero al carbono forjado con mango ergonómico de madera de fresno tratada.',
    imagen_url: '/src/assets/images/cat_tierras_abonos_1795625435645.jpg',
  },
  {
    id: 'prod-15',
    nombre: 'Fertilizante Orgánico Rico en Potasio y Calcio 5kg',
    categoria: 'Fertilizantes',
    subtipo: 'Nutrición Floración y Fruto',
    proveedor_id: 'prov-05',
    precio_pyg: 89000,
    precio_usd: 11.85,
    unidad: 'Balde 5 kg',
    stock: 24,
    disponible: true,
    apto_huerta: true,
    descripcion: 'Formulación balanceada para prevenir pudrición apical en tomates y potenciar el cuajado de frutos.',
    imagen_url: '/src/assets/images/cat_tierras_abonos_1795625435645.jpg',
  },
];

function normalizeSecretValue(raw: string | undefined, expectedPrefix?: string): string {
  if (!raw) return '';
  let val = raw.trim().replace(/^['"]+|['"]+$/g, '');
  if (expectedPrefix && val.startsWith(`${expectedPrefix}=`)) {
    val = val.slice(expectedPrefix.length + 1).trim().replace(/^['"]+|['"]+$/g, '');
  }
  return val;
}

function resolveSupabaseUrl(rawUrl: string): string | null {
  if (!rawUrl || rawUrl.toUpperCase().startsWith('MY_')) {
    return null;
  }

  let candidate = rawUrl;
  if (/^[a-z0-9]{12,32}$/i.test(candidate)) {
    candidate = `https://${candidate}.supabase.co`;
  } else if (!/^https?:\/\//i.test(candidate) && candidate.includes('.')) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function getSupabaseClient(): { client: SupabaseClient | null; warning?: string } {
  const rawUrl =
    normalizeSecretValue(process.env.SUPABASE_URL, 'SUPABASE_URL') ||
    normalizeSecretValue(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');

  const rawKey =
    normalizeSecretValue(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY') ||
    normalizeSecretValue(process.env.SUPABASE_ANON_KEY, 'SUPABASE_ANON_KEY') ||
    normalizeSecretValue(process.env.SUPABASE_PUBLISHABLE_KEY, 'SUPABASE_PUBLISHABLE_KEY') ||
    normalizeSecretValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ||
    normalizeSecretValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (!rawUrl || !rawKey) {
    return { client: null };
  }

  const resolvedUrl = resolveSupabaseUrl(rawUrl);
  if (!resolvedUrl) {
    return {
      client: null,
      warning: 'URL de Supabase inválida en Secrets; usando base local.',
    };
  }

  try {
    const client = createClient(resolvedUrl, rawKey, {
      auth: { persistSession: false },
    });
    return { client };
  } catch {
    return {
      client: null,
      warning: 'No se pudo inicializar cliente Supabase; usando base local.',
    };
  }
}

function withDefaultCoordinates(proveedores: Proveedor[]): Proveedor[] {
  const seedById: Record<string, { latitud: number; longitud: number }> = {};
  for (const s of SEED_PROVEEDORES) {
    seedById[s.id] = { latitud: s.latitud, longitud: s.longitud };
  }
  return proveedores.map((p, idx) => {
    const hasLat = typeof p.latitud === 'number' && Number.isFinite(p.latitud);
    const hasLng = typeof p.longitud === 'number' && Number.isFinite(p.longitud);
    if (hasLat && hasLng) return p;
    const fallback = seedById[p.id] ?? {
      latitud: -25.2968 + idx * 0.005,
      longitud: -57.585 + idx * 0.005,
    };
    return {
      ...p,
      latitud: hasLat ? p.latitud : fallback.latitud,
      longitud: hasLng ? p.longitud : fallback.longitud,
    };
  });
}

function ensureLocalDataFile(): PersistedState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initial: PersistedState = {
      proveedores: SEED_PROVEEDORES,
      productos: SEED_PRODUCTOS,
      reglas: DEFAULT_REGLAS,
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const parsed = JSON.parse(raw) as PersistedState;
  parsed.proveedores = withDefaultCoordinates(parsed.proveedores);
  return parsed;
}

function saveLocalDataFile(state: PersistedState): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export async function getDatabaseSnapshot(): Promise<AgroDatabaseSnapshot> {
  const local = ensureLocalDataFile();
  const { client: supabase, warning } = getSupabaseClient();

  if (supabase) {
    try {
      const [provRes, prodRes] = await Promise.all([
        supabase.from('proveedores').select('*').order('nombre', { ascending: true }),
        supabase.from('productos').select('*').order('nombre', { ascending: true }),
      ]);

      if (!provRes.error && !prodRes.error) {
        let proveedores = withDefaultCoordinates((provRes.data ?? []) as Proveedor[]);
        let productos = (prodRes.data ?? []) as Producto[];

        if (proveedores.length === 0 && productos.length === 0) {
          const seedProv = await supabase.from('proveedores').insert(local.proveedores).select();
          const seedProd = await supabase.from('productos').insert(local.productos).select();
          if (!seedProv.error && seedProv.data) {
            proveedores = withDefaultCoordinates(seedProv.data as Proveedor[]);
          }
          if (!seedProd.error && seedProd.data) {
            productos = seedProd.data as Producto[];
          }
        }

        if (proveedores.length > 0 || productos.length > 0) {
          return {
            proveedores,
            productos,
            reglas: local.reglas,
            source: {
              mode: 'supabase',
              label: 'PostgreSQL en Supabase (En vivo)',
              supabaseConfigured: true,
            },
          };
        }
      }
    } catch (err) {
      console.warn('Supabase fallback to local persistent store:', err);
    }
  }

  return {
    proveedores: local.proveedores,
    productos: local.productos,
    reglas: local.reglas,
    source: {
      mode: 'local',
      label: warning
        ? warning
        : supabase
        ? 'Almacenamiento local sincronizado (tablas Supabase pendientes)'
        : 'Base de datos local persistente (esquema Supabase)',
      supabaseConfigured: Boolean(supabase),
    },
  };
}

export async function createProducto(
  input: Omit<Producto, 'id'>
): Promise<Producto> {
  const newProd: Producto = {
    ...input,
    id: `prod-${Date.now().toString(36)}`,
    disponible: input.stock > 0 ? input.disponible : false,
  };

  const { client: supabase } = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('productos')
      .insert([newProd])
      .select()
      .single();
    if (!error && data) {
      return data as Producto;
    }
  }

  const state = ensureLocalDataFile();
  state.productos.unshift(newProd);
  saveLocalDataFile(state);
  return newProd;
}

export async function updateProducto(
  id: string,
  patch: Partial<Producto>
): Promise<Producto | null> {
  const { client: supabase } = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('productos')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      return data as Producto;
    }
  }

  const state = ensureLocalDataFile();
  const idx = state.productos.findIndex((p) => p.id === id);
  if (idx === -1) return null;

  const updated: Producto = {
    ...state.productos[idx],
    ...patch,
  };
  if (typeof patch.stock === 'number' && patch.stock <= 0) {
    updated.disponible = false;
  }
  state.productos[idx] = updated;
  saveLocalDataFile(state);
  return updated;
}

export async function deleteProducto(id: string): Promise<boolean> {
  const { client: supabase } = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.from('productos').delete().eq('id', id);
    if (!error) {
      return true;
    }
  }

  const state = ensureLocalDataFile();
  const next = state.productos.filter((p) => p.id !== id);
  if (next.length === state.productos.length) return false;
  state.productos = next;
  saveLocalDataFile(state);
  return true;
}

export async function createProveedor(
  input: Omit<Proveedor, 'id'>
): Promise<Proveedor> {
  const newProv: Proveedor = {
    ...input,
    id: `prov-${Date.now().toString(36)}`,
  };

  const { client: supabase } = getSupabaseClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('proveedores')
      .insert([newProv])
      .select()
      .single();
    if (!error && data) {
      return data as Proveedor;
    }
  }

  const state = ensureLocalDataFile();
  state.proveedores.push(newProv);
  saveLocalDataFile(state);
  return newProv;
}

export async function updateReglasNegocio(
  patch: Partial<ReglasNegocio>
): Promise<ReglasNegocio> {
  const state = ensureLocalDataFile();
  const validCategories: CategoriaInsumo[] = [
    'Semillas',
    'Herramientas',
    'Fertilizantes',
    'Sistemas de Riego',
    'Tierras/Abonos',
  ];

  const tiposPermitidos = Array.isArray(patch.tiposPermitidos)
    ? patch.tiposPermitidos.filter((c): c is CategoriaInsumo => validCategories.includes(c))
    : state.reglas.tiposPermitidos;

  const limite =
    typeof patch.limiteSugerencias === 'number'
      ? Math.min(5, Math.max(1, Math.round(patch.limiteSugerencias)))
      : state.reglas.limiteSugerencias;

  state.reglas = {
    monedaPredeterminada: patch.monedaPredeterminada ?? state.reglas.monedaPredeterminada,
    ubicacionPrincipal: patch.ubicacionPrincipal?.trim() || state.reglas.ubicacionPrincipal,
    tiposPermitidos: tiposPermitidos.length > 0 ? tiposPermitidos : state.reglas.tiposPermitidos,
    limiteSugerencias: limite,
  };
  saveLocalDataFile(state);
  return state.reglas;
}
