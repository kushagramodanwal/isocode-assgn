// Generates simple, original SVG pack illustrations for seed products (no product photos).
import { writeFileSync, mkdirSync } from 'node:fs';
const items = {
  biscuit: ['#d97706', '#fde68a', 'circle'], 'cream-biscuit': ['#9d174d', '#fbcfe8', 'circle'],
  noodles: ['#dc2626', '#fecaca', 'wave'], ketchup: ['#b91c1c', '#fee2e2', 'bottle'],
  tea: ['#166534', '#bbf7d0', 'leaf'], salt: ['#1d4ed8', '#dbeafe', 'dots'],
  poha: ['#a16207', '#fef9c3', 'dots'], haldi: ['#ca8a04', '#fef08a', 'dots'],
  detergent: ['#0369a1', '#bae6fd', 'bubble'], dishwash: ['#15803d', '#dcfce7', 'bubble'],
  'dish-liquid': ['#047857', '#d1fae5', 'bottle'], floor: ['#7c3aed', '#ede9fe', 'bottle'],
  soap: ['#0f766e', '#ccfbf1', 'leaf'], 'sandal-soap': ['#b45309', '#ffedd5', 'leaf'],
  'detergent-bar': ['#1e40af', '#e0e7ff', 'bubble'], toilet: ['#0e7490', '#cffafe', 'bottle'],
  handwash: ['#be185d', '#fce7f3', 'bottle'], toothpowder: ['#4338ca', '#e0e7ff', 'dots'],
};
const motif = (k, c) => ({
  circle: `<circle cx="80" cy="92" r="26" fill="${c}"/><circle cx="72" cy="86" r="3" fill="#fff"/><circle cx="88" cy="96" r="3" fill="#fff"/>`,
  wave: `<path d="M50 92q10-12 20 0t20 0 20 0" stroke="${c}" stroke-width="6" fill="none"/><path d="M50 106q10-12 20 0t20 0 20 0" stroke="${c}" stroke-width="6" fill="none"/>`,
  bottle: `<rect x="66" y="64" width="28" height="56" rx="8" fill="${c}"/><rect x="74" y="54" width="12" height="12" rx="2" fill="${c}"/>`,
  leaf: `<path d="M56 112c0-30 22-46 50-46-2 30-20 46-50 46z" fill="${c}"/>`,
  dots: `<circle cx="66" cy="84" r="8" fill="${c}"/><circle cx="92" cy="84" r="8" fill="${c}"/><circle cx="79" cy="106" r="8" fill="${c}"/>`,
  bubble: `<circle cx="70" cy="96" r="16" fill="${c}"/><circle cx="96" cy="82" r="10" fill="${c}" opacity=".7"/><circle cx="94" cy="108" r="6" fill="${c}" opacity=".5"/>`,
})[k];
mkdirSync('public/img', { recursive: true });
for (const [name, [dark, light, m]] of Object.entries(items)) {
  writeFileSync(`public/img/${name}.svg`,
`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="${light}"/><rect x="36" y="30" width="88" height="104" rx="12" fill="#fff" stroke="${dark}" stroke-width="4"/><rect x="36" y="30" width="88" height="20" rx="10" fill="${dark}"/>${motif(m, dark)}</svg>\n`);
}
console.log(Object.keys(items).length, 'images');
