import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function requireUserId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');
  return user.id;
}

function parseSort(sortField, defaultColumn = 'created_at') {
  if (!sortField) return { column: defaultColumn, ascending: false };
  const desc = sortField.startsWith('-');
  const column = desc ? sortField.slice(1) : sortField;
  const mapped = column === 'created_date' ? 'created_at' : column;
  return { column: mapped, ascending: !desc };
}

function slugify(text) {
  return (text || 'tienda')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'tienda';
}

function toClient(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    instagram: row.instagram,
    facebook: row.facebook,
    notes: row.notes,
    tag: row.tag,
    created_date: row.created_at,
  };
}

function toProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price != null ? Number(row.price) : 0,
    cost: row.cost != null ? Number(row.cost) : undefined,
    stock: row.stock != null ? Number(row.stock) : undefined,
    photo_url: row.photo_url,
    notes: row.notes,
    is_offer: row.is_offer,
    offer_price: row.offer_price != null ? Number(row.offer_price) : undefined,
    offer_description: row.offer_description,
    offer_expiry: row.offer_expiry,
    created_date: row.created_at,
  };
}

function toOrderItem(row) {
  return {
    product_id: row.product_id,
    product_name: row.product_name,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
    unit_cost: row.unit_cost != null ? Number(row.unit_cost) : 0,
    subtotal: Number(row.subtotal),
  };
}

function isStockControlled(stock) {
  return stock !== null && stock !== undefined && Number.isFinite(Number(stock));
}

function getRequestedStockByProduct(items) {
  const requestedByProduct = new Map();

  for (const item of items) {
    if (!item.product_id) continue;
    const quantity = Number(item.quantity) || 1;
    if (quantity <= 0) continue;

    const current = requestedByProduct.get(item.product_id) || {
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: 0,
    };

    current.quantity += quantity;
    requestedByProduct.set(item.product_id, current);
  }

  return [...requestedByProduct.values()];
}

function buildStockError(productName, available, requested) {
  return `No hay suficiente stock de ${productName}. Disponible: ${available}. Solicitado: ${requested}.`;
}

function toPayment(row) {
  return {
    id: row.id,
    amount: Number(row.amount),
    due_date: row.due_date,
    status: row.status,
    paid_date: row.paid_date,
  };
}

function toOrder(order, items = [], paymentRows = [], delivery = null) {
  return {
    id: order.id,
    client_id: order.client_id,
    client_name: order.client_name,
    client_phone: order.client_phone,
    items: items.map(toOrderItem),
    total: Number(order.total),
    advance: Number(order.advance),
    balance: Number(order.balance),
    total_cost: order.total_cost != null ? Number(order.total_cost) : 0,
    delivery_date: order.delivery_date,
    status: order.status,
    notes: order.notes,
    delivered: delivery?.delivered ?? order.delivered,
    payment_plan: paymentRows.map(toPayment),
    created_date: order.created_at,
  };
}

function toSettings(row) {
  if (!row) return null;
  return {
    id: row.id,
    monthly_goal: row.monthly_goal != null ? Number(row.monthly_goal) : undefined,
    whatsapp_phone: row.whatsapp_phone,
    shop_name: row.shop_name,
    shop_description: row.shop_description,
    catalog_wa_message: row.catalog_wa_message,
    catalog_slug: row.catalog_slug,
    catalog_public: row.catalog_public,
    created_date: row.created_at,
  };
}

function toPaymentCard(row) {
  if (!row) return null;
  return {
    id: row.id,
    shop_name: row.shop_name,
    holder_name: row.holder_name,
    bank: row.bank,
    clabe: row.clabe,
    card_number: row.card_number,
    phone: row.phone,
    payment_note: row.payment_note,
    card_color: row.card_color,
    logo_url: row.logo_url,
    created_date: row.created_at,
  };
}

async function assembleOrders(orderRows) {
  if (!orderRows.length) return [];

  const orderIds = orderRows.map((o) => o.id);

  const [itemsRes, paymentsRes, deliveriesRes] = await Promise.all([
    supabase.from('order_items').select('*').in('order_id', orderIds).order('created_at'),
    supabase.from('payments').select('*').in('order_id', orderIds).order('sort_order'),
    supabase.from('deliveries').select('*').in('order_id', orderIds),
  ]);

  if (itemsRes.error) throw itemsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;
  if (deliveriesRes.error) throw deliveriesRes.error;

  const itemsByOrder = {};
  for (const item of itemsRes.data) {
    if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
    itemsByOrder[item.order_id].push(item);
  }

  const paymentsByOrder = {};
  for (const p of paymentsRes.data) {
    if (!paymentsByOrder[p.order_id]) paymentsByOrder[p.order_id] = [];
    paymentsByOrder[p.order_id].push(p);
  }

  const deliveryByOrder = {};
  for (const d of deliveriesRes.data) {
    deliveryByOrder[d.order_id] = d;
  }

  return orderRows.map((order) =>
    toOrder(order, itemsByOrder[order.id] || [], paymentsByOrder[order.id] || [], deliveryByOrder[order.id])
  );
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export async function getClients(sort = '-created_date', limit = 500) {
  const userId = await requireUserId();
  const { column, ascending } = parseSort(sort, 'created_at');

  let query = supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order(column, { ascending });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data.map(toClient);
}

export async function createClient(payload) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...payload, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return toClient(data);
}

export async function updateClient(id, payload) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('clients')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return toClient(data);
}

export async function deleteClient(id) {
  const userId = await requireUserId();
  const { error } = await supabase.from('clients').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

const PRODUCT_COLUMNS = [
  'id',
  'user_id',
  'name',
  'category',
  'price',
  'cost',
  'stock',
  'photo_url',
  'notes',
  'is_offer',
  'offer_price',
  'offer_description',
  'offer_expiry',
  'created_at',
];

const PRODUCT_SELECT = PRODUCT_COLUMNS.join(', ');

const PRODUCT_WRITABLE_KEYS = [
  'name',
  'category',
  'price',
  'cost',
  'stock',
  'photo_url',
  'notes',
  'is_offer',
  'offer_price',
  'offer_description',
  'offer_expiry',
];

function pickProductPayload(payload) {
  const row = {};
  for (const key of PRODUCT_WRITABLE_KEYS) {
    if (payload[key] === undefined) continue;
    const value = payload[key];
    if (value === '') {
      row[key] = null;
    } else if (key === 'is_offer') {
      row[key] = Boolean(value);
    } else {
      row[key] = value;
    }
  }
  return row;
}

export async function getProducts(sort = '-created_date', limit = 500) {
  const userId = await requireUserId();
  const { column, ascending } = parseSort(sort, 'created_at');
  const orderColumn = PRODUCT_COLUMNS.includes(column) ? column : 'created_at';

  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('user_id', userId)
    .order(orderColumn, { ascending });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data.map(toProduct);
}

export async function createProduct(payload) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('products')
    .insert({ ...pickProductPayload(payload), user_id: userId })
    .select(PRODUCT_SELECT)
    .single();
  if (error) throw error;
  return toProduct(data);
}

export async function updateProduct(id, payload) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('products')
    .update(pickProductPayload(payload))
    .eq('id', id)
    .eq('user_id', userId)
    .select(PRODUCT_SELECT)
    .single();
  if (error) throw error;
  return toProduct(data);
}

export async function deleteProduct(id) {
  const userId = await requireUserId();
  const { error } = await supabase.from('products').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

async function getStockPlanForItems(userId, items) {
  const requestedItems = getRequestedStockByProduct(items);
  if (requestedItems.length === 0) return [];

  const productIds = requestedItems.map((item) => item.product_id);
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('user_id', userId)
    .in('id', productIds);
  if (error) throw error;

  const productsById = new Map(data.map((row) => [row.id, row]));
  const stockPlan = [];

  for (const item of requestedItems) {
    const product = productsById.get(item.product_id);
    if (!product || !isStockControlled(product.stock)) continue;

    const available = Number(product.stock);
    if (available < item.quantity) {
      throw new Error(buildStockError(product.name || item.product_name, available, item.quantity));
    }

    stockPlan.push({
      id: product.id,
      name: product.name || item.product_name,
      previousStock: available,
      nextStock: available - item.quantity,
      requested: item.quantity,
    });
  }

  return stockPlan;
}

async function rollbackStockUpdates(userId, updatedProducts) {
  await Promise.all(
    updatedProducts.map((product) =>
      supabase
        .from('products')
        .update({ stock: product.previousStock })
        .eq('id', product.id)
        .eq('user_id', userId)
    )
  );
}

async function decrementStockForOrder(userId, stockPlan) {
  const updatedProducts = [];

  try {
    for (const product of stockPlan) {
      const { data, error } = await supabase
        .from('products')
        .update({ stock: product.nextStock })
        .eq('id', product.id)
        .eq('user_id', userId)
        .eq('stock', product.previousStock)
        .select('id, stock');

      if (error) throw error;
      if (!data?.length) {
        throw new Error(buildStockError(product.name, product.previousStock, product.requested));
      }

      updatedProducts.push(product);
    }
  } catch (error) {
    await rollbackStockUpdates(userId, updatedProducts);
    throw error;
  }

  return updatedProducts;
}

export async function uploadProductPhoto(file) {
  const userId = await requireUserId();
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('product-photos').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from('product-photos').getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function getOrders(sort = '-created_date', limit = 500) {
  const userId = await requireUserId();
  const { column, ascending } = parseSort(sort, 'created_at');

  let query = supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order(column, { ascending });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return assembleOrders(data);
}

export async function getOrder(id) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();
  if (error) throw error;
  const [assembled] = await assembleOrders([data]);
  return assembled;
}

export async function createOrder(payload) {
  const userId = await requireUserId();
  const { items = [], payment_plan = [], delivery_date, delivered = false, ...orderFields } = payload;
  const stockPlan = await getStockPlanForItems(userId, items);
  const updatedStockProducts = await decrementStockForOrder(userId, stockPlan);

  try {
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        client_id: orderFields.client_id || null,
        client_name: orderFields.client_name,
        client_phone: orderFields.client_phone,
        total: orderFields.total,
        advance: orderFields.advance ?? 0,
        balance: orderFields.balance ?? 0,
        total_cost: orderFields.total_cost ?? 0,
        delivery_date: delivery_date || null,
        status: orderFields.status ?? 'apartado',
        notes: orderFields.notes,
        delivered,
      })
      .select()
      .single();
    if (error) throw error;

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('order_items').insert(
        items.map((item) => ({
          order_id: order.id,
          user_id: userId,
          product_id: item.product_id || null,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost: item.unit_cost ?? 0,
          subtotal: item.subtotal,
        }))
      );
      if (itemsError) throw itemsError;
    }

    if (payment_plan.length > 0) {
      const { error: paymentsError } = await supabase.from('payments').insert(
        payment_plan.map((p, i) => ({
          id: p.id || crypto.randomUUID(),
          order_id: order.id,
          user_id: userId,
          amount: p.amount,
          due_date: p.due_date || null,
          status: p.status ?? 'pendiente',
          paid_date: p.paid_date || null,
          sort_order: i,
        }))
      );
      if (paymentsError) throw paymentsError;
    }

    const { error: deliveryError } = await supabase.from('deliveries').insert({
      order_id: order.id,
      user_id: userId,
      delivery_date: delivery_date || null,
      delivered,
      status: orderFields.status,
      notes: null,
    });
    if (deliveryError) throw deliveryError;

    return getOrder(order.id);
  } catch (error) {
    await rollbackStockUpdates(userId, updatedStockProducts);
    throw error;
  }
}

export async function updateOrder(id, payload) {
  const userId = await requireUserId();
  const { items, payment_plan, delivered, delivery_date, ...orderFields } = payload;

  const orderUpdate = { ...orderFields };
  if (delivered !== undefined) orderUpdate.delivered = delivered;
  if (delivery_date !== undefined) orderUpdate.delivery_date = delivery_date;

  if (Object.keys(orderUpdate).length > 0) {
    const { error } = await supabase
      .from('orders')
      .update(orderUpdate)
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  }

  if (payment_plan !== undefined) {
    await supabase.from('payments').delete().eq('order_id', id).eq('user_id', userId);
    if (payment_plan.length > 0) {
      const { error: paymentsError } = await supabase.from('payments').insert(
        payment_plan.map((p, i) => ({
          id: p.id || crypto.randomUUID(),
          order_id: id,
          user_id: userId,
          amount: p.amount,
          due_date: p.due_date || null,
          status: p.status ?? 'pendiente',
          paid_date: p.paid_date || null,
          sort_order: i,
        }))
      );
      if (paymentsError) throw paymentsError;
    }
  }

  if (delivered !== undefined || delivery_date !== undefined || orderFields.status !== undefined) {
    const deliveryUpdate = {};
    if (delivered !== undefined) deliveryUpdate.delivered = delivered;
    if (delivery_date !== undefined) deliveryUpdate.delivery_date = delivery_date;
    if (orderFields.status !== undefined) deliveryUpdate.status = orderFields.status;
    deliveryUpdate.updated_at = new Date().toISOString();

    const { error: deliveryError } = await supabase
      .from('deliveries')
      .update(deliveryUpdate)
      .eq('order_id', id)
      .eq('user_id', userId);
    if (deliveryError) throw deliveryError;
  }

  return getOrder(id);
}

// ---------------------------------------------------------------------------
// Payments (installment plan rows)
// ---------------------------------------------------------------------------

export async function getPayments(orderId) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', orderId)
    .eq('user_id', userId)
    .order('sort_order');
  if (error) throw error;
  return data.map(toPayment);
}

export async function createPayment(orderId, payload) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('payments')
    .insert({
      id: payload.id || crypto.randomUUID(),
      order_id: orderId,
      user_id: userId,
      amount: payload.amount,
      due_date: payload.due_date || null,
      status: payload.status ?? 'pendiente',
      paid_date: payload.paid_date || null,
      sort_order: payload.sort_order ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return toPayment(data);
}

export async function updatePayment(id, payload) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('payments')
    .update(payload)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return toPayment(data);
}

export async function deletePayment(id) {
  const userId = await requireUserId();
  const { error } = await supabase.from('payments').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Deliveries
// ---------------------------------------------------------------------------

export async function getDeliveries(limit = 500) {
  const userId = await requireUserId();
  let query = supabase
    .from('deliveries')
    .select('*')
    .eq('user_id', userId)
    .order('delivery_date', { ascending: true });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createDelivery(payload) {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('deliveries')
    .insert({ ...payload, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDelivery(orderId, payload) {
  return updateOrder(orderId, payload);
}

export async function deleteDelivery(id) {
  const userId = await requireUserId();
  const { error } = await supabase.from('deliveries').delete().eq('id', id).eq('user_id', userId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Settings (singleton per user)
// ---------------------------------------------------------------------------

export async function getSettings() {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? [toSettings(data)] : [];
}

export async function upsertSettings(payload) {
  const userId = await requireUserId();
  const { data: existing } = await supabase
    .from('settings')
    .select('id, catalog_slug')
    .eq('user_id', userId)
    .maybeSingle();

  const catalogSlug =
    payload.catalog_slug ||
    existing?.catalog_slug ||
    slugify(payload.shop_name || 'mi-tienda');

  const row = {
    ...payload,
    user_id: userId,
    catalog_slug: catalogSlug,
    catalog_public: payload.catalog_public ?? true,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('settings')
      .update(row)
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return toSettings(data);
  }

  const { data, error } = await supabase.from('settings').insert(row).select().single();
  if (error) throw error;
  return toSettings(data);
}

// ---------------------------------------------------------------------------
// Payment card (singleton per user)
// ---------------------------------------------------------------------------

export async function getPaymentCard() {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from('payment_cards')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? [toPaymentCard(data)] : [];
}

export async function upsertPaymentCard(payload) {
  const userId = await requireUserId();
  const { data: existing } = await supabase
    .from('payment_cards')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  const row = { ...payload, user_id: userId, updated_at: new Date().toISOString() };

  if (existing?.id) {
    const { data, error } = await supabase
      .from('payment_cards')
      .update(row)
      .eq('id', existing.id)
      .eq('user_id', userId)
      .select()
      .single();
    if (error) throw error;
    return toPaymentCard(data);
  }

  const { data, error } = await supabase.from('payment_cards').insert(row).select().single();
  if (error) throw error;
  return toPaymentCard(data);
}

// ---------------------------------------------------------------------------
// Public catalog (no auth required)
// ---------------------------------------------------------------------------

async function getSettingsByCatalogSlug(catalogSlug) {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('catalog_slug', catalogSlug)
    .eq('catalog_public', true)
    .maybeSingle();
  if (error) throw error;
  return data ? toSettings(data) : null;
}

export async function getPublicSettings(catalogSlug) {
  if (!catalogSlug) return [];
  const settings = await getSettingsByCatalogSlug(catalogSlug);
  return settings ? [settings] : [];
}

export async function getPublicProducts(catalogSlug, sort = 'name', limit = 500) {
  if (!catalogSlug) return [];

  const { data: settingsRow, error: settingsError } = await supabase
    .from('settings')
    .select('user_id')
    .eq('catalog_slug', catalogSlug)
    .eq('catalog_public', true)
    .maybeSingle();
  if (settingsError) throw settingsError;
  if (!settingsRow) return [];

  const { column, ascending } = parseSort(sort, 'name');
  const orderColumn = PRODUCT_COLUMNS.includes(column) ? column : 'name';
  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('user_id', settingsRow.user_id)
    .order(orderColumn, { ascending });

  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return data.map(toProduct);
}

export function getCatalogUrl(catalogSlug) {
  if (!catalogSlug) return `${window.location.origin}/catalogo`;
  return `${window.location.origin}/catalogo?tienda=${catalogSlug}`;
}
