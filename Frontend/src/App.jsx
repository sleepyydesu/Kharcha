// App.jsx
// Root component for Kharcha.
//
// Manages:
//   - Which tab is active: 'login' or 'register'
//   - Whether the Reset Password page is shown
//
// Structure:
//   .phone-frame
//     .app-header       ← fixed, never scrolls
//     .tab-bar          ← fixed, never scrolls
//     .scroll-area      ← scrolls when content is tall
//       LoginForm / SignupForm / ResetForm

import { useState } from 'react';
import KharchaLogo from './components/KharchaLogo';
import LoginForm   from './components/LoginForm';
import SignupForm  from './components/SignupForm';
import ResetForm   from './components/ResetForm';

function App() {
  const [activeTab, setActiveTab] = useState('login');
  const [showReset, setShowReset] = useState(false);

  return (
    <div className="phone-frame">

      {/* ── Green header with logo ─────────────── */}
      <div className="app-header">
        <div className="logo-area">
          <KharchaLogo size={42} />
          <span className="logo-name">Khar<span>cha</span></span>
        </div>
        <p className="header-tagline">Nepal's trusted digital wallet 🇳🇵</p>
      </div>

      {/* ── Tab bar (hidden on Reset page) ────── */}
      {!showReset && (
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => setActiveTab('login')}
          >
            Login
          </button>
          <button
            className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => setActiveTab('register')}
          >
            Register
          </button>
        </div>
      )}

      {/*
        .scroll-area takes up all remaining space below the header + tabs.
        If the form content is taller than the available space, it scrolls.
        The card itself stays at its fixed height.
      */}
      <div className="scroll-area">

        {showReset && (
          <ResetForm
            key="reset"
            onBack={() => { setShowReset(false); setActiveTab('login'); }}
          />
        )}

        {!showReset && activeTab === 'login' && (
          <LoginForm
            key="login"
            onShowReset={() => setShowReset(true)}
          />
        )}

        {!showReset && activeTab === 'register' && (
          <SignupForm key="signup" />
        )}

      </div>

    </div>
  );
}

export default App;
