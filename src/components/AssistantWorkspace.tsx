import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Code2,
  Database,
  RotateCcw,
  SendHorizontal,
  SlidersHorizontal,
} from 'lucide-react';
import { FormattedMessage } from './FormattedMessage';
import type {
  AgroDatabaseSnapshot,
  ChatTurn,
} from '../types/agro';

interface AssistantWorkspaceProps {
  snapshot: AgroDatabaseSnapshot;
  onGoToSettings: () => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

const SAMPLE_QUESTIONS = [
  '¿Qué semillas registradas son adecuadas para una huerta?',
  '¿Qué proveedores venden herramientas de riego?',
  '¿Cómo preparo una huerta de tomates?',
  '¿Cuál es el estilo visual de la plataforma?',
];

export const AssistantWorkspace: React.FC<AssistantWorkspaceProps> = ({
  snapshot,
  onGoToSettings,
  inputRef,
}) => {
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: 'welcome',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      content:
        'Bienvenido a **AgroConecta AI**. Estoy conectado en tiempo real al catálogo de **proveedores** e **insumos agrícolas** de la plataforma.\n\nPuedo ayudarle con:\n- Filtrado de **semillas aptas para huerta** con precios y stock vigentes.\n- Búsqueda de **proveedores de sistemas y herramientas de riego** con dirección y contacto.\n- Guías agronómicas paso a paso vinculadas a los insumos disponibles en nuestra base de datos.',
    },
  ]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPayloadModal, setShowPayloadModal] = useState(false);
  const [selectedPayload, setSelectedPayload] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendQuestion = async (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed || isLoading) return;

    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const historyForApi = messages
      .filter((m) => m.id !== 'welcome' && !m.error)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userTurn]);
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          history: historyForApi,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data?.error || 'No se pudo obtener respuesta del asistente.'
        );
      }

      const assistantTurn: ChatTurn = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        timestamp: data.timestamp || new Date().toISOString(),
        payloadSnapshot: data.payloadSnapshot,
      };
      setMessages((prev) => [...prev, assistantTurn]);
    } catch (err) {
      const errorTurn: ChatTurn = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        error: true,
        timestamp: new Date().toISOString(),
        content:
          err instanceof Error
            ? err.message
            : 'Ocurrió un error al consultar el servicio de inteligencia artificial.',
      };
      setMessages((prev) => [...prev, errorTurn]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(question);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(question);
    }
  };

  const handleReset = () => {
    setMessages((prev) => [prev[0]]);
  };

  const allowedSet = new Set(snapshot.reglas.tiposPermitidos);
  const activeProducts = snapshot.productos.filter((p) =>
    allowedSet.has(p.categoria)
  );
  const latestPayload = [...messages]
    .reverse()
    .find((m) => m.payloadSnapshot)?.payloadSnapshot;

  const previewJson = JSON.stringify(
    {
      proveedores: snapshot.proveedores.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        ciudad: p.ciudad,
        direccion: p.direccion,
        telefono: p.telefono,
      })),
      productos: activeProducts.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        categoria: p.categoria,
        precio_pyg: p.precio_pyg,
        stock: p.stock,
        disponible: p.disponible,
        apto_huerta: p.apto_huerta,
      })),
    },
    null,
    2
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#E5DEC9] rounded-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-[#EFE9DB] flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-[#2B2B2B]">
              Asistente Agronómico AgroConecta
            </h2>
            <p className="text-xs text-[#666057] mt-0.5">
              Respuestas fundamentadas en el catálogo activo y conocimientos de agronomía
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5C564D] hover:text-[#2B2B2B] hover:bg-[#F5F0EB] border border-[#E5DEC9] rounded transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Nueva conversación</span>
          </button>
        </div>

        <div className="px-6 py-3 bg-[#FAF7F2] border-b border-[#EFE9DB]">
          <p className="text-xs font-medium text-[#666057] mb-2">
            Consultas frecuentes de verificación:
          </p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((sample) => (
              <button
                key={sample}
                type="button"
                disabled={isLoading}
                onClick={() => sendQuestion(sample)}
                className="px-3 py-1.5 text-xs font-medium text-[#2B2B2B] bg-[#FFFFFF] hover:bg-[#F5F5DC] border border-[#DFD6C3] hover:border-[#C5A059] rounded transition-colors duration-150 text-left disabled:opacity-50"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 space-y-6 min-h-[420px] max-h-[600px] overflow-y-auto bg-[#FFFFFF]">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-[#666057] mb-1.5">
                <span className="font-medium text-[#2B2B2B]">
                  {msg.role === 'user' ? 'Usted' : 'AgroConecta AI'}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {new Date(msg.timestamp).toLocaleTimeString('es-PY', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {msg.error ? (
                <div className="w-full max-w-2xl p-4 rounded-md bg-[#FDF4F3] border border-[#E8C5C1] text-[#8B2E24] flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="text-sm leading-relaxed">
                    <p className="font-semibold">No fue posible completar la consulta</p>
                    <p className="mt-1">{msg.content}</p>
                  </div>
                </div>
              ) : msg.role === 'user' ? (
                <div className="max-w-xl px-4 py-3 rounded-lg bg-[#2B2B2B] text-[#FFFFFF] text-[15px] leading-relaxed">
                  {msg.content}
                </div>
              ) : (
                <div className="w-full max-w-2xl px-5 py-4 rounded-lg bg-[#FAF7F2] border border-[#E8E1D1]">
                  <FormattedMessage content={msg.content} />
                  {msg.payloadSnapshot && (
                    <div className="mt-4 pt-3 border-t border-[#E8E1D1] flex flex-wrap items-center justify-between gap-2 text-xs text-[#666057]">
                      <span>
                        Contexto consultado: {msg.payloadSnapshot.proveedoresCount} proveedores ·{' '}
                        {msg.payloadSnapshot.productosCount} productos
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPayload(msg.payloadSnapshot!.formattedPrompt);
                          setShowPayloadModal(true);
                        }}
                        className="inline-flex items-center gap-1 font-medium text-[#8A7240] hover:text-[#2B2B2B] transition-colors"
                      >
                        <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Ver mensaje enviado al modelo</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium text-[#2B2B2B] mb-1.5">
                AgroConecta AI
              </span>
              <div className="px-5 py-4 rounded-lg bg-[#FAF7F2] border border-[#E8E1D1] text-sm text-[#666057]">
                Consultando inventario en tiempo real y elaborando recomendación agronómica...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 bg-[#FAF7F2] border-t border-[#E5DEC9]"
        >
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1">
              <label htmlFor="agro-question-input" className="sr-only">
                Escriba su consulta agronómica o de catálogo
              </label>
              <textarea
                id="agro-question-input"
                ref={inputRef}
                rows={2}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunte por semillas aptas para huerta, proveedores de riego o preparación de cultivos..."
                className="w-full px-3.5 py-2.5 text-sm text-[#2B2B2B] placeholder:text-[#8C8478] bg-[#FFFFFF] border border-[#D9D0BE] rounded-md focus:outline-none focus:border-[#C5A059] focus:ring-2 focus:ring-[#C5A059]/25 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !question.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 h-[42px] text-sm font-semibold text-[#FFFFFF] bg-[#2B2B2B] hover:bg-[#3F3B36] disabled:opacity-45 rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
            >
              <span>Enviar consulta</span>
              <SendHorizontal className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>

      <aside className="lg:col-span-4 space-y-6">
        <div className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-lg p-6">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#EFE9DB]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#8A7240]" aria-hidden="true" />
              <h3 className="font-display text-lg font-semibold text-[#2B2B2B]">
                Reglas Activas del Sistema
              </h3>
            </div>
            <button
              type="button"
              onClick={onGoToSettings}
              className="text-xs font-medium text-[#8A7240] hover:text-[#2B2B2B] underline underline-offset-4 whitespace-nowrap shrink-0"
            >
              Editar
            </button>
          </div>

          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[#666057]">Moneda predeterminada</dt>
              <dd className="font-mono text-xs font-medium text-[#2B2B2B]">
                {snapshot.reglas.monedaPredeterminada}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[#666057]">Ubicación principal</dt>
              <dd className="font-medium text-[#2B2B2B] text-right">
                {snapshot.reglas.ubicacionPrincipal}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-[#666057]">Límite de sugerencias</dt>
              <dd className="font-mono text-xs font-medium text-[#2B2B2B] tabular-nums">
                Máx. {snapshot.reglas.limiteSugerencias} opciones
              </dd>
            </div>
            <div className="pt-2 border-t border-[#EFE9DB]">
              <dt className="text-[#666057] mb-1.5">Categorías habilitadas</dt>
              <dd className="text-xs text-[#2B2B2B] leading-relaxed">
                {snapshot.reglas.tiposPermitidos.join(' · ')}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-lg p-6">
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-[#EFE9DB]">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#8A7240]" aria-hidden="true" />
              <h3 className="font-display text-lg font-semibold text-[#2B2B2B]">
                Contexto de Supabase
              </h3>
            </div>
            <span className="font-mono text-xs text-[#666057] tabular-nums">
              {snapshot.source.mode === 'supabase' ? 'Supabase Live' : 'Esquema Local'}
            </span>
          </div>

          <p className="mt-3 text-xs text-[#5C564D] leading-relaxed">
            Cada consulta envía dinámicamente la estructura{' '}
            <code className="font-mono text-[#2B2B2B]">[DATOS DE SUPABASE DISPONIBLES]</code>{' '}
            con los {snapshot.proveedores.length} proveedores y {activeProducts.length} productos permitidos.
          </p>

          <pre className="mt-3 p-3 rounded bg-[#FAF7F2] border border-[#EFE9DB] font-mono text-[11px] leading-relaxed text-[#38342E] max-h-56 overflow-auto">
            {latestPayload ? latestPayload.formattedPrompt : previewJson}
          </pre>
        </div>
      </aside>

      {showPayloadModal && selectedPayload && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Estructura de entrada enviada a Gemini"
          className="fixed inset-0 z-50 bg-[#2B2B2B]/50 flex items-center justify-center p-4"
        >
          <div className="bg-[#FFFFFF] border border-[#E5DEC9] rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EFE9DB] flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-[#2B2B2B]">
                Mensaje estructurado enviado al modelo
              </h3>
              <button
                type="button"
                onClick={() => setShowPayloadModal(false)}
                className="px-3 py-1 text-xs font-medium text-[#2B2B2B] hover:bg-[#F5F0EB] border border-[#D9D0BE] rounded"
              >
                Cerrar
              </button>
            </div>
            <div className="p-6 overflow-auto bg-[#FAF7F2]">
              <pre className="font-mono text-xs leading-relaxed text-[#2B2B2B] whitespace-pre-wrap">
                {selectedPayload}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
