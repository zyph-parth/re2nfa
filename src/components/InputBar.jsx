import { useState } from 'react';

const EPSILON = '\u03b5';
const CHEVRON_UP = '\u25b2';
const CHEVRON_DOWN = '\u25bc';
const WARNING = '\u26a0';

const EXAMPLES = [
  '(a+b)*abb',
  'a(b+c)*',
  '(ab+ba)*',
  'a*b*',
  '(a+b)(c+d)',
  'ab*c',
  'a?(b+c)*',
  `(a+${EPSILON})b`,
];

export default function InputBar({
  regex,
  result,
  error,
  onRegexChange,
  onConvert,
  onClear,
  onExample,
}) {
  const [showSyntax, setShowSyntax] = useState(false);

  const handleKey = (e) => {
    if (e.key === 'Enter') onConvert();
  };

  const nfa = result?.nfa;
  const dfa = result?.dfa;

  return (
    <div className="input-bar">
      <div className="input-row">
        <div className="input-wrap">
          <input
            id="regexInput"
            className={`regex-input${error ? ' is-error' : ''}`}
            type="text"
            value={regex}
            onChange={(e) => onRegexChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a regular expression, e.g. (a+b)*abb"
            autoComplete="off"
            spellCheck={false}
            aria-label="Regular expression input"
            aria-invalid={Boolean(error)}
          />
        </div>
        <button type="button" className="btn btn-primary" onClick={onConvert}>
          Convert
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClear}>
          Clear
        </button>
        <button
          type="button"
          className="syntax-toggle"
          onClick={() => setShowSyntax((value) => !value)}
          aria-expanded={showSyntax}
        >
          {showSyntax ? CHEVRON_UP : CHEVRON_DOWN} syntax
        </button>
      </div>

      {showSyntax && (
        <div className="syntax-guide" role="note">
          <span className="sg-item"><code>a+b</code> or <code>a|b</code> - union</span>
          <span className="sg-item"><code>r*</code> - Kleene star (0 or more)</span>
          <span className="sg-item"><code>r+</code> - one or more</span>
          <span className="sg-item"><code>r?</code> - optional (0 or 1)</span>
          <span className="sg-item"><code>\+</code> - literal plus sign</span>
          <span className="sg-item"><code>{EPSILON}</code> - empty string</span>
        </div>
      )}

      <div className="examples-row">
        <span className="eg-label">Examples:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className="chip"
            onClick={() => onExample(example)}
          >
            {example}
          </button>
        ))}
      </div>

      {error && (
        <div className="err-msg" role="alert">
          {WARNING} {error}
        </div>
      )}

      {result && !error && (
        <div className="stats-row">
          <div className="stat">
            <span className="stat-key">Regex</span>
            <span className="stat-val">{regex}</span>
          </div>
          <div className="stat">
            <span className="stat-key">{EPSILON}-NFA states</span>
            <span className="stat-val nv">{nfa?.states.length}</span>
          </div>
          <div className="stat">
            <span className="stat-key">{EPSILON}-NFA transitions</span>
            <span className="stat-val nv">{nfa?.transitions.length}</span>
          </div>
          <div className="stat">
            <span className="stat-key">DFA states</span>
            <span className="stat-val dv">{dfa?.states.length}</span>
          </div>
          <div className="stat">
            <span className="stat-key">Alphabet</span>
            <span className="stat-val dv">
              {dfa?.alphabet.length ? `{ ${dfa.alphabet.join(', ')} }` : '{ }'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
