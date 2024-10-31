import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
//import evalationPageImg from './EvaluationPage.png';

import axios from 'axios';
import config from '../../../../../loadConfig';
import { Alert } from '@govtechsg/sgds-react/Alert';
import './EvaluationPage.css';

function EvaluationPage() {
  const navigate = useNavigate();
  const location = useLocation();

  let loginState = "";

  // Check if location.state exists before accessing its properties
  if (location.state && location.state.loginState != null) {
    loginState = location.state.loginState;
  }

  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);
  //const [selectedModels, setSelectedModels] = useState([]);

  // Jobs Pagination
  const itemsPerPageJobs = 5;
  const [currentPageJobs, setCurrentPageJobs] = useState(1);
  const [totalNumOfPagesJobs, setTotalNumOfPagesJobs] = useState(0);
  const [loadingJobs, setLoadingJobs] = useState(false);

  // Models Pagination
  const itemsPerPageModels = 2;
  const [currentPageModels, setCurrentPageModels] = useState(1);
  const [totalNumOfPagesModels, setTotalNumOfPagesModels] = useState(0);
  const [loadingModels, setLoadingModels] = useState(false);

  // Model Evaluation
  const [evalImages, setEvalImages] = useState([]);

  useEffect(() => { 
    // Fetch the job names from the API
    refreshJobs(1);
  }, []);
  useEffect(() => { 
    // Fetch the model names from the API
    refreshModels(1, selectedJob);
  }, [selectedJob]);

  const refreshJobs = (pageNumber = currentPageJobs) => {
    setCurrentPageJobs(pageNumber);
    setJobs([]);
    setSelectedJob(null);
    setModels([]);
    setSelectedModel(null);
    setLoadingJobs(true);
    console.log('Fetching jobs for itemsPerPage:', itemsPerPageJobs, ', pageNumber:', pageNumber);
    axios.get(`${config.backendUrl}/get-jobs/${itemsPerPageJobs}/${pageNumber}`)
      .then(response => {
        console.log('Response: ', response.data);
        setJobs(response.data.jobs);
        setTotalNumOfPagesJobs(Math.ceil(parseInt(response.data.totalJobs.low) / itemsPerPageJobs) );
      })
      .catch(error => {
        console.error('Error refreshing jobs:', error);
      })
      .finally(() => {
        setLoadingJobs(false);
      });
  };

  const refreshModels = (pageNumber = currentPageModels, job = selectedJob ) => {
    setCurrentPageModels(pageNumber);
    setModels([]);
    setSelectedModel(null);
    setLoadingModels(true);

    if (!selectedJob) {
      setLoadingModels(false);
      return;
    }

    console.log('Fetching models for job:', job.name, 
                ', itemsPerPage:', itemsPerPageModels, ', pageNumber:', pageNumber);
    axios.post(`${config.backendUrl}/get-models-in-job`, {
      jobName: job.name,
      itemsPerPage: itemsPerPageModels,
      pageNumber: pageNumber, 
    })
      .then(response => {
        console.log('Response: ', response.data);
        setModels(response.data.models);
        setTotalNumOfPagesModels(Math.ceil(parseInt(response.data.totalModels.low) / itemsPerPageModels) );
      })
      .catch(error => {
        console.error('Error refreshing models:', error);
      })
      .finally(() => {
        setLoadingModels(false);
      });
  };

  const handlePageClickJobs = (pageNumber) => {
    refreshJobs(pageNumber);
  };

  const handlePageClickModels = (pageNumber) => {
    refreshModels(pageNumber);
  };

  const handleJobClick = (job) => {
    console.log('Job clicked: ', job);
    if (job === selectedJob) {
      // If the same job is clicked, deselect it
      setSelectedJob(null);
      setModels([]);
      setSelectedModel(null);
      setTotalNumOfPagesModels(1);
    } else {
      setSelectedJob(job);
    }
  };

  const handleModelClick = (model) => {
    if (model === selectedModel) {
      // If the same model is clicked, deselect it
      setSelectedModel(null);
    } else { 
      setSelectedModel(model);
    }
    /*setSelectedModels(prevSelectedModels => {
      if (prevSelectedModels.includes(model)) {
        // If model is already selected, remove it
        return prevSelectedModels.filter(c => c !== model);
      } else {
        // If model is not selected, add it
        return [...prevSelectedModels, model];
      } 
    }); */ 
  }; 

  const handleDeleteJob = async (jobName) => {
    console.log('Deleting job: ', jobName);
    try {
      const response = await axios.post(`${config.backendUrl}/delete-job`, { jobName: jobName });
      if (response.status === 200) {
        refreshJobs(1);
        // Remove the deleted job from the state
        //setJobs(jobs.filter(job => job.name !== jobName));
        alert('Job deleted successfully');
      } else {
        alert('The job could not be deleted. Check whether any of its models are New/Processing/Running, or whether they were used to create bounding-boxes.');
      }
    } catch (error) {
      alert('The job could not be deleted. Check whether any of its models are New/Processing/Running, or whether they were used to create bounding-boxes.');
      console.error('Error deleting job:', error);
    } 

  };

  const handleDeleteModel = async (modelName) => {
    console.log('Deleting model ', modelName, ' in job ', selectedJob.name);
    try {
      const response = await axios.post(`${config.backendUrl}/delete-model`, 
        { 
          jobName: selectedJob.name,
          modelName: modelName 
        }
      );
      if (response.status === 200) {
        refreshModels(1);
        // Remove the deleted model from the state
        //setModels(models.filter(model => model.name !== modelName));
        alert('Model deleted successfully');
      } else {
        alert('The model could not be deleted. Check whether it is New/Processing/Running, or whether it was used to create bounding-boxes.');
      }
    } catch (error) {
      alert('The model could not be deleted. Check whether it is New/Processing/Running, or whether it was used to create bounding-boxes.');
      console.error('Error deleting model:', error);
    } 

  };

  const toggleDeployModel = async (model, newStatus) => {
    let modelName = model.name;
    console.log('Changing deploy status of model ', modelName, ' in job ', selectedJob.name, ' to ', newStatus);
    try {
      const response = await axios.post(`${config.backendUrl}/models/status`,
        {
          modelName: modelName,
          newStatus: newStatus
        }
      );
      if (response.status === 200) {
        model.status = newStatus;
        setSelectedModel(model);
        
      } else {
        alert('The model deploy status could not be updated.');
      }
    } catch (error) {
      alert('The model deploy status could not be updated.');
      console.error('Error updating model deploy status:', error);
    } 
  };

  useEffect(() => {
    const fetchEvalImages = async () => {
      try {
        const response = await fetch(`${config.backendUrl}/getModelEvaluationResults`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jobName: selectedJob.name,
            modelName: selectedModel.name,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch images');
        }

        const base64Images = await response.json();
        setEvalImages(base64Images);
      } catch (error) {
        console.error('Error fetching images:', error);
      }
    };

    if (selectedJob && selectedModel) {
      if (selectedModel.status === 'C' || selectedModel.status === 'D') {
        fetchEvalImages();
      }
    }
  }, [selectedJob, selectedModel]);

    // State for alert message (Error or success)
    const [showAlert, setShowAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    // State for the left section width
    const [leftWidth, setLeftWidth] = useState(40); // Initial width in percentage
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
        <div className="card mb-3">
          <div className="card-header">
            <h4 className="card-title">Model Evaluation</h4>
          </div>
          <div className="card-body">
            <div className="row card-container" 
                 style={{ display: 'flex' }}>
              {/* Content for the left section */}
              <div className='left-section' style={{ width: `${leftWidth}%`, marginRight: '2px' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h5>Selected Job:</h5>
                  <button onClick={() => refreshJobs(1)} style={{ marginLeft: '10px' }}>Refresh Jobs</button>
                </div>

                { totalNumOfPagesJobs > 1 && 
                  <div className="pagination" style={{overflowX: "auto", maxWidth: "100%"}}>
                      {Array.from({ length: totalNumOfPagesJobs }, (_, index) => (
                      <button
                          key={index + 1}
                          className={`pagination-button ${currentPageJobs === index + 1 ? 'active' : ''}`}
                          onClick={() => handlePageClickJobs(index + 1)}
                      >
                          {index + 1}
                      </button>
                      ))}
                  </div>
                }
                
                <div style={{alignItems: 'center', maxHeight: '220px', overflowY: 'scroll', overflowX: 'auto'}}>

                  {loadingJobs ? <h2><em>Loading...</em></h2> : null}
                  
                  {!loadingJobs && jobs.length === 0 && <p>No jobs have been added yet!</p>}
                  <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {jobs.map((job) => (
                      <li
                        key={job.name}
                        onClick={() => handleJobClick(job)}
                        style={{
                          padding: '3px',
                          margin: '5px 0',
                          border: selectedJob === job ? '5px solid red' : '2px solid #ccc',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>&nbsp; {job.name}</span>
                          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <button
                              className="delete-button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete the job "${job.name}"?`)) {
                                  handleDeleteJob(job.name);
                                }
                              }}
                            >
                              X
                            </button> &nbsp;
                            <span>
                              {job.updatedOn.year.low}-{job.updatedOn.month.low}-{job.updatedOn.day.low}<br/>{job.updatedOn.hour.low}:{job.updatedOn.minute.low}:{job.updatedOn.second.low}
                            </span>
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>


              {/* Draggable Divider */}
              <div
                onMouseDown={startDragging}
                style={{ cursor: 'ew-resize', width: '4px', backgroundColor: 'grey' }}
              ></div>
              {/* Content for the Right Section */}
              <div className="right-section col-md-6" style={{ flex: 1 }}>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h5>Selected Model:</h5>
                  <button onClick={() => refreshModels(1)} style={{ marginLeft: '10px' }}>Refresh Models</button>
                </div>

                { totalNumOfPagesModels > 1 && 
                  <div className="pagination" style={{overflowX: "auto", maxWidth: "100%"}}>
                      {Array.from({ length: totalNumOfPagesModels }, (_, index) => (
                      <button
                          key={index + 1}
                          className={`pagination-button ${currentPageModels === index + 1 ? 'active' : ''}`}
                          onClick={() => handlePageClickModels(index + 1)}
                      >
                          {index + 1}
                      </button>
                      ))}
                  </div>
                }

                <div style={{alignItems: 'center', maxHeight: '220px', overflowY: 'scroll'}}>
                  {loadingModels ? <h2><em>Loading...</em></h2> : null}
                  {!loadingModels && !selectedJob && <p>Select a job.</p>}
                  {!loadingModels && selectedJob && models.length === 0 && <p>No models in this job!</p>}
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      { models.length > 0 && 
                        <tr>
                          <th style={{ border: '1px solid #ccc', padding: '10px' }}>Model Name</th>
                          <th style={{ border: '1px solid #ccc', padding: '10px' }}>Created</th>
                          <th style={{ border: '1px solid #ccc', padding: '10px' }}>Updated</th>
                          <th style={{ border: '1px solid #ccc', padding: '10px' }}>Del</th>
                          <th style={{ border: '1px solid #ccc', padding: '10px' }}>Status</th>
                          <th style={{ border: '1px solid #ccc', padding: '10px' }}>Deploy</th>
                        </tr>
                      }
                    </thead>
                    <tbody>
                      {models.map((model) => (
                        <tr
                          key={model.name}
                          onClick={() => handleModelClick(model)}
                          style={{
                            cursor: 'pointer',
                            border: selectedModel === model ? '5px solid red' : '2px solid #ccc',
                            backgroundColor: selectedModel === model ? '#f9f9f9' : 'transparent'
                          }}
                        >
                          <td style={{ border: '1px solid #ccc', padding: '10px' }}>{model.name}</td>
                          
                          <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                            {model.createdOn.year.low}-{model.createdOn.month.low}-{model.createdOn.day.low}<br/>{model.createdOn.hour.low}:{model.createdOn.minute.low}:{model.createdOn.second.low}
                          </td>
                          <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                            {model.updatedOn.year.low}-{model.updatedOn.month.low}-{model.updatedOn.day.low}<br/>{model.updatedOn.hour.low}:{model.updatedOn.minute.low}:{model.updatedOn.second.low}
                          </td>
                          
                          <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                            <button
                              className="delete-button"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete the model "${model.name}"?`)) {
                                  handleDeleteModel(model.name);
                                }
                              }}
                            >
                              X
                            </button>
                          </td>

                          <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                          {
                            model.status === null ? 'Undefined'
                            : model.status === 'N' ? 'New' 
                            : model.status === 'P' ? 'Processing' 
                            : model.status === 'R' ? 'Running'
                            : model.status === 'C' ? 'Completed'
                            : model.status === 'D' ? 'Deployed'
                            : model.status === 'E' ? 'Error' : 'Unknown'
                          }
                          </td> 

                          <td style={{ border: '1px solid #ccc', padding: '10px' }}>
                            { model.status === 'C' ? 
                              <button onClick={() => toggleDeployModel(model, 'D')}
                                      style={{ backgroundColor: "red", color: "white"}}>
                                Inactive
                              </button>
                            : model.status === 'D' ? 
                              <button onClick={() => toggleDeployModel(model, 'C')}
                                      style={{ backgroundColor: "green", color: "white"}}>
                                Active
                              </button> 
                            : <span>NA</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          </div>
        </div>

        { selectedModel && 
        <div className="card mb-3">
          <div className="card-header">
            <h4 className="card-title">
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h5>{selectedModel.name}</h5>
                  <h5>
                  {
                    selectedModel.status === null ? 'Undefined'
                    : selectedModel.status === 'N' ? 'New' 
                    : selectedModel.status === 'P' ? 'Processing' 
                    : selectedModel.status === 'R' ? 'Running' 
                    : selectedModel.status === 'C' ? 'Completed'
                    : selectedModel.status === 'D' ? 'Deployed'
                    : selectedModel.status === 'E' ? 'Error' : 'Unknown'
                  }
                  </h5>
              </div>

            </h4>
          </div>
          <div className="card-body">
            <div className="row card-container" 
                 style={{ display: 'flex' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead></thead>  
                    <tbody>
                      <tr>
                        <td style={{ /* border: '1px solid #ccc', */ padding: '2px' }}>
                          &nbsp;Created: {selectedModel.createdOn.year.low}-{selectedModel.createdOn.month.low}-{selectedModel.createdOn.day.low} {selectedModel.createdOn.hour.low}:{selectedModel.createdOn.minute.low}:{selectedModel.createdOn.second.low}
                        </td>
                        { (selectedModel.status === 'C' || selectedModel.status === 'D') ? <>
                        <td style={{ /* border: '1px solid #ccc', */ padding: '2px' }}>
                          Accuracy: {selectedModel.accuracy}
                        </td>
                        <td style={{ /* border: '1px solid #ccc', */ padding: '2px' }}>
                          &nbsp;&nbsp;&nbsp;Category Keys: 
                          {selectedModel.classifierKeys.map((key, index) => (
                            <span key={index} style={{ marginLeft: '5px' }}>
                              {key.low}
                              {index < selectedModel.classifierKeys.length - 1 && <span>,</span>}
                            </span>
                          ))}
                        </td> </>
                        : <td colSpan="2"></td>
                        }
                      </tr>

                      <tr>
                        <td style={{ /* border: '1px solid #ccc', */ padding: '2px' }}>
                          Updated: {selectedModel.updatedOn.year.low}-{selectedModel.updatedOn.month.low}-{selectedModel.updatedOn.day.low} {selectedModel.updatedOn.hour.low}:{selectedModel.updatedOn.minute.low}:{selectedModel.updatedOn.second.low}
                        </td>
                        { (selectedModel.status === 'C' || selectedModel.status === 'D') ? <>
                        <td style={{ /* border: '1px solid #ccc', */ padding: '2px' }}>
                          Precision: {selectedModel.precision}
                        </td>
                        <td style={{ /* border: '1px solid #ccc', */ padding: '2px' }}>
                          Category Values: 
                          {selectedModel.classifierCategories.map((cat, index) => (
                            <span key={index} style={{ marginLeft: '5px' }}>
                              {cat}
                              {index < selectedModel.classifierCategories.length - 1 && <span>,</span>}
                            </span>
                          ))}
                        </td> </>
                        : <td colSpan="2"></td>
                        }
                      </tr>
                      { (selectedModel.status === 'C' || selectedModel.status === 'D') &&
                      <tr>
                        <td style={{ /* border: '1px solid #ccc', */ padding: '2px' }}>
                          &nbsp; &nbsp;&nbsp;RMSE: {selectedModel.rmse}
                        </td>
                        <td style={{ /* border: '1px solid #ccc', */ padding: '2px' }}>
                          &nbsp; &nbsp;&nbsp; Recall: {selectedModel.recall}
                        </td>
                        <td style={{ /* border: '1px solid #ccc', */ padding: '2px' }}>
                          &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;&nbsp;F1 score: {selectedModel.f1Score}
                        </td>
                      </tr>
                      }
                      <tr>
                        <td style={{ /* border: '1px solid #ccc', */ padding: '2px' }} colSpan="3" >
                          { (selectedModel.status === 'C' || selectedModel.status === 'D') && evalImages.length > 0 && 
                            <div style={{ display: 'flex', overflowX: 'scroll', maxWidth: '83vw' }}>
                              {evalImages.map((base64Image, index) => (
                                <img
                                  key={index}
                                  src={`data:image/png;base64,${base64Image}`}
                                  alt={`Evaluation ${index}`}
                                  style={{ marginRight: '10px', height: '460px' }}
                                />
                              ))}
                            </div>
                          }
                        </td>
                      </tr>
                    </tbody>
                </table>
            </div>
          </div>
        </div>
    }
      </div>
  );

}

export default EvaluationPage;
