import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ReactNode } from 'react';

type ConfirmationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  children?: ReactNode;
  cancelLabel?: string;
  pending?: boolean;
  confirmDisabled?: boolean;
  error?: string | null;
  informational?: boolean;
};

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  children,
  cancelLabel = 'Cancel',
  pending = false,
  confirmDisabled = false,
  error,
  informational = false,
}: ConfirmationModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) onOpenChange(nextOpen); }}>
      <DialogContent
        className="savewise-modal"
        data-testid="dialog-confirmation"
        onInteractOutside={(event) => {
          if (pending) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <div className="modal-pixel-rule" aria-hidden="true"><i /><i /><i /></div>
        <DialogHeader className="savewise-modal-header">
          <span className="modal-eyebrow">SAVEWISE · YOUR CHOICE</span>
          <DialogTitle className="savewise-modal-title" data-testid="text-modal-title">{title}</DialogTitle>
          <DialogDescription className="savewise-modal-description">{description}</DialogDescription>
        </DialogHeader>
        {children && <div className="savewise-modal-body">{children}</div>}
        {error && <p className="modal-error" role="alert" data-testid="status-modal-error">{error}</p>}
        <DialogFooter className="savewise-modal-actions">
          {!informational && <button type="button" className="modal-secondary" onClick={() => onOpenChange(false)} disabled={pending} data-testid="button-modal-cancel">{cancelLabel}</button>}
          {informational && <button type="button" className="modal-secondary" onClick={() => onOpenChange(false)} data-testid="button-modal-got-it">{cancelLabel === 'Cancel' ? 'Got It' : cancelLabel}</button>}
          {!informational && <button type="button" className="modal-primary" onClick={onConfirm} disabled={pending || confirmDisabled} data-testid="button-modal-confirm">{pending ? 'Saving…' : confirmLabel}</button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
