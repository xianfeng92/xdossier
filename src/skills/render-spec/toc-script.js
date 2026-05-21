// Interaction layer for render-spec output:
//   1. Scroll-spy across H2 sections and H3 anchors (H3 active also marks its parent H2)
//   2. Reading-progress bar at top of page
//   3. Mobile TOC drawer toggle + backdrop + Escape close
//   4. Per-pre code copy button (clipboard + visual confirm)
(function () {
  const semanticNavEls = Array.from(document.querySelectorAll(".semantic-overview[id], .semantic-block[id], .source-prose-boundary[id], .source-section-map[id]"));
  const sectionEls = Array.from(document.querySelectorAll("section[id]"));
  const h3Els = Array.from(document.querySelectorAll("main h3[id]"));
  const headings = [...semanticNavEls, ...sectionEls, ...h3Els];
  const tocLinks = new Map();
  document.querySelectorAll("aside.toc a").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    tocLinks.set(href.slice(1), a);
  });

  const progressFill = document.querySelector(".reading-progress-fill");
  const tocAside = document.querySelector("aside.toc");
  let lastActiveId = "";
  let isSyncingHashTarget = false;

  // Bound to semantic.ts ids: H2 = s<n>, H3 = s<n>-<m>.
  const parentH2Id = (id) => {
    const idx = id.indexOf("-");
    return idx > 0 ? id.slice(0, idx) : null;
  };

  const targetFromHash = () => {
    if (!window.location.hash || window.location.hash.length <= 1) return null;
    try {
      return document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
    } catch (_e) {
      return null;
    }
  };

  const scrollTocLinkIntoView = (activeLink) => {
    if (!activeLink || !tocAside) return;
    const linkRect = activeLink.getBoundingClientRect();
    const tocRect = tocAside.getBoundingClientRect();
    if (linkRect.top < tocRect.top) {
      tocAside.scrollTop -= tocRect.top - linkRect.top + 8;
    } else if (linkRect.bottom > tocRect.bottom) {
      tocAside.scrollTop += linkRect.bottom - tocRect.bottom + 8;
    }
  };

  const syncHashTarget = () => {
    const target = targetFromHash();
    if (!target) return;
    isSyncingHashTarget = true;
    target.scrollIntoView({ block: "start", inline: "nearest" });
    requestAnimationFrame(() => {
      isSyncingHashTarget = false;
      onScroll();
    });
  };

  const onScroll = () => {
    let activeId = sectionEls[0]?.id ?? "";
    const offset = 120;
    for (const el of headings) {
      if (el.getBoundingClientRect().top - offset <= 0) activeId = el.id;
    }
    const parentId = activeId ? parentH2Id(activeId) : null;
    tocLinks.forEach((a, id) => {
      const isActive = id === activeId || (parentId !== null && id === parentId);
      a.classList.toggle("active", isActive);
      const sectionItem = a.closest(".toc-section");
      if (sectionItem && !parentH2Id(id)) {
        const isCurrentSection = id === activeId || id === parentId;
        sectionItem.classList.toggle("is-current", isCurrentSection);
      }
    });

    if (activeId && activeId !== lastActiveId) {
      const activeLink = tocLinks.get(activeId) ?? (parentId ? tocLinks.get(parentId) : undefined);
      if (!isSyncingHashTarget) scrollTocLinkIntoView(activeLink);
      lastActiveId = activeId;
    }

    if (progressFill) {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? Math.min(100, Math.max(0, (h.scrollTop / max) * 100)) : 0;
      progressFill.style.width = pct.toFixed(2) + "%";
    }
  };
  const syncAfterLayout = () => requestAnimationFrame(() => {
    syncHashTarget();
    onScroll();
  });
  document.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("hashchange", syncAfterLayout, { passive: true });
  window.addEventListener("load", syncAfterLayout, { passive: true });
  onScroll();
  syncAfterLayout();

  // Mobile TOC drawer
  const tocToggle = document.querySelector(".toc-toggle");
  const tocBackdrop = document.querySelector(".toc-backdrop");
  const isMobileToc = () => window.matchMedia && window.matchMedia("(max-width: 1024px)").matches;
  const syncTocAccessibility = () => {
    if (!tocAside) return;
    const drawerClosed = isMobileToc() && !tocAside.hasAttribute("data-open");
    if (drawerClosed) {
      tocAside.setAttribute("inert", "");
      tocAside.setAttribute("aria-hidden", "true");
    } else {
      tocAside.removeAttribute("inert");
      tocAside.setAttribute("aria-hidden", "false");
    }
  };
  const closeToc = () => {
    if (!tocAside) return;
    tocAside.removeAttribute("data-open");
    document.body.removeAttribute("data-toc-open");
    tocToggle?.setAttribute("aria-expanded", "false");
    syncTocAccessibility();
  };
  const openToc = () => {
    if (!tocAside) return;
    tocAside.setAttribute("data-open", "");
    document.body.setAttribute("data-toc-open", "");
    tocToggle?.setAttribute("aria-expanded", "true");
    syncTocAccessibility();
  };
  tocToggle?.addEventListener("click", () => {
    if (tocAside?.hasAttribute("data-open")) closeToc();
    else openToc();
  });
  tocBackdrop?.addEventListener("click", closeToc);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeToc();
  });
  tocAside?.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeToc));
  window.addEventListener("resize", syncTocAccessibility, { passive: true });
  syncTocAccessibility();

  // Code copy buttons
  const COPY_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
  document.querySelectorAll("main pre").forEach((pre) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy";
    btn.setAttribute("aria-label", __DOSSIER_CODE_COPY_LABEL__);
    btn.innerHTML = COPY_SVG;
    btn.addEventListener("click", () => {
      const code = pre.querySelector("code");
      const text = (code ? code.textContent : pre.textContent) ?? "";
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(() => {
        btn.classList.add("copied");
        btn.innerHTML = CHECK_SVG;
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.innerHTML = COPY_SVG;
        }, 1400);
      });
    });
    pre.appendChild(btn);
  });
})();
