import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, MessageCircle, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getClients, getProducts } from '@/api/entities';
import { getRequestAudit, getSellerRequest, manageCatalogRequest } from '@/api/catalog-requests';
import { catalogPrice, money, requestLink, requestStatuses, whatsappLink } from '@/lib/catalog-requests';
import CatalogPrivacy from '@/components/catalog/CatalogPrivacy';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function OrderRequestDetail() {
  return <><CatalogPrivacy /><OrderRequestPage /></>;
}

function OrderRequestPage() {
  const { id } = useParams();
  const { user, accessState } = useAuth();
  const query = useQuery({ queryKey: ['catalog-request', user.id, id], queryFn: () => getSellerRequest(user.id, id), refetchInterval: 20000 });
  if (query.isPending) return <p role="status">Cargando solicitud…</p>;
  if (query.isError) return <div role="alert" className="space-y-3"><p>No pudimos consultar esta solicitud.</p><Button variant="outline" onClick={() => query.refetch()}>Reintentar</Button><Link to="/pedidos/solicitudes" className="block underline">Volver a solicitudes</Link></div>;
  return <RequestDetail key={`${id}:${query.data.version}:${query.data.status}`} request={query.data} user={user} canEdit={accessState.hasAccess} />;
}

function RequestDetail({ request, user, canEdit }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState(request.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })));
  const [conditions, setConditions] = useState(request.conditions);
  const [date, setDate] = useState(request.delivery_date || '');
  const [clientId, setClientId] = useState('');
  const [closing, setClosing] = useState(null);
  const { data: products = [] } = useQuery({ queryKey: ['products', user.id], queryFn: () => getProducts('name', 500) });
  const { data: clients = [] } = useQuery({ queryKey: ['clients', user.id], queryFn: () => getClients('name', 500) });
  const audit = useQuery({ queryKey: ['request-audit', user.id, request.id], queryFn: () => getRequestAudit(user.id, request.id) });
  const refresh = () => {
    for (const key of ['catalog-request', 'catalog-requests', 'catalog-request-count', 'request-audit', 'orders', 'products']) void qc.invalidateQueries({ queryKey: [key] });
  };
  const mutation = useMutation({
    mutationFn: action => manageCatalogRequest({ p_id: request.id, p_version: request.version, p_action: action,
      ...(action === 'adjust' ? { p_items: items.map(i => ({ ...i, quantity: Number(i.quantity) })), p_conditions: conditions, p_delivery_date: date || null } : {}),
      ...(action === 'confirm' ? { p_client_id: clientId || null } : {}),
    }),
    onSuccess: result => {
      refresh(); setClosing(null); setEditing(false);
      if (result.order_id) {
        toast.success('Pedido confirmado.'); navigate(`/pedido/${result.order_id}`);
      } else if (result.requires_acceptance) toast.success('Ajuste pendiente. Comparte el enlace para que el comprador lo acepte.');
      else toast.success('Solicitud actualizada.');
    },
    onError: error => { toast.error(error.message); refresh(); },
  });
  const link = requestLink(request.public_token);
  const wa = whatsappLink(request.buyer_phone, `Hola ${request.buyer_name}, revisa tu solicitud ${request.folio}: ${link}`);
  const open = ['pending', 'adjustment_pending'].includes(request.status);
  const controlsDisabled = !canEdit || mutation.isPending;
  const selectClass = 'w-full min-h-11 rounded-md border border-input bg-background px-2 text-sm';
  return <div className="space-y-5">
    <Link to="/pedidos/solicitudes" className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Solicitudes recibidas</Link>
    <div className="space-y-1"><h2 className="text-xl font-bold break-words">{request.buyer_name}</h2><p className="font-mono text-sm break-all">{request.folio}</p><p className="text-sm text-primary font-semibold">{requestStatuses[request.status]}</p><p className="text-sm text-muted-foreground">{new Date(request.created_at).toLocaleString('es-MX')}</p><p className="text-sm">WhatsApp: {request.buyer_phone}</p></div>
    {request.buyer_notes && <section><h3 className="font-semibold text-sm">Observaciones del comprador</h3><p className="whitespace-pre-wrap break-words text-sm">{request.buyer_notes}</p></section>}
    {editing ? <form className="space-y-4" onSubmit={e => { e.preventDefault(); mutation.mutate('adjust'); }}>
      <h3 className="font-semibold">Ajustar solicitud</h3>
      {items.map((item, index) => <div key={index} className="space-y-2 border-b border-border pb-3">
        <Label htmlFor={`request-product-${index}`}>Producto {index + 1}</Label>
        <select id={`request-product-${index}`} className={selectClass} value={item.product_id} required onChange={e => setItems(old => old.map((i, n) => n === index ? { ...i, product_id: e.target.value } : i))}>
          <option value="">Seleccionar producto</option>{!products.some(p => p.id === item.product_id) && item.product_id && <option value={item.product_id}>Producto ya no disponible</option>}
          {products.filter(p => p.catalog_visible).map(p => <option key={p.id} value={p.id}>{p.name} · {money(catalogPrice(p))}</option>)}
        </select>
        <div className="flex items-center gap-3"><Label htmlFor={`request-quantity-${index}`}>Cantidad</Label><Input id={`request-quantity-${index}`} type="number" inputMode="numeric" min="1" max="1000" step="1" required className="w-24" value={item.quantity} onChange={e => setItems(old => old.map((i, n) => n === index ? { ...i, quantity: e.target.value } : i))} /><Button type="button" variant="ghost" size="icon" aria-label={`Eliminar producto ${index + 1}`} onClick={() => setItems(old => old.filter((_, n) => n !== index))}><Trash2 className="h-4 w-4" /></Button></div>
      </div>)}
      <Button type="button" variant="outline" disabled={items.length >= 20} onClick={() => setItems([...items, { product_id: '', quantity: 1 }])}><Plus className="h-4 w-4" />Agregar producto</Button>
      <div className="space-y-1"><Label htmlFor="request-conditions">Condiciones para el comprador</Label><Textarea id="request-conditions" maxLength={2000} value={conditions} onChange={e => setConditions(e.target.value)} /></div>
      <div className="space-y-1"><Label htmlFor="request-date">Fecha propuesta de entrega</Label><Input id="request-date" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      <p className="text-sm text-muted-foreground">El comprador deberá aceptar el ajuste antes de que puedas confirmar el pedido.</p>
      <div className="flex flex-wrap gap-2"><Button type="submit" disabled={controlsDisabled || !items.length}>Guardar propuesta</Button><Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancelar ajuste</Button></div>
    </form> : <>
      <section className="divide-y divide-border border-y border-border">{request.items.map(item => <div key={item.product_id} className="py-3 flex justify-between gap-3"><div className="min-w-0"><p className="font-medium break-words">{item.product_name}</p><p className="text-sm text-muted-foreground">{item.quantity} × {money(item.unit_price)}</p>{item.availability === 'on_request' && <p className="text-xs text-muted-foreground">Bajo pedido</p>}</div><span className="shrink-0">{money(item.subtotal)}</span></div>)}</section>
      <p className="font-semibold flex justify-between gap-3"><span>Total estimado</span>{money(request.estimated_total)}</p>
      {request.conditions && <p className="whitespace-pre-wrap break-words text-sm">{request.conditions}</p>}
      {request.delivery_date && <p className="text-sm">Entrega propuesta: {request.delivery_date}</p>}
      {open && <div className="space-y-2"><Label htmlFor="request-client">Vincular cliente (opcional)</Label><select id="request-client" className={selectClass} value={clientId} onChange={e => setClientId(e.target.value)} disabled={controlsDisabled}><option value="">Sin vincular a un cliente existente</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ''}</option>)}</select></div>}
      {open && <div className="grid gap-2 sm:grid-cols-2"><Button className="min-h-12 h-auto whitespace-normal" disabled={controlsDisabled || request.status !== 'pending'} onClick={() => mutation.mutate('confirm')}><Check className="h-4 w-4 shrink-0" />{mutation.isPending ? 'Guardando…' : 'Confirmar pedido'}</Button><Button variant="outline" disabled={controlsDisabled} onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Modificar</Button></div>}
      {request.status === 'adjustment_pending' && <p role="status" className="text-sm text-muted-foreground">Falta la aceptación del comprador. Comparte su enlace.</p>}
    </>}
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="flex-1 min-h-11 h-auto whitespace-normal" onClick={async () => { try { await navigator.clipboard.writeText(link); toast.success('Enlace copiado. Compártelo solo con el comprador.'); } catch { toast.error('No se pudo copiar el enlace.'); } }}><Copy className="h-4 w-4 shrink-0" />Copiar enlace</Button>
      {wa && <Button variant="outline" asChild className="flex-1 min-h-11"><a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a></Button>}
    </div>
    {open && !editing && <div className="space-y-2">{closing ? <><p>¿{closing === 'reject' ? 'Rechazar' : 'Cancelar'} esta solicitud sin crear un pedido?</p><div className="flex gap-2"><Button variant="destructive" disabled={controlsDisabled} onClick={() => mutation.mutate(closing)}>Sí, continuar</Button><Button variant="outline" onClick={() => setClosing(null)}>Volver</Button></div></> : <div className="flex gap-2"><Button variant="ghost" disabled={controlsDisabled} onClick={() => setClosing('reject')}><X className="h-4 w-4" />Rechazar</Button><Button variant="ghost" disabled={controlsDisabled} onClick={() => setClosing('cancel')}>Cancelar solicitud</Button></div>}</div>}
    {mutation.isError && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
    {request.order_id && <Button asChild className="w-full"><Link to={`/pedido/${request.order_id}`}>Ver pedido confirmado</Link></Button>}
    <details className="border-t border-border pt-3"><summary className="cursor-pointer text-sm font-semibold min-h-11">Actividad de la solicitud</summary>{audit.isError && <p className="text-sm">No pudimos cargar la actividad.</p>}<ul className="space-y-2 text-sm text-muted-foreground">{audit.data?.map(entry => <li key={entry.id}>{({ submitted: 'Solicitud recibida', adjusted: 'Propuesta ajustada', accept: 'Ajuste aceptado', cancel: 'Solicitud cancelada', reject: 'Solicitud rechazada', confirmed: 'Pedido confirmado' })[entry.action] || 'Solicitud actualizada'} · {new Date(entry.created_at).toLocaleString('es-MX')} · v{entry.version}</li>)}</ul></details>
  </div>;
}
