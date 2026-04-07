/**
 * Compute layered positions for each state so the SVG renderer can draw them.
 *
 * NFA -> BFS-layered layout
 * DFA -> BFS-layered layout, with the dead state pushed to the far right
 */

const R = 30;
const H_GAP = 176;
const V_GAP = 110;
const PAD_X = 108;
const PAD_Y = 84;

function bfsLayers(states, startState, transitions) {
  const layer = new Map();
  const queue = [[startState, 0]];
  const visited = new Set([startState]);

  layer.set(startState, 0);

  while (queue.length) {
    const [state, depth] = queue.shift();

    for (const transition of transitions) {
      if (transition.from === state && !visited.has(transition.to)) {
        visited.add(transition.to);
        layer.set(transition.to, depth + 1);
        queue.push([transition.to, depth + 1]);
      }
    }
  }

  let maxLayer = Math.max(0, ...layer.values());
  for (const state of states) {
    if (!layer.has(state)) {
      maxLayer += 1;
      layer.set(state, maxLayer);
    }
  }

  const groups = new Map();
  for (const [state, depth] of layer) {
    if (!groups.has(depth)) {
      groups.set(depth, []);
    }

    groups.get(depth).push(state);
  }

  for (const group of groups.values()) {
    group.sort((left, right) => left - right);
  }

  return groups;
}

function layoutFromGroups(groups) {
  const layerNumbers = [...groups.keys()].sort((left, right) => left - right);
  const maxGroupSize = Math.max(...[...groups.values()].map((group) => group.length), 1);
  const positions = {};

  for (const layerNumber of layerNumbers) {
    const group = groups.get(layerNumber);
    const x = PAD_X + layerNumber * H_GAP;
    const yStart = PAD_Y + ((maxGroupSize - group.length) * V_GAP) / 2;

    group.forEach((state, index) => {
      positions[state] = { x, y: yStart + index * V_GAP };
    });
  }

  const maxX = Math.max(...Object.values(positions).map((position) => position.x), PAD_X) + PAD_X;
  const maxY = Math.max(...Object.values(positions).map((position) => position.y), PAD_Y) + PAD_Y;

  return {
    positions,
    width: Math.max(maxX, 480),
    height: Math.max(maxY, 280),
    R,
  };
}

export function layoutLayered(states, startState, transitions) {
  return layoutFromGroups(bfsLayers(states, startState, transitions));
}

export function layoutNFA(nfa) {
  return layoutLayered(nfa.states, nfa.start, nfa.transitions);
}

export function layoutDFA(dfa) {
  const nonDeadStates = dfa.deadState == null
    ? dfa.states
    : dfa.states.filter((state) => state !== dfa.deadState);

  const usefulTransitions = dfa.transitions.filter((transition) => {
    if (transition.from === transition.to) {
      return false;
    }

    if (dfa.deadState == null) {
      return true;
    }

    return transition.from !== dfa.deadState && transition.to !== dfa.deadState;
  });

  const layout = layoutLayered(nonDeadStates, dfa.start, usefulTransitions);

  if (dfa.deadState == null) {
    return layout;
  }

  const xs = Object.values(layout.positions).map((position) => position.x);
  const ys = Object.values(layout.positions).map((position) => position.y);
  const deadX = (xs.length ? Math.max(...xs) : PAD_X) + H_GAP;
  const deadY = (ys.length ? Math.max(...ys) : PAD_Y) + V_GAP / 2;

  return {
    ...layout,
    positions: {
      ...layout.positions,
      [dfa.deadState]: { x: deadX, y: deadY },
    },
    width: Math.max(layout.width, deadX + PAD_X),
    height: Math.max(layout.height, deadY + PAD_Y),
  };
}
