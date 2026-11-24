import { supabase } from '@/lib/supabase';
import { logoFileIssue, logoMime } from '@/lib/catalog-logo';

export async function getCatalogLogo() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('Inicia sesión para consultar tu catálogo.');
  const { data, error } = await supabase.from('payment_cards').select('logo_url').eq('user_id', user.id).maybeSingle();
  if (error) throw error;
  return data?.logo_url || null;
}

export async function saveCatalogPresentation({ name, description, file, removeLogo }) {
  let image;
  if (file) {
    const issue = logoFileIssue(file);
    if (issue) throw new Error(issue);
    if (logoMime(new Uint8Array(await file.arrayBuffer())) !== file.type) throw new Error('El archivo no corresponde a una imagen válida.');
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('No pudimos leer la imagen.'));
      reader.readAsDataURL(file);
    });
    image = { type: file.type, data };
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Inicia sesión para guardar tu catálogo.');
  const response = await fetch('/api/catalog-presentation', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ name, description, image, removeLogo: Boolean(removeLogo) }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || 'No pudimos guardar. Revisa tu conexión e intenta de nuevo.');
  return result;
}
