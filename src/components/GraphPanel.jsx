import { useCallback, useEffect, useRef, useState } from 'react';

const EPSILON = '\u03b5';
const EMPTY_GLYPH = '\u25cc';
const MINUS = '\u2212';

const LEGEND_NFA = [
  { dot: '#73c08a', label: 'Start state' },
  { dot: '#d7b46b', label: 'Accept state' },
  { dot: '#b0a1d3', label: 'Normal state' },
  { dash: true, label: `${EPSILON} transition` },
];

const LEGEND_DFA = [
  { dot: '#73c08a', label: 'Start state' },
  { dot: '#d7b46b', label: 'Accept state' },
  { dot: '#95b8f5', label: 'Normal state' },
  { dot: '#5a6e85', label: 'Dead state' },
];

function parseViewBox(svgContent) {
  const match = svgContent?.match(/viewBox="[^"]*?\s([\d.]+)\s+([\d.]+)"/);
  if (!match) {
    return null;
  }

  const width = Number(match[1]);
  const height = Number(match[2]);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

function getFitTransform(container, svgContent) {
  const viewBox = parseViewBox(svgContent);
  if (!container || !viewBox) {
    return { x: 0, y: 0, s: 1 };
  }

  const padding = 36;
  const availableWidth = Math.max(container.clientWidth - padding * 2, 120);
  const availableHeight = Math.max(container.clientHeight - padding * 2, 120);
  const scale = Math.max(
    0.1,
    Math.min(4, Math.min(availableWidth / viewBox.width, availableHeight / viewBox.height)),
  );

  return {
    x: Math.round((container.clientWidth - viewBox.width * scale) / 2),
    y: Math.round((container.clientHeight - viewBox.height * scale) / 2),
    s: Number(scale.toFixed(3)),
  };
}

export default function GraphPanel({ dot, title, subtitle, svgContent, legendType }) {
  const [tf, setTf] = useState({ x: 0, y: 0, s: 1 });
  const drag = useRef({ on: false, sx: 0, sy: 0, tx: 0, ty: 0 });
  const wrapRef = useRef(null);

  const onDown = useCallback(
    (e) => {
      e.preventDefault();
      drag.current = { on: true, sx: e.clientX, sy: e.clientY, tx: tf.x, ty: tf.y };
    },
    [tf],
  );

  const onMove = useCallback((e) => {
    if (!drag.current.on) return;
    const dx = e.clientX - drag.current.sx;
    const dy = e.clientY - drag.current.sy;
    setTf((t) => ({ ...t, x: drag.current.tx + dx, y: drag.current.ty + dy }));
  }, []);

  const onUp = useCallback(() => {
    drag.current.on = false;
  }, []);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const container = wrapRef.current;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;

    setTf((t) => {
      const nextScale = Math.max(0.1, Math.min(6, Number((t.s * delta).toFixed(3))));
      const worldX = (px - t.x) / t.s;
      const worldY = (py - t.y) / t.s;

      return {
        x: Math.round(px - worldX * nextScale),
        y: Math.round(py - worldY * nextScale),
        s: nextScale,
      };
    });
  }, []);

  useEffect(() => {
    const element = wrapRef.current;
    if (!element) return;
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [onWheel]);

  const setWrapNode = useCallback((node) => {
    wrapRef.current = node;
    if (node) {
      setTf(svgContent ? getFitTransform(node, svgContent) : { x: 0, y: 0, s: 1 });
    }
  }, [svgContent]);

  const fit = useCallback(() => {
    const container = wrapRef.current;
    setTf(container && svgContent ? getFitTransform(container, svgContent) : { x: 0, y: 0, s: 1 });
  }, [svgContent]);

  const zoomIn = () => setTf((t) => ({ ...t, s: Math.min(6, +(t.s * 1.25).toFixed(3)) }));
  const zoomOut = () => setTf((t) => ({ ...t, s: Math.max(0.1, +(t.s / 1.25).toFixed(3)) }));

  const legend = legendType === 'nfa' ? LEGEND_NFA : LEGEND_DFA;

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title-row">
          <div className="ph-title">
            <span className={`ph-dot ${dot}`} />
            {title}
          </div>
          {subtitle && <div className="ph-sub">{subtitle}</div>}
        </div>
      </div>

      <div className="panel-body" style={{ overflow: 'hidden', position: 'relative' }}>
        {!svgContent ? (
          <div className="empty">
            <div className="empty-glyph">{EMPTY_GLYPH}</div>
            <p>Convert a regular expression to generate the automaton diagram.</p>
          </div>
        ) : (
          <>
            <div
              ref={setWrapNode}
              className="graph-wrap"
              onMouseDown={onDown}
              onMouseMove={onMove}
              onMouseUp={onUp}
              onMouseLeave={onUp}
            >
              <div
                className="graph-content"
                style={{
                  transform: `translate(${tf.x}px,${tf.y}px) scale(${tf.s})`,
                  transformOrigin: '0 0',
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </div>

            <div className="graph-legend">
              {legend.map((item) => (
                <div key={item.label} className="lg-item">
                  {item.dot && <span className="lg-dot" style={{ background: item.dot }} />}
                  {item.dash && <span className="lg-dash" />}
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="graph-controls">
              <button type="button" className="gc-btn" onClick={zoomIn} aria-label="Zoom in">+</button>
              <button type="button" className="gc-btn gc-zoom" onClick={fit}>
                {Math.round(tf.s * 100)}%
              </button>
              <button type="button" className="gc-btn" onClick={zoomOut} aria-label="Zoom out">{MINUS}</button>
              <button
                type="button"
                className="gc-btn"
                onClick={fit}
                aria-label="Reset view"
                style={{ fontSize: 10, letterSpacing: '.05em' }}
              >
                FIT
              </button>
            </div>

            <div className="graph-hint">Drag to pan | Scroll to zoom</div>
          </>
        )}
      </div>
    </div>
  );
}
