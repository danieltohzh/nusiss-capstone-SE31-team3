import React, { useEffect, useState, useContext } from "react";
import "bootstrap/dist/css/bootstrap.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import navbarLogo from "./navbar_logo.png";
import { useNavigate, useLocation, Link } from "react-router-dom";
import getGoogleOAuthURL from "../../../../utils/getGoogleUrl";
import axios from "axios";

import { AuthContext } from "../modules/userManagement/AuthContext";

function clearAccessTokenCookie(cookieName, domain, path) {
  document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + domain + '; path=' + path + '; Secure; SameSite=None';
}

function clearRefreshTokenCookie(cookieName, domain, path) {
  document.cookie = cookieName + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=' + domain + '; path=' + path + '; Secure; SameSite=None';
}

function NavBar({isAuthenticated}) {
  const { user, logout } = useContext(AuthContext); // Use the AuthContext to access the user and logout function

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    // Call the logout function from the AuthContext
    logout();

    // Clear cookies
    console.log("Clear cookie");
    clearAccessTokenCookie('accessToken', process.env.REACT_APP_DOMAIN_URL , '/');
    clearRefreshTokenCookie('refreshToken', process.env.REACT_APP_DOMAIN_URL , '/');
    
    // Navigate to home page
    navigate("/");

    // Refresh the page
    window.location.reload();
  };

  const goToLogoutPage = () => {
    handleLogout();
  };

  const goToHomePage = () => {
    navigate("/");
  };

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
    <>
      {isAuthenticated ? (
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
          <div className="container">
            <a className="navbar-brand" onClick={goToHomePage}>
              <img
                src={navbarLogo}
                width="60"
                height="60"
                className="d-inline-block align-top"
                alt=""
              />
            </a>
            <button
              className="navbar-toggler"
              type="button"
              data-toggle="collapse"
              data-target="#navbarSupportedContent"
              aria-controls="navbarSupportedContent"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>

            <div
              className="collapse navbar-collapse justify-content-between"
              id="navbarSupportedContent"
            >
              <ul className="navbar-nav">
                <li className="nav-item active">
                  <Link to = "/data" 
                    className="nav-link"
                    aria-current="page"
                  >
                    Data
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to = "/training" 
                    className="nav-link"
                    aria-current="page"
                  >
                    Training
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to = "/evaluation" 
                    className="nav-link"
                    aria-current="page"
                  >
                    Evaluation
                  </Link>
                </li>
                <li className="nav-item">
                  <Link to = "/settings" 
                    className="nav-link"
                    aria-current="page"
                  >
                    Settings
                  </Link>
                </li>
                {/* <li className="nav-item">
                  <Link to = "/userManagement" 
                    className="nav-link"
                    aria-current="page"
                  >
                    UserManagement
                  </Link>
                </li> */}

              {/* Conditional rendering based on user role */}
                {user && user.role === "admin" && (
                  <li className="nav-item">
                    <Link to="/userManagement" className="nav-link">User Management</Link>
                  </li>
                )}
              </ul>
              <div className="d-flex me-3">
                <i className="bi bi-box-arrow-right fs-2"></i>
                <button
                  type="submit"
                  className="btn btn-link"
                  onClick={goToLogoutPage}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
      ) : (
        <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <div className="container">
            <a className="navbar-brand" onClick={goToHomePage}>
            <img
              src={navbarLogo}
              width="60"
              height="60"
              className="d-inline-block align-top"
              alt=""
            />
          </a>
          <button
              className="navbar-toggler"
              type="button"
              data-toggle="collapse"
              data-target="#navbarSupportedContent"
              aria-controls="navbarSupportedContent"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>

            <div
              className="collapse navbar-collapse justify-content-between"
              id="navbarSupportedContent"
            >
              <ul className="navbar-nav">
                {/*
                <li className="nav-item">
                  <Link to = "/training" 
                    className="nav-link"
                    aria-current="page"
                  >
                    Training
                  </Link>
                </li>
                
                */}
              </ul>

              <div className="d-flex me-2">
                <button type="submit" className="btn btn-outline-primary" onClick={handleGoogleLogin}>
                  <i className="bi bi-google"></i> Google Sign in
                </button>
              </div>

              {/* <div className="d-flex me-3">
                <i className="bi bi-box-arrow-right fs-2"></i>
                <button
                  type="submit"
                  className="btn btn-link"
                  onClick={goToLoginPage}
                >
                  Login
                </button>
              </div> */}
            </div>
          
          </div>
        </nav>
      )}
    </>
  );
}

export default NavBar;
