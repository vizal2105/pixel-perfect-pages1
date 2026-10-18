const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const EOCD = 0x06054b50;

function u16(view: DataView, offset: number) {
  return view.getUint16(offset, true);
}
function u32(view: DataView, offset: number) {
  return view.getUint32(offset, true);
}

async function inflateRaw(data: Uint8Array) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot preview Word files.');
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function unzip(input: ArrayBuffer | Uint8Array) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  const start = Math.max(0, bytes.length - 22 - 65535);
  for (let i = bytes.length - 22; i >= start; i--) {
    if (u32(view, i) === EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Unable to read this file.');
  const count = u16(view, eocd + 10);
  let offset = u32(view, eocd + 16);
  const files = new Map<string, Uint8Array>();
  for (let n = 0; n < count; n++) {
    if (u32(view, offset) !== CENTRAL) throw new Error('Unable to read this file.');
    const method = u16(view, offset + 10);
    const compSize = u32(view, offset + 20);
    const nameLen = u16(view, offset + 28);
    const extraLen = u16(view, offset + 30);
    const commentLen = u16(view, offset + 32);
    const localOff = u32(view, offset + 42);
    const name = new TextDecoder().decode(bytes.subarray(offset + 46, offset + 46 + nameLen)).replace(/\\/g, '/');
    if (u32(view, localOff) !== LOCAL) throw new Error('Unable to read this file.');
    const dataStart = localOff + 30 + u16(view, localOff + 26) + u16(view, localOff + 28);
    const compressed = bytes.subarray(dataStart, dataStart + compSize);
    if (!name.endsWith('/')) {
      const raw = method === 0 ? compressed.slice() : method === 8 ? await inflateRaw(compressed) : null;
      if (!raw) throw new Error('Unable to read this file.');
      files.set(name, raw);
    }
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

export function zipStore(files: Record<string, Uint8Array>) {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, data] of Object.entries(files)) {
    const n = encoder.encode(name);
    const local = new Uint8Array(30 + n.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, LOCAL, true);
    lv.setUint16(26, n.length, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    local.set(n, 30);
    local.set(data, 30 + n.length);
    const central = new Uint8Array(46 + n.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, CENTRAL, true);
    cv.setUint16(28, n.length, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint32(42, offset, true);
    central.set(n, 46);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const cdSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, EOCD, true);
  ev.setUint16(8, locals.length, true);
  ev.setUint16(10, locals.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + cdSize + 22);
  let pos = 0;
  for (const part of locals) { out.set(part, pos); pos += part.length; }
  for (const part of centrals) { out.set(part, pos); pos += part.length; }
  out.set(eocd, pos);
  return out;
}
