import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCatalogRequest, respondCatalogRequest } from '@/api/catalog-requests';
import { isRequestToken, money, requestStatuses, whatsappLink } from '@/lib/catalog-requests';
import CatalogPrivacy from '@/components/catalog/CatalogPrivacy';

export default function CatalogRequestStatus() {
  const token = useLocation().hash.slice(1);
  const qc = useQueryClient();
  const [cancel, setCancel] = useState(false);
  const query = useQuery({ queryKey: ['public-request', token], queryFn: () => getCatalogRequest(token), enabled: isRequestToken(token), refetchInterval: 30000, retry: 1 });
  const request = query.data;
  const mutation = useMutation({ mutationFn: action => respondCatalogRequest(token, request.version, action),
    onSuccess: data => { qc.setQueryData(['public-request', token], data); setCancel(false); },
    onError: () => { void query.refetch(); },
  });
  const wa = request && whatsappLink(request.whatsapp_phone, `Hola, quiero consultar mi solicitud ${request.folio}.`);
  return <main className="min-h-screen bg-background px-4 py-8 max-w-lg mx-auto space-y-5">
    <CatalogPrivacy />
    <h1 className="text-2xl font-bold">Solicitud de pedido</h1>
    {query.isFetching && <p role="status" className="text-sm text-muted-foreground">Consultando…</p>}
    {query.isError && <div role="alert"><p>No pudimos consultar la solicitud.</p><Button variant="outline" onClick={() => query.refetch()}>Reintentar</Button></div>}
    {(!isRequestToken(token) || (!query.isPending && !query.isError && !request)) && <p>Solicitud no disponible. Revisa el enlace que recibiste.</p>}
    {request && <>
      <div className="space-y-1"><p className="font-medium">{request.shop_name || 'Tienda'}</p><p className="text-sm font-mono break-all">{request.folio}</p><p className="font-semibold text-primary">{requestStatuses[request.status]}</p></div>
      <section className="border-y border-border divide-y divide-border">
        {request.items.map(item => <div className="py-3 flex justify-between gap-4" key={item.product_id}><div className="min-w-0"><p className="font-medium break-words">{item.product_name}</p><p className="text-sm text-muted-foreground">{item.quantity} × {money(item.unit_price)}</p>{item.availability === 'on_request' && <p className="text-xs text-muted-foreground">Bajo pedido</p>}</div><span className="shrink-0">{money(item.subtotal)}</span></div>)}
      </section>
      <p className="flex justify-between gap-3 font-semibold"><span>Total {request.status === 'confirmed' ? 'del pedido' : 'estimado'}</span>{money(request.estimated_total)}</p>
      {request.conditions && <section><h2 className="font-semibold">Condiciones propuestas</h2><p className="text-sm whitespace-pre-wrap break-words">{request.conditions}</p></section>}
      {request.delivery_date && <p>Entrega propuesta: {new Date(`${request.delivery_date}T12:00:00`).toLocaleDateString('es-MX')}</p>}
      {request.status === 'adjustment_pending' && <div className="space-y-3"><p className="text-sm">El vendedor ajustó la solicitud. Revisa productos, cantidades, precios y condiciones. Aceptar el ajuste no reserva existencias; el vendedor confirmará la disponibilidad.</p><Button className="w-full min-h-12" disabled={mutation.isPending} onClick={() => mutation.mutate('accept')}><Check className="h-4 w-4" />Aceptar ajuste</Button></div>}
      {request.status === 'pending' && <p role="status" className="text-sm">El vendedor revisará tu pedido y confirmará la disponibilidad.</p>}
      {request.status === 'confirmed' && <p role="status">Tu solicitud fue confirmada. Contacta al vendedor para coordinar el pago y la entrega.</p>}
      {wa && <Button variant="outline" asChild className="w-full min-h-11"><a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />Contactar al vendedor</a></Button>}
      {['pending', 'adjustment_pending'].includes(request.status) && <div className="space-y-2">{cancel ? <><p>¿Cancelar esta solicitud?</p><div className="flex gap-2"><Button disabled={mutation.isPending} variant="destructive" onClick={() => mutation.mutate('cancel')}>Sí, cancelar</Button><Button variant="outline" onClick={() => setCancel(false)}>Conservar</Button></div></> : <Button variant="ghost" className="w-full" onClick={() => setCancel(true)}><X className="h-4 w-4" />Cancelar solicitud</Button>}</div>}
      {mutation.isError && <p role="alert" className="text-destructive text-sm">{mutation.error.message}</p>}
      <p className="text-xs text-muted-foreground">Nenis Pro no procesa los pagos de las ventas ni verifica depósitos. Conserva este enlace privado para consultar tu solicitud.</p>
      <Link className="underline inline-flex min-h-11 items-center" to={`/catalogo?tienda=${encodeURIComponent(request.catalog_slug)}`}>Volver al catálogo</Link>
    </>}
  </main>;
}
