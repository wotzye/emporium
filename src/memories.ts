import { t } from './i18n';

type Draw = (c: CanvasRenderingContext2D, w: number, h: number) => void;

const ink = '#0d0c0b';
const paper = '#cfc8b8';

function figure(c: CanvasRenderingContext2D, x: number, y: number, s: number, col: string, coat = false, hat = false) {
  c.fillStyle = col;
  c.beginPath();
  c.arc(x, y - 150 * s, 26 * s, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(x - 40 * s, y - 115 * s);
  c.lineTo(x + 40 * s, y - 115 * s);
  c.lineTo(x + (coat ? 55 : 38) * s, y);
  c.lineTo(x - (coat ? 55 : 38) * s, y);
  c.closePath();
  c.fill();
  if (hat) {
    c.fillRect(x - 42 * s, y - 176 * s, 84 * s, 8 * s);
    c.fillRect(x - 24 * s, y - 205 * s, 48 * s, 32 * s);
  }
}

function chair(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.fillStyle = '#2a2723';
  c.fillRect(x - 40 * s, y - 70 * s, 80 * s, 16 * s);
  c.fillRect(x + 24 * s, y - 150 * s, 18 * s, 90 * s);
  c.fillRect(x - 6 * s, y - 54 * s, 12 * s, 50 * s);
  c.fillRect(x - 40 * s, y - 6 * s, 80 * s, 8 * s);
}

/** The barber: Aldo Morandi, 1951–1974. */
export function barberMemory(): { title: string; panels: { draw: Draw; text: string }[] } {
  const panels: { draw: Draw; text: string }[] = [
    {
      text: t('mem.bar.1'),
      draw: (c, w, h) => {
        // the new shop, 1951: shop front, striped pole, a young man at the door
        c.fillStyle = '#8f897d';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#5c574e';
        c.fillRect(200, 120, 560, 420);
        c.fillStyle = '#c9c2b2';
        c.fillRect(260, 220, 260, 200);
        c.fillStyle = ink;
        c.fillRect(560, 220, 120, 320);
        c.fillStyle = '#1a1816';
        c.fillRect(230, 140, 500, 50);
        c.fillStyle = paper;
        c.font = 'bold 34px Georgia, serif';
        c.textAlign = 'center';
        c.fillText('BARBIERE — 1951', 480, 177);
        for (let y = 230; y < 420; y += 24) {
          c.fillStyle = y % 48 ? '#eee' : '#222';
          c.fillRect(712, y, 22, 24);
        }
        figure(c, 620, 540, 1.1, '#e4dfd4');
      },
    },
    {
      text: t('mem.bar.2'),
      draw: (c, w, h) => {
        // three reflections in the same mirror, each one older
        c.fillStyle = '#2c2a27';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#7d8286';
        c.fillRect(90, 70, 780, 360);
        const faces: [number, string, number][] = [[230, '#e2ddd2', 0], [480, '#c9c3b7', 6], [730, '#a59e92', 14]];
        for (const [x, col, wr] of faces) {
          c.fillStyle = col;
          c.beginPath();
          c.ellipse(x, 250, 70, 95, 0, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = ink;
          c.beginPath();
          c.ellipse(x - 25, 230, 10, 7, 0, 0, Math.PI * 2);
          c.ellipse(x + 25, 230, 10, 7, 0, 0, Math.PI * 2);
          c.fill();
          c.strokeStyle = 'rgba(0,0,0,0.45)';
          c.lineWidth = 2;
          for (let k = 0; k < wr; k++) {
            c.beginPath();
            c.moveTo(x - 40, 190 - k * 2 + (k % 3) * 40);
            c.quadraticCurveTo(x, 186 - k * 2 + (k % 3) * 40, x + 40, 190 - k * 2 + (k % 3) * 40);
            c.stroke();
          }
          c.fillRect(x - 22, 300, 44, 4);
        }
      },
    },
    {
      text: t('mem.bar.3'),
      draw: (c, w, h) => {
        // the stranger at the counter, the razor glinting red
        c.fillStyle = '#3b3833';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#d8d0bf';
        const g = c.createRadialGradient(480, 260, 10, 480, 260, 420);
        g.addColorStop(0, 'rgba(230,220,200,0.35)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        figure(c, 640, 540, 1.6, '#050505', true, true);
        c.fillStyle = '#d6cfc2';
        c.beginPath();
        c.ellipse(640, 300, 30, 40, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = ink;
        c.fillRect(620, 312, 40, 4);
        figure(c, 300, 540, 1.3, '#cfc8bc');
        // the razor, held out between them
        c.save();
        c.translate(470, 360);
        c.rotate(-0.3);
        c.fillStyle = '#c4101a';
        c.shadowColor = '#ff2020';
        c.shadowBlur = 20;
        c.fillRect(-60, -6, 120, 12);
        c.restore();
      },
    },
    {
      text: t('mem.bar.4'),
      draw: (c, w, h) => {
        // the chairs, the customers going grey
        c.fillStyle = '#9b958a';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#6f6a61';
        c.fillRect(0, 380, w, 160);
        const cols = ['#d9d3c7', '#a9a397', '#78726a'];
        [220, 480, 740].forEach((x, i) => {
          chair(c, x, 470, 1.6);
          c.fillStyle = cols[i];
          c.beginPath();
          c.arc(x - 10, 250, 34, 0, Math.PI * 2);
          c.fill();
          c.fillRect(x - 45, 280, 70, 110);
          // white hair grows with each chair
          c.fillStyle = '#f2efe8';
          c.fillRect(x - 40, 214, 60, 8 + i * 14);
        });
        figure(c, 600, 470, 1.2, '#eae6dc');
      },
    },
    {
      text: t('mem.bar.5'),
      draw: (c, w, h) => {
        // an empty shop, and the mirror where he stayed
        c.fillStyle = '#1a1917';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#596064';
        c.fillRect(140, 80, 680, 300);
        c.fillStyle = 'rgba(230,228,220,0.75)';
        c.beginPath();
        c.ellipse(480, 220, 50, 66, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = ink;
        c.beginPath();
        c.ellipse(462, 208, 9, 12, 0, 0, Math.PI * 2);
        c.ellipse(498, 208, 9, 12, 0, 0, Math.PI * 2);
        c.ellipse(480, 255, 10, 14, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(0,0,0,0.6)';
        for (const x of [260, 480, 700]) chair(c, x, 520, 1.4);
      },
    },
  ];
  return { title: t('mem.bar.title'), panels };
}
