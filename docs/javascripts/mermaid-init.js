(() => {
  const renderMermaid = async () => {
    if (typeof mermaid === 'undefined') return;

    const codeBlocks = document.querySelectorAll('pre > code.language-mermaid');
    for (const codeBlock of codeBlocks) {
      const pre = codeBlock.parentElement;
      if (!pre || pre.dataset.mermaidProcessed === 'true') continue;

      const container = document.createElement('div');
      container.className = 'mermaid';
      container.textContent = codeBlock.textContent ?? '';

      pre.replaceWith(container);
    }

    document.querySelectorAll('.mermaid').forEach((el) => {
      el.removeAttribute('data-processed');
    });

    mermaid.initialize({ startOnLoad: false });
    await mermaid.run({ querySelector: '.mermaid' });
  };

  if (window.document$?.subscribe) {
    window.document$.subscribe(() => {
      void renderMermaid();
    });
  } else {
    window.addEventListener('DOMContentLoaded', () => {
      void renderMermaid();
    });
  }
})();
