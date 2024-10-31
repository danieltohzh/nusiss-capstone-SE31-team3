import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import config from '../../../../../loadConfig';
import { Alert } from '@govtechsg/sgds-react/Alert';
import { ModelContext } from './ModelContext';

// Validation functions
const isValidInteger = (value) => {
    return /^\d+$/.test(value); // Checks if the value is a non-negative integer
};

const isPowerOfTwo = (num) => num > 2 && (num & (num - 1)) === 0;

const ModelOptionDropdown = ({ Method, Step, onChange }) => {
    const { valueStored, linearOutFeatureStored, flattenStepNum, setFlattenStep, numOfCategorySelected, selectedCategories }  = useContext(ModelContext);
    const [modelOptions, setModelOptions] = useState([]);
    const [selectedMethod, setSelectedMethod] = useState();
    const [step, setStep] = useState(0);
    const [selectedInputNames, setSelectedInputNames] = useState([]);
    const [selectedInputTypes, setSelectedInputTypes] = useState([]);
    const [selectedInputValues, setSelectedInputValues] = useState([]);
    // State to store templates from neo4j 
    const [codeTemplate, setCodeTemplate] = useState('');
    const [stepValueTemplate, setStepValueTemplate] = useState('');
    // State for alert message (Error or success)
    const [errorExist, setErrorExist] = useState(false);
    const [errorMessages, setErrorMessages] = useState(Array(selectedInputTypes.length).fill('')); 


    // Model definition options are fetched
    React.useEffect(() => {
        setSelectedInputNames([]);
        setSelectedInputTypes([]);
        setSelectedInputValues([]);
        if (Method === "###" && parseInt(Step, 10) === 1) {
            //console.log(`Calling ${config.backendUrl}/api/filterMlModelOptions`)
            axios.post(`${config.backendUrl}/api/filterMlModelOptions`, {
                "Stages":[],
                "Types":[],
                "Methods":[...config.initialModelOptions]
            })
                .then(response => {
                    //console.log('Model options fetched 1:', response.data);
                    setModelOptions(response.data);
                    setSelectedMethod(Method); 
                })
                .catch(error => {
                    console.error('Error fetching model options:', error);
                });
        } else {
            console.log("hit here");
            //console.log(`Calling ${config.backendUrl}/api/getMlModelOptions/${Method}`)
            axios.get(`${config.backendUrl}/api/getMlModelOptions/${Method}`)
                .then(response => {
                    //console.log('Model options fetched 2:', response.data);
                    setModelOptions(response.data);
                    setSelectedMethod(Method); 
       
            })
            .catch(error => {
                    console.error('Error fetching model options:', error);
            }); 
        }      
    }, [Method]);



    /*
     * To set the StepValue to bring back to 'TrainingPage.js' for display
     * StepValue is pulled from neo4j db - consisting of 'methodId, method, code, inputNamesStr, inputTypesStr'
    */
    const handleChange = (event) => {
        let StepValue = Step + "%%" + event.target.value;
        console.log("StepValue: " + StepValue);
        const [methodId, method, code, inputNamesStr, inputTypesStr, errorMessageStr] = StepValue.split('%%');
        setCodeTemplate(code); //To set a code template pulled from neo4j
        setStepValueTemplate(StepValue);

        let StrSplit = event.target.value.split('%%');
        if (event.target.value !== "###" && StrSplit[2].length > 0) {
            setSelectedInputNames(StrSplit[2].split(','));
            setSelectedInputTypes(StrSplit[3].split(','));
        } else {
            setSelectedInputNames([]);
            setSelectedInputTypes([]);
            setSelectedInputValues([]);
        }
        onChange(StepValue);
        console.log("event.target.value: " + event.target.value);
        setSelectedMethod(event.target.value);
        setStep(Step);
        //console.log("StrSplit[0]" + StrSplit[0] , " & step: " , Step );
        if(StrSplit[0] === 'Flatten'){
            //console.log("Flatten");
            setFlattenStep(Step);
        }
    };


    // Handle input change
    const handleInputChange = (selectedMethod, index, event) => {
        const { value } = event.target;

        handleInputValidation(selectedMethod, index, event);

        setSelectedInputValues(prevValues => {
            const newValues = [...prevValues];
            newValues[index] = value;
            return newValues;
        });
        //setShowAlert(false);
    };

    useEffect(() => {
        if(selectedMethod !== 'Conv2d'){
            if (Array.isArray(valueStored.current) && valueStored.current[step-1] !== undefined || valueStored.current[step-1] === '' ) {
                valueStored.current[step-1] = null; // Modify the value at the specified index
                //console.log("Updated ref value:", valueStored.current);
            } else {
                //console.log("Updated ref value to push in empty:", valueStored.current);
                valueStored.current.push(null);
            }

            // if (Array.isArray(maxInChannelValStored.current) && maxInChannelValStored.current[step-1] !== undefined || maxInChannelValStored.current[step-1] === '' ) {
            //     maxInChannelValStored.current[step-1] = null; // Modify the value at the specified index
            //     //console.log("Updated ref value:", maxInChannelValStored.current);
            // } else {
            //     //console.log("Updated ref value to push in empty:", maxInChannelValStored.current);
            //     maxInChannelValStored.current.push(null);
            // }
        }

        if(selectedMethod !== 'Linear'){
            if (Array.isArray(linearOutFeatureStored.current) && linearOutFeatureStored.current[step-1] !== undefined || linearOutFeatureStored.current[step-1] === '' ) {
                linearOutFeatureStored.current[step-1] = null; // Modify the value at the specified index
                //console.log("Updated linearOutFeatureStored value:", linearOutFeatureStored.current);
            } else {
                //console.log("Updated linearOutFeatureStored value to push in empty:", linearOutFeatureStored.current);
                linearOutFeatureStored.current.push(null);
            }
        }

        //console.log("valueStored.current....: " + valueStored.current);
    }, [selectedMethod]);


   // Handle input validation
   const handleInputValidation = (selectedMethod, index, event) => {
    const { value } = event.target;
    const inputName = selectedInputNames[index]; 
    let splitStr = selectedMethod.split('%%');

    //console.log('valueStored: ' , valueStored);

    let isValid = true;
    console.log("isValid: " , isValid);
    let errorMessage = '';
    const trimmedValue = value.trim(); // Remove whitespace
    const isInteger = !isNaN(trimmedValue) && Number.isInteger(Number(trimmedValue)); 

    // Your validation logic (start)

    //Validate input based on inputName & General validation such as null values
     if (inputName === 'min_out_channels') {
        isValid = trimmedValue !== '' && isInteger && isPowerOfTwo(Number(trimmedValue));
        if (!isValid) {
            errorMessage = 'min_out_channels cannot be empty & must be an integer value of a power of 2';
        }
    } else if (inputName === 'max_out_channels') {
        console.log("selectedInputValues[index]: " + selectedInputValues[index-1]);
        console.log("trimmedValue: " + trimmedValue);
        isValid = trimmedValue !== '' && isInteger && isPowerOfTwo(Number(trimmedValue)) && Number(trimmedValue) >= Number(selectedInputValues[index-1]); // Check against min_out_channels
        if (!isValid) {
            errorMessage = 'max_out_channels cannot be empty & must be an integer value greater than min_out_channels and a power of 2';
        }
    } else if (inputName === 'dim'){
        isValid = trimmedValue !== '' && isInteger && (trimmedValue === '0' || trimmedValue === '1'); 
        if (!isValid) {
            errorMessage = 'dim cannot be empty & must be an integer value of either 0 or 1';
        }
    } else if (inputName === 'out_features'){
        console.log("numOfCategorySelected in modelOption: " + numOfCategorySelected);
        isValid = trimmedValue !== '' && isInteger; 
        if (!isValid) {
            errorMessage = 'out_features cannot be empty';
        }

    }
    else {
        isValid = trimmedValue !== '' && isInteger; 
        if (!isValid) {
            errorMessage = inputName + ' cannot be empty & must be an integer value';
        }
    }   

    // To validate that the value input for the second min_out_channels & in_channels matches with the first value input for max_out_channels
    if (splitStr[0] === 'Conv2d' && inputName === 'min_out_channels' || inputName === 'in_channels') {  
        // Check if the array length is greater than 1 before accessing
        console.log("valueStored.current.length: " + valueStored.current.length);
        console.log("valueStored.current: " + valueStored.current);
        console.log("step: " + step);

        if (valueStored.current.length > 1 && step != 1) {
            let stepMinus = step-1;
            let previousMaxOutChannel = valueStored.current[stepMinus-1];

            console.log("stepMinus: " , stepMinus);
            console.log("valueStored.current: " , valueStored.current[stepMinus-1]);

            while(stepMinus >= 1 && previousMaxOutChannel === null){
                console.log("hit in");
                stepMinus = stepMinus-1; 
                console.log("stepMinus after valueStored.current[stepMinus-1] !== undefined || valueStored.current[stepMinus-1] !== '': " , stepMinus);
                previousMaxOutChannel = valueStored.current[stepMinus-1]; // To get previous max_out_channels value
                console.log("previousMaxOutChannel value...", previousMaxOutChannel + "....");

            }

            if(previousMaxOutChannel !== undefined && previousMaxOutChannel !== null){
                console.log("previousMaxOutChannel value...", previousMaxOutChannel + "....");
                // Check if previousMaxOutChannel is defined before comparing
                isValid = (previousMaxOutChannel !== undefined && Number(value) > Number(previousMaxOutChannel));
                if (!isValid) {
                    if(inputName === 'min_out_channels'){
                        errorMessage = 'min_out_channels must be more than the previous max_out_channels';
                    }
                    // else{
                    //     errorMessage = 'min_out_channels must match the previous max_out_channels';
                    // }
                    
                }

                if (inputName === 'in_channels') {
                    isValid = Number(value) <= Number(previousMaxOutChannel) && isPowerOfTwo(Number(trimmedValue));
                    if (!isValid) {
                        errorMessage = 'in_channels must be a power of two and less than the previous max_out_channels ';
                    }
                }

            }
            
            // if (step === 1 && inputName === 'in_channels') {
            //     isValid = trimmedValue !== '' && isInteger && trimmedValue === '3'; 
            //     if (!isValid) {
            //         errorMessage = 'in_channels cannot be empty and it must be an integer value of 3';
            //     }
            // } 
        } else {
            //Input Channel fixed at 3 (Only the first one) 
            //if (inputName === 'min_in_channels' || inputName === 'max_in_channels') {
            if (inputName === 'in_channels') {
                isValid = trimmedValue !== '' && isInteger && trimmedValue === '3'; 
                if (!isValid) {
                    errorMessage = 'in_channels cannot be empty and it must be an integer value of 3';
                }
            } 
            console.log("This is the first Conv2d instance, no previous max_out_channels to compare.");
        }
    }

    // To validate that the value input for the second in_features matches with the first value input for out_features
    if (splitStr[0] === 'Linear' && inputName === 'in_features') {  
        // Check if the array length is greater than 1 before accessing
        console.log("step num inside Linear: " + step);
        console.log("flattenStep: " + flattenStepNum);
        console.log("linear stored value: " + linearOutFeatureStored.current);
        //const trimmedValues = linearOutFeatureStored.current.filter(value => value.trim() !== '');

        if (linearOutFeatureStored.current.length > 1 && step != flattenStepNum+1) {
            console.log("LinearOutFeatureStored is not empty");
            let stepMinus = step-1;
            let previousOutFeature = linearOutFeatureStored.current[stepMinus-1];

            console.log("stepMinus: " , stepMinus);
            console.log("previousOutFeature.current: " , previousOutFeature.current[stepMinus-1]);

            if (linearOutFeatureStored.current[stepMinus-1] === undefined || linearOutFeatureStored.current[stepMinus-1] === null){
                stepMinus = stepMinus-1; 
                previousOutFeature = linearOutFeatureStored.current[stepMinus-1]; // To get previous iout_features value
            }else{
                // Check if previousMaxOutChannel is defined before comparing
                console.log("previousOutFeature value...", previousOutFeature);
                isValid = (previousOutFeature !== undefined && Number(value) === Number(previousOutFeature));
                if (!isValid) {
                    errorMessage = 'in_features must match the previous out_features';
                }

            }
            
            if (step === flattenStepNum+1 && inputName === 'in_features') {
                isValid = trimmedValue !== '' && isInteger; // Check for fixed value
                if (!isValid) {
                    errorMessage = 'in_features cannot be empty and it must be an integer value';
                }
            } 
        } else {
            //Input Channel fixed at 3 (Only the first one) 
            if (inputName === 'in_features') {
                console.log("In the else looppp"); 
                isValid = trimmedValue !== '' && isInteger; // Check for fixed value
                if (!isValid) {
                    errorMessage = 'in_features cannot be empty and it must be an integer value';
                }
            } 
            console.log("This is the first Linear instance, no previous out_features to compare.");
        }
    }

    // Your validation logic (end)

    // Set the error message for the specific input index
    const newErrorMessages = [...errorMessages]; // Clone existing messages
    newErrorMessages[index] = isValid ? '' : errorMessage; // Set or clear the error message
    setErrorMessages(newErrorMessages); // Update the state
    setErrorExist(true);

    // If not valid, you can also return or handle accordingly
    if (!isValid) {
        //console.log("Validation failed for:", inputName, errorMessage);
        return false; // Indicate invalid input
    }else {
        // Clear any alerts if validation is successful
        setSelectedInputValues(prevValues => {
            const newValues = [...prevValues];
            newValues[index] = value; // Accept the input as valid
            return newValues;
        });
        setErrorExist(false);

        //Only update the max_out_channels values for Conv2d
        if (splitStr[0] === 'Conv2d' && inputName === 'max_out_channels') {
            // console.log('To save the value for max_out_channels: ' + value);
            // console.log('Step: ' + step);
            // console.log('valueStored.current[0] ' , valueStored.current[0]);
            if (Array.isArray(valueStored.current) && valueStored.current[step-1] !== undefined) {
                valueStored.current[step-1] = value; // Modify the value at the specified index
                //console.log("Updated ref value:", valueStored.current);
            } else {
                valueStored.current.push(value);
            }
            //console.log('value after saving: ' , valueStored);
        }

        //Only update the out_features values for Linear
        if (splitStr[0] === 'Linear' && inputName === 'out_features') {
            console.log('To save the value for out_features: ' + value);
            console.log('Step: ' + step);
            console.log('linearOutFeatureStored.current[0] ' , linearOutFeatureStored.current[0]);
            if (Array.isArray(linearOutFeatureStored.current) && linearOutFeatureStored.current[step-1] !== undefined) {
                linearOutFeatureStored.current[step-1] = value; // Modify the value at the specified index
                //console.log("Updated ref value:", valueStored.current);
            } else {
                linearOutFeatureStored.current.push(value);
            }
            //console.log('value after saving: ' , valueStored);
        }        
        
    } 
}
    
    // (Start) 
    /*
     * From the (Start) to (End): The portion of codes is to 
     * 1. To track and do immediate update for any changes in inputvalues 
     * 2. To update the code portion with the user's input value 
     * 3. To update the updated code portion to the StepValue for display in TrainingPage.js
    */
    useEffect(() => {
        // Filter out empty strings from errorMessages
        const filteredErrors = Array.isArray(errorMessages) 
        ? errorMessages.filter(message => message !== null && typeof message === 'string' && message.trim() !== '')
        : [];
        
        // Check if filteredErrors array has any elements
        if (filteredErrors.length > 0) {
            //console.log("errorMessages is not empty " , errorMessages);
            setErrorExist(true);
        }else{
            setErrorExist(false);
        }
    }, [errorMessages]);

    useEffect(() => {
        //console.log(">>>>>>> selectedInputValues <<<<<< " , selectedInputValues );
        const updatedCode = updateCodeWithUserInputValues(codeTemplate, selectedInputValues,errorExist);
        //console.log(">>>>>>> updatedCode <<<<<< " , updatedCode );
    }, [selectedInputValues, errorExist]);

    const updateCodeWithUserInputValues = (code, values, errorExist) => {
        let updatedCode = code;
    
        // Ensure that your code template variables have {i1}, {i2}.... as it will find and replace
        values.forEach((value, index) => {
            const placeholder = `{i${index + 1}}`;
            //console.log(`Index ${index} Replacing placeholder ${placeholder} with value ${value}`);

            const strValue = String(value);
            const regex = new RegExp(`\\${placeholder}`, 'g'); // Create a regex pattern for the placeholder
            //console.log("regex : " , regex)

            updatedCode = updatedCode.replace(regex, strValue);
        });
    
        // Update the step value with the updated code
        const updatedStepValue = updateStepValue(stepValueTemplate, updatedCode, errorExist);
        onChange(updatedStepValue);
        //console.log("updatedStepValue " , updatedStepValue);
        return updatedCode;
    };

    const updateStepValue = (stepValue, updatedCode, errorExist) => {
        const [methodId, method, , inputNamesStr, inputTypesStr] = stepValue.split('%%');
        return `${methodId}%%${method}%%${updatedCode}%%${inputNamesStr}%%${inputTypesStr}%%${errorExist}%%${valueStored.current}`;
    };
    // (End) 

    return (
        <>

            <div className="dropdown-widget" style={{ display: 'flex', alignItems: 'left' }}>
                <label>{Step})&nbsp;</label>
                <select id={Step+"-ModelOptions"} className="form-control" 
                onChange={handleChange} value={selectedMethod}>
                    <option key={Step+"-None"} value="###">---None Selected---</option>    
                    {modelOptions.map(opt => (
                        <option key={opt.Method} 
                            value={opt.Method+'%%'+opt.Code+'%%'+
                            opt.InputNames.join(',')+'%%'+opt.InputTypes.join(',')}>
                            {opt.Method} ({opt.Name})
                        </option>
                        
                    ))}

                </select> 
            </div>
            <div>
                <table key={Step+"-"+selectedMethod} className="model-options-table"
                       style={{ border: "1px solid gray", width: "100%" }}>
                    <tbody>
                        {selectedInputNames.length === 0 ? (
                            <tr>
                                <td>&nbsp; This method has no parameters.</td>
                            </tr>
                        ) : (
                            <>
                                <tr>
                                    {selectedInputNames.map((inputName, index) => (
                                        <td key={Step+"-"+inputName}
                                            style={{ border: "1px solid gray" }}
                                        >&nbsp; {inputName}</td>
                                    ))}
                                </tr>

                                {/* This is the input type values that require validation : Not just to check integer value, follow the rules of the neuron network  */}
                                <tr>
                                    {selectedInputTypes.map((inputType, index) => (
                                        <td key={index} >
                                            <input
                                                type="text"
                                                value={selectedInputValues[index] || ''}
                                                onChange={(e) => handleInputChange(selectedMethod, index, e)} 
                                                required
                                                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                                            />
                                                <div style={errorExist ? { minHeight: '150px', minWidth: '150px', color: 'red', paddingTop: '8px' } : {}}>
                                                    {errorMessages[index] && <div>{errorMessages[index]}</div>} {/* Error message */}
                                                </div>
                                        </td>
                                    ))}
                                </tr>
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </>
        
    );
};

export default ModelOptionDropdown;