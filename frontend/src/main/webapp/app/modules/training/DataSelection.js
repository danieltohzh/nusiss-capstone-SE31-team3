import React, { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import config from '../../../../../loadConfig';
import { S3FolderContext } from '../upload/S3FolderContext';
import { Alert } from '@govtechsg/sgds-react/Alert';
import './DataSelection.css';
import { ModelContext } from './ModelContext';

function DataSelection() {
  // Consume S3FolderContext
  const { folders, setFolders } = useContext(S3FolderContext);
  const { dropzoneChanged } = useContext(S3FolderContext);
  const { setNumOfCategorySelected, selectedFolder, setSelectedFolder, selectedCategories, setSelectedCategories, showAlert, alertMessage,
    existingModel, setExistingModel, selectedExistingModel, setSelectedExistingModel, preSetmodel, setPreSetModel
   }  = useContext(ModelContext);
  const [categories, setCategories] = useState([]);


  // console.log("Folder selected: " + selectedFolder);
  // console.log("Categories selected: " + JSON.stringify(selectedCategories, null, selectedCategories.length));
  // console.log("Number of categories selected: " + selectedCategories.length);

  useEffect(() => {
    setNumOfCategorySelected(selectedCategories.length);
  }, [selectedCategories])

  useEffect(() => {
    // Fetch the folder names from the API
    axios.get(`${config.backendUrl}/api/imagefolders`)
        .then(response => {
            setFolders(response.data.folders);
        })
        .catch(error => {
            console.error('Error fetching folders:', error);
        });
  }, [setFolders, dropzoneChanged]);

  const handleFolderClick = (folder) => {
    if (folder === selectedFolder) {
      // If the same folder is clicked, deselect it
      setSelectedFolder('');
      setCategories([]);
      setSelectedCategories([]);
      setSelectedExistingModel('');
      setPreSetModel([]);
    } else {
      setSelectedFolder(folder);
      setSelectedExistingModel('');
      setPreSetModel([]);
      // Fetch categories for the selected folder
      axios.get(`${config.backendUrl}/get-categories-in-folder/${folder}`)
        .then(response => {
        //   if (response.data && response.data.length > 0) {
        //     // Extract categories from the string representations
        //     const extractedCategories = response.data.map(item => {
        //         // Parse the string to an object

        //         return item.category; // Get the category
        //     });
        //     console.log("extractedCategories: " , extractedCategories);
        //     setCategories(extractedCategories); // Set the categories state
        // } 


          setCategories(response.data);
          setSelectedCategories([]); // Reset selected categories when a new folder is selected
        })
        .catch(error => {
          console.error('Error fetching categories:', error);
        });
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategories(prevSelectedCategories => {
      if (prevSelectedCategories.includes(category.category)) {
        // If category is already selected, remove it
        return prevSelectedCategories.filter(c => c !== category.category);
      } else {
        // If category is not selected, add it
        return [...prevSelectedCategories, category.category];
      }
    });
  };

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

  React.useEffect(() => {
    // console.log("Inside handleRecommendedModelOption: ");
    // console.log("selectedCategories: " , selectedCategories);
    // console.log("selectedFolder: " , selectedFolder);

    const fetchExistingModel = async () => {
      try {
        //console.log(`${config.backendUrl}/api/getModelOptionHandler`);
        const response = await axios.post(`${config.backendUrl}/api/getExistingCompletedModelHandler`, {
          classifierCategories: selectedCategories,
          classifierTrainFolder: selectedFolder,
        });
        //setModel(response.data);
        console.log('Response:', response.data);
        //console.log("JSON.stringify(model): " + JSON.stringify(model));
        //const methods = response.data.map(item => item.option.Method);
        //console.log("Extracted Methods:", methods);
                // Extract specific properties and set them to model
        // const extractedData = response.data.map(item => ({
        //           modelName: item.model.Name,
        //           method: item.option.Method,
        //           nextAllowable: item.option.NextAllowable,
        //           inputNames: item.option.InputNames,
        //           inputTypes: item.option.InputTypes,
        //           userInput : item.relationship.UserInput,
        //           modelCode: item.option.Code,
        //           // Add any other properties you need
        // }));
        // console.log("Extracted data:", extractedData);
        setExistingModel([...response.data]);
  
        // if (JSON.stringify(extractedData) !== JSON.stringify(model)) {
        //   console.log("inside");
        //   setModel([...extractedData]);
        // }
        
        // console.log("Updated model:", methods); 
      
      } catch (error) {
        console.error('Error:', error);
      }
  };

    if(selectedFolder){
      fetchExistingModel();

    }
  }, [selectedCategories, selectedFolder]);

  React.useEffect(() => {
    console.log("existingModel: " , existingModel.length);

  }, [existingModel]);

  const handleExistingModelClick = (existingModelItem) => {
    //console.log("inside handleExistingModelClick");

    const fetchSelectedExistingModel = async () => {
        // To get all the other details 
        try {
          //console.log(`${config.backendUrl}/api/getModelOptionHandler`);
          const response = await axios.post(`${config.backendUrl}/api/getSelectedExistingModelHandler`, {
            existingModelName: existingModelItem.name,
          });
          //setModel(response.data);
          console.log('Response:', response.data);
          //console.log("JSON.stringify(model): " + JSON.stringify(model));
          // const methods = response.data.map(item => item.option.Method);
          // //console.log("Extracted Methods:", methods);
          // //Extract specific properties and set them to model
          // const extractedData = response.data.map(item => ({
          //           modelName: item.model.Name,
          //           method: item.option.Method,
          //           nextAllowable: item.option.NextAllowable,
          //           inputNames: item.option.InputNames,
          //           inputTypes: item.option.InputTypes,
          //           userInput : item.relationship.UserInput,
          //           modelScript: item.model.Script,
          //           // Add any other properties you need
          // }));
          // console.log("Extracted data:", extractedData);
          setPreSetModel([...response.data]);
          
    
          // if (JSON.stringify(extractedData) !== JSON.stringify(model)) {
          //   console.log("inside");
          //   setModel([...extractedData]);
          // }
          
          // console.log("Updated model:", methods); 
        
        } catch (error) {
          console.error('Error:', error);
        }
    };


    if (existingModelItem.name === selectedExistingModel) {
      // If the same folder is clicked, deselect it
      console.log("unselect it ");
      setSelectedExistingModel('');
      setPreSetModel([]);
    } else {
      console.log("select it ");
      setSelectedExistingModel(existingModelItem.name);
      fetchSelectedExistingModel();
    }
  };



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
            <h4 className="card-title">Data selection</h4>
          </div>
          <div className="card-body">
            <div className="row card-container" 
                 style={{ display: 'flex' }}>
              {/* Content for the left section */}
              <div className='left-section' style={{ width: `${leftWidth}%`, marginRight: '2px' }}>
                
                <h5>Selected Folder:</h5>
                <div style={{alignItems: 'center', maxHeight: '220px', overflowY: 'scroll'}}>
                {folders.length === 0 && <p>No folders have been added yet!</p>}
                <ul style={{ listStyleType: 'none', padding: 0 }}>
                  {folders.map((folder) => (
                    <li
                      key={folder}
                      onClick={() => handleFolderClick(folder)}
                      style={{
                        padding: '10px',
                        margin: '5px 0',
                        border: selectedFolder === folder ? '5px solid red' : '2px solid #ccc',
                        cursor: 'pointer'
                      }}
                    >
                      {folder}
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
                
                <h5>Selected Categories:</h5>
                <div style={{alignItems: 'center', maxHeight: '220px', overflowY: 'scroll'}}>
                  {!selectedFolder && <p>Select a folder with active labels.</p>}
                  {selectedFolder && categories.length === 0 && <p>No Active Categories in this folder!</p>}
                  <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {categories.map((category) => (
                      <li
                        key={category.category}
                        onClick={() => handleCategoryClick(category)}
                        style={{
                          padding: '10px',
                          margin: '5px 0',
                          border: selectedCategories.includes(category.category) ? '5px solid red' : '2px solid #ccc',
                          cursor: 'pointer'
                        }}
                      >
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{category.category}</span>
                            <span>{"("+category.count+")"}</span>
                        </div>

                      </li>
                    ))}
                  </ul>
                </div>

              </div>

            </div>
          </div>
        </div>

     {/* Check if existingModel is not null and has elements */}
      {/* {existingModel && existingModel.length > 0 && (  */}
      <div className="card mb-3">
        <div className="card-header">
          <h4 className="card-title">Existing Completed Model Results</h4>
        </div>
        <div className="card-body">
          <div className="row card-container" style={{ display: 'flex' }}>
            {/* Content for the left section */}
            <div className='left-section' style={{ width: `${leftWidth}%`, marginRight: '2px' }}>
              <h5>Selected Completed Model:</h5>
              <div style={{ alignItems: 'center', maxHeight: '220px', overflowY: 'scroll' }}>
              {existingModel.length === 0 && <p>No existing model for the selected folders and cateories!</p>}
                  <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {existingModel.map((existingModelItem) => (
                      <li
                        key={existingModelItem.name}
                        onClick={() => handleExistingModelClick(existingModelItem)}
                        style={{
                          padding: '10px',
                          margin: '5px 0',
                          border: selectedExistingModel === existingModelItem.name ? '5px solid red' : '2px solid #ccc',
                          cursor: 'pointer'
                        }}
                      >
                        {existingModelItem.name} 
                        <br></br>
                        <br></br>
                        (Results: 
                          Accuracy= {existingModelItem.evalAccuracy}, 
                          AvgLoss= {existingModelItem.evalAvgLoss},
                          F1Score= {existingModelItem.evalF1Score},
                          FalsePositiveRate= {existingModelItem.evalFalsePositiveRate},
                          Precision= {existingModelItem.evalPrecision},
                          Recall= {existingModelItem.evalRecall},
                          Rmse= {existingModelItem.evalRmse})
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
                
                <h5>Selected Completed Model Script:</h5>
                <div style={{alignItems: 'center', maxHeight: '220px', overflowY: 'scroll'}}>
                  {/* {!selectedFolder && <p>Select a folder with active labels.</p>}
                  {selectedFolder && categories.length === 0 && <p>No Active Categories in this folder!</p>} */}
                  <ul style={{ listStyleType: 'none', padding: 0 }}>
                    {preSetmodel.map((model) => (
                      <li
                        key={model.name}
                        // onClick={() => handleCategoryClick(category)}
                        style={{
                          padding: '10px',
                          margin: '5px 0',
                          // border: selectedCategories.includes(category.category) ? '5px solid red' : '2px solid #ccc',
                          cursor: 'pointer'
                        }}
                      >
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <pre>{model.script}</pre>
                        </div>

                      </li>
                    ))}
                  </ul>
                </div>

              </div>

          </div>
        </div>
      </div>
    {/* )}  */}
       
      </div>
  );
}

export default DataSelection;
