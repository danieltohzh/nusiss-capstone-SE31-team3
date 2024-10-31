import React, { useState, useEffect, useCallback, useContext } from 'react';
import ModelOptionDropdown from './ModelOptionDropdown';
import { Alert } from '@govtechsg/sgds-react/Alert';
import axios from 'axios';
import config from '../../../../../loadConfig';
import { jwtDecode } from 'jwt-decode';
import './TrainingPage.css';
import DataSelection from './DataSelection';
import { ModelContext } from './ModelContext';
import { Modal, Button } from '@govtechsg/sgds-react';
import './TrainingModal.css';
import './Switch.css'; 

function getPayloadSize(payload) {
  const jsonString = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(jsonString).length; // Gets size in bytes
  return bytes;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

function TrainingPage() {
  // State for the left section width
  const [leftWidth, setLeftWidth] = useState(40); // Initial width in percentage
  const [isDragging, setIsDragging] = useState(false);
  // State for model, codes and mlScript
  //const [model, setModel] = useState([]);
  const [codes, setCodes] = useState([]);
  const [mlScript, setMlScript] = useState('nn.Sequential(\n)');
  const [jobName, setJobName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  // State for alert message (Error or success)
  const [disableJobBtn, setDisableJobBtn] = useState(false); 
  const [jobNameError, setJobNameError] = useState('');
  const [errorInputExist, setErrorInputExist] = useState([]);
  const { valueStored, maxInChannelValStored, scriptStored, pyTorchScriptStored, selectedFolder, selectedCategories, setShowAlert, setAlertMessage,model, setModel, preSetmodel, setPreSetModel }  = useContext(ModelContext);
  const pyScriptTemplate = localStorage.getItem('boilerplate');
 

  //For Pagnation Modal (start)
  const [show, setShow] = useState(false);
  const handleClose = () => {setShow(false)

    scriptStored.current = [];
    pyTorchScriptStored.current = []; 
  };
  const itemsPerPage = 1; // Set the number of items per page
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(pyTorchScriptStored.current.length / itemsPerPage);

  // Calculate the starting and ending index of the items to display
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = pyTorchScriptStored.current.slice(startIndex, endIndex);

  const handlePageClick = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  //For Pagnation Modal (end)


  useEffect(() => {
    // Function to decode the JWT token and set the user email
    const decodeJwtToken = () => {
      const jwtCookieValue = getCookie('accessToken');
      // console.log('JWT Cookie Value:', jwtCookieValue);

      if (jwtCookieValue != null) {
        try {
          const decodedToken = jwtDecode(jwtCookieValue);
          // console.log('decodedToken:', decodedToken);
          // console.log('decodedToken.email:', decodedToken.email);
          setUserEmail(decodedToken.email);
        } catch (error) {
          console.error('Error decoding JWT token:', error);
        }
      }
    };

    decodeJwtToken();

  }, []); // Empty dependency array ensures this runs only once after the initial render

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

  useEffect(() => {

  }, [mlScript]);


  /*
   * To ensure that the generator will show instant changes if there are any changes to the codes or model
   * As the selected value for option dropdown is '###', will need to filter it away to avoid being displayed in frontend 
   * After the selected value for option dropdown is '###', code value will become 'undefined', will need to filter it away
  */ 


  useEffect(() => {
    let hasChanges = false;
    console.log("Initial model values:", model);

    // Ensure model is an array
    // if (!Array.isArray(model)) {
    //     console.warn("Model is not an array. Resetting to an empty array.");
    //     setModel([]); // Reset to an empty array
    //     return; // Exit early to prevent further processing
    // }

    // 1. To check for '###' in model array
    if (model.length === 1 && model[0] === '###') {
        setModel([]); // Set to empty if it only contains '###'
        hasChanges = true;
    } else {
        const updatedModelArray = model.filter(item => item !== '###');
        if (updatedModelArray.length !== model.length) {
            setModel(updatedModelArray);
            hasChanges = true;
        }
    }

    // 2. To check for 'undefined' in codes array
    if (codes.length === 1 && codes[0] === 'undefined') {
        setCodes([]); // Reset if only contains 'undefined'
        hasChanges = true;
    } else {
        const updatedCodesArray = codes.filter(item => item !== 'undefined');
        if (updatedCodesArray.length !== codes.length) {
            setCodes(updatedCodesArray);
            hasChanges = true;
        }
    }

    // 3. To check for 'undefined' in errorInputExist array
    if (errorInputExist.length === 1 && errorInputExist[0] === 'undefined') {
        setErrorInputExist([]); // Reset if only contains 'undefined'
        hasChanges = true;
    } else {
        const updatedErrorArray = errorInputExist.filter(item => item !== 'undefined');
        if (updatedErrorArray.length !== errorInputExist.length) {
            setErrorInputExist(updatedErrorArray);
            hasChanges = true;
        }
    }

    // 4. To update and join the latest codes into MLscript
    if (codes.length >= 0) {
        const updatedMlScript = `nn.Sequential(\n    ${codes.join(',\n    ')}\n)`;
        setMlScript(updatedMlScript);
        hasChanges = true;
    }



    // Optionally log other state changes
}, [model, codes, errorInputExist]);


  // To display and allow user to handle the dropdown options 
  const handleModelOptionDropdownChange = (StepValue) => {
    let StrSplit = StepValue.split('%%');
    //console.log("=====================================================================");
    //console.log("StepValue in training page : " + StepValue);
    //console.log("hit 1 - " + StrSplit[0] + " - " + StrSplit[1] + " - " + StrSplit[2] + " - " + StrSplit[3]);
    
    let Affected = parseInt(StrSplit[0], 10);
    let Selected = StrSplit[1];
    let Code = StrSplit[2];
    let errorInInput = StrSplit[5];
    //console.log("errorInInput in training page : " + errorInInput);
    
    // Copy model and codes to modify them
    let newModel = [...model];
    let newCodes = [...codes];
    let newErrorMessageExit = [...errorInputExist];
    
    // console.log("=================== Selected ===================" , Selected);
    // console.log("=================== Affected ===================" , Affected);
    if (Affected <= model.length) {
      if (Selected === "###") {
        // console.log("Hit 1 : To remove element at 'Affected - 1' index ");
        let startIndex = parseInt(Affected, 10) - 1;
        // console.log("startIndex " , startIndex);

        // Use slice to keep elements before the startIndex, effectively removing elements from startIndex to end
        let newModel = model.slice(0, startIndex);
        let newCodes = codes.slice(0, startIndex);
        let newErrorMessageExit = errorInputExist.slice(0, startIndex);
        
        setModel(newModel);
        setCodes(newCodes);
        setErrorInputExist(newErrorMessageExit)
      } else {
        // console.log("Hit 2 : Update or replace element at 'Affected - 1' index ");
        // Update or replace element at `Affected - 1` index
        newModel[Affected - 1] = Selected;
        newCodes[Affected - 1] = Code;
        newErrorMessageExit[Affected-1] = errorInInput;
        setModel(newModel);
        setCodes(newCodes);
        setErrorInputExist(newErrorMessageExit)
      }
    } else if (Affected === model.length + 1) {
      // console.log("Hit 3 : Add new trailing element ");
      // Add new trailing element
      newModel.push(Selected);
      newCodes.push(Code);
      newErrorMessageExit.push(errorInInput);
      setModel(newModel);
      setCodes(newCodes);
      setErrorInputExist(newErrorMessageExit)
      
    }

    // console.log("Updated model:", newModel);
    // console.log("Updated codes:", newCodes);
  };

  // To launch confirmation
  const handleCreateJob = async () => {
    // 1. Validation to double check for empty fields on Job Name, folder & categories 
    setJobNameError(''); // Reset error messages

    if (!selectedFolder.trim()) {
      setAlertMessage("Please select a Folder");
      setShowAlert(true);
      return; 
    }

    if (selectedCategories.length === 0) {
      setAlertMessage("Please select a Category");
      setShowAlert(true);
      return; 
    }


    if (!jobName.trim()) {
        setAlertMessage("Please enter Job Name");
        setShowAlert(true);
        setJobNameError('Job name cannot be empty.');
        return; 
    }


    // 2. To check if there are any existing error that is not rectify in the script portion before script creation 
    const containsError = errorInputExist.some(error => error === 'true');

    if (containsError) {
        setAlertMessage("There are errors present. Please rectify it before job creation");
        setShowAlert(true);
        //console.log("!containsError!");
        return; 
    } else {
      //console.log("No Error!");
      setAlertMessage("");
      setShowAlert(false);
    }

    // 3. To change the boiler template for the folder and neo4j script first and fix it as the main template to do loop
    // const s3FolderRegex = /s3_folder\s*=\s*'([a-zA-Z][a-zA-Z0-9-]*)';/;
    const s3FolderRegex = /s3_folder\s*=\s*'([^']+)';?/; 
    const neo4jQueryRegex = /MATCH\s*\(i:Image\)<-\[b:Labelled\]-\(u\)\s*WHERE\s*i\.folderName\s*=\s*'([^']+)'\s*AND\s*b\.isActive\s*=\s*true\s*AND\s*b\.category\s*IN\s*\[([^\]]+)\]/;
    const sequentialRegex = /nn\.Sequential\s*\(([^()]|(\([^()]*\))|(\s*[^,()]*\s*,\s*)|(\s*[^,()]*\s*))*\)/;
    const simpleRegex = /nn\.Sequential/; // Simplified regex

    //console.log("selectedFolder: " + selectedFolder);
    let updatedTemplate = pyScriptTemplate.replace(s3FolderRegex, `s3_folder = '${selectedFolder}';`);
    //console.log("updatedTemplate after S3 : " , updatedTemplate)

    //console.log("selectedCategories: " + selectedCategories);
    //Replace neo4j categories
    if (neo4jQueryRegex.test(updatedTemplate)) {
      //console.log("inside neo4jQueryRegex.test(updatedTemplate)");
  
      // Join the selected categories into a string format for the query
      const categoriesString = selectedCategories.map(cat => `'${cat}'`).join(', ');
  
      // Perform the replacement
      updatedTemplate = updatedTemplate.replace(neo4jQueryRegex, 
          `MATCH (i:Image)<-[b:Labelled]-(u) WHERE i.folderName = '${selectedFolder}' AND b.isActive = true AND b.category IN [${categoriesString}]`
      );
    }
    //Output the updated template
    //console.log("updatedTemplate after categories: " + updatedTemplate);

    //3.1 To store in the first pyTorch script 
    //console.log("updatedTemplate BEFORE mlScript: " + updatedTemplate);
    // const isMatch = sequentialRegex.test(updatedTemplate);
    // console.log("Does regex match for sequentialRegex?:", isMatch);
    // console.log("mlScript: " + mlScript);
    updatedTemplate = updatedTemplate.replace(sequentialRegex, `${mlScript}`);
    //console.log("updatedTemplate after mlScript: " + updatedTemplate);
    pyTorchScriptStored.current.push(updatedTemplate);

    // 4. To validate create multiple scripts for different models (start)
    // 4.1. To make an array of the first string script 

    scriptStored.current.push(mlScript);
    //console.log("scriptStored: " + scriptStored.current);

    // 4.2. Compare it against the stored values of the max_out_channels 
    const outChannelsVal = [];

    // Loop through the matches
    const regex = /out_channels=(\d+)/g; // Regex to find out_channels values    
    const lines = mlScript.split('\n'); // Split the mlScript into lines
     
    lines.forEach((line, index) => {
        let match = regex.exec(line);
        if (match) {
            outChannelsVal.push(match[1]); // Add found value
        } else {
            outChannelsVal.push(""); // Add empty string if not found
        }
      })

    //console.log("outChannelsVal: " , outChannelsVal); 

    // 4.3 To get all the numbers of power of 2 based on the min and max of out_channels 
    const generatePowersOfTwo = (min, max) => {
      // If min and max are the same or min is greater than or equal to max, return an empty array
      if (min >= max) {
        return [];
      }
      
      const powers = [];
      let value = 1;
    
      // Generate powers of 2 starting from 1
      while (value < min) {
        value *= 2; // Go to the next power of 2
      }
    
      // Collect powers of 2 within the range, excluding the min value
      while (value <= max) {
        if (value > min) { // Exclude the min value
          powers.push(value);
        }
        value *= 2; // Go to the next power of 2
      }

      // Check if value equals max
      if (value === max && max > min) {
        powers.push(max); // Include max if it's a power of 2 and greater than min
      }

      return powers;
    };


    // 4.4 Loop through the array for script generation 
    /*
      1. To loop through min and max for in_channel 
      2. To get all the powers of 2 between min and max for in_channel
      3. To loop through min and max for out_channel 
      4. To get all the powers of 2 between min and max for out_channel 

      maxInChannelValStored.current.forEach((value, index) => {
      
      }) 
    */
    valueStored.current.forEach((value, index) => {
      // Ensure the index is within bounds of outChannelsVal
      if (value !== null && index <= outChannelsVal.length) {
          // 1. Get the corresponding min_out_Channels Value
          const outChannelValue = outChannelsVal[index+1]; 

          // 2. Get The power of 2 
          const theNumOfGenPowersOfTwoVal = generatePowersOfTwo(parseInt(outChannelValue), parseInt(value));
          console.log("theNumOfGenPowersOfTwoVal: " , theNumOfGenPowersOfTwoVal);

          console.log("scriptStored.current.length: " , scriptStored.current.length);
          if(index+1 > 1){
            let currentScriptLength = scriptStored.current.length;
            //the newMlscript will be from scriptStored
            if(theNumOfGenPowersOfTwoVal.length >= 1){
              for (let i = 0; i < currentScriptLength; i++) {
                theNumOfGenPowersOfTwoVal.forEach((loopVal) => {
                  console.log("[inside index+1 loop] loopVal : " + loopVal);
                  // for(index <= scriptStored.current.length);
                  let newMlScript = scriptStored.current[i];
      
                  const lines = newMlScript.split('\n'); // Split the mlScript into lines
                  // console.log("[inside index+1 loop] lines: " + lines);

                  const convLayers = lines.filter(part => part.includes("nn.Conv2d"));
                  // console.log("[inside index+1 loop] convLayers: " + convLayers);
                  // Check if lineToUpdateIndex is valid
                  if (index < lines.length) {
                      const line = lines[index + 1]; // Ensure you are referencing the correct line

                      // To get the previous conv2d value 
                      const previousConv2d = convLayers[convLayers.length - 2];
                      const previousOutChannelsValue = previousConv2d.match(/out_channels=(\d+)/);
                      
                      // console.log(" [inside index+1 loop] previousConv2d: " + previousConv2d); 
                      // console.log(" [inside index+1 loop] previousOutChannelsValue: " + previousOutChannelsValue[1]); 
                      // console.log(" [inside index+1 loop] line: " + line); 

                      // Replace out_channels with loopVal in the specified line
                      const updatedScript = line.replace(
                          /(nn\.Conv2d\(.*?out_channels=)(\d+)/,
                          `$1${loopVal}` // Use template literals to insert loopVal
                      ).replace(
                        /(nn\.Conv2d\(.*?in_channels=)(\d+)/,
                        `$1${previousOutChannelsValue[1]}` // Replace in_channels
                    );
      
                      //console.log(`[inside index+1 loop] updatedScript: `, updatedScript);
      
                      // Update the corresponding line in lines array
                      lines[index + 1] = updatedScript;
      
                      // Log the updated script for the current line
                      //console.log(`[inside index+1 loop] Updated ML Script for line ${index + 1}: `, updatedScript);
                      
                      // Join lines back into a single string if needed
                      const finalUpdatedScript = lines.join('\n');
                      //console.log("[inside index+1 loop] Final Updated ML Script:\n", finalUpdatedScript);
                      
                      // To put it into the boilerTemplate & push into pyTouchScript
                      updatedTemplate = updatedTemplate.replace(sequentialRegex, `${finalUpdatedScript}`);
                      pyTorchScriptStored.current.push(updatedTemplate);
                      //console.log("[inside index+1 loop] pyTorchScript : " + pyTorchScriptStored.current);

                      // Store the final updated script
                      scriptStored.current.push(finalUpdatedScript);
                      //console.log("[inside index+1 loop] finalUpdatedScript: " + scriptStored.current);
                  }
              });
            }

            }

        
          }
          else{
            // 3. If there are power of 2 then do a loop to create more script  
            if(theNumOfGenPowersOfTwoVal.length >= 1){
              
              theNumOfGenPowersOfTwoVal.forEach((loopVal) => {
                // console.log("================================================ " );
                // console.log("loopVal : " + loopVal);
                // console.log("index: " + index);
                // for(index <= scriptStored.current.length);
                let newMlScript = scriptStored.current[index];
                
                const lines = newMlScript.split('\n'); // Split the mlScript into lines
                // console.log("lines: " + lines); 

                const convLayers = lines.filter(part => part.includes("nn.Conv2d"));
                // console.log(" convLayers: " + convLayers); 

                // Find all indices of lines containing nn.Conv2d
                const allConvIndices = lines
                  .map((line, index) => (line.includes("nn.Conv2d") ? index : -1))
                  .filter(index => index !== -1);

                console.log("All nn.Conv2d indices:", allConvIndices);
                // Check if lineToUpdateIndex is valid
                if (index < lines.length) {
                    const line = lines[index + 1]; // Ensure you are referencing the correct line
                    console.log("line: " + line); 
                    console.log("current index : " + index+1);

                    const currentPos = allConvIndices.indexOf(index+1);
                    const nextIndex = currentPos !== -1 && currentPos + 1 < allConvIndices.length ? allConvIndices[currentPos + 1] : null;

                    console.log("Next index:", nextIndex);
                    const line2 = lines[nextIndex];
                    console.log("line2:", line2);
                    

                    // Replace out_channels with loopVal in the specified line
                    const updatedScript = line.replace(
                        /(nn\.Conv2d\(.*?out_channels=)(\d+)/,
                        `$1${loopVal}` // Use template literals to insert loopVal
                    );
                    
                    // Replace in_channels with loopVal in the specified line
                    const updatedScript2 = line2.replace(
                      /(nn\.Conv2d\(.*?in_channels=)(\d+)/,
                      `$1${loopVal}` 
                    );
                    
                    //console.log(`updatedScript: `, updatedScript);
    
                    // Update the corresponding line in lines array
                    lines[index + 1] = updatedScript;
                    lines[nextIndex] = updatedScript2;

    
                    // Log the updated script for the current line
                    //console.log(`Updated ML Script for line ${index + 1}: `, updatedScript);
                    
                    // Join lines back into a single string if needed
                    const finalUpdatedScript = lines.join('\n');
                    //console.log("Final Updated ML Script:\n", finalUpdatedScript);
  
                    // To put it into the boilerTemplate & push into pyTouchScript
                    updatedTemplate = updatedTemplate.replace(sequentialRegex, `${finalUpdatedScript}`);
                    pyTorchScriptStored.current.push(updatedTemplate);
                    //console.log("pyTorchScript : " + pyTorchScriptStored.current);
                    
                    // Store the final updated script
                    scriptStored.current.push(finalUpdatedScript);
                    console.log("finalUpdatedScript: " + scriptStored.current);
                }
            });
            }

        }

      }
  });
  // 4. To validate create multiple scripts for different models (end)

  // 5. To ensure that there is feature & classifier layer selected 
  const containsConv2d = scriptStored.current.some(script => script.includes("Conv2d"));
  const containsFlatten = scriptStored.current.some(script => script.includes("Flatten"));

  if (!containsConv2d){
    console.log("Please select your feature layer.");
    setAlertMessage("Please select your feature layer.");
    setShowAlert(true);
    return;
  }else{
    if (containsFlatten) {
      setAlertMessage("");
      setShowAlert(false);
    } else {
      console.log("Please select your classifier layer after selecting 'Flatten'.");
      setAlertMessage("Please select your classifier layer after selecting 'Flatten'.");
      setShowAlert(true);
      return;
    }

  }

  //Check the payload size 
  const payload = {
        UserEmail: userEmail,
        JobName: jobName,
        MlScript: scriptStored.current,
        pyTorchScript: pyTorchScriptStored.current
  };

  const sizeInBytes = getPayloadSize(payload);
  console.log("pyTorchScript Size: " + pyTorchScriptStored.current.length);
  console.log(`Payload size: ${sizeInBytes} bytes`);

  setShow(true);


  };


  // To insert into neo4j and mongodb
  const handleConfirmJobCreation = async () => {
    console.log("confirm job creation");
    setShow(false);
    // To call API for the insertion 
    try {
      const response = await axios.post(`${config.backendUrl}/api/createModelHandler`, {
        UserEmail: userEmail,
        JobName: jobName,
        MlScript: scriptStored.current,
        pyTorchScript: pyTorchScriptStored.current
        // ,kubernetesToggleSwitch: kubernetesToggleSwitch  
      });
      //console.log('Response:', response.data);
      // Access the success message
      const successMessage = response.data.message || 'Job created successfully!';
      setAlertMessage(successMessage);
      setShowAlert(true);
      setDisableJobBtn(true);
    } catch (error) {
      console.error('Error:', error);
      setAlertMessage('Error creating job. Please try again.');
      setShowAlert(true);
    }

  }

  useEffect(() => {
    console.log("changes in model");
    console.log("change in model values:", model);

}, [model]);


// const [kubernetesToggleSwitch, setKubernetesToggleSwitch] = useState(false);

// const toggleSwitch = () => {
//   setKubernetesToggleSwitch(!kubernetesToggleSwitch);
// }

// useEffect(() => {
//   console.log("kubernetesToggleSwitch:", kubernetesToggleSwitch);

// }, [kubernetesToggleSwitch]);


  return (
    <>
    <Modal show={show} onHide={handleClose} scrollable='true' size="xl">
        <Modal.Header closeButton>
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
          <Modal.Title>Confirm Your PyTorch Script</Modal.Title>

          <div style={{ marginTop: '10px' }}>
            {Array.from({ length: totalPages }, (_, index) => (
              <Button
                key={index + 1}
                variant="light"
                onClick={() => handlePageClick(index + 1)}
                active={currentPage === index + 1}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </div>

        </Modal.Header>
        <Modal.Body className="modal-body">

          {currentItems.map((script, index) => (
            <pre key={index}>
              <code>{script}</code>
            </pre>
          ))}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>

          <Button variant="primary" onClick={handleConfirmJobCreation}>
              Save Changes
          </Button>

        </Modal.Footer>
      </Modal>
      
      <DataSelection />

      <div className="container mt-3">


        {/* New Card */}
        <div className="card mb-3">
          <div className="card-header">
            <h4 className="card-title">Machine Learning Script Builder</h4>
          </div>


          <div className="card-body">
           {/* A toggle switch to run the script either with Kubernetes or no Kubernetes */}
            {/* <div className="switch-container">
              <label className="switch">
                <input type="checkbox" checked={kubernetesToggleSwitch} onChange={toggleSwitch} />
                <span className="slider" />
              </label>
              <span>{kubernetesToggleSwitch ? 'Run Script With Kubernetes' : 'Run Script Without Kubernetes'}</span>
            </div> */}

            <div className="row card-container" style={{ display: 'flex' }}>
              {/* Left Section */}
              <div style={{paddingBottom: '30px', paddingTop: '30px' }}>
                <label htmlFor="jobNameInput" style={{ display: 'block' }}>Job Name:</label>
                <input
                  id="jobNameInput"
                  type="text"
                  onChange={(e) => setJobName(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box', marginTop: '3px' }} />
                  {jobNameError && <div style={{ color: 'red' }}>{jobNameError}</div>} {/* Error message */}
              </div>


              <div>
                  {Array.isArray(model) && model.map((option, index) => (
                      <span key={index + option}>&nbsp; &gt; {option}</span>
                  ))}
              </div>

              {/* <div>
                  {Array.isArray(preSetmodel) && preSetmodel.map((option, index) => (
                      <span key={index + option.method}>&nbsp; &gt; {option.method}</span>
                  ))}
              </div> */}

              <div className='left-section' style={{ width: `${leftWidth}%`, marginRight: '2px' }}>
                  
                  {Array.isArray(model) && ['###', ...model].map((option, index) => (
                      <ModelOptionDropdown
                          key={index + 1}
                          Step={index + 1}
                          Method={option}
                          onChange={handleModelOptionDropdownChange}
                      />
                  ))}

                  {/* {Array.isArray(preSetmodel) && [...preSetmodel].map((option, index) => (
                      <ModelOptionDropdown
                          key={index + 1}
                          Step={index + 1}
                          Method={option.method}
                          onChange={handleModelOptionDropdownChange}
                      />
                  ))} */}

                  {/* Create Job button */}
                  <div style={{ paddingTop: '20px', paddingBottom: '20px' }}>
                      <Button onClick={handleCreateJob} disabled={disableJobBtn}>
                          Create Job
                      </Button>
                  </div>
              </div>


              {/* Draggable Divider */}
              <div
                onMouseDown={startDragging}
                style={{ cursor: 'ew-resize', width: '4px', backgroundColor: 'grey' }}
              ></div>
              {/* Content for the Right Section */}
              <div className="right-section col-md-6" style={{ flex: 1, backgroundColor: '#333', color: '#fff', fontFamily: 'monospace', minHeight: '250px' }}>
                {/* Your text here */}
                <pre>{mlScript}</pre>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default TrainingPage;
