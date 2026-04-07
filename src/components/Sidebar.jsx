const EPSILON = '\u03b5';
const RIGHT_ARROW = '\u2192';
const IDENTICAL_TO = '\u2261';
const TURNSTILE = '\u22a2';
const PLAY = '\u25b6';

const TABS = [
  {
    group: 'Automata',
    items: [
      { id: 'nfa', label: `${EPSILON}-NFA Graph`, icon: EPSILON, variant: 'v-nfa' },
      { id: 'dfa', label: 'DFA Graph', icon: RIGHT_ARROW, variant: 'v-dfa' },
    ],
  },
  {
    group: 'Tables',
    items: [
      { id: 'ntbl', label: 'NFA Table', icon: IDENTICAL_TO, variant: 'v-nfa' },
      { id: 'dtbl', label: 'DFA Table', icon: TURNSTILE, variant: 'v-dfa' },
    ],
  },
  {
    group: 'Tools',
    items: [
      { id: 'sim', label: 'Simulate', icon: PLAY, variant: 'v-sim' },
      { id: 'thy', label: 'Theory', icon: '?', variant: 'v-thy' },
    ],
  },
];

export default function Sidebar({ activeTab, onTabChange }) {
  return (
    <nav className="sidebar" aria-label="Views">
      {TABS.map((group, groupIndex) => (
        <div key={group.group} className="sb-section">
          {groupIndex > 0 && <div className="sb-divider" />}
          <div className="sb-label">{group.group}</div>
          {group.items.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`sb-btn${activeTab === tab.id ? ` act ${tab.variant}` : ''}`}
              onClick={() => onTabChange(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
            >
              <span className="sb-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );
}
