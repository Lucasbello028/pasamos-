import { GoogleGenAI } from '@google/genai';
import type { AgroDatabaseSnapshot, ReglasNegocio } from '../src/types/agro.ts';

function buildSystemInstruction(reglas: ReglasNegocio): string {
  const tiposStr = reglas.tiposPermitidos.join(', ');
  return `Eres el asistente virtual inteligente del sistema "AgroConecta AI", una plataforma dinámicamente conectada a una base de datos PostgreSQL en Supabase. Tu objetivo es asesorar a viveros, agricultores y usuarios sobre productos agrícolas, proveedores, herramientas y técnicas de cultivo.

=== PALETA DE COLORES Y ESTILO DE LA INTERFAZ ===
* Estilo estético: Clásico, sobrio, elegante y profesional.
* Paleta visual de la web:
  - Beige/Crema (#F5F5DC / #F5F0EB)
  - Dorado (#D4AF37 / #C5A059)
  - Blanco (#FFFFFF)
  - Acentos oscuros/Texto (#2B2B2B)
* Si el usuario pregunta por la interfaz, diseño o estilo visual de la aplicación, menciona que la plataforma está diseñada con una línea estética clásica, limpia e impecable dominada por tonos beige, blanco y acabados en dorado.

=== CONEXIÓN A DATOS (SUPABASE) ===
Para responder sobre disponibilidad, stock, precios y ubicaciones, utilizas como fuente de verdad los registros dinámicos de Supabase que se te proporcionan en la consulta.
- Si el usuario pregunta por semillas, proveedores o herramientas, consulta la información del contexto (JSON de Supabase).
- Si un producto o proveedor no figura en los datos proporcionados, indica amablemente que no está registrado en el sistema actual.

=== CONSULTAS DE PRUEBA Y COMPORTAMIENTO ===
1. Semillas para huerta: Cuando pregunten "¿Qué semillas registradas son adecuadas para una huerta?", filtra y muestra únicamente las semillas registradas en la base de datos marcadas como aptas (apto_huerta: true) y disponibles (disponible: true y stock > 0), especificando precio, stock y proveedor.
2. Proveedores de riego: Cuando pregunten "¿Qué proveedores venden herramientas de riego?", busca en el catálogo los locales que tengan insumos o herramientas de categoría/tipo "Sistemas de Riego" o subtipo "Herramientas de riego" y proporciona su contacto y dirección.
3. Guías de cultivo: Cuando pregunten "¿Cómo preparo una huerta de tomates?" (o consultas similares de agronomía), brinda una explicación clara, estructurada paso a paso (preparación de suelo, siembra, riego, sol y cuidados), mencionando específicamente si dispones de semillas, sustratos o herramientas de tomate en el catálogo registrado.

=== REGLAS EDITABLES DEL NEGOCIO / CONFIGURACIÓN DE DATOS ===
[Moneda predeterminada: ${reglas.monedaPredeterminada}]
[Ubicación geográfica principal: ${reglas.ubicacionPrincipal}]
[Tipos de insumos permitidos: ${tiposStr}]
[Límite de sugerencias por consulta: Máximo ${reglas.limiteSugerencias} opciones destacadas]

Respeta estrictamente estas reglas editables al recomendar productos y mostrar precios en la moneda configurada (${reglas.monedaPredeterminada}), priorizando la ubicación (${reglas.ubicacionPrincipal}) y sin superar el límite de ${reglas.limiteSugerencias} opciones destacadas por consulta.

=== TONO Y FORMATO DE RESPUESTA ===
- Tono: Atento, formal, experto, claro y clásico.
- Usa negritas (**texto**) para destacar nombres de proveedores, precios y estados de stock.
- Utiliza listas estructuradas con viñetas (- ) o pasos numerados (1. ) para facilitar la lectura.
- Responde siempre basándote estrictamente en los datos enviados dentro de [DATOS DE SUPABASE DISPONIBLES] combinados con tu conocimiento experto en agronomía general.`;
}

export function buildStructuredPrompt(
  snapshot: AgroDatabaseSnapshot,
  userQuestion: string
): string {
  const allowedSet = new Set(snapshot.reglas.tiposPermitidos);
  const filteredProducts = snapshot.productos.filter((p) =>
    allowedSet.has(p.categoria)
  );

  const payload = {
    proveedores: snapshot.proveedores,
    productos: filteredProducts,
  };

  return `[DATOS DE SUPABASE DISPONIBLES]:
${JSON.stringify(payload, null, 2)}

[PREGUNTA DEL USUARIO]:
"${userQuestion}"`;
}

export interface AssistantHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';
const RETRY_DELAY_MS = 2000;
const MAX_RETRIES = 3;

function isServiceUnavailable503(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const record = err as { status?: number; code?: number; message?: string };
  if (record.status === 503 || record.code === 503) return true;
  const msg = String(record.message ?? '').toLowerCase();
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('high demand')
  );
}

async function generateWithRetry(
  ai: GoogleGenAI,
  model: string,
  contents: Array<{ role: string; parts: Array<{ text: string }> }>,
  systemInstruction: string
): Promise<string> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
        },
      });

      const reply = response.text?.trim();
      if (!reply) {
        throw new Error('El asistente no devolvió contenido en la respuesta.');
      }
      return reply;
    } catch (err) {
      lastError = err;
      if (isServiceUnavailable503(err) && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }
      break;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Error al consultar el modelo ${model}.`);
}

function formatGeminiErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const lower = raw.toLowerCase();

  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand')) {
    return 'Los servidores de Gemini están experimentando una alta demanda temporal (error 503) tras 3 reintentos y cambio al modelo alternativo. Por favor, intenta nuevamente en unos segundos.';
  }
  if (lower.includes('429') || lower.includes('resource_exhausted')) {
    return 'Se alcanzó el límite temporal de solicitudes de la API de Gemini (429). Verifica tu cuota o plan en Settings > Secrets.';
  }
  if (lower.includes('403') || lower.includes('permission_denied') || lower.includes('api_key_invalid')) {
    return 'La clave GEMINI_API_KEY es inválida o no tiene permisos. Verifica la clave en Settings > Secrets.';
  }
  return raw || 'Error al comunicarse con Gemini API.';
}

export async function askAgroConectaAI(
  snapshot: AgroDatabaseSnapshot,
  userQuestion: string,
  history: AssistantHistoryItem[] = []
): Promise<{ reply: string; formattedPrompt: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'No se encontró la clave GEMINI_API_KEY en el entorno del servidor. Configúrala en el panel Settings > Secrets.'
    );
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const formattedPrompt = buildStructuredPrompt(snapshot, userQuestion);
  const systemInstruction = buildSystemInstruction(snapshot.reglas);

  const contents = [
    ...history.slice(-6).map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.content }],
    })),
    {
      role: 'user',
      parts: [{ text: formattedPrompt }],
    },
  ];

  try {
    const reply = await generateWithRetry(
      ai,
      PRIMARY_MODEL,
      contents,
      systemInstruction
    );
    return { reply, formattedPrompt };
  } catch (primaryErr) {
    console.warn(
      `Modelo primario (${PRIMARY_MODEL}) falló; cambiando a fallback (${FALLBACK_MODEL}):`,
      primaryErr
    );
    try {
      const reply = await generateWithRetry(
        ai,
        FALLBACK_MODEL,
        contents,
        systemInstruction
      );
      return { reply, formattedPrompt };
    } catch (fallbackErr) {
      throw new Error(formatGeminiErrorMessage(fallbackErr));
    }
  }
}
