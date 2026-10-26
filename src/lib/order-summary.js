const cents = (value) => Math.round((Number(value) || 0) * 100);

export function getOrderPaymentSummary(order) {
  const total = cents(order.total);
  const advance = cents(order.advance);
  const balance = cents(order.balance);
  // Balance already includes the advance and subsequent payments.
  const received = Math.max(0, total - balance);
  return {
    additionalPayments: Math.max(0, received - advance) / 100,
    received: received / 100,
  };
}

export function getOrderItemAmount(item, order) {
  const subtotal = cents(item.subtotal);
  const calculated = Math.round(cents(item.unit_price) * (Number(item.quantity) || 1));
  if (subtotal > 0 || calculated > 0) {
    return { amount: (subtotal || calculated) / 100, usesOrderTotal: false };
  }
  // A manual order total does not provide a per-product breakdown.
  if (order.items?.length === 1 && cents(order.total) > 0) {
    return { amount: cents(order.total) / 100, usesOrderTotal: true };
  }
  return { amount: cents(order.total) === 0 ? 0 : null, usesOrderTotal: false };
}
