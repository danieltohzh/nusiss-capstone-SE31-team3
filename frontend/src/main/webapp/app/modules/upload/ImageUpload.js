import React, { useCallback, useState, useEffect, useContext } from 'react';
import { useDropzone } from 'react-dropzone';
import JSZip from 'jszip';
import axios from 'axios';
import Pica from 'pica';
import config from '../../../../../loadConfig';
import Modal from 'react-modal';
import Autosuggest from 'react-autosuggest';
import './ImageUpload.css';
import { S3FolderContext } from './S3FolderContext';

const pica = Pica();

const ImageUpload = () => {
  // Consuming S3FolderContext so that ImageLabel can be notified of new folders
  const { folders, setFolders } = useContext(S3FolderContext);
  const { setDropzoneChanged } = useContext(S3FolderContext);

  const [isUploading, setIsUploading] = useState(false);

  const [fileUrls, setFileUrls] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageFolderName, setImageFolderName] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const convertToPng = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, ".png"), { type: 'image/png' }));
        }, 'image/png');
      };
      img.onerror = reject;
    });
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const isValidImageFolderName = /^[a-z][a-z0-9-]*$/.test(imageFolderName);
    if (!isValidImageFolderName) {
      alert('Invalid ImageFolderName: must be alphanumeric, must start with an alphabet, and cannot contain special characters except dashes.');
      return;
    }

    // Process files if imageFolderName is valid
    try {
      setIsUploading(true);
      const zipFiles = acceptedFiles.filter(file => file.name.endsWith('.zip'));
      const imageFiles = acceptedFiles.filter(file => 
        file.name.endsWith('.png') || 
        file.name.endsWith('.jpg') || 
        file.name.endsWith('.jpeg')
      );

      const processZipFiles = zipFiles.map(file => {
        return JSZip.loadAsync(file).then(zip => {
          const zipPngFiles = [];
          zip.forEach((relativePath, zipEntry) => {
            if (zipEntry.name.endsWith('.png')) {
              zipPngFiles.push(zipEntry.async('blob').then((blob) => new File([blob], zipEntry.name, { type: 'image/png' })));
            } else if (zipEntry.name.endsWith('.jpeg') || zipEntry.name.endsWith('.jpg')) {
              zipPngFiles.push(zipEntry.async('blob').then((blob) => convertToPng(new File([blob], zipEntry.name))));
            }
          });
          return Promise.all(zipPngFiles);
        });
      });

      const processImageFiles = imageFiles.map(file => {
        if (file.name.endsWith('.jpeg') || file.name.endsWith('.jpg')) {
          return convertToPng(file);
        }
        return Promise.resolve(file);
      });

      Promise.all([...processZipFiles, ...processImageFiles]).then((results) => {
        const allPngFiles = results.flat();
        const formData = new FormData();
        formData.append('imageFolderName', imageFolderName);
        allPngFiles.forEach((file) => {
          formData.append('files', file);
        });

        console.log('Uploading files:', allPngFiles);

        axios.post(`${config.backendUrl}/api/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }).then((response) => {
          setFolders([...folders, imageFolderName]);
          setDropzoneChanged(prev => !prev);
          setFileUrls(response.data.fileUrls);
          setIsModalOpen(true);
        }).catch((error) => {
          console.error('Error uploading files:', error);
          alert('Error uploading files: ' + error);
        }).finally(() => {
          setIsUploading(false);
        });  
      });
    } catch (error) {
      console.error('Error processing files:', error);
      alert('Error processing files: ' + error);
      setIsUploading(false);
    } 
    
  }, [imageFolderName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: 'image/png,image/jpeg,image/jpg,application/zip',
    multiple: true,
  });

  useEffect(() => {
    // Fetch the folder names from the API
    axios.get(`${config.backendUrl}/api/imagefolders`)
        .then(response => {
            setFolders(response.data.folders);
        })
        .catch(error => {
            console.error('Error fetching folders:', error);
        });
  }, []);

  //const handleImageFolderNameChange = (event) => {
  //  const value = event.target.value.trim().toLowerCase();
  const handleImageFolderNameChange = (event, { newValue }) => {
    const value = newValue.trim().toLowerCase();
    const isValid = /^[a-z][a-z0-9-]*$/.test(value);
    const InvalidImageFolderNameMsg = 'Invalid ImageFolderName: must be alphanumeric, must start with an alphabet, cannot start with a number, and cannot contain special characters except dashes.';

    if (isValid || value === '') {
      setImageFolderName(value);
    } else {
      // Optionally, you can handle invalid input here, e.g., show an error message
      console.error(InvalidImageFolderNameMsg);
      // Show an alert popup for invalid input
      alert(InvalidImageFolderNameMsg);
    }
  };

  // Autosuggest functions
  const getSuggestions = (value) => {
      const inputValue = value.trim().toLowerCase();
      const inputLength = inputValue.length;

      return inputLength === 0 ? [] : folders.filter(folder =>
          folder.toLowerCase().includes(inputValue)
      );
  };

  const getSuggestionValue = (suggestion) => suggestion;

  const renderSuggestion = (suggestion) => (
      <div>
          {suggestion}
      </div>
  );

  const onSuggestionsFetchRequested = ({ value }) => {
      setSuggestions(getSuggestions(value));
  };

  const onSuggestionsClearRequested = () => {
      setSuggestions([]);
  };


  const closeModal = () => {
    setIsModalOpen(false);
  };

  const dropzoneStyle = {
    border: isDragActive ? '4px dashed blue' : '4px solid blue',
    padding: '20px',
    textAlign: 'center',
    borderRadius: '10px',
    transition: 'border 0.3s ease-in-out',
    fontSize: '24px', // Adjust text size
    color: 'blue', // Set text color to blue
    fontWeight: 'bold' // Make text bold
  };

  return (
    <div className="container mt-3">
    <div className="card mb-3">
        <div className="card-header">
            <h4 className="card-title">Image Uploading Dropzone</h4>
        </div>
        <div className="card-body">
            {/* <input
            type="text"
            value={imageFolderName}
            onChange={handleImageFolderNameChange}
            placeholder="Enter Image Folder Name"
            style={{ marginBottom: '20px', padding: '10px', fontSize: '16px', width: '100%' }}
        /> */}
            <Autosuggest
                suggestions={suggestions}
                onSuggestionsFetchRequested={onSuggestionsFetchRequested}
                onSuggestionsClearRequested={onSuggestionsClearRequested}
                getSuggestionValue={getSuggestionValue}
                renderSuggestion={renderSuggestion}
                inputProps={{
                    placeholder: 'Enter Image Folder Name',
                    value: imageFolderName,
                    onChange: handleImageFolderNameChange,
                    style: { marginBottom: '20px', padding: '10px', fontSize: '16px', width: '100%' }
                }}
            />
        <div {...getRootProps()} className="dropzone" style={dropzoneStyle}>
          <input {...getInputProps()} />
          {isDragActive ? (
            <p>Drop the files here ...</p>
          ) : 
            isUploading ? (
              <p>Uploading images... please wait!</p>
            ) : (
              <p>Drag 'n' drop some files here, or click to select files</p>
            )
          }
        </div>

            {/* Modal for displaying uploaded files */}
            <Modal
                isOpen={isModalOpen}
                onRequestClose={closeModal}
                contentLabel="Uploaded Files"
                style={{
                    content: {
                        top: '50%',
                        left: '50%',
                        right: 'auto',
                        bottom: 'auto',
                        marginRight: '-50%',
                        transform: 'translate(-50%, -50%)',
                    },
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2>{fileUrls.length} Uploaded Files</h2>
                    <button 
                      onClick={closeModal}
                      style={{
                        backgroundColor: '#c91306', // Dark red background
                        color: 'white', // White text
                        fontSize: '22px', // Font size
                        border: 'none', // Remove default border
                        padding: '7px 15px', // Add some padding
                        cursor: 'pointer', // Change cursor to pointer
                        borderRadius: '5px' // Optional: Add border radius for rounded corners
                      }}
                      >X</button>
                </div>
                <ul style={{ maxHeight: '450px', overflowY: 'scroll', marginTop: '12px' }}>
                    {fileUrls.map((url, index) => (
                        <li key={index}>
                            <a href={url} target="_blank" rel="noopener noreferrer">
                                {url}
                            </a>
                        </li>
                    ))}
                </ul>
            </Modal>
        </div>
    </div>
    </div>
  );
};

export default ImageUpload;



