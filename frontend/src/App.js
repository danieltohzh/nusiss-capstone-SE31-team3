import React from "react";
import "./App.css";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./routes";
import NavBar from "./main/webapp/app/modules/NavBar";
import { ModelContextProvider } from './main/webapp/app/modules/training/ModelContext';

function App() {
  return (
    <div>
      <BrowserRouter>
      <ModelContextProvider>
        <AppRoutes />
      </ModelContextProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
