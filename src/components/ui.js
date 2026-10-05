export const h = React.createElement;
export const cx = (...parts) => parts.filter(Boolean).join(' ');
export function iconButton(label, icon, onClick, active=false, title='') {
  return h('button',{className:cx('icon-btn',active&&'active'),onClick,title:title||label,'aria-label':label},
    h('span',{className:'icon-glyph','aria-hidden':'true'},icon),
    label ? h('span',{className:'icon-label'},label) : null
  );
}
export function money(v){ return `${v<0?'-':''}$${Math.abs(v).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
export function number(v,d=2){ return Number(v).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}); }
