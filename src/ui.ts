import { ICONS, ITEMS } from './items';
import { t } from './i18n';

export interface Line {
  who?: 'diego' | 'mercante' | 'lisa' | 'bruno' | 'narr' | 'ada' | 'ettore';
  key: string;
  vars?: Record<string, string | number>;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

export class UI {
  root: HTMLElement;
  hud = el('div');
  place = el('div', 'place');
  btnDiary = el('button');
  btnNotebook = el('button');
  btnLisa = el('button');
  btnSettings = el('button');
  btnTorch = el('button');
  back = el('button');
  inv = el('div');
  invLabel = el('div', 'label');
  dialog = el('div');
  toastEl = el('div');
  modal = el('div');
  fade = el('div', 'off');
  scare = el('div');
  qte = el('button');
  title = el('div');
  card = el('div');
  rotate = el('div');
  held = el('button');
  onHeldTap: () => void = () => {};

  onBack: () => void = () => {};
  onItemTap: (id: string) => void = () => {};
  onDiary: () => void = () => {};
  onNotebook: () => void = () => {};
  onLisa: () => void = () => {};
  onSettings: () => void = () => {};
  onTorch: () => void = () => {};

  private toastTimer = 0;

  constructor(root: HTMLElement) {
    this.root = root;
    this.hud.id = 'hud';
    const top = el('div', 'top');
    const btns = el('div', 'btns');
    this.btnDiary.innerHTML = ICONS.diary;
    this.btnNotebook.innerHTML = ICONS.notebook;
    this.btnLisa.innerHTML = ICONS.lisa + '<span class="badge"></span>';
    this.btnSettings.innerHTML = ICONS.settings;
    this.btnTorch.innerHTML = ICONS.torch;
    this.btnTorch.style.display = 'none';
    btns.append(this.btnTorch, this.btnDiary, this.btnNotebook, this.btnLisa, this.btnSettings);
    top.append(this.place, btns);
    this.back.id = 'back';
    this.inv.id = 'inv';
    this.held.id = 'held';
    this.held.hidden = true;
    this.held.onclick = () => this.onHeldTap();
    this.hud.append(top, this.back, this.inv, this.invLabel, this.held);
    this.dialog.id = 'dialog';
    this.toastEl.id = 'toast';
    this.modal.id = 'modal';
    this.fade.id = 'fade';
    this.fade.classList.remove('off');
    this.scare.id = 'scare';
    this.qte.id = 'qte';
    this.title.id = 'title';
    this.card.id = 'card';
    this.rotate.id = 'rotate';
    root.append(this.hud, this.dialog, this.toastEl, this.modal, this.fade, this.scare, this.qte, this.title, this.card, this.rotate);

    this.btnDiary.onclick = () => this.onDiary();
    this.btnNotebook.onclick = () => this.onNotebook();
    this.btnLisa.onclick = () => this.onLisa();
    this.btnSettings.onclick = () => this.onSettings();
    this.btnTorch.onclick = () => this.onTorch();
    this.back.onclick = () => this.onBack();
    this.refreshStatic();
  }

  refreshStatic() {
    this.rotate.innerHTML = `<div><div class="ph"></div><div>${t('ui.rotate')}</div></div>`;
    this.btnDiary.title = t('ui.diary');
    this.btnNotebook.title = t('ui.notebook');
    this.btnLisa.title = t('ui.lisa');
    this.btnSettings.title = t('ui.settings');
    this.btnTorch.title = t('ui.torch');
  }

  showHud(on: boolean) {
    this.hud.style.display = on ? '' : 'none';
  }

  setPlace(name: string) {
    this.place.textContent = name;
  }

  setBack(label: string | null) {
    if (label === null) this.back.hidden = true;
    else {
      this.back.hidden = false;
      this.back.textContent = label;
    }
  }

  setHeld(label: string | null) {
    this.held.hidden = !label;
    this.held.innerHTML = label ? `✋ ${label}<small>${t('ui.putDown')}</small>` : '';
  }

  setTorch(available: boolean, on: boolean) {
    this.btnTorch.style.display = available ? '' : 'none';
    this.btnTorch.classList.toggle('on', on);
  }

  setLisaBadge(n: number | null) {
    const b = this.btnLisa.querySelector('.badge') as HTMLElement;
    b.textContent = n === null ? '∞' : String(n);
    this.btnLisa.style.opacity = n === 0 ? '0.4' : '1';
  }

  flash(btn: 'diary' | 'notebook') {
    const b = btn === 'diary' ? this.btnDiary : this.btnNotebook;
    b.classList.remove('flash');
    void b.offsetWidth;
    b.classList.add('flash');
  }

  renderInventory(items: string[], selected: string | null, fresh?: string) {
    this.inv.innerHTML = '';
    const slots = Math.max(6, items.length);
    for (let i = 0; i < slots; i++) {
      const id = items[i];
      const s = el('div', 'slot');
      if (id) {
        const def = ITEMS[id];
        s.innerHTML = def.svg;
        if (def.cursed) s.classList.add('cursed');
        if (id === selected) s.classList.add('sel');
        if (id === fresh) s.classList.add('new');
        s.onclick = (e) => {
          e.stopPropagation();
          this.onItemTap(id);
        };
      }
      this.inv.append(s);
    }
    this.invLabel.textContent = selected ? t(`item.${selected}`) + ' — ' + t('ui.useHint') : '';
  }

  toast(text: string, ms = 2600) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('on');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('on'), ms);
  }

  /** Typewriter dialog. Resolves after the last line is dismissed. */
  say(lines: Line[]): Promise<void> {
    return new Promise((resolve) => {
      let i = 0;
      let typing = 0;
      let full = '';
      const d = this.dialog;
      d.innerHTML = '<div class="box"><div class="who"></div><div class="txt"></div><div class="more">▼</div></div>';
      const who = d.querySelector('.who') as HTMLElement;
      const txt = d.querySelector('.txt') as HTMLElement;
      d.classList.add('on');
      const show = () => {
        const L = lines[i];
        full = t(L.key, L.vars);
        const w = L.who ?? 'narr';
        who.className = 'who ' + w;
        who.textContent = w === 'narr' ? '' : t(`who.${w}`);
        txt.className = 'txt ' + w;
        txt.textContent = '';
        let n = 0;
        clearInterval(typing);
        typing = window.setInterval(() => {
          n += 2;
          txt.textContent = full.slice(0, n);
          if (n >= full.length) clearInterval(typing);
        }, 22);
      };
      const next = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (txt.textContent!.length < full.length) {
          clearInterval(typing);
          txt.textContent = full;
          return;
        }
        i++;
        if (i >= lines.length) {
          d.classList.remove('on');
          d.onpointerup = null;
          resolve();
        } else show();
      };
      d.onpointerup = next;
      show();
    });
  }

  // ---------------- modals ----------------
  private openModal(title: string, body: HTMLElement, onClose?: () => void) {
    this.modal.innerHTML = '';
    const p = el('div', 'panel');
    const h = el('h2');
    h.textContent = title;
    const x = el('button', 'close', '×');
    p.append(h, x, body);
    this.modal.append(p);
    this.modal.classList.add('on');
    const close = () => {
      this.modal.classList.remove('on');
      this.modal.innerHTML = '';
      onClose?.();
    };
    x.onclick = close;
    this.modal.onpointerup = (e) => {
      if (e.target === this.modal) close();
    };
    return close;
  }

  closeModal() {
    this.modal.classList.remove('on');
    this.modal.innerHTML = '';
  }

  doc(title: string, text: string, hand = false): Promise<void> {
    return new Promise((res) => {
      const b = el('div', 'paper' + (hand ? ' hand' : ''));
      b.textContent = text;
      this.openModal(title, b, res);
    });
  }

  picture(title: string, src: string, caption?: string): Promise<void> {
    return new Promise((res) => {
      const b = el('div');
      const img = el('img', 'pic') as HTMLImageElement;
      img.src = src;
      b.append(img);
      if (caption) {
        const c = el('div', 'paper hand');
        c.style.marginTop = '12px';
        c.textContent = caption;
        b.append(c);
      }
      this.openModal(title, b, res);
    });
  }

  list(title: string, entries: { text: string; onClick?: () => void }[], empty: string) {
    const b = el('div');
    if (!entries.length) {
      const e = el('div', 'empty');
      e.textContent = empty;
      b.append(e);
    } else {
      const ul = el('ul', 'entries');
      for (const en of entries) {
        const li = el('li', en.onClick ? 'page' : '');
        li.textContent = en.text;
        if (en.onClick) li.onclick = en.onClick;
        ul.append(li);
      }
      b.append(ul);
    }
    this.openModal(title, b);
  }

  /** Numeric keypad. check() decides if the code is right; resolves true when solved, false when closed. */
  keypad(title: string, digits: number, check: (code: string) => boolean, onKey?: () => void): Promise<boolean> {
    return new Promise((res) => {
      let code = '';
      const b = el('div');
      const disp = el('div', 'display');
      const pad = el('div', 'keypad');
      const render = () => (disp.textContent = code.padEnd(digits, '·'));
      let solved = false;
      for (const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '↵']) {
        const btn = el('button');
        btn.textContent = k;
        btn.onclick = () => {
          onKey?.();
          if (k === 'C') code = '';
          else if (k === '↵') {
            if (check(code)) {
              solved = true;
              close();
              res(true);
              return;
            }
            disp.classList.remove('err');
            void disp.offsetWidth;
            disp.classList.add('err');
            code = '';
          } else if (code.length < digits) code += k;
          render();
        };
        pad.append(btn);
      }
      render();
      b.append(disp, pad);
      const close = this.openModal(title, b, () => {
        if (!solved) res(false);
      });
    });
  }

  /** Letter wheels lock. */
  letterLock(title: string, len: number, check: (word: string) => boolean, onKey?: () => void): Promise<boolean> {
    return new Promise((res) => {
      const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const vals = new Array(len).fill(0);
      const b = el('div');
      const wheels = el('div', 'wheels');
      const chs: HTMLElement[] = [];
      let solved = false;
      for (let i = 0; i < len; i++) {
        const w = el('div', 'wheel');
        const up = el('button', '', '▲');
        const ch = el('div', 'ch');
        const dn = el('button', '', '▼');
        up.onclick = () => { vals[i] = (vals[i] + 25) % 26; onKey?.(); draw(); };
        dn.onclick = () => { vals[i] = (vals[i] + 1) % 26; onKey?.(); draw(); };
        chs.push(ch);
        w.append(up, ch, dn);
        wheels.append(w);
      }
      const draw = () => chs.forEach((c, i) => (c.textContent = A[vals[i]]));
      draw();
      const act = el('div', 'actions');
      const ok = el('button');
      ok.textContent = t('ui.tryOpen');
      ok.onclick = () => {
        const word = vals.map((v) => A[v]).join('');
        if (check(word)) {
          solved = true;
          close();
          res(true);
        } else {
          wheels.classList.remove('err');
          void wheels.offsetWidth;
          wheels.style.animation = 'shake 0.4s';
          setTimeout(() => (wheels.style.animation = ''), 400);
        }
      };
      act.append(ok);
      b.append(wheels, act);
      const close = this.openModal(title, b, () => {
        if (!solved) res(false);
      });
    });
  }

  settings(rows: { label: string; value: string; options?: { label: string; on: boolean; set: () => void }[]; action?: () => void }[]) {
    const b = el('div');
    for (const r of rows) {
      const row = el('div', 'row');
      const l = el('span');
      l.textContent = r.label;
      const right = el('span');
      right.style.display = 'flex';
      right.style.gap = '6px';
      if (r.options) {
        for (const o of r.options) {
          const btn = el('button', o.on ? 'on' : '');
          btn.textContent = o.label;
          btn.onclick = () => o.set();
          right.append(btn);
        }
      } else if (r.action) {
        const btn = el('button');
        btn.textContent = r.value;
        btn.onclick = () => r.action!();
        right.append(btn);
      }
      row.append(l, right);
      b.append(row);
    }
    this.openModal(t('ui.settings'), b);
  }

  // ---------------- fade, scare, qte ----------------
  fadeOut(ms = 600): Promise<void> {
    this.fade.style.transitionDuration = ms + 'ms';
    this.fade.classList.remove('off');
    return new Promise((r) => setTimeout(r, ms));
  }
  fadeIn(ms = 600): Promise<void> {
    this.fade.style.transitionDuration = ms + 'ms';
    this.fade.classList.add('off');
    return new Promise((r) => setTimeout(r, ms));
  }

  showScare(cv: HTMLCanvasElement, ms: number): Promise<void> {
    this.scare.innerHTML = '';
    this.scare.append(cv);
    this.scare.classList.add('on');
    return new Promise((r) =>
      setTimeout(() => {
        this.scare.classList.remove('on');
        r();
      }, ms),
    );
  }

  /** Quick action button. Resolves true if tapped in time. */
  quick(label: string, ms: number): Promise<boolean> {
    return new Promise((res) => {
      this.qte.textContent = label;
      this.qte.classList.add('on');
      let done = false;
      const finish = (v: boolean) => {
        if (done) return;
        done = true;
        this.qte.classList.remove('on');
        this.qte.onclick = null;
        res(v);
      };
      this.qte.onclick = (e) => {
        e.stopPropagation();
        finish(true);
      };
      setTimeout(() => finish(false), ms);
    });
  }

  /** A memory: illustrated panels, each with a line of story, like an old film reel. */
  memory(title: string, panels: { draw: (c: CanvasRenderingContext2D, w: number, h: number) => void; text: string }[]): Promise<void> {
    return new Promise((res) => {
      let i = 0;
      const c = this.card;
      c.innerHTML = `<div class="grain"></div><div class="memtitle"></div><div class="memframe"><canvas></canvas></div><div class="txt memtxt"></div><div class="tap"></div>`;
      (c.querySelector('.memtitle') as HTMLElement).textContent = title;
      const cv = c.querySelector('canvas') as HTMLCanvasElement;
      const txt = c.querySelector('.txt') as HTMLElement;
      (c.querySelector('.tap') as HTMLElement).textContent = t('ui.tapContinue');
      c.classList.add('on', 'memory');
      let typing = 0;
      let full = '';
      const show = () => {
        cv.width = 960;
        cv.height = 540;
        const ctx = cv.getContext('2d')!;
        ctx.fillStyle = '#0b0a09';
        ctx.fillRect(0, 0, 960, 540);
        // drawn soft, like a half-remembered photograph
        ctx.filter = 'blur(2.2px) contrast(1.15)';
        panels[i].draw(ctx, 960, 540);
        ctx.filter = 'none';
        // a slow light leak from one side
        const lk = ctx.createLinearGradient(0, 0, 960, 0);
        lk.addColorStop(0, 'rgba(255,240,210,0.10)');
        lk.addColorStop(0.4, 'rgba(255,240,210,0)');
        ctx.fillStyle = lk;
        ctx.fillRect(0, 0, 960, 540);
        // old film: grain, scratches, vignette
        for (let k = 0; k < 9000; k++) {
          const v = Math.random() < 0.5 ? 0 : 255;
          ctx.fillStyle = `rgba(${v},${v},${v},${Math.random() * 0.12})`;
          ctx.fillRect(Math.random() * 960, Math.random() * 540, 2, 2);
        }
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.1})`;
          ctx.fillRect(Math.random() * 960, 0, 1, 540);
        }
        const v = ctx.createRadialGradient(480, 270, 180, 480, 270, 560);
        v.addColorStop(0, 'rgba(0,0,0,0)');
        v.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = v;
        ctx.fillRect(0, 0, 960, 540);
        cv.style.animation = 'none';
        void cv.offsetWidth;
        cv.style.animation = '';
        full = panels[i].text;
        txt.textContent = '';
        let n = 0;
        clearInterval(typing);
        typing = window.setInterval(() => {
          n += 1;
          txt.textContent = full.slice(0, n);
          if (n >= full.length) clearInterval(typing);
        }, 30);
      };
      c.onpointerup = () => {
        if (txt.textContent!.length < full.length) {
          clearInterval(typing);
          txt.textContent = full;
          return;
        }
        i++;
        if (i >= panels.length) {
          c.onpointerup = null;
          c.classList.remove('on', 'memory');
          res();
        } else show();
      };
      show();
    });
  }

  /** Full-screen text cards (intro, chapter ends). */
  cards(keys: string[]): Promise<void> {
    return new Promise((res) => {
      let i = 0;
      const c = this.card;
      c.innerHTML = '<div class="grain"></div><div class="txt"></div><div class="tap"></div>';
      const txt = c.querySelector('.txt') as HTMLElement;
      const tap = c.querySelector('.tap') as HTMLElement;
      tap.textContent = t('ui.tapContinue');
      c.classList.add('on');
      let typing = 0;
      let full = '';
      const show = () => {
        full = t(keys[i]);
        txt.textContent = '';
        let n = 0;
        clearInterval(typing);
        typing = window.setInterval(() => {
          n += 1;
          txt.textContent = full.slice(0, n);
          if (n >= full.length) clearInterval(typing);
        }, 28);
      };
      c.onpointerup = () => {
        if (txt.textContent!.length < full.length) {
          clearInterval(typing);
          txt.textContent = full;
          return;
        }
        i++;
        if (i >= keys.length) {
          c.onpointerup = null;
          c.classList.remove('on');
          res();
        } else show();
      };
      show();
    });
  }
}
