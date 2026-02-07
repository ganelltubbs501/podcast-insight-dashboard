import type { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const TWILIO_AUTH_URL = "https://oauth.twilio.com/v2/authorize";
const TWILIO_TOKEN_URL = "https://oauth.twilio.com/v2/token";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing`);
  return v;
}

export async function twilioAuthUrl(req: any, res: Response) {
  const userId = req.user.id as string;

  const clientId = mustEnv("TWILIO_CLIENT_ID");
  const redirectUri = mustEnv("TWILIO_REDIRECT_URI");

  const state = Buffer.from(
    JSON.stringify({ userId, ts: Date.now() })
  ).toString("base64url");

  // Twilio OAuth scopes for SMS and email
  const scope = "offline_access";

  const url =
    `${TWILIO_AUTH_URL}?` +
    new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      state,
      scope,
    }).toString();

  res.json({ url });
}

export async function twilioCallback(req: Request, res: Response) {
  const code = String(req.query.code || "");
  const state = String(req.query.state || "");
  const error = req.query.error;
  const errorDescription = req.query.error_description;

  const appBase = process.env.APP_PUBLIC_URL || process.env.APP_URL || "https://app.loquihq.com";

  if (error) {
    console.error(`Twilio OAuth error: ${error} - ${errorDescription}`);
    return res.redirect(`${appBase}/#/settings?twilio=error&message=${encodeURIComponent(String(errorDescription || error))}`);
  }

  if (!code || !state) {
    return res.redirect(`${appBase}/#/settings?twilio=error&message=${encodeURIComponent("Missing code or state")}`);
  }

  let parsed: { userId: string; ts: number };
  try {
    parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    if (Date.now() - parsed.ts > 10 * 60 * 1000) {
      return res.redirect(`${appBase}/#/settings?twilio=error&message=${encodeURIComponent("State expired")}`);
    }
  } catch {
    return res.redirect(`${appBase}/#/settings?twilio=error&message=${encodeURIComponent("Invalid state")}`);
  }

  const clientId = mustEnv("TWILIO_CLIENT_ID");
  const clientSecret = mustEnv("TWILIO_CLIENT_SECRET");
  const redirectUri = mustEnv("TWILIO_REDIRECT_URI");

  // Exchange code for tokens
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const tokenResp = await fetch(TWILIO_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${basicAuth}`,
    },
    body: tokenParams.toString(),
  });

  const tokenJson: any = await tokenResp.json().catch(() => ({}));
  if (!tokenResp.ok) {
    console.error("Twilio token exchange failed:", tokenJson);
    return res.redirect(`${appBase}/#/settings?twilio=error&message=${encodeURIComponent("Token exchange failed")}`);
  }

  const accessToken = tokenJson.access_token as string;
  const refreshToken = tokenJson.refresh_token as string;
  const expiresIn = Number(tokenJson.expires_in || 3600);
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  // Get account info using the token
  // Twilio's OAuth tokens can be used with the API, but we need the Account SID
  // The token response should include account info or we can fetch it
  let accountSid = tokenJson.account_sid || "";
  let accountName = "";

  // Try to get account details if we have the account SID
  if (accessToken) {
    try {
      // Use the token to get account info
      const accountResp = await fetch("https://api.twilio.com/2010-04-01/Accounts.json", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (accountResp.ok) {
        const accountData: any = await accountResp.json();
        if (accountData.accounts && accountData.accounts.length > 0) {
          const account = accountData.accounts[0];
          accountSid = account.sid || accountSid;
          accountName = account.friendly_name || "";
        }
      }
    } catch (err) {
      console.error("Failed to fetch Twilio account info:", err);
    }
  }

  // Store connection
  const { error: dbError } = await supabaseAdmin
    .from("connected_accounts")
    .upsert({
      user_id: parsed.userId,
      provider: "twilio",
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: tokenExpiresAt,
      scopes: ["sms", "email"],
      provider_user_id: accountSid || null,
      profile: {
        accountSid,
        accountName,
      },
      status: "connected",
      last_sync_at: new Date().toISOString(),
      metadata: { scope: "offline_access" },
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,provider" });

  if (dbError) {
    console.error("Failed to store Twilio connection:", dbError);
    return res.redirect(`${appBase}/#/settings?twilio=error&message=${encodeURIComponent("Failed to store connection")}`);
  }

  console.log(`✅ Twilio connected for user: ${parsed.userId.substring(0, 8)}...`);

  res.redirect(`${appBase}/#/settings?twilio=connected`);
}

export async function twilioStatus(req: any, res: Response) {
  const userId = req.user.id as string;
  const { data, error } = await supabaseAdmin
    .from("connected_accounts")
    .select("provider, profile, expires_at, status, last_sync_at")
    .eq("user_id", userId)
    .eq("provider", "twilio")
    .maybeSingle();

  if (error) return res.status(500).json({ connected: false, error: error.message });
  if (!data) return res.json({ connected: false });

  const isExpired = data.expires_at && new Date(data.expires_at).getTime() < Date.now();

  res.json({
    connected: !isExpired && data.status !== 'disconnected',
    accountSid: data.profile?.accountSid,
    accountName: data.profile?.accountName,
    tokenExpired: !!isExpired,
    expiresAt: data.expires_at,
    lastSyncAt: data.last_sync_at,
  });
}

export async function twilioDisconnect(req: any, res: Response) {
  const userId = req.user.id as string;

  const { error } = await supabaseAdmin
    .from("connected_accounts")
    .delete()
    .eq("user_id", userId)
    .eq("provider", "twilio");

  if (error) return res.status(500).json({ success: false, error: error.message });

  console.log(`🔌 Twilio disconnected for user: ${userId.substring(0, 8)}...`);

  return res.json({ success: true });
}

/**
 * Get Twilio connection for a user
 */
export async function getTwilioConnection(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("connected_accounts")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "twilio")
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }

  return data;
}

/**
 * Send SMS via Twilio
 */
export async function sendTwilioSMS(
  accessToken: string,
  accountSid: string,
  from: string,
  to: string,
  body: string
): Promise<{ success: boolean; messageSid?: string; error?: string }> {
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: from,
          To: to,
          Body: body,
        }).toString(),
      }
    );

    const data: any = await response.json();

    if (!response.ok) {
      console.error("Twilio SMS failed:", data);
      return { success: false, error: data.message || "Failed to send SMS" };
    }

    return { success: true, messageSid: data.sid };
  } catch (err: any) {
    console.error("Twilio SMS error:", err);
    return { success: false, error: err.message };
  }
}
