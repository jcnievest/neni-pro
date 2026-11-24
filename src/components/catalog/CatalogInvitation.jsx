import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Settings2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { getSettings } from '@/api/entities';
import { Button } from '@/components/ui/button';
import ShareCatalogButton from './ShareCatalogButton';

export default function CatalogInvitation() {
  const { user, accessState } = useAuth();
  const query = useQuery({ queryKey: ['settings', user.id], queryFn: getSettings, staleTime: 20000 });
  if (!accessState.hasAccess) return null;
  if (query.isPending) return <p role="status" className="text-sm text-muted-foreground">Consultando tu catálogo…</p>;
  if (query.isError) return <div role="alert" className="text-sm"><p>No pudimos consultar tu catálogo.</p><Button variant="link" onClick={() => query.refetch()}>Reintentar</Button></div>;
  const settings = query.data?.[0];
  const canShare = settings?.catalog_public && settings?.catalog_orders_enabled && settings?.catalog_slug;
  return <section aria-label="Recibe pedidos desde tu catálogo" className="space-y-2 border-y border-border py-3">
    <h3 className="text-sm font-semibold">Recibe pedidos desde tu catálogo</h3>
    <p className="text-xs leading-5 text-muted-foreground">{canShare
      ? 'Comparte tu catálogo para que tus clientes puedan enviarte solicitudes directamente.'
      : 'Activa las solicitudes en la configuración de tu catálogo para recibir pedidos de tus clientes.'}</p>
    {canShare ? <ShareCatalogButton settings={settings} userId={user.id} /> : <Button asChild variant="outline" className="min-h-11 h-auto whitespace-normal"><Link to="/mi-catalogo#solicitudes-catalogo"><Settings2 className="h-4 w-4" />{settings?.catalog_public === false ? 'Revisar configuración del catálogo' : 'Habilitar solicitudes'}</Link></Button>}
  </section>;
}
