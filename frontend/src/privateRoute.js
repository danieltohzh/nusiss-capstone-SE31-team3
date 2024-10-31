import React, { useEffect, useState, useContext } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthContext } from "./main/webapp/app/modules/userManagement/AuthContext";

// Utility function to get the value of a cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null; // Return null if cookie not found or improperly formatted
}

const PrivateRoute = ({ allowedRoles }) => {
  const { user } = useContext(AuthContext);
    
  const isAuthenticated = user !== null; // Replace with actual auth check

  if (!isAuthenticated) {
      return <Navigate to="/" />; // Redirect to home if not authenticated
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to="/unauthorized" />; // Redirect if user role is not allowed
  }

  return <Outlet />;
};

export default PrivateRoute;