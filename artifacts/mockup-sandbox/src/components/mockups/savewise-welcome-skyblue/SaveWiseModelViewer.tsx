import { createElement, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import '@google/model-viewer';
import { MousePointer2 } from 'lucide-react';
const modelUrl = '/__mockup/images/sky_blue_fintech_growth.glb';

type SaveWiseModelProps = {
  className?: string;
};

type CameraOrbit = {
  theta: number;
  phi: number;
  radius: number;
};

type ModelViewerElement = HTMLElement & {
  cameraOrbit: string;
  getCameraOrbit: () => CameraOrbit;
  loaded: boolean;
};

export default function SaveWiseModelViewer({ className = '' }: SaveWiseModelProps) {
  const viewerRef = useRef<HTMLElement | null>(null);
  const baseOrbitRef = useRef<CameraOrbit | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const handleLoad = () => {
      baseOrbitRef.current = (viewer as ModelViewerElement).getCameraOrbit();
      setIsReady(true);
    };
    const handleError = () => setHasError(true);
    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);
    if ((viewer as ModelViewerElement).loaded) handleLoad();
    return () => {
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
    };
  }, []);

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const viewer = viewerRef.current as ModelViewerElement | null;
    const baseOrbit = baseOrbitRef.current;
    const bounds = event.currentTarget.getBoundingClientRect();
    if (!viewer || !baseOrbit || !bounds.width || !bounds.height) return;

    const horizontal = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const vertical = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    const theta = baseOrbit.theta + horizontal * 0.55;
    const phi = Math.max(0.2, Math.min(Math.PI - 0.2, baseOrbit.phi - vertical * 0.25));

    viewer.cameraOrbit = `${theta}rad ${phi}rad ${baseOrbit.radius}m`;
  };

  const handlePointerLeave = () => {
    const viewer = viewerRef.current as ModelViewerElement | null;
    const orbit = baseOrbitRef.current;
    if (viewer && orbit) {
      viewer.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`;
    }
  };

  return (
    <div
      className={`sw-model-stage ${className}`}
      role="group"
      aria-label="Interactive SaveWise 3D illustration"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {!isReady && (
        <span className="sw-model-loading-copy" role="status" aria-live="polite">
          <span className="sw-model-loading-mark" aria-hidden="true" />
          {hasError ? '3D preview unavailable' : 'Preparing the 3D view…'}
        </span>
      )}
      {createElement('model-viewer', {
        ref: viewerRef,
        class: `sw-3d-viewer ${isReady ? 'is-ready' : ''}`,
        src: modelUrl,
        alt: 'A sky-blue 3D illustration representing financial growth and saving.',
        'interaction-prompt': 'none',
        'touch-action': 'pan-y',
        'shadow-intensity': '0.55',
        'exposure': '1',
        'loading': 'eager',
        'aria-label': 'Move your pointer over the model to change its angle',
        'data-testid': 'viewer-savewise-growth-model',
      })}
      <span className="sw-model-hint">
        <MousePointer2 size={14} aria-hidden="true" />
        Move your pointer to explore
      </span>
    </div>
  );
}
