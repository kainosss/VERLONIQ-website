// A tiny, test-only interpreter for the node types used by the VERLONIQ workflows (Manual Trigger, Webhook as a
// start node, Code, IF, Respond to Webhook). It walks the generated workflow JSON's real connections and runs the
// real Code node source, so `node --test` can check every demo scenario in seconds. It mirrors n8n's behaviour
// for onError (continueErrorOutput → error branch, continueRegularOutput → { error } item) and $('Node') lookups.
// It is NOT n8n: test/run-local-e2e.sh runs the same workflows in a real local n8n.
export function runWorkflow(wf, { start, items = [{}], standins = {} } = {}) {
  const byName = Object.fromEntries(wf.nodes.map((n) => [n.name, n]));
  const runs = {}; // name → { output: [[items]...] }
  const order = [];

  const lookup = (name) => {
    if (!byName[name]) throw new Error(`$('${name}'): no such node`);
    const r = runs[name];
    const items = r ? r.output.flat() : null;
    return {
      get isExecuted() { return Boolean(r); },
      first: () => { if (!items || !items.length) throw new Error(`$('${name}').first(): node has not run`); return items[0]; },
      all: () => { if (!items) throw new Error(`$('${name}').all(): node has not run`); return items; },
    };
  };
  const evalExpr = (expr, json) => {
    const m = /^=\{\{([\s\S]*)\}\}$/.exec(expr);
    if (!m) return expr;
    return new Function('$json', '$', `return (${m[1]});`)(json, lookup);
  };
  const runCode = (node, input) => {
    const $input = { all: () => input, first: () => input[0], item: input[0] };
    const out = new Function('$input', '$', '$json', '$getWorkflowStaticData', node.parameters.jsCode)($input, lookup, input[0] && input[0].json, () => ({}));
    if (!Array.isArray(out)) throw new Error(`${node.name}: Code node must return an array`);
    return out.map((i) => (i && i.json ? i : { json: i }));
  };

  const execute = (name, input) => {
    const node = byName[name];
    order.push(name);
    let output;
    try {
      if (standins[name]) output = [standins[name](input, lookup)];
      else if (node.type === 'n8n-nodes-base.code') output = [runCode(node, input)];
      else if (node.type === 'n8n-nodes-base.if') {
        const { conditions, combinator } = node.parameters.conditions;
        const json = input[0].json;
        const results = conditions.map((c) => {
          const v = evalExpr(c.leftValue, json);
          if (c.operator.type === 'boolean' && c.operator.operation === 'true') return v === true;
          if (c.operator.type === 'string' && c.operator.operation === 'notEmpty') return v !== undefined && v !== null && String(v) !== '';
          throw new Error(`${name}: unsupported IF operator ${c.operator.type}/${c.operator.operation}`);
        });
        const pass = combinator === 'or' ? results.some(Boolean) : results.every(Boolean);
        output = pass ? [input, []] : [[], input];
      } else if (node.type === 'n8n-nodes-base.respondToWebhook') {
        const body = JSON.parse(evalExpr(node.parameters.responseBody, input[0].json));
        output = [[{ json: { http_status: node.parameters.options.responseCode, body } }]];
      } else if (['n8n-nodes-base.manualTrigger', 'n8n-nodes-base.webhook'].includes(node.type)) output = [input];
      else throw new Error(`${name}: node type ${node.type} needs a stand-in in this test interpreter`);
    } catch (err) {
      const errItem = [{ json: { error: err.message } }];
      if (node.onError === 'continueErrorOutput') output = [[], errItem];
      else if (node.onError === 'continueRegularOutput') output = [errItem];
      else { const e = new Error(`Node "${name}" failed: ${err.message}`); e.node = name; throw e; }
    }
    // alwaysOutputData: an empty result still passes one empty item on.
    if (node.alwaysOutputData && output[0] && output[0].length === 0) output[0] = [{ json: {} }];
    runs[name] = { output };
    const conns = (wf.connections[name] || {}).main || [];
    conns.forEach((targets, branch) => {
      const data = output[branch] || [];
      if (!data.length) return;
      for (const t of targets) execute(t.node, data);
    });
  };

  execute(start, items);
  const last = order[order.length - 1];
  return { order, runs, last, lastOutput: runs[last].output.flat()[0]?.json, json: (name) => runs[name]?.output.flat()[0]?.json };
}
