import type { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const MAILCHIMP_AUTH_URL = "https://login.mailchimp.com/oauth2/authorize";
const MAILCHIMP_TOKEN_URL = "https://login.mailchimp.com/oauth2/token";
const MAILCHIMP_METADATA_URL = "https://login.mailchimp.com/oauth2/metadata";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing`);
  return v;
}

export async function mailchimpAuthUrl(req: any, res: Response) {
  const userId = req.user.id as string;

  const clientId = mustEnv("MAILCHIMP_CLIENT_ID");
  const redirectUri = mustEnv("MAILCHIMP_REDIRECT_URI");

  const state = Buffer.from(
    JSON.stringify({ userId, ts: Date.now() })
  ).toString("base64url");

  const scope = "read:audiences read:lists read:members write:members";

  const url =
    `${MAILCHIMP_AUTH_URL}?` +
    new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope,
    }).toString();

  res.json({ url });
}

export async function mailchimpCallback(req: Request, res: Response) {
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

  const clientId = mustEnv("MAILCHIMP_CLIENT_ID");
  const clientSecret = mustEnv("MAILCHIMP_CLIENT_SECRET");
  const redirectUri = mustEnv("MAILCHIMP_REDIRECT_URI");

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const tokenResp = await fetch(MAILCHIMP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  const tokenJson: any = await tokenResp.json().catch(() => ({}));
  if (!tokenResp.ok) {
    return res.status(401).send(`Mailchimp token exchange failed: ${tokenResp.status} - ${JSON.stringify(tokenJson)}`);
  }

  const accessToken = tokenJson.access_token as string;
  const scope = String(tokenJson.scope || "");

  const metaResp = await fetch(MAILCHIMP_METADATA_URL, {
    headers: { "Authorization": `OAuth ${accessToken}` },
  });

  const metaJson: any = await metaResp.json().catch(() => ({}));
  if (!metaResp.ok) {
    return res.status(401).send(`Mailchimp metadata failed: ${metaResp.status} - ${JSON.stringify(metaJson)}`);
  }

  const accountId = metaJson?.account_id || null;
  const accountName = metaJson?.accountname || null;
  const email = metaJson?.email || null;
  const dc = metaJson?.dc || null;
  const apiEndpoint = metaJson?.api_endpoint || null;

  const { error } = await supabaseAdmin
    .from("connected_accounts")
    .upsert({
      user_id: parsed.userId,
      provider: "mailchimp",
      access_token: accessToken,
      scopes: scope ? scope.split(" ").filter(Boolean) : null,
      provider_user_id: accountId,
      profile: {
        accountId,
        accountName,
        email,
        dc,
        apiEndpoint,
      },
      status: "connected",
      last_sync_at: new Date().toISOString(),
      metadata: { dc, apiEndpoint },
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

  if (error) return res.status(500).send(`Failed to store Mailchimp connection: ${error.message}`);

  const frontendUrl = process.env.FRONTEND_PUBLIC_URL!;
  res.redirect(`${frontendUrl}/?oauth=mailchimp`);
}

export async function mailchimpStatus(req: any, res: Response) {
  const userId = req.user.id as string;
  const { data, error } = await supabaseAdmin
    .from("connected_accounts")
    .select("provider, profile, status, last_sync_at")
    .eq("user_id", userId)
    .eq("provider", "mailchimp")
    .maybeSingle();

  if (error) return res.status(500).json({ connected: false, error: error.message });
  if (!data) return res.json({ connected: false });

  const revoked = data.status === 'disconnected';

  res.json({
    connected: !revoked,
    revoked,
    tokenExpired: false,
    status: data.status,
    account: data.profile || {},
    lastSyncAt: data.last_sync_at,
  });
}

export async function mailchimpDisconnect(req: any, res: Response) {
  const userId = req.user.id as string;

  const { error } = await supabaseAdmin
    .from("connected_accounts")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "mailchimp");

  if (error) return res.status(500).json({ success: false, error: error.message });
  return res.json({ success: true });
}
