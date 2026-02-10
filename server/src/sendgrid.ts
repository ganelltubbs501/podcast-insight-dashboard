// server/src/sendgrid.ts
// SendGrid API utility functions (validation, lists, templates)

type SendGridList = {
  id: string;
  name: string;
};

type SendGridTemplate = {
  id: string;
  name: string;
  generation?: string; // "dynamic" etc.
  updated_at?: string;
};

const SG_BASE = "https://api.sendgrid.com/v3";

function sgHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export function looksLikeSendGridKey(apiKey: string) {
  // Common pattern: "SG.xxxxx"
  return typeof apiKey === "string" && apiKey.trim().startsWith("SG.");
}

export async function validateSendGridKey(apiKey: string) {
  // Validate by fetching user account
  const resp = await fetch(`${SG_BASE}/user/account`, {
    method: "GET",
    headers: sgHeaders(apiKey),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`SendGrid key validation failed: ${resp.status} ${text}`);
  }

  const json = (await resp.json().catch(() => ({}))) as any;

  // Fetch profile for additional details (optional)
  let profileJson: any = null;
  try {
    const profileResp = await fetch(`${SG_BASE}/user/profile`, {
      method: "GET",
      headers: sgHeaders(apiKey),
    });
    if (profileResp.ok) {
      profileJson = await profileResp.json();
    }
  } catch (_e) {
    // Profile fetch is optional
  }

  // Fetch account email (optional)
  let email: string | null = null;
  try {
    const emailResp = await fetch(`${SG_BASE}/user/email`, {
      method: "GET",
      headers: sgHeaders(apiKey),
    });
    if (emailResp.ok) {
      const emailData = (await emailResp.json()) as any;
      email = emailData?.email || null;
    }
  } catch (_e) {
    // Email fetch is optional
  }

  const accountName =
    email ||
    json?.username ||
    profileJson?.first_name ||
    "SendGrid";

  return {
    ok: true,
    accountName,
    email,
    profile: {
      username: json?.username || "",
      email: email || "",
      firstName: profileJson?.first_name || "",
      lastName: profileJson?.last_name || "",
    },
  };
}

export async function fetchSendGridLists(apiKey: string): Promise<SendGridList[]> {
  const resp = await fetch(`${SG_BASE}/marketing/lists?page_size=100`, {
    method: "GET",
    headers: sgHeaders(apiKey),
  });

  if (!resp.ok) {
    // Return empty array if marketing is not enabled
    if (resp.status === 404 || resp.status === 403) {
      return [];
    }
    const text = await resp.text().catch(() => "");
    throw new Error(`Failed to fetch SendGrid lists: ${resp.status} ${text}`);
  }

  const json = (await resp.json()) as any;
  const lists = Array.isArray(json?.result) ? json.result : [];

  return lists.map((l: any) => ({
    id: String(l.id),
    name: String(l.name ?? "Untitled list"),
  }));
}

export async function fetchSendGridTemplates(apiKey: string): Promise<SendGridTemplate[]> {
  // Fetch both legacy + dynamic templates
  const resp = await fetch(`${SG_BASE}/templates?generations=legacy,dynamic&page_size=200`, {
    method: "GET",
    headers: sgHeaders(apiKey),
  });

  if (!resp.ok) {
    // Return empty array if templates endpoint not accessible
    if (resp.status === 404 || resp.status === 403) {
      return [];
    }
    const text = await resp.text().catch(() => "");
    throw new Error(`Failed to fetch SendGrid templates: ${resp.status} ${text}`);
  }

  const json = (await resp.json()) as any;
  const templates = Array.isArray(json?.templates) ? json.templates : [];

  return templates.map((t: any) => ({
    id: String(t.id),
    name: String(t.name ?? "Untitled template"),
    generation: t.generation,
    updated_at: t.updated_at,
  }));
}

export async function createAndScheduleSendGridSingleSend(
  apiKey: string,
  options: {
    name: string;
    subject: string;
    listIds: string[];
    templateId: string;
    senderEmail?: string;
    senderName?: string;
    htmlContent?: string;
  }
): Promise<{ id: string }> {
  // Build the single send payload
  const payload: any = {
    name: options.name,
    send_to: {
      list_ids: options.listIds,
    },
    email_config: {
      subject: options.subject,
      design_id: options.templateId,
      suppression_group_id: null,
    },
  };

  // Set sender if provided
  if (options.senderEmail) {
    payload.email_config.sender_id = undefined; // will be resolved by SendGrid from email
    payload.email_config.custom_unsubscribe_url = undefined;
  }

  // If html content is provided instead of a template, use it directly
  if (options.htmlContent && !options.templateId) {
    delete payload.email_config.design_id;
    payload.email_config.html_content = options.htmlContent;
    payload.email_config.plain_content = "";
  }

  // Step 1: Create the Single Send
  const createResp = await fetch(`${SG_BASE}/marketing/singlesends`, {
    method: "POST",
    headers: sgHeaders(apiKey),
    body: JSON.stringify(payload),
  });

  if (!createResp.ok) {
    const text = await createResp.text().catch(() => "");
    throw new Error(`Failed to create SendGrid Single Send: ${createResp.status} ${text}`);
  }

  const createData = (await createResp.json()) as any;
  const singleSendId = createData.id;

  if (!singleSendId) {
    throw new Error("SendGrid Single Send created but no ID returned");
  }

  // Step 2: Schedule the Single Send to send now
  const scheduleResp = await fetch(`${SG_BASE}/marketing/singlesends/${singleSendId}/schedule`, {
    method: "PUT",
    headers: sgHeaders(apiKey),
    body: JSON.stringify({ send_at: "now" }),
  });

  if (!scheduleResp.ok) {
    const text = await scheduleResp.text().catch(() => "");
    throw new Error(`Failed to schedule SendGrid Single Send: ${scheduleResp.status} ${text}`);
  }

  return { id: singleSendId };
}
