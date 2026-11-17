import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import { ToastProvider } from './components/ui/toast.js';
import { TooltipProvider } from './components/ui/tooltip.js';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ToastProvider><TooltipProvider><App /></TooltipProvider></ToastProvider></React.StrictMode>,
);
