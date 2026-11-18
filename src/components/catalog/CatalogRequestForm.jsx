import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Minus, Plus, Send, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getCatalogRequestReceipt, submitCatalogRequest } from '@/api/catalog-requests';
import { catalogPrice, catalogSessionId, money, quantityIssue, requestLink } from '@/lib/catalog-requests';

export default function CatalogRequestForm({ slug, shopName, products, basket, setBasket, open, onOpenChange, onRefresh }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [review, setReview] = useState(false);
  const [operation, setOperation] = useState(() => catalogSessionId(slug, 'submission'));
  const contentRef = useRef(null);
  const titleRef = useRef(null);
  useLayoutEffect(() => {
    if (review || receipt) titleRef.current?.focus({ preventScroll: true });
    contentRef.current?.scrollTo({ top: 0 });
  }, [review, receipt]);
  const rows = Object.entries(basket).map(([id, quantity]) => ({ product: products.find(p => p.id === id), id, quantity }));
  const invalid = !rows.length || rows.some(r => !r.product || quantityIssue(r.product, r.quantity));
  const total = rows.reduce((sum, r) => sum + (r.product ? catalogPrice(r.product) * Number(r.quantity || 0) : 0), 0);
  const acceptReceipt = result => {
      setReceipt(result); setBasket({}); setName(''); setPhone(''); setNotes(''); setConsent(false); setReview(false);
      try { window.sessionStorage.removeItem(`nenis:catalog:v1:${slug}:submission`); } catch { /* No contact data is stored. */ }
      setOperation(catalogSessionId(slug, 'submission'));
  };
  useEffect(() => {
    if (!open || receipt) return;
    let active = true;
    void getCatalogRequestReceipt(slug, operation).then(result => { if (active && result) acceptReceipt(result); }).catch(() => {});
    return () => { active = false; };
  }, [open, slug, operation, receipt]);
  const submit = useMutation({
    mutationFn: payload => submitCatalogRequest(payload),
    onSuccess: acceptReceipt,
    onError: () => {
      void getCatalogRequestReceipt(slug, operation).then(result => { if (result) acceptReceipt(result); }).catch(() => {});
      void onRefresh();
    },
  });
  const changeQuantity = (id, value) => setBasket(old => ({ ...old, [id]: value }));
  const remove = id => setBasket(old => Object.fromEntries(Object.entries(old).filter(([key]) => key !== id)));
  const send = () => {
    const payload = { p_slug: slug, p_operation: operation,
      p_items: rows.map(r => ({ product_id: r.id, quantity: Number(r.quantity), expected_unit_price: catalogPrice(r.product) })),
      p_name: name.trim(), p_phone: phone, p_notes: notes, p_consent: consent, p_website: website };
    // The same key survives errors and edits. A saved-but-lost response cannot create a second request.
    submit.mutate(payload);
  };
  return <Dialog open={open} onOpenChange={value => { if (!submit.isPending) onOpenChange(value); }}>
    <DialogContent ref={contentRef} className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-lg">
      <DialogHeader><DialogTitle ref={titleRef} tabIndex={-1} className="tracking-normal">{receipt ? 'Solicitud enviada' : review ? 'Revisa tu solicitud' : 'Tu solicitud de pedido'}</DialogTitle>
        <DialogDescription>{shopName || 'Catálogo'} · Sujeta a confirmación, sin pago en línea.</DialogDescription></DialogHeader>
      {receipt ? <div className="space-y-4">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        <p role="status">¡Solicitud enviada! El vendedor revisará tu pedido y confirmará la disponibilidad.</p>
        <p className="font-semibold break-all">{receipt.folio}</p>
        <Button asChild className="w-full min-h-11"><Link to={requestLink(receipt.token).replace(window.location.origin, '')}>Consultar solicitud</Link></Button>
        <Button variant="outline" className="w-full" onClick={() => { setReceipt(null); onOpenChange(false); }}>Seguir viendo productos</Button>
      </div> : <form className="space-y-4" onSubmit={e => { e.preventDefault(); if (!invalid && consent) review ? send() : setReview(true); }}>
        <div className="space-y-4">
          {rows.map(({ product, id, quantity }) => <div key={id} className="border-b border-border pb-3 space-y-2">
            <div className="flex justify-between gap-3"><p className="min-w-0 break-words font-medium">{product?.name || 'Producto no disponible'}</p><span className="shrink-0">{money(product ? catalogPrice(product) : 0)}</span></div>
            <div className="flex items-center gap-2">
              {review ? <p className="text-sm">Cantidad: {quantity}</p> : <>
                <Button type="button" variant="outline" size="icon" aria-label={`Quitar una unidad de ${product?.name}`} disabled={Number(quantity) <= 1 || submit.isPending} onClick={() => changeQuantity(id, Number(quantity) - 1)}><Minus className="h-4 w-4" /></Button>
                <Input type="number" min="1" max="1000" step="1" inputMode="numeric" className="w-20 text-center" aria-label={`Cantidad de ${product?.name}`} value={quantity} onChange={e => changeQuantity(id, e.target.value)} disabled={submit.isPending} required />
                <Button type="button" variant="outline" size="icon" aria-label={`Agregar una unidad de ${product?.name}`} disabled={submit.isPending || Boolean(product && quantityIssue(product, Number(quantity) + 1))} onClick={() => changeQuantity(id, Number(quantity) + 1)}><Plus className="h-4 w-4" /></Button>
                <Button type="button" variant="ghost" size="icon" className="ml-auto" aria-label={`Eliminar ${product?.name}`} title="Eliminar producto" onClick={() => remove(id)} disabled={submit.isPending}><Trash2 className="h-4 w-4" /></Button>
              </>}
            </div>
            {product && quantityIssue(product, quantity) && <p role="alert" className="text-sm text-destructive">{quantityIssue(product, quantity)}</p>}
            {product?.made_to_order && <p className="text-sm text-muted-foreground">Bajo pedido · sujeto a confirmación</p>}
          </div>)}
          {!rows.length && <p className="text-muted-foreground">Tu selección está vacía.</p>}
        </div>
        <p className="flex justify-between gap-3 font-semibold"><span>Total estimado</span><span>{money(total)}</span></p>
        <fieldset disabled={submit.isPending} className="space-y-3">
          <div className="space-y-1"><Label htmlFor="buyer-name">Nombre</Label><Input id="buyer-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={120} readOnly={review} required /></div>
          <div className="space-y-1"><Label htmlFor="buyer-phone">WhatsApp</Label><Input id="buyer-phone" type="tel" autoComplete="tel" placeholder="10 dígitos o número con código de país" value={phone} onChange={e => setPhone(e.target.value)} minLength={10} maxLength={20} pattern="[+0-9 ()-]{10,20}" readOnly={review} required /></div>
          <div className="space-y-1"><Label htmlFor="buyer-notes">Observaciones (opcional)</Label><Textarea id="buyer-notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={2000} readOnly={review} rows={2} /></div>
          <div hidden aria-hidden="true"><label>Sitio web<input tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} /></label></div>
          <p className="text-sm text-muted-foreground">Tu nombre, WhatsApp y observaciones se compartirán con {shopName || 'el vendedor'} para atender esta solicitud. No se usarán para suscribirte a publicidad. <Link to="/privacidad#solicitudes" target="_blank" rel="noopener noreferrer" className="underline">Aviso de privacidad</Link>.</p>
          <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-primary" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={review} required />Autorizo compartir estos datos con el vendedor para que me contacte sobre esta solicitud.</label>
        </fieldset>
        {submit.isError && <p role="alert" className="text-sm text-destructive">{submit.error.message}</p>}
        <p className="text-sm text-muted-foreground">El envío no aparta productos ni confirma una compra. Nenis Pro no procesa pagos de ventas ni verifica depósitos.</p>
        {review && <Button type="button" variant="outline" className="w-full" disabled={submit.isPending} onClick={() => setReview(false)}>Editar selección y contacto</Button>}
        <Button type="submit" className="w-full h-auto min-h-12 whitespace-normal" disabled={invalid || !consent || submit.isPending}><Send className="h-4 w-4 shrink-0" />{submit.isPending ? 'Enviando…' : review ? 'Enviar solicitud de pedido' : 'Revisar solicitud'}</Button>
      </form>}
    </DialogContent>
  </Dialog>;
}
