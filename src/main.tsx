import React from 'react';
import {createRoot} from 'react-dom/client';
import './reset.css';
import '@form-glass/react/styles.css';
import './style.css';
import {LocaleProvider} from './i18n';
import {App} from './App';
createRoot(document.getElementById('atlas')!).render(<React.StrictMode><LocaleProvider><App/></LocaleProvider></React.StrictMode>);
