const EPSILON = '\u03b5';
const CONCAT = '\u00b7';

const STEPS = [
  {
    n: 1,
    title: 'Parse the regular expression',
    body: (
      <>
        The expression is <strong>tokenized</strong> and transformed into{' '}
        <strong>postfix (RPN)</strong> with the <em>Shunting-Yard algorithm</em>. An
        explicit concatenation operator <code>{CONCAT}</code> is inserted between
        adjacent atoms. Whitespace is ignored, <code>\x</code> escapes the next character
        as a literal, and <code>{EPSILON}</code> denotes the empty string unless escaped.
        Operator precedence: postfix <code>*</code> <code>+</code> <code>?</code>, then
        concatenation <code>{CONCAT}</code>, then infix alternation <code>+</code>{' '}
        <code>|</code>.
      </>
    ),
  },
  {
    n: 2,
    title: `Thompson construction (regex to ${EPSILON}-NFA)`,
    body: (
      <>
        Each postfix token builds a small NFA fragment <code>{'{ start, accept }'}</code>:
        <ul>
          <li>
            <code>a</code> - single labeled transition between two fresh states.
          </li>
          <li>
            <code>r+s</code> or <code>r|s</code> - alternation with new start/accept
            states plus {EPSILON}-branches to each operand.
          </li>
          <li>
            <code>rs</code> - concatenation: link accept(r) to start(s) via {EPSILON}.
          </li>
          <li>
            <code>r*</code> - Kleene star: {EPSILON}-bypass and {EPSILON}-loop-back for
            zero or more repetitions.
          </li>
          <li>
            <code>r+</code> - one-or-more: loop-back without bypass.
          </li>
          <li>
            <code>r?</code> - optional: {EPSILON}-bypass, no loop.
          </li>
        </ul>
        The result is one {EPSILON}-NFA with exactly one start state and one accept state.
      </>
    ),
  },
  {
    n: 3,
    title: `${EPSILON}-closure computation`,
    body: (
      <>
        <strong>{EPSILON}-closure(S)</strong> is the set of all NFA states reachable
        from state set <code>S</code> using only {EPSILON}-transitions (including the
        states already in <code>S</code>). Computed via BFS/DFS. Used in both subset
        construction and simulation.
      </>
    ),
  },
  {
    n: 4,
    title: 'Subset construction, completion, and minimization',
    body: (
      <>
        Each raw <strong>DFA state starts as a set of NFA states</strong>.
        <ol>
          <li>
            DFA start = <code>{`${EPSILON}-closure({ nfa_start })`}</code>.
          </li>
          <li>
            For each unprocessed DFA state <code>S</code> and symbol <code>a</code>:
            compute <code>{`${EPSILON}-closure(move(S, a))`}</code>.
          </li>
          <li>Repeat until no new subset states are discovered.</li>
          <li>Add an explicit dead state so the DFA is total.</li>
          <li>
            Partition refinement merges equivalent states, producing the minimal DFA
            shown in the graph and table.
          </li>
        </ol>
        A DFA state is accepting if any NFA accept state appears in its NFA subset.
      </>
    ),
  },
  {
    n: 5,
    title: 'String simulation on DFA',
    body: (
      <>
        Simulation starts at the DFA start state and consumes input one symbol at a
        time. A missing transition or entry into the dead state causes immediate
        rejection. After the last symbol,{' '}
        <strong>
          the string is accepted if and only if the current state is an accept state
        </strong>
        .
      </>
    ),
  },
  {
    n: 6,
    title: 'Why it works',
    body: (
      <>
        Regular expressions, {EPSILON}-NFAs, and DFAs all describe exactly the class of{' '}
        <em>regular languages</em>. Thompson construction converts regex to {EPSILON}-NFA,
        subset construction converts {EPSILON}-NFA to DFA, and minimization preserves the
        recognized language while reducing the state count.
      </>
    ),
  },
];

export default function TheoryPanel() {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title-row">
          <div className="ph-title">
            <span className="ph-dot dot-purple" />
            How It Works
          </div>
          <div className="ph-sub">
            The construction pipeline behind every view in this workbench
          </div>
        </div>
      </div>

      <div className="panel-body" style={{ overflow: 'auto' }}>
        <div className="theory-body">
          {STEPS.map((step) => (
            <div key={step.n} className="step-item">
              <div className="step-num">{step.n}</div>
              <div className="step-content">
                <h3 className="step-title">{step.title}</h3>
                <div className="step-desc">{step.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
