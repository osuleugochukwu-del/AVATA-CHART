import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
const topbar=fs.readFileSync(new URL('../src/components/TopBar.js',import.meta.url),'utf8');
const quick=fs.readFileSync(new URL('../src/components/QuickTradeDock.js',import.meta.url),'utf8');

test('advanced 0.4 toolbar shell remains intact',()=>{
  assert.match(css,/--top:54px/);
  assert.match(topbar,/Trade Avata /);
  assert.match(topbar,/Indicators/);
  assert.match(topbar,/Replay/);
  assert.match(topbar,/Snapshot/);
  assert.match(topbar,/Layout/);
  assert.match(topbar,/Settings/);
});

test('chart has zero-gap overlay without removing advanced shell',()=>{
  assert.match(css,/\.chart-shell\{padding-top:0!important/);
  assert.match(css,/\.chart-head\.chart-overlay/);
  assert.match(css,/\.legend\.chart-overlay/);
});

test('quick trading remains compact and toggleable',()=>{
  assert.match(css,/grid-template-columns:70px 58px 70px 22px!important/);
  assert.match(css,/\.quick-trade button\{height:38px!important/);
  assert.match(quick,/if\(!state\.tradePanelVisible\)return null/);
});

test('mobile quick strip stays compact above safe area',()=>{
  assert.match(css,/grid-template-columns:64px 52px 64px 20px!important/);
  assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
});

test('desktop quick trade is tiny, centered and independently hideable',()=>{
  assert.match(css,/grid-template-columns:62px 52px 62px 18px!important/);
  assert.match(css,/left:50%!important/);
  assert.match(quick,/title:'Hide quick trade'/);
  assert.match(quick,/actions\.toggleTradePanel/);
});

test('desktop toolbar has quick indicator hide and owner AI without removing advanced controls',()=>{
  assert.match(topbar,/indicator-visibility-toggle/);
  assert.match(topbar,/toggleHideAllIndicators/);
  assert.match(topbar,/owner-ai-btn/);
  assert.match(topbar,/actions\.openAI/);
});

test('symbol click opens chart settings while dedicated find control still opens market selection',()=>{
  assert.match(topbar,/actions\.openSymbolSettings/);
  assert.match(topbar,/symbol-find/);
  assert.match(topbar,/actions\.toggleWatchlist/);
});
