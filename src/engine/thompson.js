/**
 * thompson.js
 * Builds an ε-NFA from a postfix token array using Thompson's construction.
 *
 * Each NFA fragment is { start, accept } and all transitions are stored
 * in a flat array.
 */

import { EPSILON, EPSILON_LABEL, regexToPostfix } from './parser.js';

const TOKEN = {
  LITERAL: 'literal',
  UNION: 'union',
  CONCAT: 'concat',
  STAR: 'star',
  PLUS: 'plus',
  QUESTION: 'question',
};

let nextStateId = 0;

function fresh() {
  return nextStateId++;
}

function reset() {
  nextStateId = 0;
}

function fragmentSymbol(symbol, transitions) {
  const start = fresh();
  const accept = fresh();

  transitions.push({ from: start, symbol, to: accept });
  return { start, accept };
}

function fragmentConcat(left, right, transitions) {
  transitions.push({ from: left.accept, symbol: EPSILON_LABEL, to: right.start });
  return { start: left.start, accept: right.accept };
}

function fragmentUnion(left, right, transitions) {
  const start = fresh();
  const accept = fresh();

  transitions.push({ from: start, symbol: EPSILON_LABEL, to: left.start });
  transitions.push({ from: start, symbol: EPSILON_LABEL, to: right.start });
  transitions.push({ from: left.accept, symbol: EPSILON_LABEL, to: accept });
  transitions.push({ from: right.accept, symbol: EPSILON_LABEL, to: accept });

  return { start, accept };
}

function fragmentStar(fragment, transitions) {
  const start = fresh();
  const accept = fresh();

  transitions.push({ from: start, symbol: EPSILON_LABEL, to: fragment.start });
  transitions.push({ from: start, symbol: EPSILON_LABEL, to: accept });
  transitions.push({ from: fragment.accept, symbol: EPSILON_LABEL, to: fragment.start });
  transitions.push({ from: fragment.accept, symbol: EPSILON_LABEL, to: accept });

  return { start, accept };
}

function fragmentPlus(fragment, transitions) {
  const start = fresh();
  const accept = fresh();

  transitions.push({ from: start, symbol: EPSILON_LABEL, to: fragment.start });
  transitions.push({ from: fragment.accept, symbol: EPSILON_LABEL, to: fragment.start });
  transitions.push({ from: fragment.accept, symbol: EPSILON_LABEL, to: accept });

  return { start, accept };
}

function fragmentQuestion(fragment, transitions) {
  const start = fresh();
  const accept = fresh();

  transitions.push({ from: start, symbol: EPSILON_LABEL, to: fragment.start });
  transitions.push({ from: start, symbol: EPSILON_LABEL, to: accept });
  transitions.push({ from: fragment.accept, symbol: EPSILON_LABEL, to: accept });

  return { start, accept };
}

export function buildNFA(regex) {
  reset();

  const postfix = regexToPostfix(regex);
  const transitions = [];
  const stack = [];

  function pop() {
    if (!stack.length) {
      throw new Error('Invalid expression: missing operand');
    }
    return stack.pop();
  }

  for (const token of postfix) {
    switch (token.type) {
      case TOKEN.CONCAT: {
        const right = pop();
        const left = pop();
        stack.push(fragmentConcat(left, right, transitions));
        break;
      }
      case TOKEN.UNION: {
        const right = pop();
        const left = pop();
        stack.push(fragmentUnion(left, right, transitions));
        break;
      }
      case TOKEN.STAR:
        stack.push(fragmentStar(pop(), transitions));
        break;
      case TOKEN.PLUS:
        stack.push(fragmentPlus(pop(), transitions));
        break;
      case TOKEN.QUESTION:
        stack.push(fragmentQuestion(pop(), transitions));
        break;
      case TOKEN.LITERAL: {
        const label = token.value === EPSILON ? EPSILON_LABEL : token.value;
        stack.push(fragmentSymbol(label, transitions));
        break;
      }
      default:
        throw new Error(`Unsupported postfix token type: ${token.type}`);
    }
  }

  if (stack.length !== 1) {
    throw new Error('Invalid expression: operator/operand mismatch');
  }

  const { start, accept } = stack[0];
  const stateSet = new Set([start, accept]);

  for (const transition of transitions) {
    stateSet.add(transition.from);
    stateSet.add(transition.to);
  }

  return {
    states: [...stateSet].sort((a, b) => a - b),
    start,
    accept,
    transitions,
  };
}
