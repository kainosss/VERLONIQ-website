// Checks every node's parameters in the committed workflows against the INSTALLED n8n's own node definitions
// (the editor's NodeHelpers logic): unknown parameter names, invalid option values, missing required parameters,
// unsupported typeVersions. Usage: node validate-node-params.cjs <n8n node_modules dir> <workflow.json>...
const path = require('path'); const fs = require('fs');
const NM = process.argv[2]; const files = process.argv.slice(3);
const { NodeHelpers } = require(path.join(NM, 'n8n-workflow'));
const base = path.join(NM, 'n8n-nodes-base');
const pkg = require(path.join(base, 'package.json'));
const map = {};
for (const p of pkg.n8n.nodes) { const name = path.basename(p).replace('.node.js', ''); map[name.toLowerCase()] = path.join(base, p); }
const load = (type, version) => {
  const short = type.replace('n8n-nodes-base.', '').toLowerCase();
  const file = map[short] || Object.entries(map).find(([k]) => k === short)?.[1];
  if (!file) throw new Error('no node file for ' + type);
  const mod = require(file); const Cls = Object.values(mod)[0]; const inst = new Cls();
  const d = inst.nodeVersions ? (inst.nodeVersions[version] || inst.nodeVersions[inst.currentVersion]).description : inst.description;
  return d;
};
const flat = (o, pre = '') => Object.entries(o || {}).flatMap(([k, v]) => [pre + k]);
let problems = 0;
for (const f of files) {
  const wf = JSON.parse(fs.readFileSync(f, 'utf8'));
  for (const n of wf.nodes) {
    if (n.type === 'n8n-nodes-base.stickyNote') continue;
    const d = load(n.type, n.typeVersion);
    const node = { ...n, parameters: n.parameters };
    const resolved = NodeHelpers.getNodeParameters(d.properties, n.parameters, true, false, node) || {};
    // options-type values must be one of the offered options (for parameters displayed with these settings)
    const bad = [];
    for (const prop of d.properties) { if (prop.type !== 'options' || !(prop.name in n.parameters) || !(prop.name in resolved)) continue; if (!NodeHelpers.displayParameter(n.parameters, prop, node)) continue; const ok = (prop.options||[]).map(o=>o.value); const v = n.parameters[prop.name]; if (typeof v === 'string' && !v.startsWith('=') && !ok.includes(v)) bad.push(`${prop.name}=${v} not in [${ok.join(', ')}]`); }
    const unknown = Object.keys(n.parameters).filter((k) => !(k in resolved));
    const issues = NodeHelpers.getNodeParametersIssues(d.properties, node, null) || {};
    const paramIssues = issues.parameters ? Object.entries(issues.parameters).map(([k, v]) => `${k}: ${v.join(' ')}`) : [];
    const versions = Array.isArray(d.version) ? d.version : [d.version];
    const verOk = versions.includes(n.typeVersion);
    if (unknown.length || paramIssues.length || !verOk || bad.length) { problems++; console.log(`✗ ${path.basename(f)} / ${n.name} (${n.type} v${n.typeVersion})`, { unknown, paramIssues, bad, versions }); }
    else console.log(`✓ ${path.basename(f)} / ${n.name}`);
  }
}
console.log(problems ? `${problems} node(s) with parameter problems` : "All node parameters valid for this n8n version");
process.exit(problems ? 1 : 0);
