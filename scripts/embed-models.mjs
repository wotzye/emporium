// For the single-file build (Claude artifact): .glb isn't served there, so each model is
// rewritten as a self-contained glTF JSON (buffers and images as data URIs) under models-json/.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import fs from 'fs';
import path from 'path';
const [srcDir, dstDir] = process.argv.slice(2);
fs.mkdirSync(dstDir, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const mime = (u) => (u.endsWith('.png') ? 'image/png' : /\.jpe?g$/.test(u) ? 'image/jpeg' : u.endsWith('.webp') ? 'image/webp' : 'application/octet-stream');
for (const f of fs.readdirSync(srcDir).filter((f) => f.endsWith('.glb'))) {
  const doc = await io.read(path.join(srcDir, f));
  const { json, resources } = await io.writeJSON(doc, { format: 'json' });
  for (const b of json.buffers || []) if (b.uri && resources[b.uri]) b.uri = `data:application/octet-stream;base64,${Buffer.from(resources[b.uri]).toString('base64')}`;
  for (const im of json.images || []) if (im.uri && resources[im.uri]) im.uri = `data:${mime(im.uri)};base64,${Buffer.from(resources[im.uri]).toString('base64')}`;
  fs.writeFileSync(path.join(dstDir, f.replace(/\.glb$/, '.json')), JSON.stringify(json));
}
fs.rmSync(srcDir, { recursive: true });
