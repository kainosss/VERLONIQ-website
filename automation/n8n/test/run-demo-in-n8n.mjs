// Runs every demo scenario through the DEMO workflow in a REAL local n8n (CLI `n8n execute`) and checks the
// result with the same expectations as the node:test suite. No accounts, keys or network access are used.
// Called by run-local-e2e.sh (which sets N8N_USER_FOLDER to a throwaway folder). Requires `n8n` on PATH.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { demoWorkflow, scenarios, chooseScenarioCode } from '../build-workflow.mjs';
import { outcome, checkScenario } from './expectations.mjs';

const work = process.env.N8N_USER_FOLDER;
if (!work) throw new Error('Set N8N_USER_FOLDER to a throwaway folder');
const dir = join(work, 'demo-variants');
mkdirSync(dir, { recursive: true });
scenarios.forEach((s, i) => {
  const wf = structuredClone(demoWorkflow);
  wf.id = `vqDemo${String(i).padStart(2, '0')}`;
  wf.name = `DEMO ${s.id}`;
  wf.nodes.find((n) => n.name === 'Choose Demo Scenario').parameters.jsCode = chooseScenarioCode(s.id);
  writeFileSync(join(dir, `${wf.id}.json`), JSON.stringify(wf));
});
execFileSync('n8n', ['import:workflow', '--separate', `--input=${dir}`], { stdio: 'ignore' });

let failed = 0;
scenarios.forEach((s, i) => {
  const raw = execFileSync('n8n', ['execute', `--id=vqDemo${String(i).padStart(2, '0')}`, '--rawOutput'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
  const run = JSON.parse(raw.slice(raw.indexOf('{')));
  const runData = run.data.resultData.runData;
  const err = run.data.resultData.error;
  const json = (name) => { const r = runData[name]; return r ? r[0].data.main.flat().filter(Boolean)[0]?.json : undefined; };
  const fails = err ? [`execution error in ${run.data.resultData.lastNodeExecuted}: ${err.message}`] : checkScenario(s, outcome(json, (n) => Boolean(runData[n])));
  const last = run.data.resultData.lastNodeExecuted;
  console.log(`${fails.length ? ' ✗' : ' ✓'} [real n8n] ${s.id}: ${last} → ${JSON.stringify(json(last)?.body || {}).slice(0, 110)}`);
  for (const f of fails) console.log(`     ${f}`);
  if (fails.length) failed++;
});
if (failed) { console.error(`\n${failed} DEMO SCENARIO(S) FAILED IN REAL n8n`); process.exit(1); }
console.log(`\nALL ${scenarios.length} DEMO SCENARIOS PASSED IN REAL n8n (mock AI, stand-ins, nothing sent)`);
