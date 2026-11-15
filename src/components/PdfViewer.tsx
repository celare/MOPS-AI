import React, { useEffect, useRef, useState } from 'react';
import { Download, ZoomIn, ZoomOut } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfViewerProps {
  url: string;
  title: string;
  filename: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url, title, filename }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [renderTick, setRenderTick] = useState<number>(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function loadPdf() {
      setLoading(true);
      setError(null);
      setPdfBytes(null);
      setPageCount(0);

      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Unable to load PDF (status ${res.status}).`);
        }
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          throw new Error('Cached HTML was returned instead of the PDF. Please reload the app once.');
        }
        const buffer = await res.arrayBuffer();
        if (cancelled) return;
        setPdfBytes(buffer);
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === 'AbortError')) return;
        setError(err instanceof Error ? err.message : 'Failed to load PDF document.');
        setLoading(false);
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url, renderTick]);

  useEffect(() => {
    if (!pdfBytes) return;
    let cancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
    let activeDoc: pdfjsLib.PDFDocumentProxy | null = null;

    async function renderPages() {
      const container = containerRef.current;
      if (!container || !pdfBytes) return;

      try {
        loadingTask = pdfjsLib.getDocument({ data: pdfBytes.slice(0) });
        const pdfDoc = await loadingTask.promise;
        activeDoc = pdfDoc;
        if (cancelled) {
          await pdfDoc.cleanup();
          return;
        }

        setPageCount(pdfDoc.numPages);
        container.innerHTML = '';

        const containerWidth = Math.max(container.clientWidth - 24, 280);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          if (cancelled) break;
          const page = await pdfDoc.getPage(pageNum);
          const unscaledViewport = page.getViewport({ scale: 1 });
          const baseScale = containerWidth / unscaledViewport.width;
          const scale = baseScale * zoom;
          const viewport = page.getViewport({ scale });

          const wrapper = document.createElement('div');
          wrapper.className = 'mb-4 flex flex-col items-center last:mb-0';

          const label = document.createElement('div');
          label.className = 'mb-1.5 font-mono text-[11px] text-[#8ca0a7]';
          label.textContent = `Page ${pageNum} of ${pdfDoc.numPages}`;

          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = `${Math.floor(viewport.height)}px`;
          canvas.className = 'rounded-lg border border-[#223036] bg-white shadow-md';

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          }

          wrapper.appendChild(label);
          wrapper.appendChild(canvas);
          container.appendChild(wrapper);
        }

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to render PDF pages.');
          setLoading(false);
        }
      }
    }

    renderPages();

    return () => {
      cancelled = true;
      if (activeDoc) {
        activeDoc.cleanup().catch(() => {});
      }
      if (loadingTask) {
        loadingTask.destroy().catch(() => {});
      }
    };
  }, [pdfBytes, zoom]);

  const handleDownload = async () => {
    try {
      let bytes = pdfBytes;
      if (!bytes) {
        const res = await fetch(url);
        if (!res.ok) return;
        bytes = await res.arrayBuffer();
      }
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Ignore download errors
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1d292e] bg-[#0b1012] px-3 py-2">
        <div className="font-mono text-xs text-[#9eb0b7]">
          {loading ? 'Rendering PDF...' : `${pageCount} pages · ${Math.round(zoom * 100)}%`}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(2)))}
            aria-label="Zoom out"
            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-[#28373e] bg-[#151e22] text-[#e6edf0] transition-colors hover:border-emerald-400/50"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-[#28373e] bg-[#151e22] px-2.5 font-mono text-xs text-[#e6edf0] transition-colors hover:border-emerald-400/50"
          >
            Fit
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(2.2, +(z + 0.2).toFixed(2)))}
            aria-label="Zoom in"
            className="inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg border border-[#28373e] bg-[#151e22] text-[#e6edf0] transition-colors hover:border-emerald-400/50"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-[#08100d] transition-colors hover:bg-emerald-300"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-400/40 bg-[#1a1012] p-5 text-center">
          <p className="text-sm text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => setRenderTick((t) => t + 1)}
            className="mt-3 inline-flex min-h-[40px] items-center rounded-lg bg-emerald-400 px-4 py-2 text-xs font-semibold text-[#08100d]"
          >
            Retry
          </button>
        </div>
      ) : (
        <div
          ref={containerRef}
          aria-label={title}
          className="terminal-scroll max-h-[68dvh] min-h-[320px] overflow-auto rounded-xl border border-[#1d292e] bg-[#080c0d] p-3"
        />
      )}
    </div>
  );
};
