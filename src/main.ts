import './style.css';
import { Game } from './game';
import { t, setLang, getLang, Lang } from './i18n';
import { createMap } from './locations/map';
import { createEmporio } from './locations/emporio';
import { createMacelleria } from './locations/macelleria';
import { createBarbiere } from './locations/barbiere';
import { createBarbiereRetro } from './locations/barbiere_retro';
import { createBarbiereCantina } from './locations/barbiere_cantina';

const root = document.getElementById('app')!;
const game = new Game(root);
game.register('map', createMap);
game.register('emporio', createEmporio);
game.register('macelleria', createMacelleria);
game.register('barbiere', createBarbiere);
game.register('barbiere_retro', createBarbiereRetro);
game.register('barbiere_cantina', createBarbiereCantina);

// expose for automated tests
(window as unknown as { __game: Game }).__game = game;

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
      el.classList.remove('on');
      if (b.dataset.a === 'continue' && game.continueGame()) {
        game.ui.refreshStatic();
        await game.go(game.save.location === 'macelleria' && game.flag('fledButcher') ? 'map' : game.save.location || 'map');
      } else {
        await game.newGame();
        game.audio.drone('map');
        await game.ui.cards(['intro.1', 'intro.2', 'intro.3', 'intro.4']);
        await game.go('map');
      }
    };
  });
}

title();
