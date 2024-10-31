import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useLocation } from "react-router-dom";

import axios from 'axios';
import config from '../../../../../loadConfig';
import { Alert } from '@govtechsg/sgds-react/Alert';
import './SettingsPage.css';

import { ModelContext } from '../training/ModelContext';

function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  let loginState = "";

  // Check if location.state exists before accessing its properties
  if (location.state && location.state.loginState != null) {
    loginState = location.state.loginState;
  }

  const { boilerplate, setBoilerplate, initialBoilerplate }  = useContext(ModelContext);
  const handleBoilerplateReset = () => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm('Are you sure you want to reset the boilerplate code?')) {
      setBoilerplate(initialBoilerplate);
    }
  };
  const handleBoilerplateChange = (event) => {
    setBoilerplate(event.target.value);
  };

    // State for alert message (Error or success)
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    // State for the left section width
    const [leftWidth, setLeftWidth] = useState(30); // Initial width in percentage
    const [isDragging, setIsDragging] = useState(false);

    // Script-builder card - divider dragging functionality

  // Set initial leftWidth based on screen width
  useEffect(() => {
    if (window.innerWidth < 600) {
      setLeftWidth(100);
    }
  }, []);

  // Start dragging
  const startDragging = (e) => {
    setIsDragging(true);
    e.preventDefault(); // Prevent text selection during dragging
  };

  // While dragging
  const onDrag = useCallback((e) => { 
    if (!isDragging) return;
    const newWidth = (e.clientX / window.innerWidth) * 100;
    setLeftWidth(newWidth);
  }, [isDragging]); 

  // Stop dragging
  const stopDragging = () => {
    setIsDragging(false);
  };

  // Attach event listeners for mouse move and mouse up
  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onDrag);
      window.addEventListener('mouseup', stopDragging);
    } else {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDragging);
    }

    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDragging);
    };
  }, [isDragging, onDrag, stopDragging]);

  return (
    <div className="container mt-3">
        
        <div>
            {showAlert && (
                <Alert variant='info' className="d-flex align-items-center">
                    <div>
                        <i className="bi bi-exclamation-circle me-4"></i>
                        {alertMessage}
                    </div>
                </Alert>
            )}
        </div>

        {/* New Card */}
        <div className="card mb-3" style={{height: '100%'}}>
          <div className="card-header"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 className="card-title">PyTorch Template Setting</h4>
            <button onClick={handleBoilerplateReset} style={{ float: 'right' }}>
              Reset
            </button>
          </div>
          <div className="card-body">
            <div className="row card-container" 
                 style={{ display: 'flex' }}>
            {/* 
              
              <div className='left-section' style={{ width: `${leftWidth}%`, marginRight: '2px' }}>
                
                <h5>Placeholder for Left Section</h5>

              </div>


              
              <div
                onMouseDown={startDragging}
                style={{ cursor: 'ew-resize', width: '4px', backgroundColor: 'grey' }}
              ></div>
            */}

              {/* Content for the Right Section */}
              <div className="right-section col-md-6" style={{ flex: 1, backgroundColor: '#333', color: '#fff', fontFamily: 'monospace', minHeight: '250px' }}>
                <textarea
                  value={boilerplate}
                  onChange={handleBoilerplateChange}
                  style={{
                    width: '100%',
                    height: '70vh',
                    resize: 'both', // Allow both horizontal and vertical resizing
                    minWidth: '100px',
                    minHeight: '100px',
                    backgroundColor: '#333',
                    color: '#fff',
                    fontFamily: 'monospace',
                    border: '1px solid #ccc',
                    padding: '10px',
                  }}
                />
              </div>

            </div>
          </div>
        </div>

        
      </div>
  );

}

export default SettingsPage;
