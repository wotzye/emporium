export interface ItemDef {
  id: string;
  svg: string;
  cursed?: boolean;
}

const s = (body: string) => `<svg viewBox="0 0 40 40">${body}</svg>`;

export const ITEMS: Record<string, ItemDef> = {
  fuse: {
    id: 'fuse',
    svg: s('<rect x="12" y="8" width="16" height="24" rx="2"/><rect x="16" y="4" width="8" height="4"/><rect x="16" y="32" width="8" height="4"/><path d="M16 14 L24 26"/>'),
  },
  photo: {
    id: 'photo',
    svg: s('<rect x="6" y="9" width="28" height="22"/><rect x="9" y="12" width="22" height="14"/><path d="M12 24 l5-6 4 4 3-3 5 5"/>'),
  },
  key: {
    id: 'key',
    svg: s('<circle cx="13" cy="20" r="6"/><circle cx="13" cy="20" r="2"/><path d="M19 20 H34 M29 20 v5 M33 20 v4"/>'),
  },
  case: {
    id: 'case',
    svg: s('<rect x="5" y="13" width="30" height="16" rx="3"/><path d="M5 19 H35"/><rect x="16" y="17" width="8" height="5"/><path d="M17 17 v-3 a3 3 0 0 1 6 0 v3"/>'),
  },
  razor: {
    id: 'razor',
    cursed: true,
    svg: s('<path d="M6 26 L22 10 L28 16 L12 32 Z"/><path d="M22 10 L26 6 Q30 4 32 8 L28 16"/><path d="M10 28 L24 14"/>'),
  },
  crank: {
    id: 'crank',
    svg: s('<path d="M8 30 H24 V14"/><path d="M24 14 H30"/><rect x="28" y="9" width="5" height="10" rx="2"/><circle cx="8" cy="30" r="3"/>'),
  },
  crutch: {
    id: 'crutch',
    svg: s('<path d="M14 4 H26"/><path d="M16 4 L19 30 M24 4 L21 30"/><path d="M17 16 H23"/><path d="M20 30 V37"/>'),
  },
  glasses: {
    id: 'glasses',
    cursed: true,
    svg: s('<circle cx="12" cy="22" r="6"/><circle cx="28" cy="22" r="6"/><path d="M18 21 Q20 18 22 21"/><path d="M6 21 L3 15 M34 21 L37 15"/>'),
  },
  labkey: {
    id: 'labkey',
    svg: s('<circle cx="11" cy="20" r="5"/><path d="M16 20 H34 M30 20 v5 M26 20 v3"/>'),
  },
  windkey: {
    id: 'windkey',
    svg: s('<path d="M20 6 v18"/><rect x="16" y="24" width="8" height="10"/><path d="M8 6 H32 M8 6 v6 M32 6 v-0"/>'),
  },
  watch: {
    id: 'watch',
    cursed: true,
    svg: s('<circle cx="20" cy="23" r="11"/><path d="M20 23 V16 M20 23 L25 26"/><circle cx="20" cy="8" r="3"/>'),
  },
  yardkey: {
    id: 'yardkey',
    svg: s('<circle cx="11" cy="20" r="6"/><circle cx="11" cy="20" r="2"/><path d="M17 20 H34 M30 20 v6 M26 20 v4"/>'),
  },
  padkey: {
    id: 'padkey',
    svg: s('<circle cx="12" cy="20" r="4"/><path d="M16 20 H30 M27 20 v4 M24 20 v3"/><rect x="28" y="8" width="8" height="8" rx="1"/><path d="M30 8 v-2 a2 2 0 0 1 4 0 v2"/>'),
  },
  shedkey: {
    id: 'shedkey',
    svg: s('<circle cx="12" cy="14" r="5"/><path d="M12 19 V34 M12 30 h4 M12 26 h3"/><rect x="20" y="8" width="12" height="7"/>'),
  },
  shears: {
    id: 'shears',
    svg: s('<path d="M20 22 L12 4 M20 22 L28 4"/><path d="M20 22 L14 36 M20 22 L26 36"/><circle cx="20" cy="22" r="2"/>'),
  },
  wardkey: {
    id: 'wardkey',
    svg: s('<path d="M8 20 q0 -6 6 -6 q6 0 6 6 q0 6 -6 6 q-6 0 -6 -6z"/><path d="M20 20 H34 M30 20 v5 M33 20 v3"/>'),
  },
  minutehand: {
    id: 'minutehand',
    svg: s('<path d="M20 34 L20 8 L17 14 M20 8 L23 14"/><circle cx="20" cy="32" r="3"/>'),
  },
  gear: {
    id: 'gear',
    svg: s('<circle cx="20" cy="20" r="9"/><circle cx="20" cy="20" r="3"/><path d="M20 6 v5 M20 29 v5 M6 20 h5 M29 20 h5 M10 10 l3.5 3.5 M26.5 26.5 l3.5 3.5 M10 30 l3.5 -3.5 M26.5 13.5 l3.5 -3.5"/>'),
  },
  redbulb: {
    id: 'redbulb',
    svg: s('<path d="M14 18 a6 6 0 1 1 12 0 c0 4 -3 5 -3 9 h-6 c0 -4 -3 -5 -3 -9z"/><path d="M17 30 h6 M17 33 h6"/>'),
  },
  flatkey: {
    id: 'flatkey',
    svg: s('<circle cx="11" cy="20" r="5"/><path d="M16 20 H34 M30 20 v5 M27 20 v3"/>'),
  },
  flashbulb: {
    id: 'flashbulb',
    svg: s('<circle cx="20" cy="15" r="8"/><path d="M16 23 h8 v6 h-8z M13 9 l-3 -3 M27 9 l3 -3 M20 5 v-3"/>'),
  },
  camera: {
    id: 'camera',
    cursed: true,
    svg: s('<rect x="20" y="12" width="14" height="16"/><path d="M20 14 L9 17 V23 L20 26"/><circle cx="7" cy="20" r="3"/>'),
  },
  cemkey: {
    id: 'cemkey',
    svg: s('<circle cx="11" cy="20" r="6"/><path d="M17 20 H34 M30 20 v6 M26 20 v4"/><path d="M8 17 l6 6"/>'),
  },
  suitcasekey: {
    id: 'suitcasekey',
    svg: s('<circle cx="12" cy="20" r="5"/><path d="M17 20 H32 M29 20 v4 M26 20 v3"/><path d="M5 9 h10 v6 h-10z"/>'),
  },
  uvlens: {
    id: 'uvlens',
    svg: s('<circle cx="20" cy="20" r="11"/><circle cx="20" cy="20" r="7"/><path d="M12 12 l3 3 M28 12 l-3 3 M12 28 l3 -3 M28 28 l-3 -3"/>'),
  },
  rfuse: {
    id: 'rfuse',
    svg: s('<rect x="12" y="8" width="16" height="24" rx="2"/><rect x="16" y="4" width="8" height="4"/><rect x="16" y="32" width="8" height="4"/><path d="M15 20 h10"/>'),
  },
  valve: {
    id: 'valve',
    svg: s('<path d="M15 30 V14 a5 5 0 0 1 10 0 V30 z"/><path d="M15 30 h10 M17 33 v3 M20 33 v3 M23 33 v3 M18 22 h4 M20 16 v10"/>'),
  },
  radio: {
    id: 'radio',
    cursed: true,
    svg: s('<rect x="8" y="15" width="24" height="16" rx="2"/><circle cx="15" cy="23" r="4"/><path d="M24 20 h5 M24 24 h5 M24 28 h5 M30 15 L34 4"/>'),
  },
  towerkey: {
    id: 'towerkey',
    svg: s('<circle cx="10" cy="20" r="6"/><circle cx="10" cy="20" r="2"/><path d="M16 20 H35 M31 20 v6 M27 20 v4 M33 20 v4"/>'),
  },
  page: {
    id: 'page',
    svg: s('<path d="M10 5 H26 L31 10 V35 H10 Z"/><path d="M26 5 V10 H31"/><path d="M14 16 H27 M14 21 H27 M14 26 H23"/>'),
  },
};

export const ICONS = {
  diary: '<svg viewBox="0 0 24 24"><path d="M5 3 H18 V21 H5 Z"/><path d="M8 3 V21"/><path d="M11 8 H16 M11 11 H16"/></svg>',
  notebook: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18"/><path d="M8 7 H16 M8 11 H16 M8 15 H13"/><path d="M5 6 H3 M5 10 H3 M5 14 H3 M5 18 H3"/></svg>',
  lisa: '<svg viewBox="0 0 24 24"><path d="M12 3 C8 3 6 6 6 10 V21 L8 19 L10 21 L12 19 L14 21 L16 19 L18 21 V10 C18 6 16 3 12 3 Z"/><circle cx="10" cy="10" r="1"/><circle cx="14" cy="10" r="1"/></svg>',
  torch: '<svg viewBox="0 0 24 24"><path d="M9 3 H15 V7 L14 10 V21 H10 V10 L9 7 Z"/><path d="M9 7 H15"/><circle cx="12" cy="14" r="1"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M4.9 19.1 L7 17 M17 7 L19.1 4.9"/></svg>',
};
