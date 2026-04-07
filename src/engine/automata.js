/**
 * automata.js
 * - epsilonClosure: compute the epsilon-closure of a set of NFA states
 * - move: compute reachable states on a symbol
 * - buildSubsetDFA: raw subset construction (epsilon-NFA -> DFA)
 * - completeDFA: add an explicit dead state so the DFA is total
 * - minimizeDFA: merge equivalent DFA states
 * - buildDFA: subset construction + completion + minimization
 * - runDFA: simulate a string on the DFA, returning an execution trace
 */

import { EPSILON_LABEL } from './parser.js';

const EMPTY_SET = '\u2205';

export function epsilonClosure(stateArr, transitions) {
  const closure = new Set(stateArr);
  const stack = [...stateArr];

  while (stack.length) {
    const state = stack.pop();

    for (const transition of transitions) {
      if (
        transition.from === state &&
        transition.symbol === EPSILON_LABEL &&
        !closure.has(transition.to)
      ) {
        closure.add(transition.to);
        stack.push(transition.to);
      }
    }
  }

  return [...closure].sort((a, b) => a - b);
}

export function move(stateArr, symbol, transitions) {
  const result = new Set();

  for (const state of stateArr) {
    for (const transition of transitions) {
      if (transition.from === state && transition.symbol === symbol) {
        result.add(transition.to);
      }
    }
  }

  return [...result].sort((a, b) => a - b);
}

function buildLookup(transitions) {
  const lookup = new Map();

  for (const transition of transitions) {
    lookup.set(`${transition.from}\x01${transition.symbol}`, transition.to);
  }

  return lookup;
}

function sortTransitions(transitions) {
  return [...transitions].sort((left, right) => {
    if (left.from !== right.from) {
      return left.from - right.from;
    }
    if (left.symbol !== right.symbol) {
      return left.symbol.localeCompare(right.symbol);
    }
    return left.to - right.to;
  });
}

function formatSubsetLabel(stateIds, deadState) {
  if (!stateIds.length || (stateIds.length === 1 && stateIds[0] === deadState)) {
    return EMPTY_SET;
  }

  if (stateIds.length === 1) {
    return `D${stateIds[0]}`;
  }

  return `{${stateIds.map((stateId) => `D${stateId}`).join(',')}}`;
}

function formatSubsetDetails(stateIds, rawLabels, deadState) {
  if (!stateIds.length || (stateIds.length === 1 && stateIds[0] === deadState)) {
    return 'Dead state (rejecting sink)';
  }

  return stateIds
    .map((stateId) => `D${stateId}: ${rawLabels.get(stateId) ?? EMPTY_SET}`)
    .join(' | ');
}

function isDeadBlock(block, acceptStates, blockTransitions, blockIndex) {
  if (block.some((state) => acceptStates.has(state))) {
    return false;
  }

  return [...blockTransitions.get(blockIndex).values()].every((target) => target === blockIndex);
}

export function buildSubsetDFA(nfa) {
  const alphabet = [
    ...new Set(
      nfa.transitions
        .map((transition) => transition.symbol)
        .filter((symbol) => symbol !== EPSILON_LABEL),
    ),
  ].sort();

  const startSet = epsilonClosure([nfa.start], nfa.transitions);
  const startKey = startSet.join(',');

  const dfaMap = new Map();
  const queue = [startSet];
  let nextId = 0;

  dfaMap.set(startKey, { id: nextId++, nfaStates: startSet });

  const transitions = [];

  while (queue.length) {
    const current = queue.shift();
    const currentKey = current.join(',');
    const currentId = dfaMap.get(currentKey).id;

    for (const symbol of alphabet) {
      const moved = move(current, symbol, nfa.transitions);
      if (!moved.length) {
        continue;
      }

      const closed = epsilonClosure(moved, nfa.transitions);
      const closedKey = closed.join(',');

      if (!dfaMap.has(closedKey)) {
        dfaMap.set(closedKey, { id: nextId++, nfaStates: closed });
        queue.push(closed);
      }

      transitions.push({ from: currentId, symbol, to: dfaMap.get(closedKey).id });
    }
  }

  const acceptStates = new Set();
  const rawStateLabels = new Map();
  const memberStates = new Map();

  for (const [, { id, nfaStates }] of dfaMap) {
    if (nfaStates.includes(nfa.accept)) {
      acceptStates.add(id);
    }
    rawStateLabels.set(id, `{${nfaStates.map((state) => `q${state}`).join(',')}}`);
    memberStates.set(id, [id]);
  }

  const states = [...dfaMap.values()].map((value) => value.id).sort((a, b) => a - b);

  return {
    states,
    start: dfaMap.get(startKey).id,
    acceptStates,
    transitions: sortTransitions(transitions),
    alphabet,
    stateLabels: new Map(states.map((state) => [state, `D${state}`])),
    stateDetails: new Map(states.map((state) => [state, rawStateLabels.get(state)])),
    rawStateLabels,
    memberStates,
    complete: false,
    minimized: false,
    deadState: null,
  };
}

export function completeDFA(dfa) {
  const states = [...dfa.states];
  const transitions = [...dfa.transitions];
  const lookup = buildLookup(transitions);
  const stateLabels = new Map(dfa.stateLabels);
  const stateDetails = new Map(dfa.stateDetails);
  const rawStateLabels = new Map(dfa.rawStateLabels);
  const memberStates = new Map(dfa.memberStates);

  let deadState = dfa.deadState;
  let nextId = states.length ? Math.max(...states) + 1 : 0;

  for (const state of dfa.states) {
    for (const symbol of dfa.alphabet) {
      const key = `${state}\x01${symbol}`;
      if (lookup.has(key)) {
        continue;
      }

      if (deadState == null) {
        deadState = nextId++;
        states.push(deadState);
        stateLabels.set(deadState, EMPTY_SET);
        stateDetails.set(deadState, 'Dead state (rejecting sink)');
        rawStateLabels.set(deadState, EMPTY_SET);
        memberStates.set(deadState, [deadState]);
      }

      transitions.push({ from: state, symbol, to: deadState });
      lookup.set(key, deadState);
    }
  }

  if (deadState != null) {
    for (const symbol of dfa.alphabet) {
      const key = `${deadState}\x01${symbol}`;
      if (lookup.has(key)) {
        continue;
      }

      transitions.push({ from: deadState, symbol, to: deadState });
      lookup.set(key, deadState);
    }
  }

  return {
    ...dfa,
    states: states.sort((a, b) => a - b),
    transitions: sortTransitions(transitions),
    stateLabels,
    stateDetails,
    rawStateLabels,
    memberStates,
    complete: true,
    deadState,
  };
}

export function minimizeDFA(dfa) {
  if (!dfa.states.length) {
    return dfa;
  }

  let partitions = [
    new Set(dfa.states.filter((state) => dfa.acceptStates.has(state))),
    new Set(dfa.states.filter((state) => !dfa.acceptStates.has(state))),
  ].filter((partition) => partition.size > 0);

  const lookup = buildLookup(dfa.transitions);

  while (true) {
    const blockOfState = new Map();
    partitions.forEach((partition, index) => {
      for (const state of partition) {
        blockOfState.set(state, index);
      }
    });

    let changed = false;
    const nextPartitions = [];

    for (const partition of partitions) {
      const groups = new Map();

      for (const state of partition) {
        const signature = dfa.alphabet
          .map((symbol) => blockOfState.get(lookup.get(`${state}\x01${symbol}`)))
          .join('|');

        if (!groups.has(signature)) {
          groups.set(signature, new Set());
        }
        groups.get(signature).add(state);
      }

      nextPartitions.push(...groups.values());
      if (groups.size > 1) {
        changed = true;
      }
    }

    partitions = nextPartitions;
    if (!changed) {
      break;
    }
  }

  const blockOfState = new Map();
  partitions.forEach((partition, index) => {
    for (const state of partition) {
      blockOfState.set(state, index);
    }
  });

  const blockTransitions = new Map();
  partitions.forEach((partition, index) => {
    const representative = [...partition][0];
    const transitionMap = new Map();

    for (const symbol of dfa.alphabet) {
      transitionMap.set(symbol, blockOfState.get(lookup.get(`${representative}\x01${symbol}`)));
    }

    blockTransitions.set(index, transitionMap);
  });

  const startBlock = blockOfState.get(dfa.start);
  const deadBlock = partitions.findIndex((partition, index) =>
    isDeadBlock([...partition], dfa.acceptStates, blockTransitions, index),
  );

  const orderedBlocks = [];
  const orderedBlockSet = new Set();
  const visitedBlocks = new Set([startBlock]);
  const queue = [startBlock];

  while (queue.length) {
    const block = queue.shift();
    if (block === deadBlock) {
      continue;
    }

    if (!orderedBlockSet.has(block)) {
      orderedBlocks.push(block);
      orderedBlockSet.add(block);
    }

    for (const symbol of dfa.alphabet) {
      const target = blockTransitions.get(block).get(symbol);
      if (target == null || visitedBlocks.has(target)) {
        continue;
      }
      visitedBlocks.add(target);
      queue.push(target);
    }
  }

  if (deadBlock !== -1 && !orderedBlockSet.has(deadBlock)) {
    orderedBlocks.push(deadBlock);
    orderedBlockSet.add(deadBlock);
  }

  for (let index = 0; index < partitions.length; index += 1) {
    if (!orderedBlockSet.has(index)) {
      orderedBlocks.push(index);
      orderedBlockSet.add(index);
    }
  }

  const newIdOfBlock = new Map(orderedBlocks.map((block, index) => [block, index]));
  const acceptStates = new Set();
  const memberStates = new Map();
  const stateLabels = new Map();
  const stateDetails = new Map();

  for (const block of orderedBlocks) {
    const newId = newIdOfBlock.get(block);
    const members = [...partitions[block]].sort((a, b) => a - b);

    memberStates.set(newId, members);
    stateLabels.set(newId, formatSubsetLabel(members, dfa.deadState));
    stateDetails.set(newId, formatSubsetDetails(members, dfa.rawStateLabels, dfa.deadState));

    if (members.some((state) => dfa.acceptStates.has(state))) {
      acceptStates.add(newId);
    }
  }

  const transitions = [];

  for (const block of orderedBlocks) {
    const from = newIdOfBlock.get(block);
    for (const symbol of dfa.alphabet) {
      const to = newIdOfBlock.get(blockTransitions.get(block).get(symbol));
      transitions.push({ from, symbol, to });
    }
  }

  return {
    states: orderedBlocks.map((block) => newIdOfBlock.get(block)),
    start: newIdOfBlock.get(startBlock),
    acceptStates,
    transitions: sortTransitions(transitions),
    alphabet: [...dfa.alphabet],
    stateLabels,
    stateDetails,
    rawStateLabels: new Map(dfa.rawStateLabels),
    memberStates,
    complete: true,
    minimized: true,
    deadState: deadBlock === -1 ? null : newIdOfBlock.get(deadBlock),
  };
}

export function buildDFA(nfa) {
  return minimizeDFA(completeDFA(buildSubsetDFA(nfa)));
}

export function runDFA(dfa, input) {
  const source = typeof input === 'string' ? input : '';
  const lookup = buildLookup(dfa.transitions);
  let current = dfa.start;
  const trace = [`Start at D${current}`];

  if (source === '') {
    const accepted = dfa.acceptStates.has(current);
    trace.push(`Input is ${EPSILON_LABEL} (empty) -> ${accepted ? 'ACCEPT' : 'REJECT'}`);
    return { accepted, trace };
  }

  for (const ch of source) {
    const next = lookup.get(`${current}\x01${ch}`);

    if (next === undefined) {
      trace.push(`Read '${ch}' from D${current} -> no transition -> dead state`);
      return { accepted: false, trace };
    }

    trace.push(
      next === dfa.deadState
        ? `Read '${ch}': D${current} --${ch}--> D${next} (dead state)`
        : `Read '${ch}': D${current} --${ch}--> D${next}`,
    );
    current = next;
  }

  const accepted = dfa.acceptStates.has(current);
  trace.push(
    accepted
      ? `End of input at D${current} -> ACCEPTED`
      : `End of input at D${current} -> REJECTED`,
  );

  return { accepted, trace };
}
