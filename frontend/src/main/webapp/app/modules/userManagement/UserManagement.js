import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import {
  Card,
  CardBody,
  FormGroup,
  Row,
  Col,
  FormLabel,
} from "@govtechsg/sgds-react";
import axios from 'axios';
import config from '../../../../../loadConfig';
import UpdateUserRole from './UpdateUserRole';

function UserManagementPage() {
  console.log("User Management page");
  const navigate = useNavigate();
  const location = useLocation();

  let loginState = "";

  // Check if location.state exists before accessing its properties
  if (location.state && location.state.loginState != null) {
    loginState = location.state.loginState;
  }

    // State to hold form data
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('user'); // Default role
    const [emailError, setEmailError] = useState('');
    const [roleError, setRoleError] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
        
    // Handle form submission
    const handleSubmit = async (event) => {
      event.preventDefault();
      // Log or process form data here
      console.log('Email:', email);
      console.log('Role:', role);

      // Validate the role selection
      if (role === '') {
        setRoleError('Please select a role.');
        return; // Stop form submission if validation fails
      }

      try {
        const response = await axios.post(`${config.backendUrl}/api/createUserHandler`, { body: { email, role } });
        if(response.data.message === "User created successfully."){
          setErrorMsg('');
          setSuccessMsg(response.data.message);
        }else{
          setErrorMsg(response.data.message);
          setSuccessMsg('');
        }
       
        return response.data; 
      } catch (error) {
          // Check if the error response exists and has a status
          if (error.response) {
            setErrorMsg(error.response.data.message);
            setSuccessMsg('');

          } else {
            // Handle cases where error.response is undefined (e.g., network errors)
            setErrorMsg("Network error: " + (error.message || "Please check your connection and try again."));
            setSuccessMsg('');
          }
          throw error; // Optionally re-throw the error if you want to handle it further

      }
      
    };

    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
  };

  const handleChange = (e) => {
      const newEmail = e.target.value;

      // Validate email format in real-time
      if (newEmail === '') {
        setEmailError('Email is required.');
      } else if (!validateEmail(newEmail)) {
        setEmailError('Please enter a valid email address.');
      } else {
        setEmailError(''); // Clear error if valid
      }

      setEmail(newEmail);
  };
  

  return (
    <>
    <UpdateUserRole />
      <div className="container mt-3">
        <div className="row justify-content-center">
          <div className="col-md-10">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">User Management Page</h4>
              </div>
              {/* Start of Card Body */}
              <div className="card-body">
                <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px' }}>
                {errorMsg && <div style={{ color: 'red' }}>{errorMsg}</div>} {/* Display error message */}
                {successMsg && <div style={{ color: 'green' }}>{successMsg}</div>} {/* Display success message */}
                  <h2>To register a new user</h2>
                  <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                      <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                      />
                      {emailError && <div style={{ color: 'red' }}>{emailError}</div>} {/* Error message */}
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                      <label htmlFor="role" style={{ display: 'block', marginBottom: '5px' }}>Role:</label>
                      <select
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                      > 
                        <option value="">Select a Role</option>
                        <option value="dataScientist">Data Scientist</option>
                        <option value="admin">Admin</option>
                      </select>
                      {roleError && <div style={{ color: 'red' }}>{roleError}</div>} {/* Error message */}
                    </div>

                    <button
                      type="submit"
                      style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Submit
                    </button>

                  </form>
                </div>
              </div>
              {/* End of Card Body */}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default UserManagementPage;
