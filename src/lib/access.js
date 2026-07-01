import { supabase } from "@/lib/supabase";

export const SUBSCRIPTION_URL = "https://mpago.la/1FzRfQS";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "paid",
  "subscribed",
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

export function getTrialEnd(subscription) {
  return parseAccessDate(subscription?.trial_end || subscription?.trial_ends_at, true);
}

export function getTrialDaysLeft(subscription, now = new Date()) {
  const trialEnd = getTrialEnd(subscription);
  if (!trialEnd) return null;

  const remainingMs = trialEnd.getTime() - now.getTime();
  if (remainingMs < 0) return -1;

  const nowDay = new Date(now);
  nowDay.setHours(0, 0, 0, 0);

  const endDay = new Date(trialEnd);
  endDay.setHours(0, 0, 0, 0);

  return Math.round((endDay.getTime() - nowDay.getTime()) / (1000 * 60 * 60 * 24));
}

export function isTrialActive(subscription, now = new Date()) {
  const trialEnd = getTrialEnd(subscription);
  return Boolean(trialEnd && trialEnd >= now);
}

export function isTrialExpired(subscription, now = new Date()) {
  const trialEnd = getTrialEnd(subscription);
  return Boolean(trialEnd && trialEnd < now);
}

export function getAccessState(subscription, now = new Date()) {
  const subscriptionActive = isSubscriptionActive(subscription, now);
  const trialActive = isTrialActive(subscription, now);
  const trialExpired = isTrialExpired(subscription, now);
  const trialDaysLeft = getTrialDaysLeft(subscription, now);

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
  const subscription = await getUserSubscription(userId);
  const access = getAccessState(subscription);

  if (!access.hasAccess) {
    throw new Error("Tu prueba gratuita terminó. Suscríbete para seguir usando Nenis Pro.");
  }

  return access;
}
