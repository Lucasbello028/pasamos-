export type CategoriaInsumo =
  | 'Semillas'
  | 'Herramientas'
  | 'Fertilizantes'
  | 'Sistemas de Riego'
  | 'Tierras/Abonos';

export interface Proveedor {
  id: string;
  nombre: string;
  categoria_principal: string;
  ciudad: string;
  barrio: string;
  direccion: string;
  telefono: string;
  email: string;
  horario: string;
  latitud: number;
  longitud: number;
  notas?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  categoria: CategoriaInsumo;
  subtipo: string;
  proveedor_id: string;
  precio_pyg: number;
  precio_usd: number;
  unidad: string;
  stock: number;
  disponible: boolean;
  apto_huerta: boolean;
  descripcion: string;
  imagen_url?: string;
}

export interface ReglasNegocio {
  monedaPredeterminada: 'PYG' | 'USD' | 'PYG / USD';
  ubicacionPrincipal: string;
  tiposPermitidos: CategoriaInsumo[];
  limiteSugerencias: number;
}

export interface DatabaseSourceInfo {
  mode: 'supabase' | 'local';
  label: string;
  supabaseConfigured: boolean;
}

export interface AgroDatabaseSnapshot {
  proveedores: Proveedor[];
  productos: Producto[];
  reglas: ReglasNegocio;
  source: DatabaseSourceInfo;
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  payloadSnapshot?: {
    proveedoresCount: number;
    productosCount: number;
    formattedPrompt: string;
  };
  error?: boolean;
}
