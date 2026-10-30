import {DproMark} from './DproMark';
import { useEffect,useState } from 'react';
import type { ReactNode } from 'react';
import { useAppNavigation, useAppTheme } from './app-navigation';
import type { AppDestination } from './app-navigation';
/**
 * CHAT-BUILD-01 (CH11): signed out is one screen with one action. No sidebar,
 * no locked sections, no Settings and no footer: nothing private shows before
 * sign-in. About stays in the program menu (Girru › About Girru).
 */
export function PublicShell({ children, setup, notice, initialPage = 'home', blocking=false, accountStep=false }: { children: ReactNode; setup?: string; notice?: ReactNode; initialPage?: 'home' | 'account';blocking?:boolean;accountStep?:boolean }) {
  const [page, setPage] = useState<'home' | 'account'>(accountStep?'account':initialPage);
  useEffect(()=>{if(accountStep)setPage('account');},[accountStep]);
  const activePage=blocking?'account':page;
  const appearance = useAppTheme();
  // The program menu may ask for Settings while signed out: sign-in comes first.
  useAppNavigation((to: AppDestination) => setPage(to === 'home' ? 'home' : 'account'));
  return <div className="shell app-shell public-shell" data-theme={appearance.theme} lang="en" dir="ltr">
    <header className="titlebar" inert={blocking}><span className="sidebar-brand"><DproMark/>Girru</span></header>
    <main className="page-area public-content">{notice && <p role="status" className="page-notice">{notice}</p>}
      {activePage === 'home' ? <section className="public-welcome" aria-label="Welcome">
        <span className="public-mark" aria-hidden="true"><DproMark/></span>
        <h1>Welcome to Girru</h1>
        <p>Your agents and your work stay private until you sign in.</p>
        <button className="primary" onClick={() => setPage('account')}>{setup === 'required' ? 'Finish workspace setup' : 'Sign in'}</button>
        {setup === 'required' && <p className="fine-print">This workspace still needs its first owner.</p>}
        {setup === 'unavailable' && <p className="fine-print" role="status">Girru’s engine is not answering yet. Sign in works once it starts.</p>}
      </section>
      : <div className={`public-account${setup === 'required' ? ' first-run-account' : ''}`}>{!blocking&&setup!=='required'&&<button onClick={() => setPage('home')}>Back</button>}{children}</div>}
    </main>
  </div>;
}
