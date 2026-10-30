// n8n Code node: "Check Duplicate" (mode: Run Once for All Items)
// Input: rows returned by "Find Existing Lead" (Google Sheets lookup on dedupe_key).
// "Always Output Data" is on for that node, so an empty lookup still arrives here as one empty item.
const ctx = $('Validate & Normalise Enquiry').first().json;
const rows = $input.all().map((i) => i.json).filter((r) => r && r.lead_id);
const existing = rows.find((r) => String(r.dedupe_key) === ctx.dedupe_key);
return [{ json: { ...ctx, duplicate: Boolean(existing), existing_lead_id: existing ? String(existing.lead_id) : '' } }];
