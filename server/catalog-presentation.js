import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { LOGO_MAX_BYTES, LOGO_MAX_PIXELS, logoFileIssue, logoMime } from '../src/lib/catalog-logo.js';

const bucket = 'product-photos';
const maxBody = 3 * 1024 * 1024;
const reply = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const failure = (message, status = 400) => Object.assign(new Error(message), { status });

export async function normalizeLogo(image) {
  if (!image || typeof image.data !== 'string' || image.data.length > Math.ceil(LOGO_MAX_BYTES / 3) * 4
    || image.data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(image.data)) throw failure('Imagen inválida o mayor a 2 MB.');
  const input = Buffer.from(image.data, 'base64');
  if (input.toString('base64') !== image.data) throw failure('Imagen inválida.');
  const issue = logoFileIssue({ type: image.type, size: input.length });
  if (issue) throw failure(issue);
  if (logoMime(input) !== image.type) throw failure('El archivo no corresponde a una imagen válida.');
  try {
    const decoder = sharp(input, { limitInputPixels: LOGO_MAX_PIXELS, failOn: 'warning' });
    const info = await decoder.metadata();
    if (!['jpeg','png','webp'].includes(info.format) || (info.pages || 1) > 1) throw new Error('Unsupported image');
    const output = await decoder.rotate().resize(512, 512, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
    if (output.length > 512 * 1024) throw new Error('Output too large');
    return output;
  } catch { throw failure('No pudimos procesar la imagen. Usa un JPG, PNG o WebP estático de hasta 16 megapíxeles.'); }
}

async function readJson(request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw failure('Formato de solicitud inválido.', 415);
  if (Number(request.headers.get('content-length')) > maxBody) throw failure('La imagen es demasiado grande.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw failure('Faltan los datos del catálogo.');
  const parts = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.length;
    if (size > maxBody) { await reader.cancel(); throw failure('La imagen es demasiado grande.', 413); }
    parts.push(Buffer.from(value));
  }
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')); }
  catch { throw failure('Formato de solicitud inválido.'); }
}

function ownedLogoPath(url, userId, storage) {
  if (typeof url !== 'string') return null;
  const prefix = storage.getPublicUrl(`${userId}/catalog-logos/`).data.publicUrl;
  if (!url.startsWith(prefix)) return null;
  const file = url.slice(prefix.length);
  return /^[a-f0-9-]{36}\.webp$/.test(file) ? `${userId}/catalog-logos/${file}` : null;
}

// The service client is server-only. Every operation derives its owner from a verified token.
export async function handleCatalogPresentation(request, admin) {
  if (request.method !== 'POST') return reply({ error: 'Método no permitido.' }, 405);
  if (!admin) return reply({ error: 'La personalización del catálogo aún no está configurada. Intenta más tarde.' }, 503);
  let uploadedUrl, userId;
  const storage = admin.storage.from(bucket);
  const cleanup = async url => {
    const path = ownedLogoPath(url, userId, storage);
    if (!path) return;
    // Do not remove a file that a successful retry or another tab has already saved.
    const { data, error } = await admin.from('payment_cards').select('logo_url').eq('user_id', userId).maybeSingle();
    if (!error && data?.logo_url !== url) await storage.remove([path]);
  };
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/i)?.[1];
    if (!token) throw failure('Inicia sesión para guardar tu catálogo.', 401);
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth?.user) throw failure('Tu sesión venció. Inicia sesión nuevamente.', 401);
    userId = auth.user.id;
    const { data: access, error: accessError } = await admin.rpc('catalog_access_allowed', { p_user: userId });
    if (accessError) throw failure('No pudimos verificar el acceso. Intenta de nuevo.', 503);
    if (!access) throw failure('Tu prueba gratuita terminó. Suscríbete para seguir usando Nenis Pro.', 403);
    const input = await readJson(request);
    if (!input || typeof input.name !== 'string' || typeof input.description !== 'string'
      || input.name.trim().length > 120 || input.description.trim().length > 300
      || (input.removeLogo !== undefined && typeof input.removeLogo !== 'boolean')
      || (input.image && input.removeLogo)) throw failure('Revisa el nombre, la descripción y el logotipo.');
    const { data: previous, error: readError } = await admin.from('payment_cards').select('logo_url').eq('user_id', userId).maybeSingle();
    if (readError) throw failure('No pudimos consultar tu logotipo. Intenta de nuevo.', 503);
    if (input.image) {
      const bytes = await normalizeLogo(input.image);
      const path = `${userId}/catalog-logos/${randomUUID()}.webp`;
      const { error } = await storage.upload(path, bytes, { contentType: 'image/webp', cacheControl: '3600', upsert: false });
      if (error) throw failure('No pudimos subir el logotipo. Intenta de nuevo.', 503);
      uploadedUrl = storage.getPublicUrl(path).data.publicUrl;
    }
    const { data, error } = await admin.rpc('save_catalog_presentation', {
      p_user: userId, p_name: input.name.trim(), p_description: input.description.trim(),
      p_replace_logo: Boolean(uploadedUrl || input.removeLogo), p_logo_url: uploadedUrl || null,
    });
    if (error) throw failure('No pudimos guardar los cambios. Intenta de nuevo.', 503);
    if ((uploadedUrl || input.removeLogo) && previous?.logo_url) await cleanup(previous.logo_url).catch(() => {});
    return reply({ ok: true, logo_url: data.logo_url, uploaded: Boolean(uploadedUrl) });
  } catch (error) {
    if (uploadedUrl) await cleanup(uploadedUrl).catch(() => {});
    return reply({ error: error.status ? error.message : 'No pudimos guardar los cambios. Intenta de nuevo.' }, error.status || 503);
  }
}
