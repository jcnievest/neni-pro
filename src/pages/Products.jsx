import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts, createProduct, updateProduct, deleteProduct } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, Package, Copy, Share2, Tag } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ProductForm from "@/components/products/ProductForm";
import EmptyState from "@/components/shared/EmptyState";

export default function Products() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts("-created_date", 500),
  });

  const createMut = useMutation({
    mutationFn: (data) => createProduct(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); setDeleting(null); },
  });

  const promoteProduct = (p) => {
    navigate(`/promocionar?id=${p.id}`);
  };

  const copyFbPost = (p) => {
    const text = [
      `✨ ${p.name}`,
      p.category ? `Categoría: ${p.category}` : "",
      `💰 Precio: $${p.price?.toLocaleString()}`,
      p.stock ? `📦 Disponibles: ${p.stock}` : "",
      p.notes ? `\n${p.notes}` : "",
      "\n¡Escríbeme para apartar el tuyo! 💬",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Publicación copiada para Facebook");
  };

  const filtered = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar producto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button onClick={() => setShowForm(true)} size="icon" className="rounded-xl shrink-0">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          icon={Package}
          title="Sin productos aún"
          description="Agrega tu primer producto"
          action={<Button onClick={() => setShowForm(true)}>Agregar producto</Button>}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <Card key={p.id} className="p-3 border-0 shadow-sm">
              <div className="flex items-center gap-3">
                {p.photo_url ? (
                  <img src={p.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    {p.is_offer && <Tag className="w-3 h-3 text-rose-500 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {p.category && <span>{p.category}</span>}
                    {p.is_offer && p.offer_price ? (
                      <>
                        <span className="font-semibold text-rose-500">${p.offer_price?.toLocaleString()}</span>
                        <span className="line-through">${p.price?.toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="font-semibold text-foreground">${p.price?.toLocaleString()}</span>
                    )}
                    {p.stock != null && <span>· Stock: {p.stock}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Promocionar producto" onClick={() => promoteProduct(p)}>
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(p)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(p)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          <DialogHeader><DialogTitle>Nuevo producto</DialogTitle></DialogHeader>
          <ProductForm onSubmit={(data) => createMut.mutate(data)} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
          <DialogHeader><DialogTitle>Editar producto</DialogTitle></DialogHeader>
          {editing && <ProductForm product={editing} onSubmit={(data) => updateMut.mutate({ id: editing.id, data })} onCancel={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará "{deleting?.name}" permanentemente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMut.mutate(deleting.id)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}