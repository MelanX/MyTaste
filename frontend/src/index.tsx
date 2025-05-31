import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import './index.css';
import { loadConfig } from "./config";

loadConfig().then(() => {
    const root = ReactDOM.createRoot(document.getElementById('root')!);
    root.render(
        <React.StrictMode>
            <AuthProvider>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </AuthProvider>
        </React.StrictMode>
    );

    serviceWorkerRegistration.register();
    reportWebVitals();

    navigator.serviceWorker?.addEventListener('message', (e) => {
        if (e.data?.type === 'recipes-updated') {
            window.dispatchEvent(new Event('recipes-updated')); // wake hooks
        }
    });
}).catch(error => {
    console.error('Failed to load config:', error);
});
