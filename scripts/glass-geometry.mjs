/** Local geometry adaptation for the supplied, pinned FORM Glass 0.1.0.
 * Its composite controls hard-code solid edges and do not expose geometry props.
 * Apply the requested four rounded corners / four faded edges at bundle time.
 * The archive, upstream project, material math, timings and CSS stay unchanged.
 * Fail on a changed upstream implementation instead of silently losing the style.
 */
export function adaptGlassGeometry(source) {
  const replace = (before, after, count = 1) => {
    if (source.split(before).length - 1 !== count) {
      throw Error(`FORM Glass 0.1.0 geometry adapter: unexpected source for ${before}`);
    }
    source = source.replaceAll(before, after);
  };
  replace('fade: t ?? (r ? [] : void 0)', 'fade: t ?? an');
  replace('fade: []', 'fade: an', 5);
  replace('edges: []', 'edges: an');
  replace('shape: "capsule"', 'shape: "rectangle"');
  // Preserve plain option labels for type-ahead and accessibility; the local
  // display node reserves both language widths/heights in trigger and menu.
  replace('children: (R = n[c]) == null ? void 0 : R.label', 'children: n[c]?.displayLabel ?? n[c]?.label');
  replace('children: (X = n[d]) == null ? void 0 : X.label', 'children: n[d]?.displayLabel ?? n[d]?.label');
  // The original field was always solid, so it omitted the rounded feather mask.
  replace('H(Ie, { control: !0, edges: an }),',
    'H($e, { geometryKey: "rectangle/all" }),\n    H(Ie, { control: !0, edges: an }),');
  // Compact controls retain a real rounded core. A 32px panel feather on a
  // 32px-high button leaves no core at all. Keep the upstream mask/material math,
  // but use a 6px / -3px feather for nested controls and standalone buttons.
  replace('const t = Fe(bt), n = V(null);', 'const context = Fe(bt), t = context, n = V(null);');
  replace('if (!s || !f || !t.active) return;', `const compact = s?.dataset.glassMaterial === "control" || s?.matches("button.glass");
    const t = compact ? {...context, distance:6, mid:-3, fades:{blur:{distance:6,mid:-3},brightness:{distance:6,mid:-3},contrast:{distance:6,mid:-3}}} : context;
    if (!s || !f || !t.active) return;`);
  // A long menu's own focus/scroll events can bubble from a viewport outside
  // its top-layer subtree. Dismiss only when resize/scroll actually moves the
  // trigger, so the 127-file-family menu stays usable while its rows unfold.
  replace('se.target instanceof Element && c.contains(se.target) || x();',
    `if (se.target instanceof Element && c.contains(se.target)) return;
      const trigger = s.current?.querySelector("button"), origin = D.current;
      const rect = trigger?.getBoundingClientRect();
      if (se.type === "resize" || !rect || !origin || Math.abs(rect.top-origin.top) > .5 || Math.abs(rect.left-origin.left) > .5) x();`);
  // A standalone window changes visibility, not content. The default reveal
  // crossfades an old and new snapshot even when both contain the same controls:
  // opening exposes a sharp outgoing copy; closing reintroduces a sharp incoming
  // copy. Opt in to a single direction while retaining FORM's shell, timelines,
  // reduced-motion handling and interrupted-animation cleanup.
  replace('[Ne(a, at(a))], a.dataset.glassRevealPhase',
    '(e && a.dataset.glassRevealMode === "visibility" ? [] : [Ne(a, at(a))]), a.dataset.glassRevealPhase');
  replace('const c = e || l.current.onPrepare ? Ne(',
    'const c = (e && (a.dataset.glassRevealMode !== "visibility" || !d.length)) || (l.current.onPrepare && a.dataset.glassRevealMode !== "visibility") ? Ne(');
  // Reversing a visibility transition continues the same paint copy at its
  // current opacity/blur, instead of starting another pair of copies.
  replace('function Ge(e, t, n) {', 'function Ge(e, t, n, resume = false) {');
  replace('f = t ? Number(s.opacity) : 0, p = t ?', 'f = t || resume ? Number(s.opacity) : 0, p = t || resume ?');
  replace('const F = G.map((Z) => Ge(Z, !0, w)),',
    'const F = G.map((Z) => Ge(Z, a.dataset.glassRevealMode === "visibility" ? !e : true, w, a.dataset.glassRevealMode === "visibility")),');
  // A reversed size animation must measure the natural full-size endpoint,
  // not mistake its paused, partially collapsed dimensions for that endpoint.
  replace('a.dataset.glassRevealPhase = "preparing", x(),',
    'a.dataset.glassRevealPhase = "preparing", a.dataset.glassRevealCollapse === "circle" && y.current?.motion?.cancel(), x(),');
  replace('const U = e ? X : k;', 'const U = e || a.dataset.glassRevealCollapse === "circle" ? X : k;');
  // Preserve the 12px physical corner radius while closing to a 24px circle.
  // Non-uniform transform scaling would flatten the rounded corners themselves.
  replace('N = a.animate(_t(M, E, P, I, w.curve),', `const shellFrames = a.dataset.glassRevealCollapse === "circle"
      ? Array.from({length:61}, (_, index) => { const p = He(M, E, index / 60, w.curve); return {offset:index / 60, width:(U.width * (P + (1-P)*p))+"px", height:(U.height * (I + (1-I)*p))+"px", transform:"none"}; })
      : _t(M, E, P, I, w.curve);
      N = a.animate(shellFrames,`);
  // Escape belongs to the topmost open menu, not its containing window.
  replace('se.key === "Escape" && (se.preventDefault(), x(!0));',
    'se.key === "Escape" && (se.preventDefault(), se.stopPropagation(), x(!0));');
  replace('c.preventDefault(), x(!0);', 'c.preventDefault(), c.stopPropagation(), x(!0);');
  // Native top-layer menus otherwise survive an inert/hidden owner. Keep their
  // normal closing animation, but dismiss as soon as that owner starts closing.
  replace('return c.addEventListener("toggle", Q),', `const ownerWatch = new MutationObserver(() => { if (s.current?.closest('[inert],[aria-hidden="true"]')) x(); });
    for (let owner = s.current; owner; owner = owner.parentElement) ownerWatch.observe(owner, {attributes:true, attributeFilter:["inert","aria-hidden"]});
    return c.addEventListener("toggle", Q),`);
  replace('c.removeEventListener("toggle", Q),', 'ownerWatch.disconnect(), c.removeEventListener("toggle", Q),');
  // Use all available vertical space instead of capping otherwise fitting menus.
  replace('Math.min(310, Math.max(U.height, (F ? P : I) - 4))', 'Math.max(U.height, (F ? P : I) - 4)');
  // Reveal transforms scale the painted rail to zero without resizing its layout
  // box. Match viewport/clientHeight units so the first opened long menu works.
  replace('A.getBoundingClientRect().height) ?? 0, a = Ct', 'A.clientHeight) ?? 0, a = Ct');
  // Feathers and reveal paint copies extend scrollHeight without adding options.
  // Measure the layout body for select menus; ordinary scroll areas stay intact.
  replace('a = Ct(y, l.scrollHeight, l.scrollTop, b, e ? 40 : 48);',
    `contentHeight = l.classList.contains("select-options") ? (l.firstElementChild?.offsetHeight ?? l.scrollHeight) : l.scrollHeight,
      a = Ct(y, contentHeight, l.scrollTop, b, e ? 40 : 48);
      if (l.classList.contains("select-options")) l.dataset.scrollOverflow = String(contentHeight > y + 1);`);
  return source;
}

export function glassGeometryPlugin() {
  return {
    name: 'block-gamut-glass-geometry',
    enforce: 'pre',
    transform(code, id) {
      if (!id.replaceAll('\\', '/').endsWith('/@form-glass/react/dist/index.js')) return null;
      return {code: adaptGlassGeometry(code), map: null};
    },
  };
}
