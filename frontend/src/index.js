import React from 'react';
import ReactDOM from 'react-dom/client';
import Modal from 'react-modal'; 
import './index.css';
import App from './App';
import { AuthProvider } from './context/AuthContext';


Modal.setAppElement('#root');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <AuthProvider>
    <App />
  </AuthProvider>
);