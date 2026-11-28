import { t } from './i18n';
import { photoOr } from './photos';

/** each panel can be a real photo: photos/mem_<story>_<n>.jpg */
/** which photo file goes with which panel (the prints came in a different order) */
const PHOTO_ORDER: Record<string, number[]> = {
  bar: [1, 2, 3, 4, 5],
  ada: [1, 2, 3, 5, 6],
  ora: [1, 6, 3, 5, 7],
  foto: [6, 5, 3, 2, 1],
  radio: [7, 4, 3, 2, 1],
};
const withPhotos = (story: string, panels: { draw: Draw; text: string }[]) =>
  panels.map((p, i) => ({ text: p.text, draw: photoOr(`mem_${story}_${PHOTO_ORDER[story]?.[i] ?? i + 1}`, p.draw) }));

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
  return { title: t('mem.bar.title'), panels: withPhotos('bar', panels) };
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
  return { title: t('mem.ada.title'), panels: withPhotos('ada', panels) };
}

/** Ottavio and Clara, L'Ora Ferma, 1974. */
export function clockMemory(): { title: string; panels: { draw: Draw; text: string }[] } {
  const dial = (c: CanvasRenderingContext2D, x: number, y: number, r: number, h = 3, m = 17, red = false) => {
    c.fillStyle = red ? '#8e0710' : '#dcd5c4';
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = red ? '#ffb0b0' : ink;
    c.lineWidth = Math.max(2, r / 14);
    c.stroke();
    const ma = (m / 60) * Math.PI * 2, ha = ((h + m / 60) / 12) * Math.PI * 2;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.sin(ma) * r * 0.8, y - Math.cos(ma) * r * 0.8);
    c.moveTo(x, y);
    c.lineTo(x + Math.sin(ha) * r * 0.5, y - Math.cos(ha) * r * 0.5);
    c.stroke();
  };
  const panels: { draw: Draw; text: string }[] = [
    {
      text: t('mem.ora.1'),
      draw: (c, w, h) => {
        // the shop: walls of clocks, a man at the bench, a girl on a stool beside him
        c.fillStyle = '#7d776c';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 14; i++) dial(c, 80 + (i % 7) * 130, 90 + Math.floor(i / 7) * 120, 34 + (i % 3) * 8, i % 12, (i * 7) % 60);
        c.fillStyle = '#3a3128';
        c.fillRect(120, 380, 720, 40);
        figure(c, 380, 540, 1.1, '#e2ddd2');
        figure(c, 560, 540, 0.7, '#f0ece4');
      },
    },
    {
      text: t('mem.ora.2'),
      draw: (c, w, h) => {
        // a little bed, a man sitting beside it with his head in his hands
        c.fillStyle = '#2b2925';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#d8d3c8';
        c.fillRect(380, 330, 380, 110);
        c.beginPath();
        c.arc(420, 320, 26, 0, Math.PI * 2);
        c.fill();
        figure(c, 260, 520, 1.15, '#bdb7ab');
        dial(c, 820, 130, 50, 10, 40);
      },
    },
    {
      text: t('mem.ora.3'),
      draw: (c, w, h) => {
        // the man in black holds out a pocket watch on its chain, glowing red
        c.fillStyle = '#34312d';
        c.fillRect(0, 0, w, h);
        figure(c, 640, 540, 1.6, '#050505', true, true);
        c.fillStyle = '#d6cfc2';
        c.beginPath();
        c.ellipse(640, 300, 30, 40, 0, 0, Math.PI * 2);
        c.fill();
        figure(c, 280, 540, 1.2, '#d8d2c6');
        c.strokeStyle = '#8e0710';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(560, 330);
        c.lineTo(470, 370);
        c.stroke();
        c.shadowColor = '#ff2020';
        c.shadowBlur = 20;
        dial(c, 460, 400, 32, 3, 17, true);
        c.shadowBlur = 0;
      },
    },
    {
      text: t('mem.ora.4'),
      draw: (c, w, h) => {
        // every clock says 3:17. The girl in bed, eyes open. Dust standing in the air.
        c.fillStyle = '#1d1c1a';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 10; i++) dial(c, 70 + i * 92, 80, 30);
        c.fillStyle = '#d8d3c8';
        c.fillRect(300, 330, 400, 110);
        c.fillStyle = '#efeae0';
        c.beginPath();
        c.arc(340, 320, 26, 0, Math.PI * 2);
        c.fill();
        for (let i = 0; i < 400; i++) {
          c.fillStyle = 'rgba(255,255,255,0.5)';
          c.fillRect(Math.random() * w, 140 + Math.random() * 300, 2, 2);
        }
      },
    },
    {
      text: t('mem.ora.5'),
      draw: (c, w, h) => {
        // an empty bed with a little grey dust on the pillow, and the clocks going again
        c.fillStyle = '#2a2825';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 10; i++) dial(c, 70 + i * 92, 80, 30, (i * 5) % 12, (i * 13) % 60);
        c.fillStyle = '#d8d3c8';
        c.fillRect(300, 330, 400, 110);
        c.fillStyle = 'rgba(200,195,185,0.6)';
        for (let i = 0; i < 120; i++) c.fillRect(320 + Math.random() * 60, 300 + Math.random() * 30, 2, 2);
        c.fillStyle = 'rgba(210,215,220,0.2)';
        c.beginPath();
        c.arc(760, 240, 20, 0, Math.PI * 2);
        c.fill();
        c.fillRect(745, 262, 30, 90);
      },
    },
  ];
  return { title: t('mem.ora.title'), panels: withPhotos('ora', panels) };
}

export function photoMemory(): { title: string; panels: { draw: Draw; text: string }[] } {
  const frame = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, empty: boolean) => {
    c.fillStyle = '#1c1510';
    c.fillRect(x - 6, y - 6, w + 12, h + 12);
    c.fillStyle = '#a49d90';
    c.fillRect(x, y, w, h);
    if (!empty) figure(c, x + w / 2, y + h, h / 260, '#2a2621');
  };
  const camera = (c: CanvasRenderingContext2D, x: number, y: number, s: number, red: boolean) => {
    c.fillStyle = red ? '#8e0710' : '#2a1f16';
    c.fillRect(x - 40 * s, y - 40 * s, 80 * s, 80 * s);
    c.beginPath();
    c.moveTo(x - 40 * s, y - 30 * s);
    c.lineTo(x - 120 * s, y - 18 * s);
    c.lineTo(x - 120 * s, y + 18 * s);
    c.lineTo(x - 40 * s, y + 30 * s);
    c.fill();
    c.fillStyle = red ? '#ff5050' : '#9a8a62';
    c.beginPath();
    c.arc(x - 130 * s, y, 16 * s, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#5a4430';
    for (const dx of [-30, 0, 30]) c.fillRect(x + dx * s - 3, y + 40 * s, 6, 200 * s);
  };
  const panels: { draw: Draw; text: string }[] = [
    {
      text: t('mem.foto.1'),
      draw: (c, w, h) => {
        // the studio: backdrop, chair, a family posing, the photographer under the black cloth
        c.fillStyle = '#6e685e';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#a49d90';
        c.fillRect(120, 60, 520, 420);
        chair(c, 380, 540, 1.2);
        figure(c, 300, 540, 1.1, '#2a2621');
        figure(c, 470, 540, 1.0, '#3a352f');
        camera(c, 830, 330, 1, false);
        c.fillStyle = '#0c0b0b';
        c.fillRect(840, 260, 90, 120);
      },
    },
    {
      text: t('mem.foto.2'),
      draw: (c, w, h) => {
        // his own photographs fading on the wall while the people outside look the same: he hates it
        c.fillStyle = '#7a7468';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 4; i++) {
          c.globalAlpha = 1 - i * 0.22;
          frame(c, 90 + i * 220, 120, 160, 210, false);
        }
        c.globalAlpha = 1;
        figure(c, 480, 600, 1.3, '#2b2824');
      },
    },
    {
      text: t('mem.foto.3'),
      draw: (c, w, h) => {
        // the man in black puts a bellows camera on the counter: it glows red
        c.fillStyle = '#34312d';
        c.fillRect(0, 0, w, h);
        figure(c, 700, 560, 1.6, '#050505', true, true);
        c.fillStyle = '#d6cfc2';
        c.beginPath();
        c.ellipse(700, 320, 30, 40, 0, 0, Math.PI * 2);
        c.fill();
        figure(c, 220, 560, 1.2, '#d8d2c6');
        c.fillStyle = '#3a3128';
        c.fillRect(0, 470, w, 40);
        c.shadowColor = '#ff2020';
        c.shadowBlur = 24;
        camera(c, 480, 420, 0.7, true);
        c.shadowBlur = 0;
      },
    },
    {
      text: t('mem.foto.4'),
      draw: (c, w, h) => {
        // a wall of perfect portraits; an empty street outside the window
        c.fillStyle = '#2a2825';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 8; i++) frame(c, 70 + (i % 4) * 230, 70 + Math.floor(i / 4) * 250, 150, 190, false);
      },
    },
    {
      text: t('mem.foto.5'),
      draw: (c, w, h) => {
        // the flash: white, and the frames empty, and people in the street again
        c.fillStyle = '#e8e4dc';
        c.fillRect(0, 0, w, h);
        for (let i = 0; i < 4; i++) frame(c, 70 + i * 230, 80, 150, 190, true);
        for (let i = 0; i < 6; i++) figure(c, 110 + i * 150, 620, 0.9, '#3a352f');
      },
    },
  ];
  return { title: t('mem.foto.title'), panels: withPhotos('foto', panels) };
}

/** The radio man: Nello Sartori, who wanted to hear everyone. */
export function radioMemory(): { title: string; panels: { draw: Draw; text: string }[] } {
  const antenna = (c: CanvasRenderingContext2D, x: number, y: number, s: number) => {
    c.strokeStyle = '#1a1816';
    c.lineWidth = 4 * s;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x, y - 300 * s);
    c.stroke();
    c.lineWidth = 3 * s;
    for (let i = 0; i < 6; i++) {
      const l = (70 - i * 8) * s;
      c.beginPath();
      c.moveTo(x - l, y - 280 * s + i * 4 * s);
      c.lineTo(x + l, y - 280 * s + i * 4 * s);
      c.stroke();
    }
  };
  const radio = (c: CanvasRenderingContext2D, x: number, y: number, s: number, red: boolean) => {
    c.fillStyle = red ? '#8e0710' : '#4a3424';
    c.fillRect(x - 45 * s, y - 30 * s, 90 * s, 60 * s);
    c.fillStyle = red ? '#2a0606' : '#6e675c';
    c.beginPath();
    c.arc(x - 18 * s, y, 18 * s, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = red ? '#ff5050' : '#9a9a98';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x + 35 * s, y - 30 * s);
    c.lineTo(x + 70 * s, y - 140 * s);
    c.stroke();
  };
  const waves = (c: CanvasRenderingContext2D, x: number, y: number, n: number, col: string) => {
    c.strokeStyle = col;
    c.lineWidth = 3;
    for (let i = 1; i <= n; i++) {
      c.beginPath();
      c.arc(x, y, i * 26, -0.7, 0.7);
      c.stroke();
    }
  };
  const panels: { draw: Draw; text: string }[] = [
    {
      text: t('mem.radio.1'),
      draw: (c, w, h) => {
        // Nello at his bench, a radio open in front of him
        c.fillStyle = '#8a8478';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#4a4640';
        c.fillRect(0, 520, w, 200);
        radio(c, 600, 500, 1.2, false);
        figure(c, 380, 560, 1.15, '#2a2621');
      },
    },
    {
      text: t('mem.radio.2'),
      draw: (c, w, h) => {
        // night; a radio on the table crackling with the neighbours' voices, Nello listening
        c.fillStyle = '#3a3631';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#5a4430';
        c.fillRect(150, 470, 700, 30);
        radio(c, 620, 440, 1.0, false);
        waves(c, 660, 420, 3, '#c8c0b0');
        figure(c, 380, 560, 1.2, '#1e1b18');
        chair(c, 380, 640, 1.1);
      },
    },
    {
      text: t('mem.radio.3'),
      draw: (c, w, h) => {
        // the man in black puts a red transistor radio on the counter
        c.fillStyle = '#34312d';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#4a3424';
        c.fillRect(0, 470, w, 40);
        figure(c, 700, 560, 1.6, ink, true, true);
        c.fillStyle = '#d6cfc2';
        c.beginPath();
        c.ellipse(700, 320, 30, 40, 0, 0, Math.PI * 2);
        c.fill();
        c.shadowColor = '#ff2020';
        c.shadowBlur = 24;
        radio(c, 420, 440, 1.1, true);
        c.shadowBlur = 0;
        figure(c, 220, 560, 1.3, '#2a2621');
      },
    },
    {
      text: t('mem.radio.4'),
      draw: (c, w, h) => {
        // every night on the roof: thinner, paler, the red radio at his ear
        c.fillStyle = '#0d1014';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#dcd8cc';
        c.beginPath();
        c.arc(820, 120, 40, 0, Math.PI * 2);
        c.fill();
        antenna(c, 200, 600, 1.2);
        figure(c, 520, 600, 1.1, '#4a4640');
        c.shadowColor = '#ff2020';
        c.shadowBlur = 20;
        radio(c, 580, 400, 0.6, true);
        c.shadowBlur = 0;
        waves(c, 640, 390, 4, '#8e0710');
      },
    },
    {
      text: t('mem.radio.5'),
      draw: (c, w, h) => {
        // the bell tower in the dawn; the key's last «·· · — · —»; the roof empty
        c.fillStyle = '#b8b2a6';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#5a5650';
        c.fillRect(640, 140, 120, 420);
        c.beginPath();
        c.moveTo(620, 140);
        c.lineTo(700, 40);
        c.lineTo(780, 140);
        c.fill();
        c.fillStyle = '#2a2622';
        c.fillRect(670, 200, 60, 70);
        antenna(c, 260, 600, 1.2);
        c.fillStyle = ink;
        c.font = "bold 44px 'Courier New', monospace";
        c.fillText('· · · — · —', 140, 120);
      },
    },
  ];
  return { title: t('mem.radio.title'), panels: withPhotos('radio', panels) };
}
