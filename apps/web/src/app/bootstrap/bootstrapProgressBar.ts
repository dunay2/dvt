type BootstrapProgressTone = 'loading' | 'blocked' | 'error' | 'complete';

export type BootstrapProgressSnapshot = {
  value: number;
  max: number;
  tone: BootstrapProgressTone;
  label: string;
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
    <div class="app-loading-progress-track" data-app-loading-progress-track>
      <span class="app-loading-progress-fill" data-app-loading-progress-fill></span>
    </div>
    <p class="app-loading-progress-label" data-app-loading-progress-label></p>
  `;
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

  const fillNode = root.querySelector<HTMLElement>('[data-app-loading-progress-fill]');
  if (fillNode) {
    fillNode.style.width = `${progressPercent}%`;
  }

  const valueNode = root.querySelector<HTMLElement>('[data-app-loading-progress-value]');
  if (valueNode) {
    valueNode.textContent = `${progressPercent}%`;
  }

  const labelNode = root.querySelector<HTMLElement>('[data-app-loading-progress-label]');
  if (labelNode) {
    labelNode.textContent = snapshot.label;
  }
}
