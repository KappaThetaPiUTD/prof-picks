import React from 'react';
import { createRoot } from 'react-dom/client';
import ProfPicksChat from './ProfPicksChat';
import './app.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <main className="app-layout">
      <header className="app-heading">
        <span className="app-logo">Prof<span>Picks</span></span>
        <span>UT Dallas · Academic planner</span>
      </header>
      <ProfPicksChat />
      <footer>Demo chat UI. Responses require your own backend and API credentials.</footer>
    </main>
  </React.StrictMode>
);
