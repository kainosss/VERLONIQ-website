// n8n Code node: "Build Response" (mode: Run Once for All Items)
// Summarises the outcome for the system that called the webhook (e.g. the website backend). The full lead
// is in the lead register; this response deliberately contains no customer details.
const row = $('Append to Lead Register').first().json;
const prep = $('Prepare Staff Notification').first().json;
let staff_notified = false;
try { staff_notified = $('Gmail: Notify Staff').isExecuted && !$('Gmail: Notify Staff').first().json.error; } catch (e) { staff_notified = false; }
return [{
  json: {
    ok: true,
    status: row.status,
    lead_id: row.lead_id,
    assessed_urgency: row.assessed_urgency,
    safety_flag: row.safety_flag,
    draft_created: /^created/.test(prep.draft_status),
    draft_status: prep.draft_status,
    staff_notified,
    staff_notification_note: staff_notified ? '' : prep.skipped_reason || 'staff notification failed - check n8n',
    processing_mode: row.processing_mode,
  },
}];
