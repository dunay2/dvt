type BootstrapProgressTone = 'loading' | 'blocked' | 'error' | 'complete';
type BootstrapProgressSegmentStatus = 'pending' | 'complete' | 'degraded' | 'blocked' | 'error';

export type BootstrapProgressSnapshot = {
  value: number;
  max: number;
  tone: BootstrapProgressTone;
  label: string;
  valueLabel?: string;
  segments?: readonly BootstrapProgressSegmentStatus[];
};

const PROGRESS_ROOT_ID = 'app-loading-progress';

function ensureProgressTemplate(root: HTMLElement): void {
  if (root.childElementCount > 0) {
    return;
  }

  root.innerHTML = `
    <div class="app-loading-progress-head">
      <span class="app-loading-progress-kicker">Startup progress</span>
      <span class="app-loading-progress-value" data-app-loading-progress-value>0%</span>
    </div>
    <div class="app-loading-progress-track" data-app-loading-progress-track></div>
    <p class="app-loading-progress-label" data-app-loading-progress-label></p>
  `;
}

function createFallbackSegments(
  value: number,
  max: number
): readonly BootstrapProgressSegmentStatus[] {
  const completedSegments = Math.round(value);
  return Array.from({ length: max }, (_, index) =>
    index < completedSegments ? 'complete' : 'pending'
  );
}

export function renderBootstrapProgress(snapshot: BootstrapProgressSnapshot): void {
  const root = document.getElementById(PROGRESS_ROOT_ID);
  if (!root) {
    return;
  }

  ensureProgressTemplate(root);

  const clampedMax = Math.max(snapshot.max, 1);
  const clampedValue = Math.min(Math.max(snapshot.value, 0), clampedMax);
  const progressRatio = clampedValue / clampedMax;
  const progressPercent = Math.round(progressRatio * 100);

  root.dataset.tone = snapshot.tone;

  const trackNode = root.querySelector<HTMLElement>('[data-app-loading-progress-track]');
  if (trackNode) {
    const segmentStatuses =
      snapshot.segments && snapshot.segments.length > 0
        ? snapshot.segments
        : createFallbackSegments(clampedValue, Math.round(clampedMax));
    trackNode.setAttribute('role', 'progressbar');
    trackNode.setAttribute('aria-valuemin', '0');
    trackNode.setAttribute('aria-valuemax', String(clampedMax));
    trackNode.setAttribute('aria-valuenow', String(clampedValue));
    trackNode.replaceChildren(
      ...segmentStatuses.map((status) => {
        const segment = document.createElement('span');
        segment.className = 'app-loading-progress-segment';
        segment.dataset.appLoadingProgressSegment = '';
        segment.dataset.status = status;
        return segment;
      })
    );
  }

  const valueNode = root.querySelector<HTMLElement>('[data-app-loading-progress-value]');
  if (valueNode) {
    valueNode.textContent = snapshot.valueLabel ?? `${progressPercent}%`;
  }

  const labelNode = root.querySelector<HTMLElement>('[data-app-loading-progress-label]');
  if (labelNode) {
    labelNode.textContent = snapshot.label;
  }
}
