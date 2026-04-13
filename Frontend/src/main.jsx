import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'        // Auth-page styles (login / signup / reset)
import App from './App.jsx'

const savedTheme = localStorage.getItem('kharcha-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)