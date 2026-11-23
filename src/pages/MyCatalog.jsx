import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Pencil, Upload, Trash2, Save, Copy, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getSettings, upsertSettings, getCatalogUrl } from '@/api/entities';
import { getCatalogLogo, saveCatalogPresentation } from '@/api/catalog-presentation';
import { useAuth } from '@/lib/AuthContext';
import { LOGO_MAX_PIXELS, logoFileIssue, logoMime } from '@/lib/catalog-logo';
import { trackSellerCatalog } from '@/lib/seller-catalog-tracking';
import CatalogIdentity from '@/components/catalog/CatalogIdentity';
import CatalogPrivacy from '@/components/catalog/CatalogPrivacy';
import ShareCatalogButton from '@/components/catalog/ShareCatalogButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export default function MyCatalog() {
  return <><CatalogPrivacy /><CatalogSettings /></>;
}

function CatalogSettings() {
  const { user, accessState } = useAuth();
  const { hash } = useLocation();
  const query = useQuery({ queryKey: ['settings', user.id], queryFn: getSettings });
  const logo = useQuery({ queryKey: ['catalog-logo', user.id], queryFn: getCatalogLogo });
  const requestSection = useRef(null);
  useEffect(() => {
    if (hash === '#solicitudes-catalogo' && query.isSuccess) {
      requestSection.current?.scrollIntoView({ block: 'start' });
      requestSection.current?.focus({ preventScroll: true });
    }
  }, [hash, query.isSuccess, logo.isSuccess]);
  if (query.isPending || logo.isPending) return <p role="status">Cargando tu catálogo…</p>;
  if (query.isError || logo.isError) return <div role="alert" className="space-y-3"><p>No pudimos consultar tu catálogo.</p><Button variant="outline" onClick={() => { query.refetch(); logo.refetch(); }}>Reintentar</Button></div>;
  return <CatalogEditor key={user.id} user={user} settings={query.data[0] || {}} logoUrl={logo.data} hasAccess={accessState.hasAccess} requestSection={requestSection} />;
}

function CatalogEditor({ user, settings, logoUrl, hasAccess, requestSection }) {
  const qc = useQueryClient();
  const fileInput = useRef(null);
  const nameInput = useRef(null);
  const [name, setName] = useState(settings.shop_name || '');
  const [description, setDescription] = useState(settings.shop_description || '');
  const [phone, setPhone] = useState(settings.whatsapp_phone || '');
  const [message, setMessage] = useState(settings.catalog_wa_message || 'Hola, me interesa el producto *{{producto}}*. ¿Me puedes dar más información?');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [imageError, setImageError] = useState('');
  const [checking, setChecking] = useState(false);
  const selection = useRef(0);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['settings', user.id] });
    qc.invalidateQueries({ queryKey: ['catalog-logo', user.id] });
    qc.invalidateQueries({ queryKey: ['public-catalog'] });
    qc.invalidateQueries({ queryKey: ['payment_card'] });
  };
  const save = useMutation({
    mutationFn: () => saveCatalogPresentation({ name, description, file, removeLogo }),
    onSuccess: result => {
      qc.setQueryData(['catalog-logo', user.id], result.logo_url);
      setName(name.trim()); setDescription(description.trim());
      setFile(null); setRemoveLogo(false); refresh(); toast.success('Catálogo actualizado.');
      if (result.uploaded) void trackSellerCatalog(user.id, 'catalog_logo_uploaded');
    },
    onError: error => toast.error(error.message),
  });
  const config = useMutation({
    mutationFn: upsertSettings,
    onSuccess: () => { refresh(); toast.success('Guardado'); },
    onError: error => toast.error(error.message || 'No pudimos guardar la configuración.'),
  });
  const canEdit = hasAccess && !save.isPending && !config.isPending;
  const canShare = Boolean(settings.catalog_slug && settings.catalog_public);
  const url = getCatalogUrl(settings.catalog_slug);
  const chooseLogo = async event => {
    const candidate = event.target.files?.[0]; event.target.value = '';
    if (!candidate) return;
    const current = ++selection.current;
    setImageError(''); setChecking(true);
    let objectUrl;
    try {
      const issue = logoFileIssue(candidate); if (issue) throw new Error(issue);
      if (logoMime(new Uint8Array(await candidate.arrayBuffer())) !== candidate.type) throw new Error('El archivo no corresponde a una imagen válida.');
      objectUrl = URL.createObjectURL(candidate);
      const image = new Image(); image.src = objectUrl; await image.decode();
      if (image.naturalWidth * image.naturalHeight > LOGO_MAX_PIXELS) throw new Error('Usa una imagen de hasta 16 megapíxeles.');
      if (current === selection.current) { setFile(candidate); setRemoveLogo(false); }
    } catch (error) { if (current === selection.current) setImageError(error.message || 'No pudimos leer la imagen.'); }
    finally { if (objectUrl) URL.revokeObjectURL(objectUrl); if (current === selection.current) setChecking(false); }
  };
  const copyLink = async () => {
    void trackSellerCatalog(user.id, 'catalog_share_clicked');
    try { await navigator.clipboard.writeText(url); toast.success('Enlace del catálogo copiado.'); }
    catch { toast.error('No pudimos copiar. Puedes seleccionar el enlace para copiarlo.'); }
  };
  const dirty = name !== (settings.shop_name || '') || description !== (settings.shop_description || '') || file || removeLogo;
  return <div className="space-y-6">
    <CatalogIdentity name={settings.shop_name} description={settings.shop_description} logoUrl={logoUrl} heading="h2" />
    <div className="grid grid-cols-2 gap-2">
      <Button asChild variant="outline" className="min-h-11 h-auto whitespace-normal"><a href={canShare ? url : '/catalogo'} target="_blank" rel="noopener noreferrer" onClick={() => { void trackSellerCatalog(user.id, 'catalog_preview_opened'); }}><ExternalLink className="h-4 w-4 shrink-0" />Ver mi catálogo</a></Button>
      <Button variant="outline" className="min-h-11 h-auto whitespace-normal" onClick={() => nameInput.current?.focus()}><Pencil className="h-4 w-4 shrink-0" />Personalizar</Button>
      <div className="col-span-2 [&>button]:w-full"><ShareCatalogButton settings={settings} userId={user.id} disabled={!canShare} /></div>
    </div>
    {!canShare && <p className="text-sm text-muted-foreground">Tu catálogo aún no está publicado. Solo tú puedes ver la vista previa.</p>}

    <form className="space-y-4 border-t border-border pt-4" onSubmit={event => { event.preventDefault(); if (canEdit && !checking) save.mutate(); }}>
      <h2 className="font-semibold">Personalizar catálogo</h2>
      <div className="space-y-2">
        <Label htmlFor="catalog-logo">Logotipo de mi negocio</Label>
        <CatalogIdentity name={name} description={description} logoUrl={removeLogo ? null : logoUrl} localPreview={preview} heading="h3" />
        <input ref={fileInput} id="catalog-logo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} disabled={!canEdit || checking} onChange={chooseLogo} aria-describedby="logo-help logo-error" />
        <p id="logo-help" className="text-xs text-muted-foreground">Opcional · JPG, PNG o WebP · Hasta 2 MB</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={!canEdit || checking} onClick={() => fileInput.current?.click()}><Upload className="h-4 w-4" />{checking ? 'Validando…' : file || (logoUrl && !removeLogo) ? 'Cambiar logotipo' : 'Subir logotipo'}</Button>
          {(file || (logoUrl && !removeLogo)) && <Button type="button" variant="ghost" disabled={!canEdit || checking} onClick={() => { setFile(null); setRemoveLogo(Boolean(logoUrl)); setImageError(''); }}><Trash2 className="h-4 w-4" />Eliminar logotipo</Button>}
        </div>
        {imageError && <p id="logo-error" role="alert" className="text-sm text-destructive">{imageError}</p>}
      </div>
      <div className="space-y-2"><Label htmlFor="catalog-name">Nombre del negocio</Label><Input id="catalog-name" ref={nameInput} value={name} maxLength={120} disabled={!canEdit} onChange={e => setName(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="catalog-description">Descripción breve</Label><Textarea id="catalog-description" value={description} rows={2} maxLength={300} disabled={!canEdit} onChange={e => setDescription(e.target.value)} /></div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={!canEdit || checking || !dirty}><Save className="h-4 w-4" />{save.isPending ? 'Guardando…' : 'Guardar cambios'}</Button>
        {dirty && <Button type="button" variant="ghost" disabled={!canEdit || checking} onClick={() => { setName(settings.shop_name || ''); setDescription(settings.shop_description || ''); setFile(null); setRemoveLogo(false); setImageError(''); }}>Cancelar</Button>}
      </div>
    </form>

    <section className="space-y-3 border-t border-border pt-4" aria-labelledby="share-title">
      <h2 id="share-title" className="font-semibold">Compartir catálogo</h2>
      {canShare ? <>
        <Input aria-label="Enlace público del catálogo" readOnly value={url} onFocus={e => e.target.select()} />
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={copyLink}><Copy className="h-4 w-4" />Copiar enlace</Button><Button asChild variant="outline"><a href={`https://wa.me/?text=${encodeURIComponent(`Te comparto el catálogo de ${settings.shop_name || 'mi negocio'}: ${url}`)}`} target="_blank" rel="noopener noreferrer" onClick={() => { void trackSellerCatalog(user.id, 'catalog_share_clicked'); }}><MessageCircle className="h-4 w-4" />WhatsApp</a></Button></div>
      </> : <p className="text-sm text-muted-foreground">Publica tu catálogo para compartir su enlace.</p>}
    </section>

    <section ref={requestSection} id="solicitudes-catalogo" tabIndex={-1} className="scroll-mt-20 space-y-4 border-t border-border pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <h2 className="font-semibold">Solicitudes desde mi catálogo</h2>
      <div className="flex items-center justify-between gap-4"><Label htmlFor="catalog-public" className="leading-6">Publicar mi catálogo</Label><Switch id="catalog-public" checked={settings.catalog_public !== false && Boolean(settings.catalog_slug)} disabled={!canEdit} onCheckedChange={value => config.mutate({ catalog_public: value })} /></div>
      <div className="flex items-center justify-between gap-4"><Label htmlFor="catalog-requests" className="leading-6">Permitir que mis clientes soliciten pedidos desde mi catálogo</Label><Switch id="catalog-requests" checked={Boolean(settings.catalog_orders_enabled)} disabled={!canEdit} onCheckedChange={value => config.mutate({ catalog_orders_enabled: value })} /></div>
      {settings.catalog_public === false && <p className="text-sm text-muted-foreground">Tu catálogo está privado. También debes publicarlo para recibir solicitudes.</p>}
    </section>

    <form className="space-y-3 border-t border-border pt-4" onSubmit={event => { event.preventDefault(); if (canEdit) config.mutate({ whatsapp_phone: phone, catalog_wa_message: message }); }}>
      <h2 className="font-semibold">Contacto desde el catálogo</h2>
      <div className="space-y-2"><Label htmlFor="catalog-phone">Tu número de WhatsApp</Label><Input id="catalog-phone" type="tel" value={phone} disabled={!canEdit} onChange={e => setPhone(e.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="catalog-message">Mensaje del catálogo público</Label><Textarea id="catalog-message" rows={3} value={message} disabled={!canEdit} onChange={e => setMessage(e.target.value)} /></div>
      <Button type="submit" variant="outline" disabled={!canEdit}><Save className="h-4 w-4" />Guardar contacto</Button>
    </form>
  </div>;
}
