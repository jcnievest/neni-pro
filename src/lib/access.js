import { supabase } from "@/lib/supabase";

export const SUBSCRIPTION_URL = "https://mpago.la/1FzRfQS";
export const TRIAL_DAYS = 7;

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "paid",
  "subscribed",
  "approved",
  "authorized",
  "activo",
  "activa",
  "pagado",
  "pagada",
]);

function parseAccessDate(value, endOfDay = false) {
  if (!value) return null;

  const dateOnly = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = dateOnly ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  if (dateOnly && endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
}

function getSubscriptionEnd(subscription) {
  return parseAccessDate(
    subscription?.expires_at ||
      subscription?.current_period_end ||
      subscription?.subscription_end ||
      subscription?.ends_at,
    true
  );
}

export function isSubscriptionActive(subscription, now = new Date()) {
  if (!subscription) return false;

  const status = String(subscription.status || subscription.subscription_status || "").toLowerCase();
  if (!ACTIVE_SUBSCRIPTION_STATUSES.has(status)) return false;

  const subscriptionEnd = getSubscriptionEnd(subscription);
  return !subscriptionEnd || subscriptionEnd >= now;
}

function getFallbackTrialEnd(user) {
  const createdAt = parseAccessDate(user?.created_at || user?.createdAt);
  if (!createdAt) return null;

  const trialEnd = new Date(createdAt);
  trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
  trialEnd.setHours(23, 59, 59, 999);
  return trialEnd;
}

export function getTrialEnd(subscription, user = null) {
  return parseAccessDate(subscription?.trial_end || subscription?.trial_ends_at, true) || getFallbackTrialEnd(user);
}

export function getTrialDaysLeft(subscription, now = new Date(), user = null) {
  const trialEnd = getTrialEnd(subscription, user);
  if (!trialEnd) return null;

  const remainingMs = trialEnd.getTime() - now.getTime();
  if (remainingMs < 0) return -1;

  const nowDay = new Date(now);
  nowDay.setHours(0, 0, 0, 0);

  const endDay = new Date(trialEnd);
  endDay.setHours(0, 0, 0, 0);

  return Math.round((endDay.getTime() - nowDay.getTime()) / (1000 * 60 * 60 * 24));
}

export function isTrialActive(subscription, now = new Date(), user = null) {
  const trialEnd = getTrialEnd(subscription, user);
  return Boolean(trialEnd && trialEnd >= now);
}

export function isTrialExpired(subscription, now = new Date(), user = null) {
  const trialEnd = getTrialEnd(subscription, user);
  return Boolean(trialEnd && trialEnd < now);
}

export function getAccessState(subscription, now = new Date(), user = null) {
  const subscriptionActive = isSubscriptionActive(subscription, now);
  const trialActive = isTrialActive(subscription, now, user);
  const trialExpired = isTrialExpired(subscription, now, user);
  const trialDaysLeft = getTrialDaysLeft(subscription, now, user);

  return {
    hasAccess: subscriptionActive || trialActive,
    subscriptionActive,
    trialActive,
    trialExpired,
    trialDaysLeft,
    missingSubscription: !subscription,
  };
}

export async function getUserSubscription(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function requireActiveAccess(userId) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.id !== userId) {
    throw new Error("Not authenticated");
  }

  const subscription = await getUserSubscription(userId);
  const access = getAccessState(subscription, new Date(), user);

  if (!access.hasAccess) {
    throw new Error("Tu prueba gratuita terminó. Suscríbete para seguir usando Nenis Pro.");
  }

  return access;
}
