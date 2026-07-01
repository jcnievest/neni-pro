import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getClients, createClient, updateClient, deleteClient } from "@/api/entities";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Phone, Pencil, Trash2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import ClientForm from "@/components/clients/ClientForm";
import { ClientTag } from "@/components/shared/TagBadge";
import EmptyState from "@/components/shared/EmptyState";
import { useAuth } from "@/lib/AuthContext";

export default function Clients() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();
  const { accessState } = useAuth();
  const canEdit = accessState.hasAccess;

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients("-created_date", 500),
  });

  const createMut = useMutation({
    mutationFn: (data) => createClient(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateClient(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id) => deleteClient(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["clients"] }); setDeleting(null); },
  });

  const filtered = clients.filter(
    (c) => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {canEdit && (
          <Button onClick={() => setShowForm(true)} size="icon" className="rounded-xl shrink-0">
            <Plus className="w-5 h-5" />
          </Button>
        )}
      </div>

      {filtered.length === 0 && !isLoading ? (
        <EmptyState
          icon={Users}
          title="Sin clientes aún"
          description={canEdit ? "Agrega tu primer cliente para empezar" : "Tus clientes aparecerán aquí al activar tu suscripción"}
          action={canEdit ? <Button onClick={() => setShowForm(true)}>Agregar cliente</Button> : null}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Card key={c.id} className="p-3 border-0 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{c.name}</p>
                    <ClientTag tag={c.tag} />
                  </div>
                  {c.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" /> {c.phone}
                    </div>
                  )}
                  {c.notes && <p className="text-xs text-muted-foreground">{c.notes}</p>}
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(c)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleting(c)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo cliente</DialogTitle>
          </DialogHeader>
          <ClientForm onSubmit={(data) => createMut.mutate(data)} onCancel={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          {editing && (
            <ClientForm
              client={editing}
              onSubmit={(data) => updateMut.mutate({ id: editing.id, data })}
              onCancel={() => setEditing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{deleting?.name}" permanentemente.
            </AlertDialogDescription>
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
