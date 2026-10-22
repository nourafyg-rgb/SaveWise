import { lazy, Suspense } from 'react';

const SaveWiseModelViewer = lazy(() => import('./SaveWiseModelViewer'));

type SaveWiseModelProps = {
  className?: string;
};

function ModelLoadingFallback({ className = '' }: SaveWiseModelProps) {
  return (
    <div className={`sw-model-stage sw-model-loading-stage ${className}`} role="status" aria-live="polite">
      <span className="sw-model-loading-copy">
        <span className="sw-model-loading-mark" aria-hidden="true" />
        Preparing the 3D view…
      </span>
    </div>
  );
}

export default function SaveWiseModel({ className = '' }: SaveWiseModelProps) {
  return (
    <Suspense fallback={<ModelLoadingFallback className={className} />}>
      <SaveWiseModelViewer className={className} />
    </Suspense>
  );
}
