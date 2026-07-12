import { useRoute, hrefFor, type RouteId } from './router';
import { useStore } from './store';
import { LedgerScreen } from './screens/LedgerScreen';
import { LogScreen } from './screens/LogScreen';
import { HandsScreen } from './screens/HandsScreen';
import { StatsScreen } from './screens/StatsScreen';
import { EquityScreen } from './screens/EquityScreen';
import { DataScreen } from './screens/DataScreen';

const NAV: { id: RouteId; label: string; mark: string }[] = [
  { id: 'ledger', label: 'Ledger', mark: '§' },
  { id: 'log', label: 'Log', mark: '✎' },
  { id: 'hands', label: 'Hands', mark: '♠' },
  { id: 'stats', label: 'Leaks', mark: '♦' },
  { id: 'equity', label: 'Equity', mark: '%' },
  { id: 'data', label: 'Data', mark: '⇅' },
];

export default function App() {
  const route = useRoute();
  const store = useStore();

  return (
    <div className="app">
      <header className="masthead">
        <div className="brand">
          Felt<span className="suit">♦</span>Notes
        </div>
        <div className="tagline">hand logging · session ledger · leak report — all on your device</div>
      </header>

      <main>
        {!store.ready ? (
          <p className="dim" role="status">
            Opening your ledger…
          </p>
        ) : store.loadError ? (
          <div className="panel" role="alert">
            <h3 className="loss-text">Storage unavailable</h3>
            <p>
              Felt Notes couldn't open local storage ({store.loadError}). This can happen in private
              browsing. Data can't be saved in this window.
            </p>
          </div>
        ) : (
          <>
            {route.id === 'ledger' && <LedgerScreen />}
            {route.id === 'log' && <LogScreen />}
            {route.id === 'hands' && <HandsScreen />}
            {route.id === 'stats' && <StatsScreen />}
            {route.id === 'equity' && <EquityScreen />}
            {route.id === 'data' && <DataScreen />}
          </>
        )}
      </main>

      <nav className="nav" aria-label="Main">
        <ul>
          {NAV.map((item) => (
            <li key={item.id}>
              <a href={hrefFor(item.id)} aria-current={route.id === item.id ? 'page' : undefined}>
                <span className="mark" aria-hidden="true">
                  {item.mark}
                </span>
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
