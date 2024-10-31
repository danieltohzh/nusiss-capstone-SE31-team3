/**
 * For routing  
 */
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import PrivateRoute from './privateRoute';
import HomePage from './main/webapp/app/modules/HomePage';
import DataPage from './main/webapp/app/modules/data/DataPage';
import TrainingPage from './main/webapp/app/modules/training/TrainingPage';
import UploadPage from './main/webapp/app/modules/upload/UploadPage';
import EvaluationPage from './main/webapp/app/modules/evaluation/EvaluationPage';
import SettingsPage from './main/webapp/app/modules/settings/SettingsPage';
import UserManagementPage from './main/webapp/app/modules/userManagement/UserManagement';
import NavBar from './main/webapp/app/modules/NavBar';
import config from './loadConfig';

// Utility function to get the value of a cookie
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    // console.log("Value in routes: " + value);
    // console.log("parts in routes: " + parts);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null; // Return null if cookie not found or improperly formatted
  }

const AppRoutes = () => {
    const [isAuthenticated, setAuthenticated] = useState(false);

    useEffect(() => {
      const token = getCookie("accessToken");
      //console.log("token in routes: " + token);
      if (token) {
        // console.log("It goes here in routes....");
        setAuthenticated(true);
      } else {
        setAuthenticated(false);
      }
    }, []);

    console.log("config: " + config.origin);

    return (
        <div>        
            <NavBar isAuthenticated={isAuthenticated} />
            <Routes>
                <Route path="/" element={<HomePage />} />
            <Route element={<PrivateRoute isAuthenticated={isAuthenticated} />}>
                {/* <Route path="/data" element={<DataPage />} /> */}
                <Route path="/training" element={<TrainingPage />} />
                <Route path="/data" element={<UploadPage />} />
                <Route path="/evaluation" element={<EvaluationPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                     {/* Protect user management route */}
                <Route element={<PrivateRoute allowedRoles={['admin']} />}>
                    <Route path="/userManagement" element={<UserManagementPage />} />
                </Route>
             </Route>
            </Routes>
        </div>

    )
}

export default AppRoutes; 

