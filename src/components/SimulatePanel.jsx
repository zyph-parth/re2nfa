import { useState } from 'react';

const EPSILON = '\u03b5';
const EMPTY_GLYPH = '\u25b7';
const LEFT_QUOTE = '\u201c';
const RIGHT_QUOTE = '\u201d';

function generateTests(alphabet) {
  if (!alphabet.length) return [''];
  const tests = new Set(['']);
  for (const first of alphabet) {
    tests.add(first);
    for (const second of alphabet) {
      tests.add(first + second);
      tests.add(first + second + first);
      tests.add(first + first + second + second);
    }
  }
  tests.add(alphabet.join(''));
  return [...tests]
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
    .slice(0, 12);
}

export default function SimulatePanel({ dfa, onSimulate, simResult }) {
  const [input, setInput] = useState('');

  const test = () => onSimulate(input);
  const clear = () => {
    setInput('');
    onSimulate(null);
  };

  const quickTests = dfa ? generateTests(dfa.alphabet) : [];

  if (!dfa) {
    return (
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title-row">
            <div className="ph-title">
              <span className="ph-dot dot-green" />
              String Simulation
            </div>
            <div className="ph-sub">Test candidate strings against the minimal DFA</div>
          </div>
        </div>
        <div className="panel-body">
          <div className="empty">
            <div className="empty-glyph">{EMPTY_GLYPH}</div>
            <p>Convert a regex first to enable simulation.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title-row">
          <div className="ph-title">
            <span className="ph-dot dot-green" />
            String Simulation
          </div>
          <div className="ph-sub">Test candidate strings against the minimal DFA</div>
        </div>
      </div>

      <div className="panel-body">
        <div className="sim-body">
          <div className="sim-input-row">
            <input
              className="sim-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && test()}
              placeholder="Enter a string to test, e.g. abb"
              autoComplete="off"
              spellCheck={false}
              aria-label="String to simulate"
            />
            <button type="button" className="btn btn-primary" onClick={test}>
              Test String
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={clear}>
              Clear
            </button>
          </div>

          <div className="quick-tests">
            <span className="eg-label">Quick tests:</span>
            {quickTests.map((sample) => (
              <button
                key={sample}
                type="button"
                className="chip"
                onClick={() => {
                  setInput(sample);
                  onSimulate(sample);
                }}
              >
                {sample === '' ? `${EPSILON} (empty)` : sample}
              </button>
            ))}
          </div>

          {simResult && (
            <div
              className={`result-box ${simResult.accepted ? 'result-acc' : 'result-rej'}`}
              aria-live="polite"
            >
              <span className="result-badge">
                {simResult.accepted ? 'ACCEPTED' : 'REJECTED'}
              </span>
              <span>
                {LEFT_QUOTE}{input === '' ? `${EPSILON} (empty)` : input}{RIGHT_QUOTE}{' '}
                {simResult.accepted ? 'is in' : 'is not in'} the language.
              </span>
            </div>
          )}

          {simResult && (
            <div className="trace-box">
              <div className="trace-hdr">Execution Trace</div>
              {simResult.trace.map((step, index) => (
                <div
                  key={`${index}:${step}`}
                  className={`trace-step${index === simResult.trace.length - 1 ? ' is-final' : ''}`}
                >
                  <span className="trace-n">{index + 1}</span>
                  <span className="trace-text">{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
