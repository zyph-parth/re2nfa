const EPSILON = '\u03b5';
const EM_DASH = '\u2014';
const RIGHT_ARROW = '\u2192';
const EMPTY_SET = '\u2205';
const EMPTY_GLYPH = '\u2261';

export default function TablePanel({ dot, title, subtitle, nfa, dfa }) {
  const empty = (
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
      <div className="panel-body">
        <div className="empty">
          <div className="empty-glyph">{EMPTY_GLYPH}</div>
          <p>Convert a regex to see the transition table.</p>
        </div>
      </div>
    </div>
  );

  if (nfa) return <NFATable dot={dot} title={title} subtitle={subtitle} nfa={nfa} />;
  if (dfa) return <DFATable dot={dot} title={title} subtitle={subtitle} dfa={dfa} />;
  return empty;
}

function stateType(isStart, isAccept) {
  if (isStart && isAccept) return { label: `${RIGHT_ARROW} *`, cls: 'cell-both' };
  if (isStart) return { label: RIGHT_ARROW, cls: 'cell-start' };
  if (isAccept) return { label: '*', cls: 'cell-accept' };
  return { label: '', cls: 'cell-state' };
}

function NFATable({ dot, title, subtitle, nfa }) {
  const symbols = [...new Set(nfa.transitions.map((transition) => transition.symbol))].sort((a, b) => {
    if (a === EPSILON) return 1;
    if (b === EPSILON) return -1;
    return a.localeCompare(b);
  });

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

      <div className="panel-body tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>State</th>
              <th>Type</th>
              {symbols.map((symbol) => (
                <th key={symbol}>{symbol === EPSILON ? `${EPSILON} (epsilon)` : symbol}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nfa.states.map((state) => {
              const { label, cls } = stateType(state === nfa.start, state === nfa.accept);
              return (
                <tr key={state}>
                  <td className="cell-q">q{state}</td>
                  <td className={cls}>{label}</td>
                  {symbols.map((symbol) => {
                    const targets = [
                      ...new Set(
                        nfa.transitions
                          .filter((transition) => transition.from === state && transition.symbol === symbol)
                          .map((transition) => `q${transition.to}`),
                      ),
                    ].sort();
                    return (
                      <td key={symbol} className={targets.length ? '' : 'cell-empty'}>
                        {targets.length ? targets.join(', ') : EM_DASH}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DFATable({ dot, title, subtitle, dfa }) {
  const {
    states,
    start,
    acceptStates,
    transitions,
    alphabet,
    stateLabels,
    stateDetails,
    deadState,
  } = dfa;

  const lookup = new Map();
  for (const transition of transitions) {
    lookup.set(`${transition.from}-${transition.symbol}`, transition.to);
  }

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

      <div className="panel-body tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>State</th>
              <th>Type</th>
              <th>Label</th>
              <th>NFA Subset</th>
              {alphabet.map((symbol) => <th key={symbol}>{symbol}</th>)}
            </tr>
          </thead>
          <tbody>
            {states.map((state) => {
              const isDead = state === deadState;
              const { label, cls } = stateType(state === start, acceptStates.has(state));
              return (
                <tr key={state}>
                  <td className={isDead ? 'cell-dead-q' : 'cell-d'}>D{state}</td>
                  <td className={cls}>{label}</td>
                  <td className="cell-d">{stateLabels?.get(state)}</td>
                  <td className="cell-detail" title={stateDetails?.get(state)}>
                    {stateDetails?.get(state)}
                  </td>
                  {alphabet.map((symbol) => {
                    const next = lookup.get(`${state}-${symbol}`);
                    const isToDeadOrMissing = next === undefined || next === deadState;
                    return (
                      <td key={symbol} className={isToDeadOrMissing ? 'cell-empty' : 'cell-d'}>
                        {next !== undefined ? `D${next}` : EMPTY_SET}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
