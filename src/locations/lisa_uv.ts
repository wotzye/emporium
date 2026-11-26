import * as THREE from 'three';
import type { Game } from '../game';
import { uvInk } from '../builders';
import { t } from '../i18n';

/**
 * Lisa's invisible writing: one message in each shop, readable only with the UV torch.
 * Diego doesn't remember much of what happened; she does, and she left him the pieces.
 */
export const LISA_UV = ['radio', 'barbiere', 'ada', 'ora', 'foto'] as const;
export type LisaUv = (typeof LISA_UV)[number];

export const lisaUvFound = (g: Game) => LISA_UV.filter((k) => g.flag('uv.' + k)).length;

export function lisaInk(g: Game, id: LisaUv, w = 0.95, h = 0.36) {
  const m = uvInk([t(`uv.${id}1`), t(`uv.${id}2`)], w, h, {
    onReveal: async () => {
      if (g.flag('uv.' + id)) return;
      g.set('uv.' + id);
      g.note(`note.uv.${id}`);
      g.audio.sfx('whisper');
      const n = lisaUvFound(g);
      g.note('note.uvGoal');
      await g.say([{ who: 'diego', key: n === 1 ? 'uv.first' : n === LISA_UV.length ? 'uv.all' : 'uv.more' }]);
      // say plainly how many are left, and what they're for
      if (n < LISA_UV.length) await g.say([{ who: 'diego', key: 'uv.left', vars: { n: LISA_UV.length - n } }]);
      if (n === LISA_UV.length && g.has('towerkey')) await g.say('uv.allChurch');
      if (n === LISA_UV.length) g.diaryPage('lisaUv');
    },
  });
  // the patch of wall around it can be tapped (and zoomed to) even before you have the lens
  m.userData.lisaWall = id;
  return m as THREE.Mesh;
}

/** place it flat on a wall: side 'back' (z = -D/2), 'left' (x = -W/2) or 'right' (x = W/2) */
export function onWall(m: THREE.Object3D, side: 'back' | 'left' | 'right', W: number, D: number, a: number, y: number) {
  if (side === 'back') m.position.set(a, y, -D / 2 + 0.015);
  else if (side === 'left') {
    m.position.set(-W / 2 + 0.015, y, a);
    m.rotation.y = Math.PI / 2;
  } else {
    m.position.set(W / 2 - 0.015, y, a);
    m.rotation.y = -Math.PI / 2;
  }
  return m;
}
