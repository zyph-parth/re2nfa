import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDFA,
  buildSubsetDFA,
  completeDFA,
  runDFA,
} from '../src/engine/automata.js';
import { regexToPostfix } from '../src/engine/parser.js';
import { buildNFA } from '../src/engine/thompson.js';

test('parser distinguishes infix union from postfix plus', () => {
  assert.deepEqual(
    regexToPostfix('a+b').map((token) => token.type),
    ['literal', 'literal', 'union'],
  );

  assert.deepEqual(
    regexToPostfix('a+').map((token) => token.type),
    ['literal', 'plus'],
  );
});

test('completeDFA adds a total dead state when transitions are missing', () => {
  const rawDfa = buildSubsetDFA(buildNFA('ab'));
  const complete = completeDFA(rawDfa);

  assert.notEqual(complete.deadState, null);

  for (const state of complete.states) {
    for (const symbol of complete.alphabet) {
      assert.ok(
        complete.transitions.some(
          (transition) => transition.from === state && transition.symbol === symbol,
        ),
      );
    }
  }
});

test('buildDFA preserves acceptance for a common sample regex', () => {
  const dfa = buildDFA(buildNFA('(a+b)*abb'));

  assert.equal(runDFA(dfa, '').accepted, false);
  assert.equal(runDFA(dfa, 'abb').accepted, true);
  assert.equal(runDFA(dfa, 'aabb').accepted, true);
  assert.equal(runDFA(dfa, 'ab').accepted, false);
  assert.equal(runDFA(dfa, 'abba').accepted, false);
});

test('epsilon regex accepts only the empty string', () => {
  const dfa = buildDFA(buildNFA('\u03b5'));

  assert.equal(runDFA(dfa, '').accepted, true);
  assert.equal(runDFA(dfa, 'a').accepted, false);
});
