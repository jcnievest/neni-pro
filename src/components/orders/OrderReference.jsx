import { formatOrderReference } from "@/lib/order-reference";

export default function OrderReference({ order }) {
  const reference = formatOrderReference(order.reference_number);
  if (!reference) return null;
  return <p className="text-sm font-mono font-semibold text-primary break-all">Pedido {reference}</p>;
}
