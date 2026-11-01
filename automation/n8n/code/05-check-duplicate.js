// n8n Code node: "Check Duplicate" (mode: Run Once for All Items)
// Input: rows returned by "Find Existing Lead" (Google Sheets lookup on dedupe_key).
// "Always Output Data" is on for that node, so an empty lookup still arrives here as one empty item.
// If the lookup itself failed (Sheets unavailable), the enquiry is processed anyway rather than lost,
// and the lead is flagged so staff can check for a duplicate by hand.
const ctx = $('Validate & Normalise Enquiry').first().json;
const items = $input.all().map((i) => i.json || {});
const lookupFailed = items.some((r) => r.error);
const existing = items.find((r) => r && r.lead_id && String(r.dedupe_key) === ctx.dedupe_key);
return [{
  json: {
    ...ctx,
    duplicate: Boolean(existing),
    existing_lead_id: existing ? String(existing.lead_id) : '',
    dedupe_check: lookupFailed ? 'failed' : 'ok',
  },
}];
