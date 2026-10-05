import { h, cx } from './ui.js';
const tools=[
  ['cursor','↖','Cursor'],['crosshair','＋','Crosshair'],['trend','╱','Trend line'],['horizontal','━','Horizontal line'],
  ['rectangle','□','Rectangle'],['fibonacci','≋','Fibonacci'],['text','T','Text'],['risk','◇','Risk / Reward'],
  ['measure','⌁','Measure'],['magnet','∩','Magnet'],['zoomIn','⊕','Zoom in'],['zoomOut','⊖','Zoom out'],
  ['visibility','◉','Hide / Show'],['delete','⌫','Delete']
];
export function LeftToolbar({state,actions}){
 return h('aside',{className:cx('leftbar',state.mobileToolsOpen&&'mobile-open')},...tools.map(([id,icon,label])=>h('button',{key:id,className:cx('left-tool',state.activeTool===id&&'active'),onClick:()=>actions.selectTool(id),title:label,'aria-label':label},h('span',null,icon))));
}
