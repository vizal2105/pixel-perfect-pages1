import { describe, expect, it } from 'vitest';
import { wordXmlToHtml } from '@/lib/docx-html';
import { unzip, zipStore } from '@/lib/zip';
import { manuscriptKind, mimeForName } from '@/lib/manuscripts';

describe('manuscript files', () => {
  it('maps common manuscript extensions', () => {
    expect(manuscriptKind('paper.PDF')).toBe('pdf');
    expect(manuscriptKind('work.docx')).toBe('docx');
    expect(manuscriptKind('legacy.doc')).toBe('doc');
    expect(mimeForName('study.pdf')).toBe('application/pdf');
  });

  it('turns Word XML into readable HTML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Capstone Title</w:t></w:r></w:p>
          <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Bold abstract.</w:t></w:r></w:p>
          <w:tbl><w:tr><w:tc><w:p><w:r><w:t>Cell A</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
        </w:body>
      </w:document>`;
    const html = wordXmlToHtml(xml);
    expect(html).toContain('<h1>Capstone Title</h1>');
    expect(html).toContain('<strong>Bold abstract.</strong>');
    expect(html).toContain('<td><p>Cell A</p></td>');
  });

  it('reads stored zip entries used by docx files', async () => {
    const packed = zipStore({
      'word/document.xml': new TextEncoder().encode('<ok/>'),
    });
    const files = await unzip(packed);
    expect(new TextDecoder().decode(files.get('word/document.xml'))).toBe('<ok/>');
  });
});
