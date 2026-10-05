import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const fail=[];
function must(rel){if(!fs.existsSync(path.join(root,rel)))fail.push(`Missing: ${rel}`);}

must('index.html');must('manifest.webmanifest');must('sw.js');must('public/styles.css');must('public/vendor/react.production.min.js');must('public/vendor/react-dom.production.min.js');must('src/core/indicator-security.js');must('src/core/retention.js');must('src/core/failover.js');must('src/core/chart-sync.js');must('src/core/ai-policy.js');must('src/core/entitlements.js');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
if(manifest.display!=='standalone')fail.push('PWA manifest must use standalone display');
if(!Array.isArray(manifest.icons)||!manifest.icons.length)fail.push('PWA manifest icon missing');

const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const quoted=[...sw.matchAll(/'\.\/(.*?)'/g)].map(m=>m[1]);
for(const rel of quoted){must(rel);}

const main=fs.readFileSync(path.join(root,'src/main.js'),'utf8');
for(const marker of ['toggleTradePanel','toggleRiskTool','PlatformOps','DEMO_OWNER_ANALYTICS','validateTradeRequest','startChartGesture','resetChartNavigation','validatePrivateIndicator','setDrawingRetention','simulatePrimaryFailure','openAI','setAIAudience','toggleOverlay','setPromotionPolicy']){
  if(!main.includes(marker))fail.push(`Final feature marker missing: ${marker}`);
}
const css=fs.readFileSync(path.join(root,'public/styles.css'),'utf8');
for(const marker of ['.mobile-dock button.trade-action','.ops-modal','.draggable-risk','.quick-trade.dock-bottom-center','.chart-nav-controls','.build-report','.failover-flow','.retention-notice','.ai-modal','.promotion-banner','.overlay-toggle-grid']){
  if(!css.includes(marker))fail.push(`CSS marker missing: ${marker}`);
}
if(fail.length){console.error(fail.join('\n'));process.exit(1);}
console.log(`Integrity PASS — ${quoted.length} service-worker assets resolved; manifest, security/failover/retention/AI/entitlement modules and final feature markers verified.`);
