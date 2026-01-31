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
