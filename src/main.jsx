import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'

import Customer from './Customer.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Customer />} />
        <Route path="/shop" element={<App />} />
        
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
