import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import { seedIfEmpty } from '@/db/schema'
import '@/index.css'

seedIfEmpty()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* basename: en producción la app vive en /GYM-tracker/. Sin esto ninguna
        ruta matchea, el catch-all de App.tsx reescribe la URL a la raíz del
        dominio y al recargar GitHub Pages devuelve su propio 404. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
