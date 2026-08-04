const MAILERLITE_API_URL = "https://connect.mailerlite.com/api/subscribers";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function sanitizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const apiKey = Deno.env.get("MAILERLITE_API_KEY");
  const groupId = Deno.env.get("MAILERLITE_GROUP_ID");

  if (!apiKey) {
    console.error("MAILERLITE_API_KEY is not configured");
    return jsonResponse({ ok: false, skipped: true, reason: "missing_api_key" });
  }

  let payload: Record<string, unknown>;

  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const email = sanitizeString(payload.email).toLowerCase();
  const name = sanitizeString(payload.name);

  if (!email) {
    return jsonResponse({ error: "Email is required" }, 400);
  }

  const fields: Record<string, string> = {};

  if (name) {
    fields.name = name;
  }

  const mailerLitePayload: Record<string, unknown> = {
    email,
    status: "active",
  };

  if (Object.keys(fields).length > 0) {
    mailerLitePayload.fields = fields;
  }

  if (groupId) {
    mailerLitePayload.groups = [groupId];
  }

  const response = await fetch(MAILERLITE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(mailerLitePayload),
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("MailerLite subscriber sync failed", response.status, details);
    return jsonResponse({ ok: false, error: "mailerlite_request_failed" }, 502);
  }

  const data = await response.json();
  return jsonResponse({ ok: true, subscriberId: data?.data?.id ?? null });
});
