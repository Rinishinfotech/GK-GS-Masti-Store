import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { API } from "../lib/api";

export const SamplePdfModal = ({ product, open, onClose }) => {
  if (!product) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col" data-testid="pdf-preview-modal">
        <DialogHeader>
          <DialogTitle className="text-base">
            Sample Preview — {product.title}
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
              GK GS Masti Preview Only
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          <iframe
            title="Sample PDF"
            src={`${API}/products/${product.id}/sample`}
            className="h-full w-full"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
