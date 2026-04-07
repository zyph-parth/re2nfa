export default function Header() {
  return (
    <header className="hdr">
      <div className="hdr-logo">
        <div className="hdr-icon">RE</div>
        <span className="hdr-wordmark">Automata Workbench</span>
      </div>

      <div className="hdr-sep" />
      <span className="hdr-pill">RE {'\u2192'} {'\u03b5'}-NFA {'\u2192'} Min DFA</span>

      <div className="hdr-right">
        <span className="hdr-tag">Regular Language Toolkit</span>
      </div>
    </header>
  );
}
