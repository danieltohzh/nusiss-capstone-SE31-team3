import React, { useEffect, useState, useContext } from "react";
import logo from './scarecrow_logo.png';
import { useLocation } from "react-router-dom";
import { jwtDecode } from 'jwt-decode';

import { AuthContext } from "./userManagement/AuthContext";

// Utility function to get the value of a cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  // console.log("Value in home: " + value);
  // console.log("parts in home: " + parts);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null; // Return null if cookie not found or improperly formatted
}

const test = process.env.REACT_APP_NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URL;
console.log("test: " + test);

function HomePage() {
  const { user, login } = useContext(AuthContext); // Use the AuthContext to access the user and logout function

  const location = useLocation();
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    // Function to retrieve access token from cookie
    const fetchAccessToken = () => {
      const token = getCookie("accessToken");
      if (token) {
        setAccessToken(token);
        const decodedToken = jwtDecode(token);
        login(decodedToken); // Store user in local storage

        // console.log("decodedToken: " + decodedToken);
        // console.log("decodedToken.name: " + decodedToken.name);
       
      } else {
        console.log("Access token not found in cookie.");
      }
    };

    fetchAccessToken();
  }, []);

  return (
    <div className="inline-centered-container">
      {accessToken ? (
        <>
          <h1>Welcome {user.name} !</h1>    
        </>
      ) : (
        <h1>Welcome to ScareCrow!</h1>
      )}
      <img src={logo} alt="Logo" className="inline-centered-image" />
    </div>
  );
}

export default HomePage;