import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrderItemAmount, getOrderPaymentSummary } from '../src/lib/order-summary.js';

test('manual total with one item is displayed as the order total', () => {
  const item = { unit_price: 0, subtotal: 0, quantity: 1 };
  assert.deepEqual(getOrderItemAmount(item, { total: 350, items: [item] }), {
    amount: 350, usesOrderTotal: true,
  });
});

test('does not invent an allocation across unpriced products', () => {
  const item = { unit_price: 0, subtotal: 0 };
  assert.equal(getOrderItemAmount(item, { total: 350, items: [item, item] }).amount, null);
});

test('uses line subtotal, or quantity times unit price when subtotal is missing', () => {
  assert.equal(getOrderItemAmount({ subtotal: 460, unit_price: 230, quantity: 2 }, {}).amount, 460);
  assert.equal(getOrderItemAmount({ unit_price: 230, quantity: 2 }, {}).amount, 460);
  assert.equal(getOrderItemAmount({ subtotal: 0, unit_price: 230, quantity: 2 }, {}).amount, 460);
});

test('free order still displays zero', () => {
  assert.equal(getOrderItemAmount({ subtotal: 0 }, { total: 0 }).amount, 0);
});

test('advance only does not appear as a subsequent payment', () => {
  assert.deepEqual(getOrderPaymentSummary({ total: 350, advance: 100, balance: 250 }), {
    additionalPayments: 0, received: 100,
  });
});

test('includes two paid installments without double counting the advance', () => {
  assert.deepEqual(getOrderPaymentSummary({ total: 230, advance: 100, balance: 43.34 }), {
    additionalPayments: 86.66, received: 186.66,
  });
});

test('handles fully paid orders and orders without an advance', () => {
  assert.deepEqual(getOrderPaymentSummary({ total: 230, advance: 100, balance: 0 }), {
    additionalPayments: 130, received: 230,
  });
  assert.deepEqual(getOrderPaymentSummary({ total: 230, advance: 0, balance: 180 }), {
    additionalPayments: 50, received: 50,
  });
});
