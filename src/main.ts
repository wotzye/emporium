import './style.css';
import { Game } from './game';
import { t, setLang, getLang, Lang } from './i18n';
import { createMap } from './locations/map';
import { createEmporio } from './locations/emporio';
import { createMacelleria } from './locations/macelleria';
import { createBarbiere } from './locations/barbiere';
import { createBarbiereRetro } from './locations/barbiere_retro';
import { createLab } from './locations/lab';
import { createAdaSoggiorno } from './locations/ada_soggiorno';
import { createAdaCucina } from './locations/ada_cucina';
import { createAdaSoffitta } from './locations/ada_soffitta';
import { createBarbiereCortile } from './locations/barbiere_cortile';
import { createBarbiereAlloggio } from './locations/barbiere_alloggio';
import { createAdaGiardino } from './locations/ada_giardino';
import { createAdaCamera } from './locations/ada_camera';
import { createAdaCucito } from './locations/ada_cucito';
import { askMotion, motionNeedsTap } from './sensors';
import { createFotoNegozio } from './locations/foto_negozio';
import { createFotoStudio } from './locations/foto_studio';
import { createFotoOscura } from './locations/foto_oscura';
import { createFotoArchivio } from './locations/foto_archivio';
import { createFotoCasa } from './locations/foto_casa';
import { createFotoRitocco } from './locations/foto_ritocco';
import { createRadioNegozio } from './locations/radio_negozio';
import { createRadioCantina } from './locations/radio_cantina';
import { createRadioLaboratorio } from './locations/radio_laboratorio';
import { createRadioCamera } from './locations/radio_camera';
import { createRadioTerrazzo } from './locations/radio_terrazzo';
import { createChiesaNavata } from './locations/chiesa_navata';
import { createChiesaCampanile } from './locations/chiesa_campanile';
import { createChiesaSagrestia } from './locations/chiesa_sagrestia';
import { createChiesaCimitero } from './locations/chiesa_cimitero';
import { createChiesaCripta } from './locations/chiesa_cripta';
import { createOraBottega } from './locations/ora_bottega';
import { createOraLaboratorio } from './locations/ora_laboratorio';
import { createOraCamera } from './locations/ora_camera';
import { createOraTorre } from './locations/ora_torre';
import { preloadModels } from './models';
import { photoOr } from './photos';
import { createBarbiereCantina } from './locations/barbiere_cantina';
import { createMacRetro } from './locations/mac_retro';
import { createMacCella } from './locations/mac_cella';
import { createMacCantina } from './locations/mac_cantina';
import { createValigiaBottega } from './locations/valigia_bottega';
import { createValigiaSogno } from './locations/valigia_sogno';

const root = document.getElementById('app')!;
const game = new Game(root);
game.register('map', createMap);
game.register('emporio', createEmporio);
game.register('macelleria', createMacelleria);
game.register('mac_retro', createMacRetro);
game.register('mac_cella', createMacCella);
game.register('mac_cantina', createMacCantina);
game.register('valigia_bottega', createValigiaBottega);
game.register('valigia_sogno', createValigiaSogno);
game.register('barbiere', createBarbiere);
game.register('barbiere_retro', createBarbiereRetro);
game.register('barbiere_cantina', createBarbiereCantina);
game.register('ada_soggiorno', createAdaSoggiorno);
game.register('ada_cucina', createAdaCucina);
game.register('ada_soffitta', createAdaSoffitta);
game.register('barbiere_cortile', createBarbiereCortile);
game.register('barbiere_alloggio', createBarbiereAlloggio);
game.register('ada_giardino', createAdaGiardino);
game.register('ada_camera', createAdaCamera);
game.register('ada_cucito', createAdaCucito);
game.register('foto_negozio', createFotoNegozio);
game.register('foto_studio', createFotoStudio);
game.register('foto_oscura', createFotoOscura);
game.register('foto_archivio', createFotoArchivio);
game.register('foto_casa', createFotoCasa);
game.register('foto_ritocco', createFotoRitocco);
game.register('radio_negozio', createRadioNegozio);
game.register('radio_cantina', createRadioCantina);
game.register('radio_laboratorio', createRadioLaboratorio);
game.register('radio_camera', createRadioCamera);
game.register('radio_terrazzo', createRadioTerrazzo);
game.register('chiesa_navata', createChiesaNavata);
game.register('chiesa_campanile', createChiesaCampanile);
game.register('chiesa_sagrestia', createChiesaSagrestia);
game.register('chiesa_cimitero', createChiesaCimitero);
game.register('chiesa_cripta', createChiesaCripta);
game.register('ora_bottega', createOraBottega);
game.register('ora_laboratorio', createOraLaboratorio);
game.register('ora_camera', createOraCamera);
game.register('ora_torre', createOraTorre);
if (location.search.includes('lab')) game.register('lab', createLab);

// expose for automated tests
(window as unknown as { __game: Game }).__game = game;

const models = preloadModels();

// if the phone takes the graphics away (out of memory), come back where we were
game.engine.renderer.domElement.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  const n = document.createElement('div');
  n.style.cssText = 'position:fixed;inset:0;background:#000;color:#cfc8b8;display:grid;place-items:center;font:16px monospace;z-index:99';
  n.textContent = '…';
  document.body.append(n);
  // straight back into the game after the reload: no logo, no title screen
  try {
    sessionStorage.setItem('cp.resume', '1');
  } catch {
    /* private mode */
  }
  setTimeout(() => location.reload(), 1200);
});

/** shown in a corner of the title screen, so you can tell which version the phone is running */
const VERSION = 'v0.25.2';

/** EmporiumEscape presents: the logo out of the dark, a bell, then the title */
function splash(): Promise<void> {
  return new Promise((res) => {
    const d = document.createElement('div');
    d.id = 'splash';
    d.innerHTML = `<img src="${import.meta.env.MODE === 'single' ? './' : import.meta.env.BASE_URL}logo.jpg" alt="EmporiumEscape"><div class="pres">${t('title.presents')}</div>`;
    document.body.append(d);
    let done = false;
    const end = () => {
      if (done) return;
      done = true;
      d.classList.add('out');
      setTimeout(() => {
        d.remove();
        res();
      }, 700);
    };
    d.onclick = end;
    setTimeout(end, 3600);
  });
}

/** the opening, told in pictures: the letter, the station, the village in the fog */
function introFilm() {
  const paper = (lines: number, title?: string) => (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#0d0c0b';
    c.fillRect(0, 0, w, h);
    c.save();
    c.translate(w / 2, h / 2);
    c.rotate(-0.04);
    c.fillStyle = '#d9d0bc';
    c.fillRect(-w * 0.3, -h * 0.42, w * 0.6, h * 0.84);
    c.fillStyle = '#2a2420';
    c.font = 'italic 34px Georgia, serif';
    if (title) c.fillText(title, -w * 0.25, -h * 0.3);
    c.strokeStyle = 'rgba(40,34,30,0.75)';
    c.lineWidth = 2;
    for (let i = 0; i < lines; i++) {
      c.beginPath();
      const y = -h * 0.2 + i * 30;
      c.moveTo(-w * 0.25, y);
      for (let x = -w * 0.25; x < w * 0.22 - (i % 3) * 40; x += 12) c.lineTo(x, y + Math.sin(x * 0.3 + i) * 3);
      c.stroke();
    }
    c.restore();
  };
  const station = (c: CanvasRenderingContext2D, w: number, h: number) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#6a6862');
    gr.addColorStop(1, '#1a1918');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#121110';
    c.fillRect(w * 0.1, h * 0.35, w * 0.45, h * 0.4);
    c.fillRect(w * 0.08, h * 0.3, w * 0.5, h * 0.06);
    c.fillStyle = '#d9d2c4';
    c.font = 'bold 28px Georgia, serif';
    c.fillText('ROCCA DEL CASTELLO', w * 0.14, h * 0.34);
    c.strokeStyle = '#2a2826';
    c.lineWidth = 6;
    for (const k of [0.82, 0.92]) {
      c.beginPath();
      c.moveTo(0, h * k);
      c.lineTo(w, h * (k - 0.06));
      c.stroke();
    }
    // a lone figure with a suitcase
    c.fillStyle = '#0a0a0a';
    c.fillRect(w * 0.72, h * 0.5, 22, 90);
    c.beginPath();
    c.arc(w * 0.72 + 11, h * 0.48, 13, 0, Math.PI * 2);
    c.fill();
    c.fillRect(w * 0.72 + 26, h * 0.62, 30, 22);
  };
  const village = (c: CanvasRenderingContext2D, w: number, h: number) => {
    c.fillStyle = '#4a4844';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1a1918';
    for (let i = 0; i < 9; i++) c.fillRect(i * w * 0.11, h * (0.4 + (i % 3) * 0.05), w * 0.1, h);
    c.fillRect(w * 0.47, h * 0.12, w * 0.06, h);
    const fog = c.createLinearGradient(0, h * 0.5, 0, h);
    fog.addColorStop(0, 'rgba(200,200,196,0)');
    fog.addColorStop(1, 'rgba(200,200,196,0.75)');
    c.fillStyle = fog;
    c.fillRect(0, 0, w, h);
  };
  game.audio.rec('bell', { gain: 0.5, delay: 0.4 });
  return game.ui.memory(t('intro.title'), [
    { text: t('intro.1'), draw: photoOr('intro_1', paper(9)) },
    { text: t('intro.2'), draw: photoOr('intro_2', paper(12, 'Diego,')) },
    { text: t('intro.3'), draw: photoOr('intro_3', station) },
    { text: t('intro.4'), draw: photoOr('intro_4', village) },
  ]);
}

function title() {
  const el = game.ui.title;
  const hasSave = game.hasSave();
  el.innerHTML = `
    <div class="tbg" style="background-image:url(${import.meta.env.MODE === 'single' ? './' : import.meta.env.BASE_URL}title_bg.jpg)"></div>
    <div class="tvig"></div>
    <div class="grain"></div>
    <img class="tlogo" src="${import.meta.env.MODE === 'single' ? './' : import.meta.env.BASE_URL}logo.jpg" alt="EmporiumEscape">
    <div class="sub">${t('title.pre')}</div>
    <h1 class="flicker">${t('title.name')}</h1>
    <div class="sub">${t('title.sub')}</div>
    <div class="ver">${VERSION}</div>
    <div class="menu">
      ${hasSave ? `<button data-a="continue">${t('title.continue')}</button>` : ''}
      <button data-a="new">${t('title.new')}</button>
    </div>
    <div class="langs">
      ${(['it', 'en'] as Lang[]).map((l) => `<button data-l="${l}" class="${getLang() === l ? 'on' : ''}">${l.toUpperCase()}</button>`).join('')}
    </div>
    <div class="warn">${t('title.warn')}</div>`;
  el.classList.add('on');
  el.querySelectorAll<HTMLButtonElement>('[data-l]').forEach((b) => {
    b.onclick = () => {
      setLang(b.dataset.l as Lang);
      game.save.lang = getLang();
      game.persist();
      game.ui.refreshStatic();
      title();
    };
  });
  el.querySelectorAll<HTMLButtonElement>('[data-a]').forEach((b) => {
    b.onclick = async () => {
      game.audio.init();
      game.applySettings();
      // the models usually finish loading while the title is on screen
      b.textContent = '…';
      await models;
      el.classList.remove('on');
      if (b.dataset.a === 'continue' && game.continueGame()) {
        game.ui.refreshStatic();
        await game.go(game.save.location === 'macelleria' && game.flag('fledButcher') && !game.flag('ch.done') ? 'map' : game.save.location || 'map');
      } else {
        await game.newGame();
        game.audio.drone('map');
        await Promise.all([introFilm(), models]);
        await game.go('map');
      }
    };
  });
}

/** after the phone took the graphics away: one tap (sound needs it) and you are where you were */
function resume() {
  const el = game.ui.title;
  el.innerHTML = `<div class="tvig"></div><div class="menu"><button data-a="resume">${t('title.resume')}</button></div>`;
  el.classList.add('on');
  el.querySelector<HTMLButtonElement>('[data-a="resume"]')!.onclick = async (ev) => {
    (ev.currentTarget as HTMLButtonElement).textContent = '…';
    game.audio.init();
    game.applySettings();
    await models;
    el.classList.remove('on');
    if (!game.continueGame()) return title();
    game.ui.refreshStatic();
    await game.go(game.save.location || 'map');
  };
}

let resuming = false;
try {
  resuming = sessionStorage.getItem('cp.resume') === '1' && game.hasSave();
  sessionStorage.removeItem('cp.resume');
} catch {
  /* private mode */
}
if (resuming) resume();
else splash().then(title);

// iPhone: ask for the motion sensors at the first tap (it can only be asked from a tap),
// so that shaking the phone works when the game needs it
// (touchend and click are the events iOS counts as a tap for this; try on each until it's answered)
const primeMotion = () => {
  if (!motionNeedsTap() || !(game.settings.sensors ?? true)) return;
  askMotion().then((ok) => {
    if (ok) {
      window.removeEventListener('touchend', primeMotion);
      window.removeEventListener('click', primeMotion);
    }
  });
};
window.addEventListener('touchend', primeMotion);
window.addEventListener('click', primeMotion);
