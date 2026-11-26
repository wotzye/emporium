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
  setTimeout(() => location.reload(), 1200);
});

function title() {
  const el = game.ui.title;
  const hasSave = game.hasSave();
  el.innerHTML = `
    <div class="grain"></div>
    <div class="sub">${t('title.pre')}</div>
    <h1>${t('title.name')}</h1>
    <div class="sub">${t('title.sub')}</div>
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
        await Promise.all([game.ui.cards(['intro.1', 'intro.2', 'intro.3', 'intro.4']), models]);
        await game.go('map');
      }
    };
  });
}

title();

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
