(() => {
  const scrollWrapperSelector = '.md-typeset__scrollwrap';
  const observedWrappers = new WeakSet();
  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) refreshScrollRegion(entry.target);
  });

  function nearestHeadingLabel(wrapper) {
    const article = wrapper.closest('article');
    const headings = article ? article.querySelectorAll('h1, h2, h3, h4, h5, h6') : [];
    let label = 'Scrollable table';
    for (const heading of headings) {
      if (heading.compareDocumentPosition(wrapper) & Node.DOCUMENT_POSITION_FOLLOWING) {
        label = heading.textContent.replace('¶', '').trim() || label;
      }
    }
    return label;
  }

  function refreshScrollRegion(wrapper) {
    const isScrollable = wrapper.scrollWidth > wrapper.clientWidth + 1;
    if (isScrollable) {
      wrapper.tabIndex = 0;
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', nearestHeadingLabel(wrapper));
      wrapper.dataset.dvtScrollableTable = 'true';
      return;
    }

    if (wrapper.dataset.dvtScrollableTable === 'true') {
      wrapper.removeAttribute('tabindex');
      wrapper.removeAttribute('role');
      wrapper.removeAttribute('aria-label');
      delete wrapper.dataset.dvtScrollableTable;
    }
  }

  function enhanceScrollableTables(root = document) {
    for (const wrapper of root.querySelectorAll(scrollWrapperSelector)) {
      refreshScrollRegion(wrapper);
      if (!observedWrappers.has(wrapper)) {
        observedWrappers.add(wrapper);
        resizeObserver.observe(wrapper);
      }
    }
  }

  function start() {
    enhanceScrollableTables();
    new MutationObserver((records) => {
      if (records.some((record) => record.addedNodes.length > 0)) enhanceScrollableTables();
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
