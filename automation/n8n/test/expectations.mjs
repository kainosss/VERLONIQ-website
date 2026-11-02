// Turns a workflow run into a comparable "outcome" and checks it against a scenario's `expect` block
// (demo/scenarios.json). Used by the node:test suite (mini interpreter) and the real local n8n run.
// json(name) returns the first output item of a node, or undefined if it did not run.
export function outcome(json, executed) {
  const respondNames = ['Respond: Invalid Request', 'Respond: Duplicate', 'Respond: Lead Saved', 'Respond: Register Failed'];
  const responder = respondNames.find((n) => executed(n));
  const resp = responder ? json(responder) : null;
  const append = executed('Append to Lead Register') ? json('Append to Lead Register') : null;
  return {
    responder,
    http_status: resp ? resp.http_status : undefined,
    body: resp ? resp.body : undefined,
    row: append && !append.error ? append : null,
    ai_called: executed('Mock AI (demo only)') || executed('AI: Classify Enquiry'),
    notification: executed('Gmail: Notify Staff') ? json('Gmail: Notify Staff') : null,
    prepared: executed('Prepare Staff Notification') ? json('Prepare Staff Notification') : null,
    alert: executed('Gmail: Alert Staff - Lead Not Saved') ? json('Gmail: Alert Staff - Lead Not Saved') : null,
    draft: executed('Gmail: Create Draft for Approval') ? json('Gmail: Create Draft for Approval') : null,
  };
}

export function checkScenario(s, o, { staffAddress = 'staff-demo@example.com' } = {}) {
  const x = s.expect;
  const fails = [];
  const eq = (label, actual, expected) => { if (expected !== undefined && actual !== expected) fails.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); };
  const has = (label, haystack, needles) => { for (const n of needles || []) if (!String(haystack || '').toLowerCase().includes(n.toLowerCase())) fails.push(`${label} should include "${n}" (got ${JSON.stringify(String(haystack || '').slice(0, 300))})`); };
  const b = o.body || {};
  eq('HTTP status', o.http_status, x.http_status);
  eq('response status', b.status, x.response_status);
  if (x.lead_id) eq('lead_id', b.lead_id, x.lead_id);
  if (x.status) eq('lead status', b.status, x.status);
  if (x.status_prefix && !String(b.status || '').startsWith(x.status_prefix)) fails.push(`lead status should start with ${x.status_prefix} (got ${b.status})`);
  eq('assessed urgency', b.assessed_urgency, x.assessed_urgency);
  eq('safety flag', b.safety_flag, x.safety_flag);
  eq('draft created', b.draft_created, x.draft_created);
  if (x.draft_status_prefix && !String(b.draft_status || '').startsWith(x.draft_status_prefix)) fails.push(`draft status should start with ${x.draft_status_prefix} (got ${b.draft_status})`);
  eq('staff notified', b.staff_notified, x.staff_notified);
  eq('staff alerted', b.staff_alerted, x.staff_alerted);
  if (x.ai_called !== undefined) eq('AI called', o.ai_called, x.ai_called);
  if (x.row_saved !== undefined) eq('row saved', Boolean(o.row), x.row_saved);
  has('review reasons', o.row && o.row.review_reasons, x.review_includes);
  has('missing information', o.row && o.row.missing_information, x.missing_includes);
  has('errors', (b.errors || []).join(' | '), x.errors_include);
  if (x.notification_subject_prefix && !String(o.notification && o.notification.subject).startsWith(x.notification_subject_prefix)) fails.push(`notification subject should start with ${x.notification_subject_prefix} (got ${o.notification && o.notification.subject})`);

  // Invariants that must hold for EVERY scenario.
  for (const [label, msg] of [['staff notification', o.notification], ['register-failure alert', o.alert]]) {
    if (msg && msg.to !== staffAddress) fails.push(`${label} went to ${msg.to}, not the configured staff address`);
    if (msg && o.row && o.row.customer_email && msg.to === o.row.customer_email) fails.push(`${label} was addressed to the customer`);
  }
  if (o.draft && !o.draft.error && !(o.draft.labelIds || []).includes('DRAFT')) fails.push('customer reply was not created as a draft');
  if (o.row) {
    if (o.row.status === 'New - draft awaiting approval' && !o.row.customer_email) fails.push('"draft awaiting approval" without an email address');
    if (o.row.safety_flag === 'YES' && !/^URGENT/.test(o.row.status)) fails.push('safety flag without URGENT status');
    if (!/approved by a person|review manually|AI unavailable/.test(o.row.review_reasons + o.row.status)) fails.push('row does not say a person must review it');
  }
  if (b.ok === true && o.http_status === 200 && b.status !== 'duplicate' && !o.row) fails.push('reported success but no lead register row was written');
  return fails;
}
