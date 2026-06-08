import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ClientForm({ client, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: client?.name || "",
    phone: client?.phone || "",
    instagram: client?.instagram || "",
    facebook: client?.facebook || "",
    notes: client?.notes || "",
    tag: client?.tag || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nombre *</Label>
        <Input
          placeholder="Nombre del cliente"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Teléfono</Label>
        <Input
          placeholder="10 dígitos"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          type="tel"
        />
      </div>
      <div className="space-y-2">
        <Label>Instagram <span className="text-muted-foreground font-normal text-xs">(usuario sin @)</span></Label>
        <Input
          placeholder="ej: mariaventas"
          value={form.instagram}
          onChange={(e) => setForm({ ...form, instagram: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Facebook <span className="text-muted-foreground font-normal text-xs">(perfil o liga)</span></Label>
        <Input
          placeholder="ej: facebook.com/maria o nombre.apellido"
          value={form.facebook}
          onChange={(e) => setForm({ ...form, facebook: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Etiqueta</Label>
        <Select value={form.tag} onValueChange={(v) => setForm({ ...form, tag: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Sin etiqueta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="frecuente">Frecuente</SelectItem>
            <SelectItem value="nuevo">Nuevo</SelectItem>
            <SelectItem value="debe">Debe</SelectItem>
            <SelectItem value="mayorista">Mayorista</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Notas</Label>
        <Textarea
          placeholder="Notas sobre el cliente..."
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1">
          {client ? "Guardar" : "Crear cliente"}
        </Button>
      </div>
    </form>
  );
}