import { useEffect, useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { docxToHtml } from '@/lib/docx-html';
import { downloadManuscript, fetchManuscriptFile, manuscriptKind, mimeForName, type Manuscript } from '@/lib/manuscripts';

type Preview =
  | { status: 'loading' }
  | { status: 'pdf'; url: string }
  | { status: 'docx'; html: string }
  | { status: 'unsupported'; label: string }
  | { status: 'error'; message: string };

export function ManuscriptFileButtons({ manuscript, onError }: { manuscript: Manuscript; onError?: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  async function download() {
    try {
      onError?.('');
      await downloadManuscript(manuscript);
    } catch (error) { onError?.((error as Error).message); }
  }
  return (
    <>
      <Button variant="outline" size="sm" type="button" onClick={() => setOpen(true)}><Eye />View</Button>
      <Button variant="outline" size="sm" type="button" onClick={() => void download()}><Download />Download</Button>
      <ManuscriptPreview manuscript={manuscript} open={open} onOpenChange={setOpen} />
    </>
  );
}

export function ManuscriptPreview({
  manuscript, open, onOpenChange,
}: {
  manuscript: Manuscript;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [preview, setPreview] = useState<Preview>({ status: 'loading' });
  useEffect(() => {
    if (!open) { setPreview({ status: 'loading' }); return; }
    let cancelled = false;
    const loaded = { pdfUrl: '', revoke: () => {} };
    (async () => {
      try {
        const blob = await fetchManuscriptFile(manuscript);
        if (cancelled) return;
        const kind = sniffKind(manuscript.file_name, blob);
        if (kind === 'pdf') {
          loaded.pdfUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
          setPreview({ status: 'pdf', url: loaded.pdfUrl });
          return;
        }
        if (kind === 'docx') {
          const converted = await docxToHtml(await blob.arrayBuffer());
          if (cancelled) { converted.revoke(); return; }
          loaded.revoke = converted.revoke;
          setPreview({ status: 'docx', html: converted.html });
          return;
        }
        setPreview({ status: 'unsupported', label: manuscript.file_name });
      } catch (error) {
        const message = (error as Error).message;
        if (!cancelled) setPreview({ status: 'error', message });
      }
    })();
    return () => {
      cancelled = true;
      if (loaded.pdfUrl) URL.revokeObjectURL(loaded.pdfUrl);
      loaded.revoke();
    };
  }, [manuscript, open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="ms-viewer flex h-[min(90vh,920px)] max-w-[min(1100px,96vw)] flex-col gap-3 sm:max-w-[min(1100px,96vw)]" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{manuscript.title}</DialogTitle>
          <DialogDescription>{manuscript.file_name}</DialogDescription>
        </DialogHeader>
        <div className="ms-viewer-body">
          {preview.status === 'loading' && <p className="directory-message">Opening the manuscript…</p>}
          {preview.status === 'error' && <p className="directory-message" role="alert">{preview.message}</p>}
          {preview.status === 'unsupported' && (
            <p className="directory-message">
              Preview is not available for {preview.label}. Use Download to save the file and open it on your device.
            </p>
          )}
          {preview.status === 'pdf' && <iframe title={manuscript.file_name} src={`${preview.url}#toolbar=1`} />}
          {preview.status === 'docx' && <div className="ms-docx" dangerouslySetInnerHTML={{ __html: preview.html }} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function sniffKind(name: string, blob: Blob) {
  const named = manuscriptKind(name);
  if (named !== 'other') return named;
  const type = blob.type || mimeForName(name);
  if (type.includes('pdf')) return 'pdf';
  if (type.includes('wordprocessingml') || type.includes('officedocument')) return 'docx';
  if (type === 'application/msword') return 'doc';
  return 'other';
}
