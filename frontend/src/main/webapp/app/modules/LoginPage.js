import React, { useState, useEffect } from "react";
import NavBar from "./NavBar";
import { useNavigate, useLocation } from "react-router-dom";
import getGoogleOAuthURL from "../../../../utils/getGoogleUrl";
import axios from "axios";

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleGoogleLogin = () => {
    window.location.href = getGoogleOAuthURL(); // Redirect to Google OAuth URL
  };

  useEffect(() => {
    // Check if there is a code in the query parameters
    const params = new URLSearchParams(location.search);
    const code = params.get("code");

    if (code) {
      // Function to fetch access token from backend
      const fetchAccessToken = async () => {
        try {
          // Make a GET request to your backend to retrieve the access token
          
          // const response = await axios.get(`https://api.uat-demo.link/api/sessions/oauth/google?code=${code}`);
          const REDIRECT_URI = process.env.REACT_APP_NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URL;
          // const REDIRECT_URI = "http://localhost:8080/api/sessions/oauth/google";
          // const response = await axios.get(`http://localhost:8080/api/sessions/oauth/google?code=${code}`);
          const response = await axios.get(`${REDIRECT_URI}?code=${code}`);

          // Assuming backend returns the access token in response.data.accessToken
          const { accessToken } = response.data;
          console.log("accessToken: " + accessToken);

          // Store access token in a cookie or local storage
          document.cookie = `accessToken=${accessToken}; path=/`;
          console.log("document.cookie at login page: " + document.cookie)
          
          // Redirect to home page
          navigate("/");
        } catch (error) {
          console.error("Error fetching access token:", error);
          // Handle error fetching access token
        }
      };

      // Call the function to fetch access token
      fetchAccessToken();
    }
  }, [location.search, navigate]);

  return (
    <div className="inline-centered-container">
      <button type="submit" className="btn btn-outline-primary" onClick={handleGoogleLogin}>
        <i className="bi bi-google"></i> Google Sign in
      </button>
    </div>
  );
}

export default LoginPage;