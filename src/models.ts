import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Real 3D models (CC0, Quaternius "Universal Base Characters"), loaded once at start-up.
 * Characters fall back to the procedural versions if a file is missing or still loading.
 */
const FILES = {
  male: 'models/body_male.glb',
  female: 'models/body_female.glb',
  hairLong: 'models/Hair_Long.glb',
  hairParted: 'models/Hair_SimpleParted.glb',
  hairBuzzed: 'models/Hair_Buzzed.glb',
  beard: 'models/Hair_Beard.glb',
  brows: 'models/Eyebrows_Regular.glb',
  hairBuns: 'models/Hair_Buns.glb',
  // props (CC0, Poly Haven)
  barberChair: 'models/BarberShopChair_01.glb',
  candleholders: 'models/brass_candleholders.glb',
  woodChair: 'models/painted_wooden_chair_02.glb',
  stool: 'models/painted_wooden_stool.glb',
  teaSet: 'models/tea_set_01.glb',
  suitcase: 'models/vintage_suitcase.glb',
  bucket: 'models/wooden_bucket_01.glb',
  crate: 'models/wooden_crate_01.glb',
  lantern: 'models/wooden_lantern_01.glb',
  rocking: 'models/Rockingchair_01.glb',
  streetLamp: 'models/street_lamp_02.glb',
  ironGate: 'models/large_iron_gate.glb',
  frame: 'models/fancy_picture_frame_01.glb',
  chandelier: 'models/lantern_chandelier_01.glb',
  roundTable: 'models/round_wooden_table_01.glb',
  rat: 'models/street_rat.glb',
  wheelchair: 'models/wheelchair_01.glb',
  trashCan: 'models/metal_trash_can.glb',
  cagedLight: 'models/caged_hanging_light.glb',
  ladder: 'models/wooden_ladder_02.glb',
  // Ada's house
  tv: 'models/television_02.glb',
  sofa: 'models/Sofa_01.glb',
  stove: 'models/electric_stove.glb',
  kettle: 'models/vintage_electric_kettle.glb',
  crutches: 'models/vintage_crutches_01.glb',
  chest: 'models/treasure_chest.glb',
  spectacles: 'models/round_spectacles.glb',
  frame2: 'models/fancy_picture_frame_02.glb',
  fisherHat: 'models/fishermans_hat.glb',
  console: 'models/ClassicConsole_01.glb',
  sideboard: 'models/WoodenTable_03.glb',
  armyCrate: 'models/wooden_military_crate.glb',
  catStatue: 'models/concrete_cat_statue.glb',
  doll: 'models/doll.glb',
  // CC-BY 4.0 (Sketchfab): the man in black, the butcher's scale and what's on the block
  merchant: 'models/merchant.glb',
  butcherScale: 'models/butcher_scale.glb',
  fingers: 'models/fingers.glb',
  hand: 'models/hand.glb',
  brain: 'models/brain.glb',
  shoe: 'models/shoe.glb',
  // second batch (Sketchfab, CC-BY 4.0 / CC0: see Credits)
  pigeon: 'models/pigeon.glb',
  pigeonFly: 'models/pigeonFly.glb',
  graves: 'models/graves.glb',
  graveFence: 'models/graveFence.glb',
  bell: 'models/bell.glb',
  greenDoor: 'models/greenDoor.glb',
  radioA: 'models/radioA.glb',
  radioB: 'models/radioB.glb',
  tvB: 'models/tvB.glb',
  tvC: 'models/tvC.glb',
  meatHook: 'models/meatHook.glb',
  // the butcher's, second time round (CC-BY 4.0)
  torso: 'models/torso.glb',
  grinder: 'models/grinder.glb',
  cleaver: 'models/cleaver.glb',
  corpse: 'models/corpse.glb',
  // the church, refurnished (CC-BY 4.0)
  pewM: 'models/pew.glb',
  confessional: 'models/confessional.glb',
  altarM: 'models/altar.glb',
  candelabra: 'models/candelabra.glb',
  candelabra2: 'models/candelabra2.glb',
  crossM: 'models/cross.glb',
  skulls: 'models/skulls.glb',
  bones: 'models/bones.glb',
  reliquary: 'models/reliquary.glb',
  tomb: 'models/tomb.glb',
  // the suitcase maker's (CC-BY 4.0)
  suitA: 'models/suitA.glb',
  suitB: 'models/suitB.glb',
  suitC: 'models/suitC.glb',
  suitD: 'models/suitD.glb',
  trunkA: 'models/trunkA.glb',
  trunkB: 'models/trunkB.glb',
  // Ada the seamstress, and the cursed things on the Emporium shelf (CC-BY 4.0)
  dressForm: 'models/dressForm.glb',
  sewing: 'models/sewing.glb',
  gramophone: 'models/gramophone.glb',
  barberPole: 'models/barberPole.glb',
  pocketWatch: 'models/pocketWatch.glb',
  bellowsCam: 'models/bellowsCam.glb',
  metronome: 'models/metronome.glb',
  antiqueClock: 'models/antiqueClock.glb',
  stethoscope: 'models/stethoscope.glb',
  musicBoxM: 'models/musicBoxM.glb',
  wallClockM: 'models/wallClockM.glb',
  clockA: 'models/clockA.glb',
  clockD: 'models/clockD.glb',
  doorA: 'models/doorA.glb',
  bedC: 'models/bedC.glb',
  bookcaseA: 'models/bookcaseA.glb',
  booksA: 'models/booksA.glb',
  globeA: 'models/globeA.glb',
  angelA: 'models/angelA.glb',
  vaseA: 'models/vaseA.glb',
  ashtrayA: 'models/ashtrayA.glb',
  dollB: 'models/dollB.glb',
  telegraph: 'models/telegraph.glb',

} as const;
export type ModelId = keyof typeof FILES;

const cache: Partial<Record<ModelId, GLTF>> = {};
let allLoaded: () => void = () => {};
let allIn = false;
export const modelsDone = () => allIn;
/** resolves when every model is in (rooms wait for it, behind the black screen, before they are built) */
export const modelsReady = new Promise<void>((r) => (allLoaded = () => { allIn = true; r(); }));
let loading: Promise<void> | null = null;

const CHAR_IDS: ModelId[] = ['male', 'female', 'hairLong', 'hairParted', 'hairBuzzed', 'beard', 'brows', 'hairBuns', 'merchant', 'butcherScale', 'fingers', 'hand', 'brain', 'meatHook', 'barberPole', 'streetLamp'];
/** Resolves when the characters are in; props keep loading in the background. */
export function preloadModels(onProgress?: (k: number) => void) {
  if (loading) return loading;
  const loader = new GLTFLoader();
  const all = Object.keys(FILES) as ModelId[];
  const ids = CHAR_IDS;
  const url = (id: ModelId) => (import.meta.env.MODE === 'single' ? FILES[id].replace('models/', 'models-json/').replace('.glb', '.json') : FILES[id]);
  // the props one after the other, in the gaps: seventy downloads and decodes at once froze phones
  // (taps lost, text crawling) and filled their memory
  // the Emporium's furniture first: it is the first room you walk into after the prologue
  const FIRST: ModelId[] = ['rocking', 'bookcaseA', 'booksA', 'globeA', 'angelA', 'vaseA', 'ashtrayA', 'dollB', 'shoe', 'catStatue', 'doll', 'pocketWatch', 'bellowsCam', 'spectacles'];
  const rest = [...FIRST.filter((i) => i in FILES), ...all.filter((i) => !CHAR_IDS.includes(i) && !FIRST.includes(i))];
  let lanes = 4;
  const next = () => {
    const id = rest.shift();
    if (!id) {
      if (--lanes <= 0) allLoaded();
      return;
    }
    if (cache[id]) return next();
    loader
      .loadAsync(url(id))
      .then((g) => (cache[id] = g))
      .catch(() => {})
      .finally(() => (typeof requestIdleCallback === 'function' ? requestIdleCallback(() => next(), { timeout: 400 }) : setTimeout(next, 60)));
  };
  // three lanes are enough to finish on the title screen on a decent connection
  setTimeout(() => { next(); next(); next(); next(); }, 300);
  let done = 0;
  loading = Promise.all(
    ids.map((id) =>
      loader
        .loadAsync(import.meta.env.MODE === 'single' ? FILES[id].replace('models/', 'models-json/').replace('.glb', '.json') : FILES[id])
        .then((g) => {
          cache[id] = g;
        })
        .catch((e) => console.warn('model', id, e))
        .finally(() => onProgress?.(++done / ids.length)),
    ),
  ).then(() => undefined);
  return loading;
}

export const hasModel = (id: ModelId) => !!cache[id];
/** The clips that came with a model (for the ones that move). */
export const clips = (id: ModelId) => cache[id]?.animations ?? [];

/** A fresh, independently posable copy. */
export function instance(id: ModelId): THREE.Object3D | null {
  const g = cache[id];
  if (!g) return null;
  const o = skClone(g.scene);
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.frustumCulled = false;
      m.geometry = m.geometry.clone();
      const mm = m.material as THREE.MeshStandardMaterial;
      if (/hair|brow|beard/i.test(mm.name + m.name)) {
        // hair cards: cut out by the texture alpha
        mm.alphaTest = 0.45;
        mm.side = THREE.DoubleSide;
      }
      m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
      // the textures still belong to the loaded model, shared by every copy in every room
      for (const x of Array.isArray(m.material) ? m.material : [m.material]) x.userData.modelTex = true;
    }
  });
  return o;
}

export function bones(root: THREE.Object3D) {
  const map: Record<string, THREE.Bone> = {};
  root.traverse((o) => {
    if ((o as THREE.Bone).isBone) map[o.name] = o as THREE.Bone;
  });
  return map;
}

/**
 * Painted straight onto the face, in bind space: sockets, hollow cheeks, a too-wide grin —
 * and, for jumpscares (uScare = 1), black holes for eyes, a gaping mouth and veins.
 */
const FACE_GLSL = `
  {
    vec3 p = vObjPos;
    float front = smoothstep(0.03, 0.06, p.z);
    float sk = 0.0, hole = 0.0, veins = 0.0;
    for (int i = 0; i < 2; i++) {
      vec2 e = vec2(i == 0 ? -uEye.x : uEye.x, uEye.y);
      vec2 dv = (p.xy - e) * vec2(1.0, 1.25);
      float de = length(dv);
      sk += 1.0 - smoothstep(0.014, 0.034 + uScare * 0.012, de);
      hole += 1.0 - smoothstep(0.012, 0.02, de);
      float ang = atan(dv.y, dv.x);
      veins += (1.0 - smoothstep(0.0, 0.08, de)) * smoothstep(0.82, 1.0, sin(ang * 9.0 + de * 120.0)) * smoothstep(0.02, 0.03, de);
      vec2 ch = vec2(i == 0 ? -0.048 : 0.048, uEye.y - 0.051);
      diffuseColor.rgb *= 1.0 - uGaunt * 0.35 * (1.0 - smoothstep(0.004, 0.024, length(p.xy - ch))) * front;
    }
    diffuseColor.rgb *= 1.0 - uSockets * 0.55 * clamp(sk, 0.0, 1.0) * front;
    float w = 0.046;
    float u = p.x / w;
    float cy = uMouth + u * u * 0.012;
    float dy = p.y - cy;
    float inside = (1.0 - smoothstep(0.85, 1.0, abs(u))) * smoothstep(0.055, 0.075, p.z + 0.02 * (1.0 - abs(u)));
    float line = (1.0 - smoothstep(0.0012, 0.0032, abs(dy))) * inside;
    float teeth = step(0.0008, dy) * (1.0 - step(0.0052, dy)) * step(0.25, fract(p.x * 140.0)) * (1.0 - smoothstep(0.75, 0.9, abs(u))) * inside;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.78, 0.74, 0.64), teeth * uGrin);
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02), line * uGrin);
    if (uScare > 0.0) {
      // dead skin, dark veins, pitch-black eyes and a mouth hanging open
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.82, 0.86, 0.84), uScare * vSkin);
      diffuseColor.rgb *= 1.0 - uScare * 0.6 * clamp(veins, 0.0, 1.0) * front;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.0), uScare * clamp(hole, 0.0, 1.0) * front);
      vec2 mo = (p.xy - vec2(0.0, uMouth - 0.012)) / vec2(0.026, 0.034);
      float mouth = 1.0 - smoothstep(0.85, 1.0, length(mo));
      float jag = step(0.6, fract(p.x * 90.0)) * smoothstep(0.55, 0.95, mo.y) * mouth;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.01), uScare * mouth * front);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.58, 0.5), uScare * jag * front);
    }
  }
`;

const SKIN_BONES = /^(head|neck_01|hand_[lr]|(index|middle|ring|pinky|thumb)_0\d(_leaf)?_[lr])$/i;

export interface Dress {
  cloth: THREE.ColorRepresentation; // colour of the clothes
  clothRough?: number;
  skinTint?: THREE.ColorRepresentation; // multiply on the skin
  skinBright?: number;
  /** extra bones that count as bare skin (e.g. forearms for rolled sleeves) */
  bare?: RegExp;
  /** how loose the clothes are: cloth is pushed out along the normal (metres) */
  puff?: number;
  /** painted-on face changes (bind-space, for the Universal Base male head) */
  face?: { sockets?: number; grin?: number; gaunt?: number };
  /** a stained/patterned cloth */
  pattern?: (c: CanvasRenderingContext2D, w: number, h: number) => void;
}

/** per-vertex 0..1: 1 where the vertex is driven by head/neck/hand bones (bare skin) */
export function skinMask(sm: THREE.SkinnedMesh, bare?: RegExp) {
  const geo = sm.geometry;
  const si = geo.getAttribute('skinIndex');
  const sw = geo.getAttribute('skinWeight');
  const names = sm.skeleton.bones.map((b) => b.name);
  const mask = new Float32Array(si.count);
  for (let v = 0; v < si.count; v++) {
    let skin = 0;
    for (let k = 0; k < 4; k++) {
      const n = names[si.getComponent(v, k)];
      if (SKIN_BONES.test(n) || (bare && bare.test(n))) skin += sw.getComponent(v, k);
    }
    mask[v] = THREE.MathUtils.smoothstep(skin, 0.35, 0.75);
  }
  geo.setAttribute('skinMask', new THREE.BufferAttribute(mask, 1));
}

/**
 * Dress a skinned base body: every vertex mostly driven by head/neck/hand bones stays skin,
 * the rest becomes cloth. No UV painting needed, works on any rig with these bone names.
 */
export function dress(root: THREE.Object3D, d: Dress) {
  root.traverse((o) => {
    const sm = o as THREE.SkinnedMesh;
    if (!sm.isSkinnedMesh) return;
    const mat0 = sm.material as THREE.MeshStandardMaterial;
    if (!/superhero/i.test(mat0.name)) return;
    skinMask(sm, d.bare);
    const m = mat0.clone();
    m.name = 'dressed';
    const cloth = new THREE.Color(d.cloth);
    const tint = new THREE.Color(d.skinTint ?? 0xffffff).multiplyScalar(d.skinBright ?? 1);
    let pat: THREE.Texture | null = null;
    if (d.pattern) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 256;
      d.pattern(cv.getContext('2d')!, 256, 256);
      pat = new THREE.CanvasTexture(cv);
      pat.wrapS = pat.wrapT = THREE.RepeatWrapping;
      pat.colorSpace = THREE.SRGBColorSpace;
    }
    const female = /female/i.test(mat0.name + sm.name);
    const faceU = {
      uEye: { value: new THREE.Vector2(0.034, female ? 1.656 : 1.699) },
      uMouth: { value: female ? 1.58 : 1.622 },
      uSockets: { value: d.face?.sockets ?? 0 },
      uGrin: { value: d.face?.grin ?? 0 },
      uGaunt: { value: d.face?.gaunt ?? 0 },
      uScare: { value: 0 },
    };
    root.userData.faceU = faceU;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, faceU);
      sh.uniforms.clothCol = { value: cloth };
      sh.uniforms.skinTint = { value: tint };
      sh.uniforms.clothRough = { value: d.clothRough ?? 0.9 };
      sh.uniforms.pat = { value: pat };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float skinMask;\nvarying float vSkin;\nvarying vec3 vObjPos;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>\nvSkin = skinMask;\nvObjPos = position;\ntransformed += normal * ${(d.puff ?? 0.012).toFixed(4)} / ${root.scale.x.toFixed(4)} * (1.0 - skinMask);`);
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>\nvarying float vSkin;\nvarying vec3 vObjPos;\nuniform vec3 clothCol;\nuniform vec3 skinTint;\nuniform float clothRough;\nuniform vec2 uEye;\nuniform float uMouth, uSockets, uGrin, uGaunt, uScare;\n${pat ? 'uniform sampler2D pat;' : ''}`,
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          vec3 cl = clothCol;
          ${pat ? 'cl *= texture2D(pat, vObjPos.xy * 1.7 + vObjPos.zz * 0.6).rgb;' : ''}
          // weave: a faint fine noise so cloth isn't plastic
          cl *= 0.92 + 0.08 * fract(sin(dot(floor(vObjPos.xy * 900.0), vec2(12.9898, 78.233))) * 43758.5453);
          diffuseColor.rgb = mix(cl, diffuseColor.rgb * skinTint, vSkin);
          ${FACE_GLSL}`,
        )
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(mix(nonPerturbedNormal, normal, vSkin * 0.9 + 0.1));')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(clothRough, roughnessFactor, vSkin);');
    };
    m.customProgramCacheKey = () => 'dress' + (pat ? 'p' : '') + cloth.getHexString() + (d.puff ?? 0.012);
    sm.material = m;
  });
}

/** Rotate a bone by euler offsets (radians) on top of its bind pose. */
export function pose(b: Record<string, THREE.Bone>, name: string, x = 0, y = 0, z = 0) {
  const bone = b[name];
  if (!bone) return;
  if (!bone.userData.bind) bone.userData.bind = bone.quaternion.clone();
  bone.quaternion.copy(bone.userData.bind).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z)));
}

/** Put a hair/eyebrow model on a body's head bone. */
export function attachHair(body: THREE.Object3D, id: ModelId, color: THREE.ColorRepresentation) {
  const h = instance(id);
  if (!h) return null;
  // hair files are rigged to the same head bone: bind their skinned meshes to the body skeleton
  const bodySkin = findSkinned(body);
  h.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) (m.material as THREE.MeshStandardMaterial).color = new THREE.Color(color);
  });
  const hs = findSkinned(h);
  if (bodySkin && hs) {
    const map = bones(body);
    const newBones = hs.skeleton.bones.map((b) => map[b.name] ?? b);
    hs.bind(new THREE.Skeleton(newBones, hs.skeleton.boneInverses), hs.bindMatrix);
    hs.removeFromParent();
    body.add(hs);
    return hs;
  }
  body.add(h);
  return h;
}

export function findSkinned(o: THREE.Object3D) {
  let s: THREE.SkinnedMesh | null = null;
  o.traverse((c) => {
    if (!s && (c as THREE.SkinnedMesh).isSkinnedMesh && /superhero|hair|eyebrow|beard/i.test(((c as THREE.Mesh).material as THREE.Material).name + c.name)) s = c as THREE.SkinnedMesh;
  });
  return s as THREE.SkinnedMesh | null;
}

const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

/** Rotate a bone so that the direction to its child points along `dir` (world space). */
export function aim(bone: THREE.Bone, child: THREE.Object3D, dir: THREE.Vector3) {
  bone.updateWorldMatrix(true, true);
  const a = bone.getWorldPosition(_v);
  const cur = child.getWorldPosition(_v2).sub(a).normalize();
  const d = _q.setFromUnitVectors(cur, dir.clone().normalize());
  const P = bone.parent!.getWorldQuaternion(_q2);
  // L' = P^-1 * D * P * L
  const Pi = P.clone().invert();
  bone.quaternion.premultiply(P).premultiply(d).premultiply(Pi);
  bone.updateWorldMatrix(false, true);
}

/** Point a bone at a world target (two-bone chains: call for the upper bone, then the lower). */
export function aimAt(bone: THREE.Bone, child: THREE.Object3D, target: THREE.Vector3) {
  bone.updateWorldMatrix(true, false);
  aim(bone, child, target.clone().sub(bone.getWorldPosition(new THREE.Vector3())));
}

/** Extra rotation about a world axis, applied on top of the bone's current local rotation. */
export function turnWorld(bone: THREE.Bone, axis: THREE.Vector3, angle: number) {
  bone.parent!.updateWorldMatrix(true, false);
  const P = bone.parent!.getWorldQuaternion(_q2);
  const d = _q.setFromAxisAngle(axis, angle);
  const Pi = P.clone().invert();
  bone.quaternion.premultiply(P).premultiply(d).premultiply(Pi);
}

/** Store the current local rotations as the rest pose for per-frame animation. */
export function saveRest(b: Record<string, THREE.Bone>) {
  for (const k in b) b[k].userData.rest = b[k].quaternion.clone();
}
export function restore(bone: THREE.Bone) {
  if (bone.userData.rest) bone.quaternion.copy(bone.userData.rest);
}

/**
 * Ghost look for skinned meshes: fresnel glow, dissolving towards the floor.
 * Keeps three's skinning (a plain ShaderMaterial would not deform with the bones).
 */
export function ghostMaterial(uniforms: { time: { value: number }; opacity: { value: number }; floorY: { value: number } }, core = 0.12, masked = false) {
  const m = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { gTime: uniforms.time, gOpacity: uniforms.opacity, gFloor: uniforms.floorY, gCore: { value: core } });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 gN; varying vec3 gV; varying float gY;\n${masked ? 'attribute float skinMask; varying float gM;' : ''}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${masked ? 'gM = skinMask;' : ''}`)
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vec4 gw = modelMatrix * vec4(transformed, 1.0);
        gY = gw.y;
        #ifdef USE_SKINNING
          vec3 on = objectNormal;
        #else
          vec3 on = normal;
        #endif
        gN = normalize(normalMatrix * on);
        gV = normalize(-mvPosition.xyz);`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 gN; varying vec3 gV; varying float gY;\nuniform float gTime, gOpacity, gFloor, gCore;\n${masked ? 'varying float gM;' : ''}`)
      .replace(
        '#include <dithering_fragment>',
        `float fres = pow(1.0 - abs(dot(normalize(gN), normalize(gV))), 2.2);
        float ga = gCore + fres * 0.9;
        float gn = fract(sin(dot(floor(gl_FragCoord.xy / 3.0) + floor(gTime * 8.0), vec2(41.3, 289.1))) * 43758.5);
        ga *= smoothstep(gFloor, gFloor + 0.55, gY + gn * 0.12);
        ga *= 0.85 + 0.15 * sin(gTime * 9.0 + gY * 20.0);
        ${masked ? 'ga *= gM; if (ga < 0.003) discard;' : ''}
        gl_FragColor = vec4(vec3(0.86, 0.92, 0.96) * (0.6 + fres), ga * gOpacity);`,
      );
  };
  m.customProgramCacheKey = () => 'ghostSk' + core + masked;
  return m;
}

/**
 * A static prop: centred on x/z, standing on y=0, optionally scaled to a height,
 * turned so that its front faces `face` (radians about y). Only one child of a multi-object
 * file can be picked with `only` (e.g. one of the three candleholders).
 */
export function prop(id: ModelId, o: { height?: number; width?: number; turn?: number; only?: string | RegExp; rot?: [number, number, number]; grey?: number } = {}) {
  const src = instance(id);
  if (!src) return null;
  let obj: THREE.Object3D = src;
  if (o.only) {
    const found: THREE.Object3D[] = [];
    src.traverse((c) => {
      if (c !== src && (typeof o.only === 'string' ? c.name === o.only : o.only!.test(c.name))) found.push(c);
    });
    if (found.length) {
      obj = new THREE.Group();
      for (const f of found) {
        f.updateWorldMatrix(true, false);
        const m = f.matrixWorld.clone();
        f.removeFromParent();
        f.matrix.copy(m);
        f.matrix.decompose(f.position, f.quaternion, f.scale);
        obj.add(f);
      }
    }
  }
  const inner = new THREE.Group();
  // stand a model up if its author laid it down (rot), then face it (turn)
  const upright = new THREE.Group();
  upright.add(obj);
  if (o.rot) upright.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  inner.add(upright);
  inner.rotation.y = o.turn ?? 0;
  const outer = new THREE.Group();
  outer.add(inner);
  outer.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(inner);
  const size = bb.getSize(new THREE.Vector3());
  const k = o.height ? o.height / size.y : o.width ? o.width / size.x : 1;
  inner.scale.setScalar(k);
  inner.position.set(-(bb.min.x + bb.max.x) / 2 * k, -bb.min.y * k, -(bb.min.z + bb.max.z) / 2 * k);
  outer.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
      // pale and bloodless: no red may survive the noir filter except on the cursed things
      if (o.grey !== undefined) for (const x of Array.isArray(m.material) ? m.material : [m.material]) greyOut(x, o.grey);
    }
  });
  return outer;
}

function greyOut(mt: THREE.Material, bright: number) {
  mt.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <map_fragment>',
      `#include <map_fragment>\n  diffuseColor.rgb = vec3(dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11))) * ${bright.toFixed(3)} * vec3(1.0, 0.97, 0.93);`,
    );
  };
  mt.customProgramCacheKey = () => 'grey' + bright;
  mt.needsUpdate = true;
}

/** Turn a real model into a cursed object: deep red, keeping its surface detail (normals, roughness). */
export function cursify(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (!m.isMesh) return;
    const src = m.material as THREE.MeshStandardMaterial;
    m.material = new THREE.MeshStandardMaterial({
      // a deep red that stays red under strong light (pale pinks lose their colour in the noir filter)
      color: 0x2a0103,
      roughness: 0.55,
      metalness: 0,
      envMapIntensity: 0.25,
      normalMap: src.normalMap ?? null,
      roughnessMap: src.roughnessMap ?? null,
      // mostly self-lit: strong white light can't wash the red out to pink/white
      emissive: 0x9a0a12,
      emissiveIntensity: 0.55,
    });
  });
  return o;
}
