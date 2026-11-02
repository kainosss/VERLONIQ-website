// n8n Code node: "Prepare Register Failure Alert" (mode: Run Once for All Items)
// Runs when saving to the lead register (Google Sheets) fails. The full lead is emailed to staff so it is
// not lost, and the webhook answers with an error so the calling system knows to retry or alert someone.
const { config } = $('Workflow Configuration').first().json;
const err = ($input.first().json || {}).error;
const errText = typeof err === 'string' ? err : err && (err.message || err.description) ? String(err.message || err.description) : 'unknown error';
// The row that could not be saved (from whichever branch produced it).
const pick = (name) => { try { return $(name).isExecuted ? $(name).first().json : null; } catch (e) { return null; } };
const row = pick('Parse & Safety Check') || pick('Manual Review Fallback') || {};
const to = String(config.staff_notification.to || '').trim();
const fields = Object.entries(row).map(([k, v]) => `${k}: ${String(v).replace(/\n/g, ' | ')}`).join('\n');
return [{
  json: {
    notify: Boolean(to),
    lead_id: row.lead_id || '',
    error: String(errText).slice(0, 300),
    notification: {
      to,
      subject: `[ACTION NEEDED] Lead ${row.lead_id || ''} could NOT be saved to the lead register`.trim(),
      body: `The lead register (Google Sheets) could not be updated, so this lead exists only in this email and in n8n's execution log.\n` +
        `Please add it to the register manually and reply to the customer as usual. Nothing has been sent to the customer.\n\n` +
        `Error: ${String(errText).slice(0, 300)}\n\n${fields}`,
    },
  },
}];
