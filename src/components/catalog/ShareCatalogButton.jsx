import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { getCatalogUrl } from '@/api/entities';
import { trackSellerCatalog } from '@/lib/seller-catalog-tracking';

export default function ShareCatalogButton({ settings, userId, disabled = false }) {
  const [showLink, setShowLink] = useState(false);
  const [sharing, setSharing] = useState(false);
  const url = getCatalogUrl(settings.catalog_slug);
  const share = async () => {
    void trackSellerCatalog(userId, 'catalog_share_clicked');
    setSharing(true);
    try {
      if (navigator.share) await navigator.share({ title: settings.shop_name || 'Mi catálogo', url });
      else { await navigator.clipboard.writeText(url); toast.success('Enlace del catálogo copiado.'); }
    } catch (error) {
      if (error.name !== 'AbortError') setShowLink(true);
    } finally { setSharing(false); }
  };
  return <>
    <Button type="button" variant="outline" className="min-h-11 h-auto whitespace-normal" disabled={disabled || sharing} onClick={share}><Share2 className="h-4 w-4" />Compartir mi catálogo</Button>
    <Dialog open={showLink} onOpenChange={setShowLink}><DialogContent className="max-w-sm w-[calc(100%-2rem)] rounded-lg">
      <DialogHeader><DialogTitle>Enlace de tu catálogo</DialogTitle><DialogDescription>No se pudo abrir el menú para compartir ni copiar el enlace automáticamente.</DialogDescription></DialogHeader>
      <Input aria-label="Enlace de tu catálogo" value={url} readOnly onFocus={e => e.target.select()} />
      <Button asChild variant="outline"><a href={url} target="_blank" rel="noopener noreferrer">Abrir catálogo</a></Button>
    </DialogContent></Dialog>
  </>;
}
