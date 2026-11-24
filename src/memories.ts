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

/** Ada and Ettore, 1946–1974. */
export function adaMemory(): { title: string; panels: { draw: Draw; text: string }[] } {
  const panels: { draw: Draw; text: string }[] = [
    {
      text: t('mem.ada.1'),
      draw: (c, w, h) => {
        // the church steps, a bride, a man on crutches
        c.fillStyle = '#a49e92';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#6e695f';
        c.fillRect(260, 60, 440, 480);
        c.fillStyle = '#2a2723';
        c.beginPath();
        c.moveTo(400, 540);
        c.lineTo(400, 300);
        c.arc(480, 300, 80, Math.PI, 0);
        c.lineTo(560, 540);
        c.fill();
        for (let i = 0; i < 4; i++) {
          c.fillStyle = i % 2 ? '#8a857b' : '#7b766c';
          c.fillRect(220 - i * 30, 470 + i * 18, 520 + i * 60, 18);
        }
        // the bride
        c.fillStyle = '#f2eee6';
        c.beginPath();
        c.arc(420, 320, 22, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.moveTo(395, 345);
        c.lineTo(445, 345);
        c.lineTo(475, 480);
        c.lineTo(365, 480);
        c.fill();
        // the groom, leaning on a crutch
        figure(c, 535, 480, 0.95, '#1d1b18', false, true);
        c.strokeStyle = '#1d1b18';
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(585, 380);
        c.lineTo(600, 480);
        c.stroke();
      },
    },
    {
      text: t('mem.ada.2'),
      draw: (c, w, h) => {
        // the kitchen table, every evening: two cups and a teapot
        c.fillStyle = '#5a554d';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#9aa1a6';
        c.fillRect(60, 80, 150, 210);
        c.fillStyle = '#2d2a26';
        c.fillRect(750, 230, 160, 240);
        c.fillStyle = '#3e3a34';
        c.beginPath();
        c.ellipse(480, 400, 260, 60, 0, 0, Math.PI * 2);
        c.fill();
        for (const x of [330, 630]) {
          c.fillStyle = '#e8e2d6';
          c.fillRect(x - 18, 360, 36, 26);
        }
        c.beginPath();
        c.ellipse(480, 365, 34, 30, 0, 0, Math.PI * 2);
        c.fill();
        figure(c, 220, 470, 1.15, '#1e1c19', false, true);
        figure(c, 740, 470, 1.15, '#e2ddd2');
      },
    },
    {
      text: t('mem.ada.3'),
      draw: (c, w, h) => {
        // an empty rocking chair in front of the snow on the TV
        c.fillStyle = '#1b1a18';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#c9cdd0';
        c.fillRect(560, 160, 260, 190);
        for (let k = 0; k < 2500; k++) {
          c.fillStyle = Math.random() < 0.5 ? '#222' : '#eee';
          c.fillRect(560 + Math.random() * 260, 160 + Math.random() * 190, 2, 2);
        }
        c.strokeStyle = '#4a4540';
        c.lineWidth = 10;
        c.beginPath();
        c.moveTo(170, 490);
        c.quadraticCurveTo(300, 530, 420, 470);
        c.moveTo(220, 470);
        c.lineTo(250, 230);
        c.moveTo(370, 470);
        c.lineTo(340, 380);
        c.moveTo(250, 230);
        c.lineTo(300, 230);
        c.moveTo(230, 380);
        c.lineTo(380, 380);
        c.stroke();
        // two cups on a tray, still
        c.fillStyle = '#e8e2d6';
        c.fillRect(430, 430, 26, 20);
        c.fillRect(470, 430, 26, 20);
      },
    },
    {
      text: t('mem.ada.4'),
      draw: (c, w, h) => {
        // the man in black, a pair of round glasses glowing red in his open palm
        c.fillStyle = '#34312d';
        c.fillRect(0, 0, w, h);
        figure(c, 620, 540, 1.6, '#050505', true, true);
        c.fillStyle = '#d6cfc2';
        c.beginPath();
        c.ellipse(620, 300, 30, 40, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#0a0a0a';
        c.fillRect(600, 312, 40, 4);
        figure(c, 280, 540, 1.2, '#d8d2c6');
        c.strokeStyle = '#c4101a';
        c.shadowColor = '#ff2020';
        c.shadowBlur = 18;
        c.lineWidth = 6;
        for (const x of [430, 490]) {
          c.beginPath();
          c.arc(x, 380, 24, 0, Math.PI * 2);
          c.stroke();
        }
        c.beginPath();
        c.moveTo(454, 378);
        c.quadraticCurveTo(460, 368, 466, 378);
        c.stroke();
        c.shadowBlur = 0;
      },
    },
    {
      text: t('mem.ada.5'),
      draw: (c, w, h) => {
        // the attic, an open trunk, and an old woman on her knees in front of it
        c.fillStyle = '#121110';
        c.fillRect(0, 0, w, h);
        const gr = c.createRadialGradient(470, 360, 10, 470, 360, 380);
        gr.addColorStop(0, 'rgba(180,170,150,0.35)');
        gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gr;
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#3a2e22';
        c.fillRect(380, 390, 260, 110);
        c.save();
        c.translate(380, 390);
        c.rotate(-0.9);
        c.fillRect(0, -16, 260, 18);
        c.restore();
        c.fillStyle = '#d6d0c4';
        c.beginPath();
        c.arc(300, 360, 26, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.moveTo(270, 385);
        c.lineTo(340, 385);
        c.lineTo(360, 500);
        c.lineTo(240, 500);
        c.fill();
        // and behind her, in the dark, a man who can finally go
        c.fillStyle = 'rgba(200,205,210,0.22)';
        c.beginPath();
        c.arc(760, 220, 26, 0, Math.PI * 2);
        c.fill();
        c.fillRect(732, 250, 56, 150);
      },
    },
  ];
  return { title: t('mem.ada.title'), panels };
}
