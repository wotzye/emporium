import * as THREE from 'three';
import { Engine, View } from './engine';
import { UI, Line } from './ui';
import { Audio, DroneKind } from './audio';
import { t, setLang, getLang, Lang } from './i18n';
import { Save, newSave, loadSave, writeSave, clearSave, loadPrefs, Settings } from './state';
import { drawScareFace } from './builders';

export interface Hotspot {
  id: string;
  obj: THREE.Object3D;
  /** Zoom to this view on first tap (when not already there and no item is selected). */
  view?: string;
  when?: () => boolean;
  /** Only chosen if nothing else is tappable behind it (e.g. furniture in front of the counter). */
  lowPriority?: boolean;
  tap: (item: string | null) => void | Promise<void>;
}

export interface Location {
  id: string;
  nameKey: string;
  scene: THREE.Scene;
  views: Record<string, View>;
  startView: string;
  hotspots: Hotspot[];
  drone: DroneKind;
  enter?: () => void | Promise<void>;
  leave?: () => void;
  update?: (dt: number, t: number) => void;
  /** i18n key of the current hint for Lisa. */
  hint?: () => string;
  /** false = you can't walk out right now (e.g. during a chase). */
  canLeave?: () => boolean;
  /** what the "back" button does at the root view; default goes to the map */
  exitTo?: string;
  /** dark place: the torch switches on by itself the first time */
  dark?: () => boolean;
  /** handles for tests and screenshots */
  debug?: Record<string, unknown>;
}

export type LocationFactory = (g: Game) => Location;

const HINTS_PER_LOCATION = 2;

export class Game {
  engine: Engine;
  ui: UI;
  audio = new Audio();
  save: Save;
  loc: Location | null = null;
  private factories: Record<string, LocationFactory> = {};
  private built: Record<string, Location> = {};
  private viewStack: string[] = [];
  private currentView = '';
  selected: string | null = null;
  busy = false;
  private removeUpdater: (() => void) | null = null;

  constructor(root: HTMLElement) {
    const prefs = loadPrefs();
    setLang(prefs.lang);
    this.save = newSave(prefs.lang, prefs.settings);
    this.engine = new Engine(root);
    this.ui = new UI(root);
    this.engine.onTap = (hits) => this.handleTap(hits);
    this.ui.onBack = () => this.back();
    this.ui.onItemTap = (id) => this.itemTap(id);
    this.ui.onDiary = () => this.openDiary();
    this.ui.onNotebook = () => this.openNotebook();
    this.ui.onLisa = () => this.askLisa();
    this.ui.onSettings = () => this.openSettings();
    this.ui.onTorch = () => this.toggleTorch();
    this.applySettings();
    this.ui.showHud(false);
  }

  register(id: string, f: LocationFactory) {
    this.factories[id] = f;
  }

  // ---------------- state helpers ----------------
  flag(k: string) {
    return this.save.flags[k];
  }
  set(k: string, v: boolean | number | string = true) {
    this.save.flags[k] = v;
    this.persist();
  }
  has(item: string) {
    return this.save.inventory.includes(item);
  }
  give(item: string) {
    if (this.has(item)) return;
    this.save.inventory.push(item);
    this.audio.sfx('pickup');
    this.ui.renderInventory(this.save.inventory, this.selected, item);
    this.ui.toast(t('ui.got', { item: t(`item.${item}`) }));
    this.persist();
  }
  take(item: string) {
    this.save.inventory = this.save.inventory.filter((i) => i !== item);
    if (this.selected === item) this.selected = null;
    this.ui.renderInventory(this.save.inventory, this.selected);
    this.persist();
  }
  note(key: string) {
    if (this.save.notebook.includes(key)) return;
    this.save.notebook.push(key);
    this.ui.flash('notebook');
    this.ui.toast(t('ui.noted'));
    this.persist();
  }
  diaryPage(id: string) {
    if (this.save.diary.includes(id)) return;
    this.save.diary.push(id);
    this.ui.flash('diary');
    this.persist();
  }
  persist() {
    writeSave(this.save);
  }

  say(lines: Line[] | string, who: Line['who'] = 'diego') {
    const arr = typeof lines === 'string' ? [{ who, key: lines }] : lines;
    return this.ui.say(arr);
  }

  get settings(): Settings {
    return this.save.settings;
  }

  applySettings() {
    const s = this.save.settings;
    this.engine.film.uniforms.keepColor.value = s.color ? 1 : 0;
    if (this.engine.quality !== s.quality) this.engine.setQuality(s.quality);
    this.audio.reduced = s.reducedScares;
    this.audio.setVolume(s.volume);
    this.updateLisaBadge();
  }

  // ---------------- flow ----------------
  async newGame() {
    const keep = this.save.settings;
    clearSave();
    this.save = newSave(getLang(), keep);
    this.built = {};
    this.persist();
  }

  continueGame(): boolean {
    const s = loadSave();
    if (!s) return false;
    this.save = s;
    setLang(s.lang);
    this.applySettings();
    return true;
  }

  hasSave() {
    return loadSave() !== null;
  }

  /** Forget a built location so it is rebuilt (e.g. lighting changes with progress). */
  rebuild(id: string) {
    delete this.built[id];
  }

  location(id: string): Location {
    if (!this.built[id]) this.built[id] = this.factories[id](this);
    return this.built[id];
  }

  async go(id: string, fade = true) {
    if (fade) await this.ui.fadeOut(500);
    this.loc?.leave?.();
    this.removeUpdater?.();
    this.selected = null;
    const L = this.location(id);
    this.loc = L;
    this.save.location = id;
    this.persist();
    this.engine.setScene(L.scene);
    this.viewStack = [];
    this.currentView = L.startView;
    await this.engine.goTo(L.views[L.startView], true);
    this.removeUpdater = L.update ? this.engine.addUpdater(L.update) : null;
    this.ui.setPlace(t(L.nameKey));
    this.ui.showHud(true);
    this.ui.renderInventory(this.save.inventory, this.selected);
    this.updateBack();
    this.updateLisaBadge();
    this.audio.drone(L.drone);
    this.engine.torchFlicker = 0;
    if (L.id === 'map') this.setTorch(false, true);
    else if (this.flag('hasTorch') && L.dark?.() && !this.flag('torchAuto.' + L.id)) {
      this.set('torchAuto.' + L.id);
      this.setTorch(true);
      this.ui.toast(t('ui.torchOn'));
    } else this.setTorch(!!this.flag('torchOn') && L.id !== 'map', true);
    if (fade) await this.ui.fadeIn(600);
    if (L.enter) {
      this.busy = true;
      try {
        await L.enter();
      } finally {
        this.busy = false;
      }
    }
  }

  view(name: string, dur = 0.9) {
    if (!this.loc) return Promise.resolve();
    if (name === this.currentView) return Promise.resolve();
    const v = this.loc.views[name];
    if (!v) return Promise.resolve();
    // build stack from parent chain
    this.viewStack = [];
    let p = v.parent;
    while (p) {
      this.viewStack.unshift(p);
      p = this.loc.views[p].parent;
    }
    this.currentView = name;
    this.updateBack();
    return this.engine.goTo(v, false, dur);
  }

  get viewName() {
    return this.currentView;
  }

  private updateBack() {
    if (!this.loc) return;
    if (this.viewStack.length) this.ui.setBack('‹ ' + t('ui.back'));
    else if (this.loc.id === 'map') this.ui.setBack(null);
    else this.ui.setBack('‹ ' + t('ui.exit'));
  }

  async back() {
    if (this.busy || !this.loc) return;
    if (this.viewStack.length) {
      const prev = this.viewStack[this.viewStack.length - 1];
      await this.view(prev);
      return;
    }
    if (this.loc.canLeave && !this.loc.canLeave()) {
      this.ui.toast(t('ui.cantLeave'));
      return;
    }
    if (this.loc.id !== 'map') this.go(this.loc.exitTo ?? 'map');
  }

  private itemTap(id: string) {
    if (this.busy) return;
    if (this.selected === id) {
      // second tap: examine
      this.selected = null;
      this.ui.renderInventory(this.save.inventory, null);
      this.examine(id);
      return;
    }
    this.selected = id;
    this.audio.sfx('click');
    this.ui.renderInventory(this.save.inventory, id);
  }

  examiners: Record<string, () => void | Promise<void>> = {};
  private async examine(id: string) {
    const ex = this.examiners[id];
    this.busy = true;
    try {
      if (ex) await ex();
      else await this.say(`item.${id}.desc`);
    } finally {
      this.busy = false;
    }
  }

  deselect() {
    this.selected = null;
    this.ui.renderInventory(this.save.inventory, null);
  }

  private async handleTap(hits: THREE.Intersection[]) {
    if (this.busy || !this.loc) return;
    let hs: Hotspot | undefined;
    let fallback: Hotspot | undefined;
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      let found: Hotspot | undefined;
      let pass = false;
      while (o) {
        if (!found) found = this.loc.hotspots.find((x) => x.obj === o && (!x.when || x.when()));
        if (o.userData.passThrough) pass = true;
        o = o.parent;
      }
      if (found) {
        if (!found.lowPriority) {
          hs = found;
          break;
        }
        fallback = fallback ?? found;
        continue;
      }
      // first solid, non-hit object blocks what is behind it (unless it is see-through furniture)
      if (!h.object.userData.hit && !pass) break;
    }
    hs = hs ?? fallback;
    if (!hs) {
      if (this.selected) this.deselect();
      return;
    }
    const item = this.selected;
    this.busy = true;
    try {
      if (hs.view && hs.view !== this.currentView && !item) {
        await this.view(hs.view);
      } else {
        await hs.tap(item);
      }
    } finally {
      this.busy = false;
    }
  }

  /** Default answer when an item does nothing here. */
  async nope() {
    this.audio.sfx('wrong');
    this.deselect();
    const keys = ['nope.1', 'nope.2', 'nope.3'];
    await this.say(keys[Math.floor(Math.random() * keys.length)]);
  }

  // ---------------- torch ----------------
  setTorch(on: boolean, silent = false) {
    const has = !!this.flag('hasTorch');
    on = on && has && this.loc?.id !== 'map';
    if (!silent && on !== this.engine.torchOn) this.audio.sfx('switch');
    this.engine.torchOn = on;
    if (this.loc?.id !== 'map') this.save.flags.torchOn = on;
    this.ui.setTorch(has && this.loc?.id !== 'map', on);
  }
  toggleTorch() {
    if (this.busy && !this.engine.torchOn) return;
    this.setTorch(!this.engine.torchOn);
    this.persist();
  }

  // ---------------- scares ----------------
  async scare(kind: 'barber' | 'bruno', ms = 650) {
    this.audio.stinger();
    this.engine.shake(0.08, 0.6);
    if (this.settings.reducedScares || this.settings.noFlash) {
      await this.ui.fadeOut(200);
      await new Promise((r) => setTimeout(r, 400));
      await this.ui.fadeIn(400);
      return;
    }
    const cv = document.createElement('canvas');
    drawScareFace(cv, kind);
    await this.ui.showScare(cv, ms);
  }

  setFlicker(on: boolean, amt = 1) {
    this.engine.flickerAmt = on && !this.settings.noFlash ? amt : 0;
  }

  // ---------------- panels ----------------
  openDiary() {
    if (this.busy) return;
    const pages = this.save.diary.map((id, i) => ({
      text: `${i + 1}. ${t(`diary.${id}.title`)}`,
      onClick: () => {
        this.ui.closeModal();
        this.audio.sfx('paper');
        this.ui.doc(t(`diary.${id}.title`), t(`diary.${id}.text`), true).then(() => this.openDiary());
      },
    }));
    this.ui.list(t('ui.diary'), pages, t('ui.diaryEmpty'));
  }

  openNotebook() {
    if (this.busy) return;
    this.ui.list(
      t('ui.notebook'),
      this.save.notebook.map((k) => ({ text: '— ' + t(k) })),
      t('ui.notebookEmpty'),
    );
  }

  hintsLeft(): number | null {
    if (this.settings.unlimitedHints) return null;
    const id = this.loc?.id ?? 'map';
    return Math.max(0, HINTS_PER_LOCATION - (this.save.hintsUsed[id] ?? 0));
  }

  updateLisaBadge() {
    this.ui.btnLisa.style.display = this.flag('metLisa') ? '' : 'none';
    this.ui.setLisaBadge(this.hintsLeft());
  }

  async askLisa() {
    if (this.busy || !this.loc) return;
    if (!this.flag('metLisa')) {
      this.ui.toast(t('hint.notYet'));
      return;
    }
    const left = this.hintsLeft();
    if (left === 0) {
      await this.say('hint.none', 'narr');
      return;
    }
    const key = this.loc.hint?.() ?? 'hint.generic';
    this.audio.sfx('whisper');
    if (left !== null) {
      this.save.hintsUsed[this.loc.id] = (this.save.hintsUsed[this.loc.id] ?? 0) + 1;
      this.persist();
    }
    this.updateLisaBadge();
    this.busy = true;
    try {
      await this.say([{ who: 'lisa', key }]);
    } finally {
      this.busy = false;
    }
  }

  private restartArmed = false;
  openSettings() {
    if (this.busy) return;
    const s = this.save.settings;
    const yesNo = (v: boolean, set: (v: boolean) => void) => [
      { label: t('ui.on'), on: v, set: () => { set(true); this.applySettings(); this.persist(); this.openSettings(); } },
      { label: t('ui.off'), on: !v, set: () => { set(false); this.applySettings(); this.persist(); this.openSettings(); } },
    ];
    this.ui.settings([
      {
        label: t('ui.language'),
        value: '',
        options: (['it', 'en'] as Lang[]).map((l) => ({
          label: l.toUpperCase(),
          on: getLang() === l,
          set: () => {
            setLang(l);
            this.save.lang = l;
            this.persist();
            this.ui.refreshStatic();
            if (this.loc) this.ui.setPlace(t(this.loc.nameKey));
            this.refreshTexts();
            this.openSettings();
          },
        })),
      },
      {
        label: t('ui.volume'),
        value: '',
        options: [0, 0.4, 0.8].map((v) => ({
          label: v === 0 ? t('ui.off') : v === 0.4 ? '50%' : '100%',
          on: s.volume === v,
          set: () => { s.volume = v; this.applySettings(); this.persist(); this.openSettings(); },
        })),
      },
      {
        label: t('ui.quality'),
        value: '',
        options: (['high', 'medium', 'low'] as const).map((q) => ({
          label: t(`ui.q.${q}`),
          on: s.quality === q,
          set: () => { s.quality = q; this.applySettings(); this.persist(); this.refreshTexts(); this.openSettings(); },
        })),
      },
      { label: t('ui.reducedScares'), value: '', options: yesNo(s.reducedScares, (v) => (s.reducedScares = v)) },
      { label: t('ui.noFlash'), value: '', options: yesNo(s.noFlash, (v) => { s.noFlash = v; if (v) this.engine.flickerAmt = 0; }) },
      { label: t('ui.color'), value: '', options: yesNo(s.color, (v) => (s.color = v)) },
      { label: t('ui.unlimitedHints'), value: '', options: yesNo(s.unlimitedHints, (v) => (s.unlimitedHints = v)) },
      {
        label: t('ui.restart'),
        value: this.restartArmed ? t('ui.restartConfirm') : t('ui.restartBtn'),
        action: () => {
          if (this.restartArmed) {
            clearSave();
            location.reload();
            return;
          }
          this.restartArmed = true;
          this.openSettings();
        },
      },
    ]);
  }

  /** Locations register here to rebuild 3D text (signs) when the language changes. */
  textRefreshers: (() => void)[] = [];
  refreshTexts() {
    // signs are baked in textures: simplest is to rebuild locations lazily
    const current = this.loc?.id;
    this.built = {};
    if (current) {
      const v = this.currentView;
      this.go(current, false).then(() => this.view(v, 0.01));
    }
  }
}

