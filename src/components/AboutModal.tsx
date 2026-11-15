import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, FileText, X } from 'lucide-react';
import { PdfViewer } from './PdfViewer';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PdfDoc {
  title: string;
  url: string;
  filename: string;
}

const CODE_PDF: PdfDoc = {
  title: 'MOP BASIC Source Listing (1980)',
  url: '/assets/aistudio/MOPS_Code_V3_033440aa.pdf',
  filename: 'MOP_Code_V3.pdf',
};

const ARTICLE_PDF: PdfDoc = {
  title: 'Chartered Mechanical Engineer (Nov 1982)',
  url: '/assets/aistudio/Chartered_Mechanical_Engineer_-_BW_223d1316.pdf',
  filename: 'Chartered_Mechanical_Engineer_Nov_1982.pdf',
};

async function triggerPdfDownload(doc: PdfDoc): Promise<void> {
  const res = await fetch(doc.url);
  if (!res.ok) return;
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = doc.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [activePdf, setActivePdf] = useState<PdfDoc | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setActivePdf(null);
      return;
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activePdf) {
          setActivePdf(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activePdf, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-mop-title"
      onClick={onClose}
    >
      <div
        className={`max-h-[92dvh] w-full overflow-y-auto rounded-2xl border border-[#26343a] bg-[#101619] p-5 shadow-2xl sm:p-6 ${
          activePdf ? 'max-w-4xl' : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {activePdf ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 border-b border-[#1d292e] pb-3">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setActivePdf(null)}
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#28373e] bg-[#151e22] px-3 py-1.5 text-xs font-medium text-[#e6edf0] transition-colors hover:border-emerald-400/50 hover:text-emerald-300 shrink-0"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Back</span>
                </button>
                <h2
                  id="about-mop-title"
                  className="truncate text-sm font-semibold text-[#e6edf0]"
                >
                  {activePdf.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close About dialog"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#8ca0a7] transition-colors hover:bg-[#1a2428] hover:text-[#e6edf0] shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <PdfViewer
              url={activePdf.url}
              title={activePdf.title}
              filename={activePdf.filename}
            />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="about-mop-title" className="text-lg font-semibold text-[#e6edf0]">
                  About MOP
                </h2>
                <p className="mt-0.5 text-xs text-[#8ca0a7]">
                  Management Ordering &amp; Processing Synthesis · Copyright © 1980
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close About dialog"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[#8ca0a7] transition-colors hover:bg-[#1a2428] hover:text-[#e6edf0]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-relaxed text-[#c6d3d7]">
              <p>
                This application is a direct interactive adaptation of the 1980 Commodore PET BASIC
                operations management simulation created at{' '}
                <span className="text-[#e6edf0] font-medium">
                  The Polytechnic, Newcastle upon Tyne
                </span>
                .
              </p>

              <dl className="rounded-xl border border-[#1d292e] bg-[#0b1012] p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between gap-4">
                  <dt className="text-[#8ca0a7]">Specification</dt>
                  <dd className="font-medium text-[#e6edf0]">
                    B. H. Claybourn (School of Operation Management)
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#8ca0a7]">Original Program</dt>
                  <dd className="font-medium text-[#e6edf0]">
                    R. Reed (CBL Advisor, Computer Unit)
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[#8ca0a7]">Simulation Horizon</dt>
                  <dd className="font-mono text-[#e6edf0]">Weeks 13 – 32 (20 weeks)</dd>
                </div>
              </dl>

              <p className="text-xs text-[#8ca0a7]">
                Includes the handwritten line 3455 correction from the original printout waiving
                under-production penalties during the Weeks 25–26 holiday shutdown.
              </p>
            </div>

            <div className="mt-5 space-y-4 border-t border-[#1d292e] pt-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-[#9eb0b7]">
                  <FileText className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Original 1980 BASIC Source Listing (6 pages, PDF)</span>
                </div>
                <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setActivePdf(CODE_PDF)}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-[#08100d] transition-colors hover:bg-emerald-300"
                  >
                    <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>View BASIC Listing</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerPdfDownload(CODE_PDF)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#28373e] bg-[#151e22] px-4 py-2.5 text-xs font-semibold text-[#e6edf0] transition-colors hover:border-emerald-400/50 hover:text-emerald-300"
                  >
                    <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              <div className="border-t border-[#1d292e] pt-4">
                <div className="flex items-center gap-2 text-xs font-medium text-[#9eb0b7]">
                  <FileText className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
                  <span>Chartered Mechanical Engineer (Nov 1982) · Article PDF</span>
                </div>
                <p className="mt-1 text-xs text-[#7e949b]">
                  “Simulating Manufacturing Dynamics using a Microcomputer” by B. H. Claybourn
                  &amp; R. Reed (pp. 30–31).
                </p>
                <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setActivePdf(ARTICLE_PDF)}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-400/15 px-4 py-2.5 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/25"
                  >
                    <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>View CME Article</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerPdfDownload(ARTICLE_PDF)}
                    className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-[#28373e] bg-[#151e22] px-4 py-2.5 text-xs font-semibold text-[#e6edf0] transition-colors hover:border-emerald-400/50 hover:text-emerald-300"
                  >
                    <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
