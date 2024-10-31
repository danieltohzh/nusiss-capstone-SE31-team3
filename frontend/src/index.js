import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { AuthProvider } from './main/webapp/app/modules/userManagement/AuthContext';
import { S3FolderProvider } from './main/webapp/app/modules/upload/S3FolderContext';


// TO START FRONTEND IN DEV ENVIRONMENT:
// npm run build:dev
// npm start

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  // <React.StrictMode>
  <AuthProvider>
    <S3FolderProvider>
      <App />
    </S3FolderProvider>
  </AuthProvider>
  // </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
