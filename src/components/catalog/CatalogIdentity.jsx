import { useState } from 'react';
import { Store } from 'lucide-react';
import { safeLogoUrl } from '@/lib/catalog-logo';

function Logo({ url, name, localPreview }) {
  const [failed, setFailed] = useState(false);
  const source = localPreview || safeLogoUrl(url);
  const initials = name?.trim().split(/\s+/).slice(0, 2).map(word => [...word][0]).join('').toUpperCase();
  return <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white p-1.5">
    {source && !failed
      ? <img src={source} alt={`Logotipo de ${name || 'mi negocio'}`} width="64" height="64" className="h-full w-full object-contain" onError={() => setFailed(true)} />
      : initials ? <span className="text-lg font-semibold text-gray-700" aria-label="Iniciales del negocio">{initials}</span> : <Store className="h-7 w-7 text-gray-600" aria-label="Sin logotipo" />}
  </div>;
}

export default function CatalogIdentity({ name, description, logoUrl, localPreview, heading: Heading = 'h1' }) {
  return <div className="flex items-center gap-3">
    <Logo key={localPreview || logoUrl || 'empty'} url={logoUrl} name={name} localPreview={localPreview} />
    <div className="min-w-0 flex-1 space-y-1">
      <Heading className="break-words text-xl font-display font-bold">{name || 'Mi catálogo'}</Heading>
      {description && <p className="break-words text-sm text-muted-foreground">{description}</p>}
    </div>
  </div>;
}
