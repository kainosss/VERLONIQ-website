// n8n Code node: "Prepare Staff Notification" (mode: Run Once for All Items)
// Builds the INTERNAL email that tells a staff member a lead is waiting for review. The recipient comes
// only from the configuration (staff_notification.to), never from the enquiry, so this can't email a customer.
const { config } = $('Workflow Configuration').first().json;
const row = $('Append to Lead Register').first().json;
const ran = (name) => { try { return $(name).isExecuted; } catch (e) { return false; } };

let draft_status;
if (!config.customer_drafts.enabled) draft_status = 'disabled in configuration';
else if (!row.draft_body) draft_status = 'not created (no AI draft available)';
else if (!row.customer_email) draft_status = row.customer_phone ? 'not created (no email address - phone the customer)' : 'not created (no contact details)';
else if (ran('Gmail: Create Draft for Approval')) draft_status = $('Gmail: Create Draft for Approval').first().json.error ? 'FAILED - write the reply manually' : 'created in Gmail Drafts (not sent)';
else draft_status = 'not created';

const to = String(config.staff_notification.to || '').trim().toLowerCase();
let skipped_reason = '';
if (!config.staff_notification.enabled) skipped_reason = 'staff notifications are disabled in the configuration';
else if (!to) skipped_reason = 'no staff email address is configured (staff_notification.to)';
else if (row.customer_email && to === String(row.customer_email).toLowerCase()) skipped_reason = 'the staff address matches the customer email - not sent';

const urgent = /^URGENT/.test(row.status);
const subject = `${urgent ? '[URGENT - possible safety issue] ' : row.status.startsWith('AI unavailable') ? '[Manual review] ' : ''}New lead ${row.lead_id} - ${row.business} - ${row.job_category}`.slice(0, 200);
const line = (label, value) => (value ? `${label}: ${value}\n` : '');
const body =
  `A new enquiry is waiting for review. Nothing has been sent to the customer.\n\n` +
  line('Status', row.status) +
  `Assessed urgency: ${row.assessed_urgency} (automated assessment - a person must confirm it)\n` +
  (row.safety_flag === 'YES' ? `SAFETY: possible hazard - ${row.hazards}. Call the customer first.\n` : '') +
  `\n` +
  line('Customer', [row.customer_name, row.organisation].filter(Boolean).join(', ') || 'Not provided') +
  line('Phone', row.customer_phone || 'Not provided') +
  line('Email', row.customer_email || 'Not provided') +
  line('Location', [row.address, row.suburb].filter(Boolean).join(', ')) +
  line('Job', row.job_summary || row.job_category) +
  line('Missing information', row.missing_information) +
  line('Check before replying', row.review_reasons) +
  line('Notes', row.notes_for_staff) +
  `Draft reply: ${draft_status}\n` +
  line('Lead register', config.staff_notification.lead_register_url) +
  `\n--- Original enquiry ---\n${row.enquiry_text}\n\n` +
  `Lead ${row.lead_id} - ${row.processing_mode === 'mock' ? 'DEMO MODE (test rules, not AI)' : `processed by ${row.ai_provider} ${row.ai_model}`} - VERLONIQ Lead Assistant ${row.workflow_version}`;

return [{ json: { notify: !skipped_reason, skipped_reason, draft_status, notification: { to, subject, body }, lead_id: row.lead_id } }];
