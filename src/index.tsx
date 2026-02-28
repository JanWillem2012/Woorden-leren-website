import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Toaster } from 'react-hot-toast';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <App />
    <Toaster position="top-center" toastOptions={{ className: "bg-zinc-900 text-white border border-zinc-700" }} />
  </React.StrictMode>
);