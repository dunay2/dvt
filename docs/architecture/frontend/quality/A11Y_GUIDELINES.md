# A11Y_GUIDELINES.md - Accessibility Guidelines

**Version**: 1.0  
**Date**: 2026-02-11  
**Status**: Informative (WCAG 2.1 AA Compliance)  
**Location**: docs/architecture/frontend/quality/A11Y_GUIDELINES.md

---

## Executive Summary

The frontend MUST comply with **WCAG 2.1 Level AA** standards to ensure usability for:
- Users with visual impairments (screen readers, low vision)
- Users with motor impairments (keyboard-only navigation)
- Users with cognitive disabilities (clear language, consistent UI)

**Philosophy**: Accessibility is not optional—it's a requirement for all features.

---

## 1. WCAG 2.1 AA Requirements

### 1.1 Perceivable

| Guideline | Requirement | Implementation |
|-----------|-------------|----------------|
| **1.1.1 Non-text Content** | All images have alt text | `<img alt="Run timeline graph">` |
| **1.2.1 Audio/Video** | Provide captions (if applicable) | N/A (no video content) |
| **1.3.1 Info & Relationships** | Use semantic HTML | `<nav>`, `<main>`, `<section>`, `<table>` |
| **1.4.3 Contrast** | Text contrast ≥4.5:1 (7:1 for large text) | Test with [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) |
| **1.4.4 Resize Text** | UI usable at 200% zoom | Test in browser zoom |
| **1.4.11 Non-text Contrast** | UI elements ≥3:1 contrast | Buttons, borders, icons |

---

### 1.2 Operable

| Guideline | Requirement | Implementation |
|-----------|-------------|----------------|
| **2.1.1 Keyboard** | All functionality keyboard-accessible | No mouse-only actions |
| **2.1.2 No Keyboard Trap** | Users can exit all UI elements | Test modal/dropdown focus traps |
| **2.4.1 Bypass Blocks** | Skip navigation link | `<a href="#main">Skip to content</a>` |
| **2.4.3 Focus Order** | Logical tab order | Test with `Tab` key |
| **2.4.7 Focus Visible** | Visible focus indicator | `:focus-visible { outline: 2px solid blue; }` |

---

### 1.3 Understandable

| Guideline | Requirement | Implementation |
|-----------|-------------|----------------|
| **3.1.1 Language** | Declare page language | `<html lang="en">` |
| **3.2.1 On Focus** | No unexpected context changes | Don't auto-submit forms on focus |
| **3.3.1 Error Identification** | Clearly describe errors | "Email is required" (not "Field is invalid") |
| **3.3.2 Labels** | Form inputs have labels | `<label for="email">Email</label>` |

---

### 1.4 Robust

| Guideline | Requirement | Implementation |
|-----------|-------------|----------------|
| **4.1.2 Name, Role, Value** | Use ARIA attributes correctly | `role="button"`, `aria-label="Close"` |
| **4.1.3 Status Messages** | Use `role="status"` for live updates | toast notifications, loading states |

---

## 2. Keyboard Navigation

### 2.1 Tab Order

All interactive elements MUST be reachable via `Tab` key:

- **Navigation menu**: Tab through links (`Home`, `Plans`, `Runs`, `Audit`)
- **Buttons**: `Tab` → `Enter` to activate
- **Forms**: `Tab` through inputs, `Enter` to submit
- **Modals**: Focus traps to modal (no tabbing to background)

**Example modal focus trap**:

```tsx
import { useEffect, useRef } from 'react';
import FocusTrap from 'focus-trap-react';

function Modal({ isOpen, onClose, children }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);
  
  return (
    <FocusTrap active={isOpen}>
      <div role="dialog" aria-modal="true">
        <button ref={closeButtonRef} onClick={onClose}>
          Close
        </button>
        {children}
      </div>
    </FocusTrap>
  );
}
```

---

### 2.2 Focus Management

When opening a modal/drawer, move focus to the first interactive element:

```tsx
// ❌ WRONG: Focus stays on trigger button
<button onClick={() => setModalOpen(true)}>Open</button>

// ✅ CORRECT: Focus moves to modal
useEffect(() => {
  if (modalOpen) {
    modalRef.current?.querySelector('button')?.focus();
  }
}, [modalOpen]);
```

When closing a modal, return focus to the trigger element:

```tsx
function Modal({ triggerRef, onClose }) {
  const handleClose = () => {
    onClose();
    triggerRef.current?.focus(); // Return focus
  };
  
  return <button onClick={handleClose}>Close</button>;
}
```

---

### 2.3 Keyboard Shortcuts

The graph editor MUST support keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| `Tab` | Navigate between nodes |
| `Enter` | Open node config panel |
| `Delete` | Delete selected node |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+C` | Copy selected node |
| `Ctrl+V` | Paste node |
| `Arrow keys` | Move selected node |
| `Esc` | Close config panel / deselect |

**Implementation**:

```tsx
function GraphEditor() {
  const [selectedNode, setSelectedNode] = useState(null);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedNode) {
        deleteNode(selectedNode.id);
      } else if (e.key === 'Escape') {
        setSelectedNode(null);
      } else if (e.ctrlKey && e.key === 'z') {
        undo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode]);
  
  return <ReactFlow nodes={nodes} edges={edges} />;
}
```

---

## 3. Screen Reader Support (ARIA)

### 3.1 Semantic HTML

Use native HTML elements when possible:

| Semantic Element | Purpose |
|-----------------|---------|
| `<nav>` | Navigation menu |
| `<main>` | Main content area |
| `<aside>` | Sidebar / complementary content |
| `<header>` | Page header |
| `<footer>` | Page footer |
| `<button>` | Clickable button |
| `<a>` | Link to another page |
| `<table>` | Tabular data |

**Don't use `<div role="button">`** when `<button>` is sufficient.

---

### 3.2 ARIA Roles

Use ARIA roles for custom components:

| Role | Usage |
|------|-------|
| `role="dialog"` | Modal windows |
| `role="status"` | Live region (toast notifications) |
| `role="alert"` | Critical alerts (errors) |
| `role="progressbar"` | Progress indicators |
| `role="tablist"` | Tab navigation |

**Example modal**:

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Confirm Action</h2>
  <p id="modal-description">Are you sure you want to delete this run?</p>
  <button onClick={handleConfirm}>Confirm</button>
  <button onClick={handleCancel}>Cancel</button>
</div>
```

---

### 3.3 ARIA Labels

Provide descriptive labels for interactive elements:

```tsx
// ❌ WRONG: No label (screen reader reads "Button")
<button onClick={handleClose}>
  <XIcon />
</button>

// ✅ CORRECT: Descriptive label
<button onClick={handleClose} aria-label="Close modal">
  <XIcon />
</button>
```

**Icon-only buttons**: Always include `aria-label`

**Visually hidden labels**: Use `.sr-only` class

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

```tsx
<button>
  <span className="sr-only">Edit plan</span>
  <EditIcon />
</button>
```

---

### 3.4 Live Regions

Use `aria-live` for dynamic content updates:

| `aria-live` Value | Usage |
|-------------------|-------|
| `off` | No announcements (default) |
| `polite` | Announce after current speech (toast notifications) |
| `assertive` | Interrupt current speech (critical errors) |

**Example toast notification**:

```tsx
function Toast({ message }) {
  return (
    <div role="status" aria-live="polite">
      {message}
    </div>
  );
}

// Usage
<Toast message="Run started successfully" />
```

**Example error alert**:

```tsx
function ErrorAlert({ message }) {
  return (
    <div role="alert" aria-live="assertive">
      ❌ {message}
    </div>
  );
}

// Usage
<ErrorAlert message="Failed to start run" />
```

---

## 4. Color Contrast

### 4.1 Text Contrast

| Text Size | Min Contrast Ratio |
|-----------|-------------------|
| Normal text (<18px) | 4.5:1 |
| Large text (≥18px or bold ≥14px) | 3:1 |

**Testing**: Use [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

**Example**:

```css
/* ❌ WRONG: Insufficient contrast (2.5:1) */
.text {
  color: #999; /* Light gray */
  background-color: #fff; /* White */
}

/* ✅ CORRECT: Sufficient contrast (4.6:1) */
.text {
  color: #595959; /* Darker gray */
  background-color: #fff;
}
```

---

### 4.2 UI Element Contrast

Buttons, borders, icons MUST have ≥3:1 contrast against background.

**Example**:

```css
/* ❌ WRONG: Button border too light */
.button {
  background: #fff;
  border: 1px solid #e0e0e0; /* 1.5:1 contrast */
}

/* ✅ CORRECT: Visible border */
.button {
  background: #fff;
  border: 1px solid #888; /* 3.5:1 contrast */
}
```

---

### 4.3 Don't Rely on Color Alone

Use additional visual cues (icons, text) alongside color:

**Example run status**:

```tsx
// ❌ WRONG: Color-only indicator
<div style={{ color: status === 'COMPLETED' ? 'green' : 'red' }}>
  {status}
</div>

// ✅ CORRECT: Color + icon
<div style={{ color: status === 'COMPLETED' ? 'green' : 'red' }}>
  {status === 'COMPLETED' ? '✅' : '❌'} {status}
</div>
```

---

## 5. Form Accessibility

### 5.1 Labels

Every input MUST have an associated label:

```tsx
// ❌ WRONG: No label
<input type="text" placeholder="Email" />

// ✅ CORRECT: Explicit label
<label htmlFor="email">Email</label>
<input type="text" id="email" />
```

**Alternative**: Use `aria-label` if visual label is not desired

```tsx
<input type="text" aria-label="Search runs" />
```

---

### 5.2 Error Messages

Error messages MUST be descriptive and linked to the input:

```tsx
function EmailInput({ error }) {
  return (
    <div>
      <label htmlFor="email">Email</label>
      <input
        type="email"
        id="email"
        aria-invalid={!!error}
        aria-describedby={error ? 'email-error' : undefined}
      />
      {error && (
        <div id="email-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

// Usage
<EmailInput error="Email is required" />
```

---

### 5.3 Required Fields

Mark required fields with `aria-required` and visual indicator:

```tsx
<label htmlFor="planName">
  Plan Name <span aria-label="required">*</span>
</label>
<input type="text" id="planName" required aria-required="true" />
```

---

## 6. Table Accessibility

### 6.1 Use Semantic HTML

```tsx
<table>
  <thead>
    <tr>
      <th scope="col">Run ID</th>
      <th scope="col">Status</th>
      <th scope="col">Started At</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>run-123</td>
      <td>COMPLETED</td>
      <td>2026-02-11 10:00</td>
    </tr>
  </tbody>
</table>
```

### 6.2 Caption

Provide a caption for complex tables:

```tsx
<table>
  <caption>Recent Runs for "Daily ETL" Plan</caption>
  <thead>...</thead>
  <tbody>...</tbody>
</table>
```

---

## 7. Focus Indicators

### 7.1 Visible Focus

All interactive elements MUST have a visible focus indicator:

```css
/* Default browser focus */
button:focus-visible {
  outline: 2px solid #0078d4;
  outline-offset: 2px;
}

/* Custom focus style */
.button:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 120, 212, 0.5);
}
```

**Test**: Tab through the page and verify all interactive elements show focus.

---

### 7.2 Skip Link

Provide a "Skip to content" link for keyboard users:

```tsx
<a href="#main" className="skip-link">
  Skip to main content
</a>

<nav>...</nav>

<main id="main">
  {/* Main content */}
</main>
```

```css
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #000;
  color: #fff;
  padding: 8px;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
```

---

## 8. Testing for Accessibility

### 8.1 Automated Tests

Use **jest-axe** for unit tests:

```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { RunList } from './RunList';

expect.extend(toHaveNoViolations);

test('RunList has no accessibility violations', async () => {
  const { container } = render(<RunList runs={mockRuns} />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

### 8.2 Manual Testing

| Test | Tool | Method |
|------|------|--------|
| **Screen reader** | NVDA (Windows), VoiceOver (Mac) | Navigate page with screen reader |
| **Keyboard navigation** | Browser | Navigate with `Tab`, `Enter`, `Esc` |
| **Color contrast** | Chrome DevTools → Accessibility | Check contrast ratios |
| **Focus indicators** | Browser | Tab through page, verify visible focus |
| **Zoom to 200%** | Browser zoom | Verify layout remains usable |

---

### 8.3 E2E Tests (Playwright + Axe)

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Audit viewer has no accessibility violations', async ({ page }) => {
  await page.goto('/audit');
  
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('Can navigate audit viewer with keyboard', async ({ page }) => {
  await page.goto('/audit');
  
  // Tab to first filter
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  
  // Type in actor filter
  await page.keyboard.type('alice@example.com');
  
  // Tab to search button
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  
  // Verify results loaded
  await expect(page.locator('.audit-entry')).toBeVisible();
});
```

---

## 9. Common Mistakes to Avoid

| Mistake | Correct Approach |
|---------|-----------------|
| Using `<div>` instead of `<button>` | Use semantic HTML: `<button>` |
| Icon-only button without label | Add `aria-label="Close"` |
| Form input without label | Use `<label>` or `aria-label` |
| Low contrast text (e.g., gray on white) | Ensure ≥4.5:1 contrast |
| No focus indicator | Add `:focus-visible` styles |
| Modal without focus trap | Use `focus-trap-react` |
| Live updates without `aria-live` | Add `role="status"` or `role="alert"` |

---

## 10. Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [React Accessibility Docs](https://react.dev/learn/accessibility)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

---

_Last updated: 2026-02-11_  
_Version: 1.0_  
_Status: Informative - WCAG 2.1 AA compliance guidelines_
