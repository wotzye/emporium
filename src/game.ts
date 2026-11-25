import * as THREE from 'three';
import { Engine, View } from './engine';
import { UI, Line } from './ui';
import { Audio, DroneKind } from './audio';
import { t, setLang, getLang, Lang } from './i18n';
import { Save, newSave, loadSave, writeSave, clearSave, loadPrefs, Settings } from './state';
import { drawScareFace } from './builders';
import { createBarberGhost, createBruno, createAdaGhost, createClara, Character } from './characters';
import { realCharacters } from './characters_real';

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

export type Interaction =
  | { kind: 'drag'; obj: THREE.Object3D; when?: () => boolean; plane: THREE.Plane; onStart?: () => void; onMove?: (p: THREE.Vector3) => void; onEnd: (p: THREE.Vector3) => void | Promise<void> }
  | { kind: 'rub'; obj: THREE.Object3D; when?: () => boolean; onRub: (uv: THREE.Vector2, p: THREE.Vector3) => void; onEnd?: () => void | Promise<void> }
  | { kind: 'dial'; obj: THREE.Object3D; when?: () => boolean; center: THREE.Vector3; onTurn: (delta: number) => void; onEnd?: () => void | Promise<void> };

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
  /** places reachable from here that aren't hotspots or exitTo (for background preloading) */
  next?: string[];
  /** per-place exposure multiplier (the open square is brighter than the shops) */
  exposure?: number;
  /** direct manipulation: drag objects, rub surfaces, turn dials */
  interactions?: Interaction[];
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
    this.engine.drag = this.dragHandler();
    this.ui.onBack = () => this.back();
    this.ui.onItemTap = (id) => this.itemTap(id);
    this.ui.onDiary = () => this.openDiary();
    this.ui.onNotebook = () => this.openNotebook();
    this.ui.onLisa = () => this.askLisa();
    this.ui.onSettings = () => this.openSettings();
    this.ui.onTorch = () => this.toggleTorch();
    this.ui.onHeldTap = () => this.setHeld(null);
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
    const br = s.brightness ?? 1;
    this.engine.film.uniforms.lift.value = [0.15, 0.45, 0.8][br];
    this.engine.film.uniforms.vigFloor.value = [0.35, 0.45, 0.55][br];
    this.engine.renderer.toneMappingExposure = [1.0, 1.15, 1.3][br] * (this.loc?.exposure ?? 1);
    document.documentElement.style.setProperty('--fs', String([1.1, 1.3, 1.55][s.textSize ?? 1]));
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

  /** Places you can reach from here: built and compiled quietly in advance. */
  private neighbours(L: Location): string[] {
    const out = new Set<string>([...(L.next ?? [])]);
    if (L.exitTo) out.add(L.exitTo);
    if (L.id !== 'map') out.add('map');
    return [...out].filter((id) => this.factories[id] && id !== L.id);
  }
  private prewarmTimer = 0;
  private schedulePrewarm(L: Location) {
    clearTimeout(this.prewarmTimer);
    const queue = this.neighbours(L);
    const step = () => {
      const id = queue.shift();
      if (!id || this.loc !== L) return;
      // only hold back while the camera is moving: a dialog on screen is idle time for the GPU
      if (this.engine.moving) {
        queue.unshift(id);
        this.prewarmTimer = window.setTimeout(step, 500);
        return;
      }
      try {
        const N = this.location(id);
        this.engine.prewarm(N.scene).finally(() => (this.prewarmTimer = window.setTimeout(step, 400)));
      } catch (e) {
        console.warn('prewarm', id, e);
        this.prewarmTimer = window.setTimeout(step, 400);
      }
    };
    this.prewarmTimer = window.setTimeout(step, 700);
  }

  async go(id: string, fade = true) {
    if (fade) await this.ui.fadeOut(300);
    this.loc?.leave?.();
    this.removeUpdater?.();
    this.selected = null;
    this.setHeld(null);
    const L = this.location(id);
    // keep only this place and its neighbours in memory: phones (iPhone above all) lose the
    // WebGL context, and with it the whole picture, if too many rooms sit on the GPU at once
    const keep = new Set([id, 'map', ...this.neighbours(L)]);
    const group = (k: string) => k.split('_')[0];
    for (const k of Object.keys(this.built)) {
      // rooms of the same building stay together (they share state and set each other up)
      if (keep.has(k) || group(k) === group(id)) continue;
      this.engine.disposeScene(this.built[k].scene);
      delete this.built[k];
    }
    this.loc = L;
    this.applySettings();
    this.save.location = id;
    this.persist();
    // compile while the screen is still black (instant if it was prewarmed)
    // never let a slow or stuck compile keep the screen black
    await Promise.race([this.engine.prewarm(L.scene), new Promise((r) => setTimeout(r, 1500))]);
    this.engine.setScene(L.scene);
    this.viewStack = [];
    this.currentView = L.startView;
    await this.engine.goTo(L.views[L.startView], true);
    this.removeUpdater = L.update ? this.engine.addUpdater(L.update) : null;
    this.removeMarkers?.();
    this.removeMarkers = this.engine.addUpdater(this.markers(L));
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
    // never start a place behind a black screen, whoever faded it out (and never wait on it: a dialog
    // in enter() must be visible)
    if (fade || !this.ui.fade.classList.contains('off')) await this.ui.fadeIn(fade ? 350 : 600);
    this.schedulePrewarm(L);
    setTimeout(() => this.prepScare(L.id), 800);
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

  // ---------------- direct manipulation ----------------
  /** something held in the hand (not in the apron), e.g. a cloth */
  held: string | null = null;
  setHeld(id: string | null) {
    this.held = id;
    this.ui.setHeld(id ? t(`held.${id}`) : null);
  }

  private dragHandler() {
    let cur: Interaction | null = null;
    let offset = new THREE.Vector3();
    let lastAngle = 0;
    const tmp = new THREE.Vector3();
    const screenOf = (p: THREE.Vector3) => {
      const v = p.clone().project(this.engine.camera);
      return [(v.x + 1) / 2 * window.innerWidth, (1 - v.y) / 2 * window.innerHeight];
    };
    const find = (hits: THREE.Intersection[]) => {
      const list = this.loc?.interactions ?? [];
      for (const h of hits) {
        let o: THREE.Object3D | null = h.object;
        while (o) {
          const it = list.find((x) => x.obj === o && (!x.when || x.when()));
          if (it) return { it, hit: h };
          o = o.parent;
        }
        if (!h.object.userData.hit) break;
      }
      return null;
    };
    return {
      start: (hits: THREE.Intersection[], ray: THREE.Ray, x: number, y: number) => {
        if (this.busy || !this.loc || this.ui.modal.classList.contains('on') || this.ui.dialog.classList.contains('on')) return false;
        // with an item in hand, a touch means "use it here", never "pick this up and move it"
        if (this.selected) return false;
        const f = find(hits);
        if (!f) return false;
        cur = f.it;
        if (cur.kind === 'drag') {
          const p = ray.intersectPlane(cur.plane, tmp);
          const wp = cur.obj.getWorldPosition(new THREE.Vector3());
          offset = p ? wp.sub(p) : new THREE.Vector3();
          cur.onStart?.();
        } else if (cur.kind === 'rub') {
          if (f.hit.uv) cur.onRub(f.hit.uv, f.hit.point);
        } else {
          const [cx, cy] = screenOf(cur.center);
          // a touch right on the hub has no angle yet: take it from the first real move
          lastAngle = Math.hypot(x - cx, y - cy) < 14 ? NaN : Math.atan2(y - cy, x - cx);
        }
        return true;
      },
      move: (ray: THREE.Ray, x: number, y: number, hits: () => THREE.Intersection[]) => {
        if (!cur) return;
        if (cur.kind === 'drag') {
          const p = ray.intersectPlane(cur.plane, tmp);
          if (!p) return;
          const target = p.add(offset);
          cur.obj.parent ? cur.obj.position.copy(cur.obj.parent.worldToLocal(target.clone())) : cur.obj.position.copy(target);
          cur.onMove?.(target);
        } else if (cur.kind === 'rub') {
          for (const h of hits()) {
            let o: THREE.Object3D | null = h.object;
            let on = false;
            while (o) {
              if (o === cur.obj) on = true;
              o = o.parent;
            }
            if (on && h.uv) {
              cur.onRub(h.uv, h.point);
              break;
            }
            if (!h.object.userData.hit) break;
          }
        } else {
          const [cx, cy] = screenOf(cur.center);
          const a = Math.atan2(y - cy, x - cx);
          // too close to the hub the angle is noise: just follow it, don't turn
          if (Math.hypot(x - cx, y - cy) < 14 || Number.isNaN(lastAngle)) {
            lastAngle = Math.hypot(x - cx, y - cy) < 14 ? NaN : a;
            return;
          }
          let d = a - lastAngle;
          if (d > Math.PI) d -= Math.PI * 2;
          if (d < -Math.PI) d += Math.PI * 2;
          lastAngle = a;
          cur.onTurn(d); // clockwise on screen = positive
        }
      },
      end: (ray: THREE.Ray) => {
        const it = cur;
        cur = null;
        if (!it) return;
        const run = async () => {
          this.busy = true;
          try {
            if (it.kind === 'drag') {
              const p = it.obj.getWorldPosition(new THREE.Vector3());
              await it.onEnd(p);
            } else await it.onEnd?.();
          } finally {
            this.busy = false;
          }
        };
        void ray;
        run();
      },
    };
  }

  /** 0..1: how much the torch is pointing at this object (for writing that only shows in its light). */
  torchOn(obj: THREE.Object3D, maxDist = 4.5) {
    if (!this.engine.torchOn) return 0;
    const cam = this.engine.camera;
    const p = obj.getWorldPosition(new THREE.Vector3());
    const c = cam.getWorldPosition(new THREE.Vector3());
    const dir = p.clone().sub(c);
    const dist = dir.length();
    if (dist > maxDist) return 0;
    const fwd = new THREE.Vector3(0, -0.03, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()));
    const ang = fwd.angleTo(dir.normalize());
    return THREE.MathUtils.clamp(1 - (ang - 0.12) / 0.22, 0, 1);
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
  async scare(kind: 'barber' | 'bruno' | 'ada' | 'clara', ms = 650) {
    this.audio.stinger();
    this.engine.shake(0.08, 0.6);
    if (this.settings.reducedScares || this.settings.noFlash) {
      await this.ui.fadeOut(200);
      await new Promise((r) => setTimeout(r, 400));
      await this.ui.fadeIn(400);
      return;
    }
    if (realCharacters()) return this.scare3d(kind, ms);
    const cv = document.createElement('canvas');
    drawScareFace(cv, kind);
    await this.ui.showScare(cv, ms);
  }

  /** A clue you act out with the phone: blow, shout, shake. */
  physical(kind: 'blow' | 'shout' | 'shake', textKey: string) {
    return this.ui.sensor(kind, t('ui.sensor.' + kind), t(textKey), this.settings.sensors ?? true);
  }

  /** The real thing: the character itself lunges at the camera, lit from below, face filling the screen. */
  private scareChars: Partial<Record<'barber' | 'bruno' | 'ada' | 'clara', Character & { setOpacity?: (v: number) => void }>> = {};
  private scareChar(kind: 'barber' | 'bruno' | 'ada' | 'clara') {
    let c = this.scareChars[kind];
    if (!c) {
      c = kind === 'barber' ? createBarberGhost(true) : kind === 'bruno' ? createBruno() : kind === 'clara' ? createClara() : createAdaGhost();
      c.group.traverse((o) => {
        o.userData.noPick = true;
        // the scare version of the face: black holes, veins, a mouth hanging open
        if (o.userData.faceU) o.userData.faceU.uScare.value = 1;
        const m = o as THREE.Mesh;
        if (kind !== 'bruno' && m.isMesh && /^Eyes$/i.test(m.name)) m.visible = false;
      });
      this.scareChars[kind] = c;
    }
    return c;
  }
  /** Build the jumpscare figure for this place and compile it with the room's lights, so it can strike without a stall. */
  private async prepScare(id: string) {
    const kind = id.startsWith('barbiere') ? 'barber' : id === 'macelleria' ? 'bruno' : id.startsWith('ada') ? 'ada' : id.startsWith('ora') ? 'clara' : null;
    if (!kind || !realCharacters() || this.settings.reducedScares) return;
    const c = this.scareChar(kind);
    const scene = this.engine.scene;
    if (scene.userData['scareWarm' + kind]) return;
    scene.userData['scareWarm' + kind] = true;
    c.setOpacity?.(1);
    c.group.visible = true;
    c.group.position.set(0, -50, 0);
    const under = new THREE.SpotLight(0xffffff, 0, 3, 0.7, 0.3, 1.2);
    const fill = new THREE.PointLight(0xdde6ff, 0, 2.5, 2);
    scene.add(c.group, under, under.target, fill);
    try {
      const r = this.engine.renderer as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
      if (r.compileAsync) {
        scene.userData.compiling = (scene.userData.compiling ?? 0) + 1;
        await r.compileAsync(scene, this.engine.camera).finally(() => scene.userData.compiling--);
      }
    } catch {
      /* compiles on first sight instead */
    }
    scene.remove(c.group, under, under.target, fill);
  }
  private removeMarkers: (() => void) | null = null;
  private static markerTex: THREE.Texture | null = null;
  /**
   * Black and white swallows small things. A soft pulsing ring marks everything you can tap
   * (not the big furniture boxes), so nothing important gets lost in the dark. Can be turned off.
   */
  private markers(L: Location) {
    if (!Game.markerTex) {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d')!;
      const gr = x.createRadialGradient(32, 32, 4, 32, 32, 30);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)');
      gr.addColorStop(0.25, 'rgba(255,255,255,0.35)');
      gr.addColorStop(0.55, 'rgba(255,255,255,0.0)');
      gr.addColorStop(0.75, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, 64, 64);
      Game.markerTex = new THREE.CanvasTexture(c);
    }
    let list = L.scene.userData.markers as { h: Hotspot; s: THREE.Sprite; ph: number }[] | undefined;
    if (!list) {
      list = [];
      for (const h of L.hotspots) {
        if (h.lowPriority) continue;
        const m = new THREE.SpriteMaterial({ map: Game.markerTex, transparent: true, depthTest: false, depthWrite: false, sizeAttenuation: false, opacity: 0 });
        m.userData.shared = false;
        const sp = new THREE.Sprite(m);
        sp.layers.set(2);
        sp.userData.noPick = true;
        sp.renderOrder = 50;
        sp.scale.setScalar(0.05);
        L.scene.add(sp);
        list.push({ h, s: sp, ph: Math.random() * 6 });
      }
      L.scene.userData.markers = list;
    }
    const v = new THREE.Vector3();
    const items = list;
    return (_dt: number, time: number) => {
      const on = (this.settings.markers ?? true) && !this.busy;
      for (const m of items) {
        const show = on && m.h.obj.visible !== false && (m.h.when ? m.h.when() : true);
        m.s.visible = show;
        if (!show) continue;
        m.h.obj.getWorldPosition(v);
        m.s.position.copy(v);
        (m.s.material as THREE.SpriteMaterial).opacity = 0.5 + 0.25 * Math.sin(time * 2.2 + m.ph);
      }
    };
  }

  private async scare3d(kind: 'barber' | 'bruno' | 'ada' | 'clara', ms: number) {
    const c = this.scareChar(kind);
    const cam = this.engine.camera;
    const scene = this.engine.scene;
    const camPos = cam.getWorldPosition(new THREE.Vector3());
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()));
    fwd.y = 0;
    fwd.normalize();
    c.group.position.set(0, 0, 0);
    c.group.rotation.set(0, 0, 0);
    c.group.updateMatrixWorld(true);
    const headOff = c.head.getWorldPosition(new THREE.Vector3());
    c.setOpacity?.(1);
    c.setEyes(true);
    c.group.visible = true;
    scene.add(c.group);
    // light from below, white and hard, like a torch held under the chin
    const under = new THREE.SpotLight(0xffffff, kind === 'barber' ? 1.6 : 3, 3, 0.7, 0.3, 1.2);
    const fill = new THREE.PointLight(0xdde6ff, 0.4, 2.5, 2);
    scene.add(under, under.target, fill);
    const place = (dist: number, t: number) => {
      const head = camPos.clone().addScaledVector(fwd, dist);
      head.y = camPos.y - 0.02 + Math.sin(t * 40) * 0.004;
      c!.group.position.copy(head).sub(headOff);
      c!.group.rotation.set(0, Math.atan2(camPos.x - c!.group.position.x, camPos.z - c!.group.position.z), 0);
      // the head tilts, wrong
      c!.head.rotation.z += Math.sin(t * 23) * 0.004;
      under.position.copy(head).add(new THREE.Vector3(0, -0.55, 0)).addScaledVector(fwd, -0.25);
      under.target.position.copy(head);
      fill.position.copy(head).addScaledVector(fwd, -0.4);
    };
    // let the first frame with it render (any shader compile happens here) before the clock starts
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const t0 = performance.now();
    const total = Math.max(ms, 600);
    this.engine.flickerAmt = 1;
    await new Promise<void>((res) => {
      const step = () => {
        const k = (performance.now() - t0) / total;
        // rushes in from 1.6 m to a hand's breadth in the first fifth, then hangs there, twitching
        const e = Math.min(k / 0.2, 1);
        const dist = 1.6 - (1.6 - 0.32) * (1 - Math.pow(1 - e, 3));
        place(dist, k);
        c!.update(0.016, performance.now() / 1000, cam);
        if (k < 1) requestAnimationFrame(step);
        else res();
      };
      step();
    });
    this.engine.flickerAmt = 0;
    scene.remove(c.group, under, under.target, fill);
    c.setEyes(false);
    await this.ui.fadeOut(80);
    await this.ui.fadeIn(250);
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
        label: t('ui.markers'),
        value: '',
        options: [true, false].map((v) => ({
          label: t(v ? 'ui.on' : 'ui.off'),
          on: (s.markers ?? true) === v,
          set: () => { s.markers = v; this.persist(); this.openSettings(); },
        })),
      },
      {
        label: t('ui.sensors'),
        value: '',
        options: [true, false].map((v) => ({
          label: t(v ? 'ui.on' : 'ui.off'),
          on: (s.sensors ?? true) === v,
          set: () => { s.sensors = v; this.persist(); this.openSettings(); },
        })),
      },
      {
        label: t('ui.brightness'),
        value: '',
        options: [0, 1, 2].map((v) => ({
          label: t(`ui.br.${v}`),
          on: (s.brightness ?? 1) === v,
          set: () => { s.brightness = v; this.applySettings(); this.persist(); this.openSettings(); },
        })),
      },
      {
        label: t('ui.textSize'),
        value: '',
        options: [0, 1, 2].map((v) => ({
          label: t(`ui.ts.${v}`),
          on: (s.textSize ?? 1) === v,
          set: () => { s.textSize = v; this.applySettings(); this.persist(); this.refreshTexts(); this.openSettings(); },
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

