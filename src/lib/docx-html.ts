import { unzip } from '@/lib/zip';

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const RELS = 'http://schemas.openxmlformats.org/package/2006/relationships';

function esc(value: string) {
  return value.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] ?? ch);
}

function normalizePath(path: string) {
  const parts: string[] = [];
  for (const part of path.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

function mimeFromName(name: string) {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'emf' || ext === 'wmf') return '';
  return 'application/octet-stream';
}

function ns(el: Element, uri: string, tag: string) {
  return Array.from(el.getElementsByTagNameNS(uri, tag));
}

function firstNs(el: Element, uri: string, tag: string) {
  return el.getElementsByTagNameNS(uri, tag)[0] ?? null;
}

function headingTag(style: string) {
  const key = style.toLowerCase().replace(/\s+/g, '');
  if (key === 'title' || key === 'heading1' || key === 'heading') return 'h1';
  if (key === 'heading2') return 'h2';
  if (key === 'heading3') return 'h3';
  if (key === 'heading4') return 'h4';
  return 'p';
}

function runHtml(run: Element, images: Map<string, string>) {
  if (run.namespaceURI === W && run.localName === 'hyperlink') {
    const inner = Array.from(run.children).map(child => runHtml(child, images)).join('');
    const anchor = run.getAttributeNS(R, 'id') || run.getAttribute('r:id');
    return inner ? (anchor ? `<span>${inner}</span>` : inner) : '';
  }
  const drawing = firstNs(run, W, 'drawing') ?? firstNs(run, W, 'pict');
  if (drawing) {
    const blip = firstNs(drawing, A, 'blip');
    const id = blip?.getAttributeNS(R, 'embed') || blip?.getAttribute('r:embed');
    const src = id ? images.get(id) : undefined;
    if (src) return `<img src="${esc(src)}" alt="" />`;
  }
  const text = ns(run, W, 't').map(node => node.textContent ?? '').join('');
  const breaks = ns(run, W, 'br').length + ns(run, W, 'cr').length;
  let html = esc(text) + (breaks ? '<br />'.repeat(breaks) : '');
  if (!html) return '';
  const rPr = firstNs(run, W, 'rPr');
  if (rPr) {
    if (firstNs(rPr, W, 'b')) html = `<strong>${html}</strong>`;
    if (firstNs(rPr, W, 'i')) html = `<em>${html}</em>`;
    if (firstNs(rPr, W, 'u')) html = `<u>${html}</u>`;
  }
  return html;
}

function paragraphHtml(p: Element, images: Map<string, string>) {
  const style = firstNs(p, W, 'pStyle')?.getAttributeNS(W, 'val') || firstNs(p, W, 'pStyle')?.getAttribute('w:val') || '';
  const tag = headingTag(style);
  const parts: string[] = [];
  const walk = (node: Element) => {
    if (node.namespaceURI === W && (node.localName === 'r' || node.localName === 'hyperlink')) {
      parts.push(runHtml(node, images));
      return;
    }
    if (node.namespaceURI === W && (node.localName === 'ins' || node.localName === 'sdt' || node.localName === 'sdtContent' || node.localName === 'smartTag')) {
      Array.from(node.children).forEach(walk);
    }
  };
  Array.from(p.children).forEach(walk);
  const inner = parts.join('') || '<br />';
  return `<${tag}>${inner}</${tag}>`;
}

function kids(el: Element, tag: string) {
  return Array.from(el.children).filter(child => child.namespaceURI === W && child.localName === tag);
}

function cellHtml(cell: Element, images: Map<string, string>) {
  const paragraphs = kids(cell, 'p');
  return (paragraphs.length ? paragraphs : ns(cell, W, 'p')).map(p => paragraphHtml(p, images)).join('');
}

function tableHtml(table: Element, images: Map<string, string>) {
  const rows = kids(table, 'tr').length ? kids(table, 'tr') : ns(table, W, 'tr');
  const body = rows.map(row => {
    const cells = kids(row, 'tc').length ? kids(row, 'tc') : ns(row, W, 'tc');
    return `<tr>${cells.map(cell => `<td>${cellHtml(cell, images)}</td>`).join('')}</tr>`;
  }).join('');
  return `<table>${body}</table>`;
}

export function wordXmlToHtml(xml: string, images: Map<string, string> = new Map()) {
  const parsed = new DOMParser().parseFromString(xml, 'application/xml');
  if (parsed.querySelector('parsererror')) throw new Error('Unable to read this document.');
  const body = parsed.getElementsByTagNameNS(W, 'body')[0];
  if (!body) throw new Error('Unable to read this document.');
  const chunks: string[] = [];
  for (const child of Array.from(body.children)) {
    if (child.localName === 'p') chunks.push(paragraphHtml(child, images));
    else if (child.localName === 'tbl') chunks.push(tableHtml(child, images));
  }
  return chunks.join('') || '<p>(This document has no readable text.)</p>';
}

export async function docxToHtml(buffer: ArrayBuffer) {
  const files = await unzip(buffer);
  const documentXml = files.get('word/document.xml');
  if (!documentXml) throw new Error('This file does not look like a Word document.');
  const objectUrls: string[] = [];
  const images = new Map<string, string>();
  const rels = files.get('word/_rels/document.xml.rels');
  if (rels) {
    const parsed = new DOMParser().parseFromString(new TextDecoder().decode(rels), 'application/xml');
    const nodes = [
      ...Array.from(parsed.getElementsByTagNameNS(RELS, 'Relationship')),
      ...Array.from(parsed.getElementsByTagName('Relationship')),
    ];
    for (const rel of nodes) {
      const id = rel.getAttribute('Id');
      const target = rel.getAttribute('Target');
      const type = rel.getAttribute('Type') ?? '';
      if (!id || !target || !type.includes('image')) continue;
      const path = normalizePath(target.startsWith('/') ? target.slice(1) : `word/${target}`);
      const bytes = files.get(path);
      const mime = mimeFromName(path);
      if (!id || !bytes || !mime) continue;
      const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
      images.set(id, url);
      objectUrls.push(url);
    }
  }
  return {
    html: wordXmlToHtml(new TextDecoder().decode(documentXml), images),
    revoke: () => { for (const url of objectUrls) URL.revokeObjectURL(url); },
  };
}
