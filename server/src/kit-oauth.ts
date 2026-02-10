import type { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
  { auth: { persistSession: false } }
);

const KIT_AUTH_URL = "https://api.kit.com/v4/oauth/authorize";
const KIT_TOKEN_URL = "https://api.kit.com/v4/oauth/token";
const KIT_API_BASE = "https://api.kit.com/v4";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing`);
  return v;
}

export async function kitAuthUrl(req: any, res: Response) {
  // requireAuth already set req.user.id
  const userId = req.user.id as string;

  const clientId = mustEnv("KIT_CLIENT_ID");
  const redirectUri = mustEnv("KIT_REDIRECT_URI");

  // store state to validate callback
  const state = Buffer.from(
    JSON.stringify({ userId, ts: Date.now() })
  ).toString("base64url");

  const url =
    `${KIT_AUTH_URL}?` +
    new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      state,
      // scope omitted -> default "public"
    }).toString();

  res.json({ url });
}

export async function kitCallback(req: Request, res: Response) {
  const code = String(req.query.code || "");
  const state = String(req.query.state || "");
  if (!code || !state) return res.status(400).send("Missing code/state");

  let parsed: { userId: string; ts: number };
  try {
    parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    if (Date.now() - parsed.ts > 10 * 60 * 1000) {
      return res.status(400).send("State expired");
    }
  } catch {
    return res.status(400).send("Invalid state");
  }

  const clientId = mustEnv("KIT_CLIENT_ID");
  const clientSecret = mustEnv("KIT_CLIENT_SECRET");
  const redirectUri = mustEnv("KIT_REDIRECT_URI");

  // exchange code -> tokens
  const tokenResp = await fetch(KIT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenJson: any = await tokenResp.json().catch(() => ({}));
  if (!tokenResp.ok) {
    return res.status(401).send(`Kit token exchange failed: ${tokenResp.status} - ${JSON.stringify(tokenJson)}`);
  }

  const accessToken = tokenJson.access_token as string;
  const refreshToken = tokenJson.refresh_token as string;
  const expiresIn = Number(tokenJson.expires_in || 0);
  const scope = String(tokenJson.scope || "public");
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // fetch account info (nice for UI)
  const acctResp = await fetch(`${KIT_API_BASE}/account`, {
    headers: { "Accept": "application/json", "Authorization": `Bearer ${accessToken}` },
  });
  const acctJson: any = await acctResp.json().catch(() => ({}));

  // upsert into connected_accounts
  const { error } = await supabaseAdmin
    .from("connected_accounts")
    .upsert({
      user_id: parsed.userId,
      provider: "kit",
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: tokenExpiresAt,
      scopes: scope.split(" ").filter(Boolean),
      provider_user_id: acctJson?.account?.id?.toString?.() ?? null,
      profile: acctJson ?? {},
      status: "connected",
      last_sync_at: new Date().toISOString(),
      metadata: { scope },
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

  if (error) return res.status(500).send(`Failed to store Kit connection: ${error.message}`);

  // send user back to app
  const frontendUrl = process.env.FRONTEND_PUBLIC_URL!;
  res.redirect(`${frontendUrl}/?oauth=kit`);
}

export async function kitStatus(req: any, res: Response) {
  const userId = req.user.id as string;
  const { data, error } = await supabaseAdmin
    .from("connected_accounts")
    .select("provider, profile, expires_at, status, last_sync_at")
    .eq("user_id", userId)
    .eq("provider", "kit")
    .maybeSingle();

  if (error) return res.status(500).json({ connected: false, error: error.message });
  if (!data) return res.json({ connected: false });

  const isExpired = data.expires_at && new Date(data.expires_at).getTime() < Date.now();

  res.json({
    connected: !isExpired && data.status !== 'disconnected',
    accountName: data.profile?.account?.name || data.profile?.name,
    tokenExpired: !!isExpired,
    expiresAt: data.expires_at,
    lastSyncAt: data.last_sync_at,
  });
}
