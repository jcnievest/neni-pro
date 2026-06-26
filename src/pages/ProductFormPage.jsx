import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProducts, createProduct, updateProduct } from "@/api/entities";
import ProductForm from "@/components/products/ProductForm";
import { ArrowLeft } from "lucide-react";

export default function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const qc = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => getProducts("name", 500),
    enabled: !!id,
  });

  const product = id ? products.find((p) => p.id === id) : null;

  const createMut = useMutation({
    mutationFn: (data) => createProduct(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); navigate("/productos"); },
  });

  const updateMut = useMutation({
    mutationFn: (data) => updateProduct(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); navigate("/productos"); },
  });

  return (
    <div className="space-y-4">
      <button onClick={() => navigate("/productos")} className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>
      <h2 className="font-bold text-lg">{id ? "Editar producto" : "Nuevo producto"}</h2>
      <ProductForm
        product={product}
        onSubmit={(data) => id ? updateMut.mutate(data) : createMut.mutate(data)}
        onCancel={() => navigate("/productos")}
      />
    </div>
  );
}
