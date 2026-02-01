# Email/CRM Integrations

This folder provides a unified adapter interface for Email/CRM providers.

Adapters implement a common set of methods:
- connect/auth (getAuthUrl + handleCallback)
- getStatus
- disconnect
- listAudiences
- upsertContact
- subscribe
- tag
- sendOrTrigger

Each endpoint should return a structured response with `supported: true|false` to enable fallback paths in the UI.

## Canonical Email Automation Model

**Internal concept:** `EmailAutomationConnector`

Stored fields (provider-agnostic):

```
{
	provider: 'mailchimp' | 'kit' | 'beehiiv' | 'gohighlevel',
	account_id,
	audience_id,
	trigger_tag,
	connected_at,
	token_expires_at
}
```

Runtime behavior (identical everywhere):

- When a user schedules email content, LoquiHQ validates:
	- provider connected
	- trigger tag selected
- At scheduled time: apply tag to subscriber
- Done

No branching logic per provider.

## 1:1 Provider Mapping

### 🟡 Mailchimp
- Audience → Audience
- Subscriber → Member
- Trigger → Tag
- Automation → Customer Journey
- API action → Add tag to member

Trigger logic: Tag added → Journey starts

### 🟡 Kit (ConvertKit)
- Audience → Subscribers
- Subscriber → Subscriber
- Trigger → Tag
- Automation → Sequence
- API action → Add tag to subscriber

Trigger logic: Tag added → Sequence starts

### 🟡 Beehiiv
- Audience → Publication
- Subscriber → Subscriber
- Trigger → Tag / Segment
- Automation → Automation
- API action → Add tag to subscriber

Trigger logic: Tag added → Automation fires

### 🟡 GoHighLevel (GHL)
- Audience → Contacts
- Subscriber → Contact
- Trigger → Tag
- Automation → Workflow
- API action → Add tag to contact

Trigger logic: Tag added → Workflow executes

### Invariant Across Providers
- User creates automation
- User owns content
- User owns timing
- LoquiHQ applies tag
- Provider does the rest

## Mailchimp OAuth Scopes (Minimum)

Required:

- `read:audiences`
- `read:lists`
- `read:members`
- `write:members`

Deliberately not requested:

- create campaigns
- send campaigns
- read campaign stats
- manage journeys
- modify templates

## Standard Analytics Ingestion

When a provider exposes analytics, normalize into a single shape before persisting to `scheduled_posts.metrics`.

Standard keys:

- impressions
- clicks
- likes
- shares
- comments
- opens
- openRate
- clickRate
- deliveries
- unsubscribes
- bounces
