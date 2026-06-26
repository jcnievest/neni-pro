import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { uploadProductPhoto } from "@/api/entities";
import { Switch } from "@/components/ui/switch";

export default function ProductForm({ product, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    category: product?.category || "",
    price: product?.price ?? "",
    cost: product?.cost ?? "",
    stock: product?.stock ?? "",
    notes: product?.notes || "",
    photo_url: product?.photo_url || "",
    is_offer: product?.is_offer || false,
    offer_price: product?.offer_price ?? "",
    offer_description: product?.offer_description || "",
    offer_expiry: product?.offer_expiry || "",
  });
  const [uploading, setUploading] = useState(false);

  const handleImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const file_url = await uploadProductPhoto(file);
    setForm((f) => ({ ...f, photo_url: file_url }));
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      price: parseFloat(form.price) || 0,
      cost: form.cost !== "" ? parseFloat(form.cost) : undefined,
      stock: form.stock !== "" ? parseFloat(form.stock) : undefined,
      offer_price: form.offer_price !== "" ? parseFloat(form.offer_price) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nombre *</Label>
        <Input placeholder="Nombre del producto" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Lo vendes en *</Label>
          <Input type="number" placeholder="0.00" value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Te cuesta <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
          <Input type="number" placeholder="0.00" value={form.cost}
            onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        </div>
      </div>

      {/* Ganancia estimada */}
      {form.price && form.cost && (() => {
        const price = parseFloat(form.price) || 0;
        const cost = parseFloat(form.cost) || 0;
        const gain = price - cost;
        const margin = price > 0 ? Math.round((gain / price) * 100) : 0;
        const isNegative = gain <= 0;
        const isLow = margin < 10 && margin >= 0;
        const isGood = margin >= 30;
        return (
          <div className={`rounded-xl p-3 space-y-1.5 text-sm ${isNegative ? "bg-rose-50 border border-rose-100" : "bg-muted/50"}`}>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-muted-foreground">Te cuesta:</span>
              <span className="font-medium">${cost.toLocaleString()}</span>
              <span className="text-muted-foreground">Lo vendes en:</span>
              <span className="font-medium">${price.toLocaleString()}</span>
              <span className="text-muted-foreground">Ganas aprox.:</span>
              <span className={`font-bold ${isNegative ? "text-rose-500" : "text-emerald-600"}`}>${gain.toLocaleString()}</span>
              <span className="text-muted-foreground">Margen:</span>
              <span className={`font-medium ${isNegative ? "text-rose-500" : isLow ? "text-amber-500" : "text-emerald-600"}`}>{margin}%</span>
            </div>
            {isNegative && <p className="text-xs text-rose-600 font-medium">⚠️ Revisa el precio: podrías no estar ganando en este producto.</p>}
            {isLow && !isNegative && <p className="text-xs text-amber-600">Este producto deja poca ganancia. Considera revisar tu precio.</p>}
            {isGood && <p className="text-xs text-emerald-600">Buen margen. Este producto puede convenirte.</p>}
          </div>
        );
      })()}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Categoría</Label>
          <Input placeholder="Ej: ropa, joyería..." value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Stock</Label>
          <Input type="number" placeholder="0" value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        </div>
      </div>

      {/* Oferta section */}
      <div className="rounded-xl border border-border p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="cursor-pointer">¿En oferta?</Label>
          <Switch checked={form.is_offer} onCheckedChange={(v) => setForm({ ...form, is_offer: v })} />
        </div>
        {form.is_offer && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Precio de oferta</Label>
                <Input type="number" placeholder="0.00" value={form.offer_price}
                  onChange={(e) => setForm({ ...form, offer_price: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Vigencia</Label>
                <Input type="date" value={form.offer_expiry}
                  onChange={(e) => setForm({ ...form, offer_expiry: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción de la oferta</Label>
              <Input placeholder="Ej: Solo esta semana" value={form.offer_description}
                onChange={(e) => setForm({ ...form, offer_description: e.target.value })} />
            </div>
          </>
        )}
      </div>

      {/* Photo */}
      <div className="space-y-2">
        <Label>Foto</Label>
        {form.photo_url && (
          <img src={form.photo_url} alt="" className="w-full h-40 object-cover rounded-xl mb-2" style={{ touchAction: "pan-y", pointerEvents: "none" }} />
        )}
        <label className="block" style={{ touchAction: "pan-y" }}>
          <div className="border-2 border-dashed border-border rounded-xl p-3 text-center text-sm text-muted-foreground cursor-pointer hover:border-primary transition-colors" style={{ touchAction: "pan-y" }}>
            {uploading ? "Subiendo foto..." : "Toca para subir foto"}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
        </label>
      </div>

      <div className="space-y-2">
        <Label>Descripción / Notas</Label>
        <Textarea placeholder="Notas del producto..." value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" className="flex-1">{product ? "Guardar" : "Crear producto"}</Button>
      </div>
    </form>
  );
}