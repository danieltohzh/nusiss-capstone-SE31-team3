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

function UpdateUserRole() {
  const navigate = useNavigate();
  const location = useLocation();
  // State to hold form data
  const [emails, setEmails] = useState([]);
  // const [roles, setRoles] = useState([]); 
  const [roles] = useState(['admin', 'dataScientist']); // Fixed roles
  const [selectedEmail, setSelectedEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState(''); 
  const [emailError, setEmailError] = useState('');
  const [roleError, setRoleError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [userRoleMap, setUserRoleMap] = useState({});

  useEffect(() => {
    // Fetch the folder names from the API
    axios.get(`${config.backendUrl}/api/getAllUsersHandler`)
        .then(response => {
          const users = response.data; // Assuming this is an array of user objects
          console.log("users: " + users);
          const fetchedEmails = users.map(user => user.email);
          const fetchedRoles = users.map(user => user.role);
          
          setEmails(fetchedEmails);
          //setRoles(fetchedRoles);
          
          // Create a mapping of email to role
          const emailRoleMap = {};
          users.forEach(user => {
            emailRoleMap[user.email] = user.role;
          });
          setUserRoleMap(emailRoleMap);
          })
        .catch(error => {
            console.error('Error fetching users:', error);
        });
  }, []);

  useEffect(() => {
   console.log("emails: " + emails);
   console.log("roles: " + roles);
  }, [emails, roles]);


  const handleEmailChange = (e) => {
    const email = e.target.value;
    setSelectedEmail(email);
    setSelectedRole(userRoleMap[email] || ''); // Set role based on selected email
    if (!email) {
      setEmailError('Please select an email');
    } else {
      setEmailError('');
    }
  };

  const handleRoleChange = (e) => {
    const role = e.target.value;
    setSelectedRole(role);
    if (!role) {
      setRoleError('Please select a role');
    } else {
      setRoleError('');
    }
  };

  
  // Handle update form submission
  const handleUpdate = async (event) => {
      event.preventDefault();
      // Log or process form data here
      console.log('Email:', selectedEmail);
      console.log('Role:', selectedRole);

      // Validate the role selection
      if (selectedRole === '') {
        setRoleError('Please select a role.');
        return; // Stop form submission if validation fails
      }

      // try {
      //   const response = await axios.post(`${config.backendUrl}/api/createUserHandler`, { body: { email, role } });
      //   if(response.data.message === "User created successfully."){
      //     setErrorMsg('');
      //     setSuccessMsg(response.data.message);
      //   }else{
      //     setErrorMsg(response.data.message);
      //     setSuccessMsg('');
      //   }
       
      //   return response.data; 
      // } catch (error) {
      //     // Check if the error response exists and has a status
      //     if (error.response) {
      //       setErrorMsg(error.response.data.message);
      //       setSuccessMsg('');

      //     } else {
      //       // Handle cases where error.response is undefined (e.g., network errors)
      //       setErrorMsg("Network error: " + (error.message || "Please check your connection and try again."));
      //       setSuccessMsg('');
      //     }
      //     throw error; // Optionally re-throw the error if you want to handle it further

      // }
      
    };

  return (
    <>
      <div className="container mt-3">
        <div className="row justify-content-center">
          <div className="col-md-10">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">Update User Role</h4>
              </div>
              {/* Start of Card Body */}
              <div className="card-body">
                <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px' }}>
                {errorMsg && <div style={{ color: 'red' }}>{errorMsg}</div>} {/* Display error message */}
                {successMsg && <div style={{ color: 'green' }}>{successMsg}</div>} {/* Display success message */}
                  <h2>To update an existing user</h2>
                  <form>
                  {/* <div style={{ marginBottom: '15px' }}>
                      <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
                      <select value={selectedEmail} onChange={handleEmailChange} required>
                        <option value="">Please select an email</option>
                        {emails.map(email => (
                          <option key={email} value={email}>
                            {email}
                          </option>
                        ))}
                      </select>
                    </div> */}

                    <div style={{ marginBottom: '15px' }}>
                      <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
                      <select
                        id="email"
                        value={selectedEmail} 
                        onChange={handleEmailChange}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                      > 
                        <option value="">Please select an email</option>
                        {emails.map(email => (
                          <option key={email} value={email}>
                            {email}
                          </option>
                        ))}
                      </select>
                      {emailError && <div style={{ color: 'red' }}>{emailError}</div>} {/* Error message */}
                    </div>

                    {/* <div style={{ marginBottom: '15px' }}>
                      <label htmlFor="role" style={{ display: 'block', marginBottom: '5px' }}>Role:</label>
                      <select id="role" value={selectedRole} onChange={handleRoleChange} required>
                        <option value="">Select a role</option>
                        {roles.map(role => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </div> */}

                    <div style={{ marginBottom: '15px' }}>
                      <label htmlFor="role" style={{ display: 'block', marginBottom: '5px' }}>Role:</label>
                      <select
                        id="role"
                        value={selectedRole} 
                        onChange={handleRoleChange}
                        required
                        style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                      > 
                        <option value="">Select a Role</option>
                        {roles.map(role => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                      {roleError && <div style={{ color: 'red' }}>{roleError}</div>} {/* Error message */}
                    </div>

                    <button
                      type="submit"
                      style={{ width: '100%', padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Update
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

export default UpdateUserRole;
