import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  createProducto,
  createProveedor,
  deleteProducto,
  getDatabaseSnapshot,
  updateProducto,
  updateReglasNegocio,
} from './server/dataStore.ts';
import { askAgroConectaAI, type AssistantHistoryItem } from './server/geminiService.ts';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'AgroConecta AI' });
  });

  app.get('/api/data', async (_req, res) => {
    try {
      const snapshot = await getDatabaseSnapshot();
      res.json(snapshot);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Error al cargar los datos',
      });
    }
  });

  app.post('/api/productos', async (req, res) => {
    try {
      const body = req.body;
      if (!body?.nombre || !body?.categoria || !body?.proveedor_id) {
        return res.status(400).json({
          error: 'Nombre, categoría y proveedor son campos obligatorios.',
        });
      }
      const created = await createProducto({
        nombre: String(body.nombre).trim(),
        categoria: body.categoria,
        subtipo: String(body.subtipo || body.categoria).trim(),
        proveedor_id: String(body.proveedor_id),
        precio_pyg: Number(body.precio_pyg) || 0,
        precio_usd: Number(body.precio_usd) || 0,
        unidad: String(body.unidad || 'Unidad').trim(),
        stock: Math.max(0, Number(body.stock) || 0),
        disponible: body.disponible !== false,
        apto_huerta: Boolean(body.apto_huerta),
        descripcion: String(body.descripcion || '').trim(),
        imagen_url: body.imagen_url || undefined,
      });
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Error al crear producto',
      });
    }
  });

  app.put('/api/productos/:id', async (req, res) => {
    try {
      const updated = await updateProducto(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Error al actualizar producto',
      });
    }
  });

  app.delete('/api/productos/:id', async (req, res) => {
    try {
      const removed = await deleteProducto(req.params.id);
      if (!removed) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json({ deleted: true });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Error al eliminar producto',
      });
    }
  });

  app.post('/api/proveedores', async (req, res) => {
    try {
      const body = req.body;
      if (!body?.nombre || !body?.direccion || !body?.telefono) {
        return res.status(400).json({
          error: 'Nombre, dirección y teléfono son obligatorios.',
        });
      }
      const created = await createProveedor({
        nombre: String(body.nombre).trim(),
        categoria_principal: String(body.categoria_principal || 'Insumos Agrícolas').trim(),
        ciudad: String(body.ciudad || 'Asunción').trim(),
        barrio: String(body.barrio || 'Centro').trim(),
        direccion: String(body.direccion).trim(),
        telefono: String(body.telefono).trim(),
        email: String(body.email || '').trim(),
        horario: String(body.horario || 'Lun a Sáb · 08:00 a 18:00').trim(),
        notas: String(body.notas || '').trim(),
      });
      res.status(201).json(created);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Error al registrar proveedor',
      });
    }
  });

  app.put('/api/reglas', async (req, res) => {
    try {
      const updated = await updateReglasNegocio(req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Error al actualizar reglas del negocio',
      });
    }
  });

  app.post('/api/assistant/chat', async (req, res) => {
    try {
      const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
      if (!question) {
        return res.status(400).json({ error: 'La consulta no puede estar vacía.' });
      }

      const history: AssistantHistoryItem[] = Array.isArray(req.body?.history)
        ? req.body.history
        : [];

      const snapshot = await getDatabaseSnapshot();
      const { reply, formattedPrompt } = await askAgroConectaAI(
        snapshot,
        question,
        history
      );

      const allowedSet = new Set(snapshot.reglas.tiposPermitidos);
      const productosCount = snapshot.productos.filter((p) =>
        allowedSet.has(p.categoria)
      ).length;

      res.json({
        reply,
        timestamp: new Date().toISOString(),
        payloadSnapshot: {
          proveedoresCount: snapshot.proveedores.length,
          productosCount,
          formattedPrompt,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error inesperado al consultar AgroConecta AI.';
      res.status(500).json({ error: message });
    }
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AgroConecta AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
