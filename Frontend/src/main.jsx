// main.jsx
// This is the entry point of the React app.
// It finds the <div id="root"> in index.html and renders our App inside it.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/variables.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)