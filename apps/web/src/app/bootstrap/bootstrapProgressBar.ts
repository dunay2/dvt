/** Owned concern: render the pre-React startup progress meter from a bootstrap snapshot. */
type BootstrapProgressTone = 'loading' | 'blocked' | 'error' | 'complete';
type BootstrapProgressSegmentStatus =
  | 'pending'
  | 'complete'
  | 'degraded'
  | 'failed'
  | 'blocked'
  | 'error';

export type BootstrapProgressSegment = {
  id: string;
  label: string;
  status: BootstrapProgressSegmentStatus;
};

export type BootstrapProgressSnapshot = {
  tone: BootstrapProgressTone;
  label: string;
  kicker: string;
  listLabel: string;
  countLabel: string;
  settledCount: number;
  totalCount: number;
  segments: readonly BootstrapProgressSegment[];
};

const PROGRESS_ROOT_ID = 'app-loading-progress';

function renderProgressTemplate(root: HTMLElement, snapshot: BootstrapProgressSnapshot): void {
  const header = document.createElement('div');
  header.className = 'app-loading-progress-head';

  const kicker = document.createElement('span');
  kicker.className = 'app-loading-progress-kicker';
  kicker.textContent = snapshot.kicker;

  const count = document.createElement('span');
  count.className = 'app-loading-progress-count';
  count.dataset.appLoadingProgressCount = '';

  header.append(kicker, count);

  const segments = document.createElement('div');
  segments.className = 'app-loading-progress-segments';
  segments.setAttribute('role', 'list');
  segments.setAttribute('aria-label', snapshot.listLabel);

  snapshot.segments.forEach((segment) => {
    const segmentNode = document.createElement('span');
    segmentNode.className = 'app-loading-progress-segment';
    segmentNode.dataset.appLoadingProgressSegment = segment.id;
    segmentNode.dataset.status = segment.status;
    segmentNode.setAttribute('role', 'listitem');
    segmentNode.setAttribute('aria-label', `${segment.label}: ${segment.status}`);
    segments.append(segmentNode);
  });

  const label = document.createElement('p');
  label.className = 'app-loading-progress-label';
  label.dataset.appLoadingProgressLabel = '';

  root.replaceChildren(header, segments, label);
}

export function renderBootstrapProgress(snapshot: BootstrapProgressSnapshot): void {
  const root = document.getElementById(PROGRESS_ROOT_ID);
  if (!root) {
    return;
  }

  renderProgressTemplate(root, snapshot);

  root.dataset.tone = snapshot.tone;

  const countNode = root.querySelector<HTMLElement>('[data-app-loading-progress-count]');
  if (countNode) {
    countNode.textContent = snapshot.countLabel;
  }

  const labelNode = root.querySelector<HTMLElement>('[data-app-loading-progress-label]');
  if (labelNode) {
    labelNode.textContent = snapshot.label;
  }
}
