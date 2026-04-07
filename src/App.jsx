import { useCallback, useState } from 'react';
import { buildDFA, runDFA } from './engine/automata.js';
import { layoutDFA, layoutNFA } from './engine/layout.js';
import { renderSVG } from './engine/svg.js';
import { buildNFA } from './engine/thompson.js';

import Header from './components/Header.jsx';
import InputBar from './components/InputBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import GraphPanel from './components/GraphPanel.jsx';
import TablePanel from './components/TablePanel.jsx';
import SimulatePanel from './components/SimulatePanel.jsx';
import TheoryPanel from './components/TheoryPanel.jsx';

const DEFAULT_REGEX = '(a+b)*abb';
const EPSILON = '\u03b5';

function buildArtifacts(source) {
  const nfa = buildNFA(source);
  const dfa = buildDFA(nfa);
  const nfaLayout = layoutNFA(nfa);
  const dfaLayout = layoutDFA(dfa);
  const nfaSvg = renderSVG({
    states: nfa.states,
    startState: nfa.start,
    acceptStates: new Set([nfa.accept]),
    transitions: nfa.transitions,
    layout: nfaLayout,
    isDFA: false,
  });
  const dfaSvg = renderSVG({
    states: dfa.states,
    startState: dfa.start,
    acceptStates: dfa.acceptStates,
    transitions: dfa.transitions,
    layout: dfaLayout,
    isDFA: true,
    deadStates: dfa.deadState == null ? [] : [dfa.deadState],
  });

  return { nfa, dfa, nfaSvg, dfaSvg };
}

export default function App() {
  const [regex, setRegex] = useState(DEFAULT_REGEX);
  const [result, setResult] = useState(() => buildArtifacts(DEFAULT_REGEX));
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('nfa');
  const [simResult, setSimResult] = useState(null);

  const convert = useCallback(
    (nextRegex) => {
      const source = nextRegex ?? regex;
      setError('');
      setSimResult(null);
      try {
        setResult(buildArtifacts(source));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to convert the expression');
        setResult(null);
      }
    },
    [regex],
  );

  const simulate = useCallback(
    (input) => {
      if (!result) return;
      setSimResult(input == null ? null : runDFA(result.dfa, input));
    },
    [result],
  );

  const loadExample = useCallback(
    (example) => {
      setRegex(example);
      setError('');
      setSimResult(null);
      convert(example);
    },
    [convert],
  );

  const handleRegexChange = useCallback((value) => {
    setRegex(value);
    setError('');
    setResult(null);
    setSimResult(null);
  }, []);

  const handleClear = useCallback(() => {
    setRegex('');
    setError('');
    setResult(null);
    setSimResult(null);
  }, []);

  const renderPanel = () => {
    if (activeTab === 'nfa') {
      return (
        <GraphPanel
          key={result ? `nfa:${regex}` : 'nfa:empty'}
          dot="dot-amber"
          title={`${EPSILON}-NFA Graph`}
          subtitle="Thompson construction - one start state, one accept state"
          svgContent={result?.nfaSvg}
          legendType="nfa"
        />
      );
    }
    if (activeTab === 'dfa') {
      return (
        <GraphPanel
          key={result ? `dfa:${regex}` : 'dfa:empty'}
          dot="dot-blue"
          title="Minimal DFA Graph"
          subtitle="Subset construction + minimization"
          svgContent={result?.dfaSvg}
          legendType="dfa"
        />
      );
    }
    if (activeTab === 'ntbl') {
      return (
        <TablePanel
          dot="dot-amber"
          title={`${EPSILON}-NFA Transition Table`}
          subtitle={`All states and ${EPSILON}-transitions from Thompson construction`}
          nfa={result?.nfa}
          dfa={null}
        />
      );
    }
    if (activeTab === 'dtbl') {
      return (
        <TablePanel
          dot="dot-blue"
          title="Minimal DFA Transition Table"
          subtitle="Complete, minimized DFA used for simulation"
          nfa={null}
          dfa={result?.dfa}
        />
      );
    }
    if (activeTab === 'sim') {
      return (
        <SimulatePanel
          key={result ? regex : 'empty'}
          dfa={result?.dfa}
          onSimulate={simulate}
          simResult={simResult}
        />
      );
    }
    if (activeTab === 'thy') {
      return <TheoryPanel />;
    }
    return null;
  };

  return (
    <div className="app">
      <Header />
      <div className="workspace">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="main">
          <InputBar
            regex={regex}
            result={result}
            error={error}
            onRegexChange={handleRegexChange}
            onConvert={() => convert()}
            onClear={handleClear}
            onExample={loadExample}
          />
          <div key={activeTab} className="panel fade-in">
            {renderPanel()}
          </div>
        </main>
      </div>
    </div>
  );
}
