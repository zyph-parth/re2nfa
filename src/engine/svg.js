/**
 * Render an automaton as an SVG string.
 *
 * Features:
 * - back-edges route beneath the main layers
 * - multiple edges between the same states share a single label
 * - epsilon-only edges use a dashed style
 * - edge underlays improve readability where paths cross
 * - start arrow always enters from the left
 * - dead states are visually distinct
 */

const EPSILON = '\u03b5';

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const COLORS = {
  startFill: '#1f3a2c',
  startStroke: '#73c08a',
  startText: '#d5efdd',
  acceptFill: '#3d3423',
  acceptStroke: '#d7b46b',
  acceptText: '#f3e0b8',
  nfaFill: '#302844',
  nfaStroke: '#b0a1d3',
  nfaText: '#f0ebff',
  dfaFill: '#243348',
  dfaStroke: '#95b8f5',
  dfaText: '#edf4ff',
  bothFill: '#2e304d',
  bothStroke: '#c4b5fd',
  bothText: '#f5f3ff',
  deadFill: '#24303f',
  deadStroke: '#8594a8',
  deadText: '#d7deea',
  edgeUnderlay: '#0d1627',
  edge: '#b4c7e4',
  edgeEpsilon: '#a796d8',
  edgeLabel: '#f2f6fc',
  edgeLabelMuted: '#efe8ff',
  labelBg: 'rgba(9,16,29,0.96)',
  labelStroke: 'rgba(67,89,121,0.9)',
};

function defs() {
  return `<defs>
  <marker id="ah" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto">
    <polygon points="0,0 9,4.5 0,9" fill="${COLORS.edge}"/>
  </marker>
  <marker id="ah-eps" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto">
    <polygon points="0,0 9,4.5 0,9" fill="${COLORS.edgeEpsilon}"/>
  </marker>
  <marker id="ah-start" markerWidth="9" markerHeight="9" refX="7.5" refY="4.5" orient="auto">
    <polygon points="0,0 9,4.5 0,9" fill="${COLORS.startStroke}"/>
  </marker>
  <filter id="state-shadow" x="-50%" y="-50%" width="200%" height="200%">
    <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#020617" flood-opacity="0.28"/>
  </filter>
</defs>`;
}

function computeEdge(p1, p2, radius, isBidirectional) {
  if (p1 === p2) {
    return null;
  }

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const distance = Math.hypot(dx, dy) || 1;
  const ux = dx / distance;
  const uy = dy / distance;
  const nx = -uy;
  const ny = ux;

  const isBack = p2.x < p1.x - 5;
  const isSameLayer = Math.abs(dx) < 10;

  if (isBack) {
    const span = Math.abs(dx);
    const dropY = Math.min(96 + span * 0.16, 210);
    const sx = p1.x - ux * radius;
    const sy = p1.y - uy * radius;
    const ex = p2.x + ux * radius;
    const ey = p2.y + uy * radius;

    return {
      path: `M ${sx} ${sy} C ${sx} ${sy + dropY} ${ex} ${ey + dropY} ${ex} ${ey}`,
      lx: (sx + ex) / 2,
      ly: Math.max(sy, ey) + dropY + 10,
    };
  }

  if (isSameLayer) {
    const bend = 58;
    const sx = p1.x + nx * radius;
    const sy = p1.y + ny * radius;
    const ex = p2.x + nx * radius;
    const ey = p2.y + ny * radius;

    return {
      path: `M ${sx} ${sy} C ${sx + bend} ${sy} ${ex + bend} ${ey} ${ex} ${ey}`,
      lx: (sx + ex) / 2 + bend * 1.08,
      ly: (sy + ey) / 2,
    };
  }

  const bend = isBidirectional ? 34 : 0;
  const ox = nx * bend;
  const oy = ny * bend;
  const sx = p1.x + ux * radius + ox;
  const sy = p1.y + uy * radius + oy;
  const ex = p2.x - ux * radius + ox;
  const ey = p2.y - uy * radius + oy;
  const mx = (sx + ex) / 2 + ox * 0.7;
  const my = (sy + ey) / 2 + oy * 0.7;

  return {
    path: bend > 0
      ? `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`
      : `M ${sx} ${sy} L ${ex} ${ey}`,
    lx: mx,
    ly: my,
  };
}

function selfLoop(position, radius) {
  const top = position.y - radius - 8;

  return {
    path: `M ${position.x - 18} ${top + 8} C ${position.x - 30} ${top - 30} ${position.x + 30} ${top - 30} ${position.x + 18} ${top + 8}`,
    lx: position.x,
    ly: top - 34,
  };
}

function stateColors({ isStart, isAccept, isDFA, isDead, isHighlighted }) {
  let fill;
  let stroke;
  let text;
  let strokeWidth;
  let dashArray = '';

  if (isDead) {
    fill = COLORS.deadFill;
    stroke = COLORS.deadStroke;
    text = COLORS.deadText;
    strokeWidth = 1.7;
    dashArray = '6 4';
  } else if (isStart && isAccept) {
    fill = COLORS.bothFill;
    stroke = COLORS.bothStroke;
    text = COLORS.bothText;
    strokeWidth = 2.5;
  } else if (isStart) {
    fill = COLORS.startFill;
    stroke = COLORS.startStroke;
    text = COLORS.startText;
    strokeWidth = 2.2;
  } else if (isAccept) {
    fill = COLORS.acceptFill;
    stroke = COLORS.acceptStroke;
    text = COLORS.acceptText;
    strokeWidth = 2.2;
  } else if (isDFA) {
    fill = COLORS.dfaFill;
    stroke = COLORS.dfaStroke;
    text = COLORS.dfaText;
    strokeWidth = 1.8;
  } else {
    fill = COLORS.nfaFill;
    stroke = COLORS.nfaStroke;
    text = COLORS.nfaText;
    strokeWidth = 1.8;
  }

  if (isHighlighted) {
    fill = '#27415f';
    stroke = '#9cc2ff';
    text = '#f7fbff';
    strokeWidth = 2.6;
    dashArray = '';
  }

  return { fill, stroke, text, strokeWidth, dashArray };
}

export function renderSVG({
  states,
  startState,
  acceptStates,
  transitions,
  layout,
  isDFA,
  highlightStates = [],
  deadStates = [],
}) {
  const { positions, width, height, R } = layout;
  const accepts = acceptStates instanceof Set ? acceptStates : new Set([acceptStates]);
  const highlighted = new Set(highlightStates);
  const dead = deadStates instanceof Set ? deadStates : new Set(deadStates);

  let svg = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"
  xmlns="http://www.w3.org/2000/svg" style="display:block; text-rendering:geometricPrecision;">
${defs()}`;

  const edgeMap = new Map();
  for (const transition of transitions) {
    const key = `${transition.from}\x01${transition.to}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, { from: transition.from, to: transition.to, symbols: [] });
    }

    const edge = edgeMap.get(key);
    if (!edge.symbols.includes(transition.symbol)) {
      edge.symbols.push(transition.symbol);
    }
  }

  for (const [, edge] of edgeMap) {
    const p1 = positions[edge.from];
    const p2 = positions[edge.to];

    if (!p1 || !p2) {
      continue;
    }

    const label = edge.symbols.join(', ');
    const isBidirectional = edgeMap.has(`${edge.to}\x01${edge.from}`);
    const isEpsilonOnly = edge.symbols.length === 1 && edge.symbols[0] === EPSILON;
    const geometry = edge.from === edge.to ? selfLoop(p1, R) : computeEdge(p1, p2, R, isBidirectional);

    if (!geometry) {
      continue;
    }

    const stroke = isEpsilonOnly ? COLORS.edgeEpsilon : COLORS.edge;
    const labelColor = isEpsilonOnly ? COLORS.edgeLabelMuted : COLORS.edgeLabel;
    const marker = isEpsilonOnly ? 'url(#ah-eps)' : 'url(#ah)';
    const dash = isEpsilonOnly ? ' stroke-dasharray="6 5"' : '';
    const labelWidth = label.length * 6.9 + 16;

    svg += `
  <path d="${geometry.path}" fill="none" stroke="${COLORS.edgeUnderlay}" stroke-width="5.4"
    stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${geometry.path}" fill="none" stroke="${stroke}" stroke-width="2.1"${dash}
    stroke-linecap="round" stroke-linejoin="round" marker-end="${marker}"/>
  <rect x="${geometry.lx - labelWidth / 2}" y="${geometry.ly - 10}" width="${labelWidth}" height="18"
    rx="6" fill="${COLORS.labelBg}" stroke="${COLORS.labelStroke}" stroke-width="1"/>
  <text x="${geometry.lx}" y="${geometry.ly + 1}" text-anchor="middle" dominant-baseline="middle"
    fill="${labelColor}" font-size="11.5" font-weight="700"
    font-family="JetBrains Mono,monospace">${esc(label)}</text>`;
  }

  if (positions[startState]) {
    const position = positions[startState];
    const x1 = position.x - R - 40;
    const x2 = position.x - R - 4;

    svg += `
  <line x1="${x1}" y1="${position.y}" x2="${x2}" y2="${position.y}" stroke="${COLORS.edgeUnderlay}"
    stroke-width="5" stroke-linecap="round"/>
  <line x1="${x1}" y1="${position.y}" x2="${x2}" y2="${position.y}" stroke="${COLORS.startStroke}"
    stroke-width="2.1" stroke-linecap="round" marker-end="url(#ah-start)"/>
  <text x="${x1 - 4}" y="${position.y - 7}" text-anchor="end" fill="${COLORS.startText}"
    font-size="10.5" font-family="JetBrains Mono,monospace">start</text>`;
  }

  for (const state of states) {
    const position = positions[state];
    if (!position) {
      continue;
    }

    const isStart = state === startState;
    const isAccept = accepts.has(state);
    const isDead = dead.has(state);
    const isHighlighted = highlighted.has(state);
    const { fill, stroke, text, strokeWidth, dashArray } = stateColors({
      isStart,
      isAccept,
      isDFA,
      isDead,
      isHighlighted,
    });
    const dashAttribute = dashArray ? ` stroke-dasharray="${dashArray}"` : '';
    const label = isDFA ? `D${state}` : `q${state}`;

    svg += `
  <circle cx="${position.x}" cy="${position.y}" r="${R}" fill="${fill}" stroke="${stroke}"
    stroke-width="${strokeWidth}"${dashAttribute} filter="url(#state-shadow)"/>`;

    if (isAccept) {
      svg += `
  <circle cx="${position.x}" cy="${position.y}" r="${R - 5}" fill="none" stroke="${stroke}"
    stroke-width="1.1" opacity="0.65"/>`;
    }

    svg += `
  <text x="${position.x}" y="${position.y}" text-anchor="middle" dominant-baseline="middle"
    fill="${text}" font-size="12" font-weight="700" font-family="JetBrains Mono,monospace">${label}</text>`;
  }

  svg += '\n</svg>';
  return svg;
}
