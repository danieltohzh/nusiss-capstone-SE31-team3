import React, { useCallback, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import config from '../../../../../loadConfig';
import './ImageLabel.css';
import { S3FolderContext } from './S3FolderContext';
import { AuthContext } from '../userManagement/AuthContext';

const ImageLabel = () => {
    // Consume AuthContext to identify the user
    const { user } = useContext(AuthContext);

    // State for the left section width
    const [leftWidth, setLeftWidth] = useState(40); // Initial width in percentage
    const [isDragging, setIsDragging] = useState(false);

    // Consume S3FolderContext
    const { folders, setFolders } = useContext(S3FolderContext);
    const { dropzoneChanged } = useContext(S3FolderContext);
    // State for the image folders and selecting images from a folder
    const [selectedFolder, setSelectedFolder] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);

    // State for retrieving images in a paginated manner
    const [images, setImages] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalNumOfPages, setTotalNumOfPages] = useState(0);
    const [loading, setLoading] = useState(false);

    // State for the image bounding box and category labelling
    const [boundingBoxes, setBoundingBoxes] = useState([]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState(null);

    // State for Model selection
    const [availableModels, setAvailableModels] = useState([]);
    const [selectedModel, setSelectedModel] = useState('');

    useEffect(() => {
        const fetchModels = async () => {
          try {
            const response = await axios.get(`${config.backendUrl}/models/status/D`);
            setAvailableModels(response.data);
          } catch (error) {
            console.error('Error fetching models by status:', error);
          }
        };
    
        fetchModels();
    }, [selectedImage]);

    const predictBoundingBoxes = async (modelName, base64Image) => {
        try {
          const response = await axios.post(`${config.flaskUrl}/predict`, {
            modelName,
            folderName: selectedFolder,
            fileName: selectedImage.name,
            base64Image
          });
          console.log('Predicted bounding boxes:', response.data);
          return response.data;
        } catch (error) {
          console.error('Error predicting bounding boxes:', error);
          return null;
        }
    };
    const handlePredictNow = async () => {
        if (selectedModel && selectedImage) {
          const base64Image = selectedImage.data; // Base64 image data
          await predictBoundingBoxes(selectedModel, base64Image)
          .then(() => {
            getBoundingBoxes(selectedImage.name);
          });
        }
    };

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

    useEffect(() => {
        if (selectedFolder) {
            fetchImages(selectedFolder, currentPage);
        }
    }, [selectedFolder, currentPage, dropzoneChanged]);

    const fetchImages = (folder, pageNumber) => {
        setLoading(true);
        setSelectedImage(null);
        setBoundingBoxes([]);
        axios.get(`${config.backendUrl}/api/imagefetch`, {
            params: {
                folder,
                itemsPerPage: 20,
                pageNumber,
            }
        })
        .then(response => {
            if (response.data && Array.isArray(response.data.images)) {
                const fetchedImages = response.data.images.map(image => ({
                    name: image.name,
                    data: `data:image/png;base64,${image.data}`
                  }));
                setImages(fetchedImages);
                setTotalNumOfPages(response.data.totalNumOfPages);
            } else {
                console.error('Error fetching images: ', response.data);
            }
        })
        .catch(error => {
            console.error('Error fetching images:', error);
        })
        .finally(() => {
            setLoading(false);
        });
    };

    const handlePageClick = (pageNumber) => {
        setImages([]);
        setSelectedImage(null);
        setBoundingBoxes([]);
        setLoading(true);
        setCurrentPage(pageNumber);
    };

    const handleFolderChange = (event) => {
        setSelectedFolder(event.target.value);
        setImages([]);
        setCurrentPage(1);
    };

    const handleDeleteFolder = async () => {
        if (!selectedFolder) return;
    
        if (window.confirm(`Are you sure you want to delete the folder "${selectedFolder}"?`)) {
          try {
            await axios.delete(`${config.backendUrl}/api/deleteFolder/${selectedFolder}`);
            setFolders(folders.filter(folder => folder !== selectedFolder));
            setSelectedFolder('');
            setImages([]);
            setCurrentPage(1);
            setTotalNumOfPages(0);
          } catch (error) {
            console.error(`Error deleting folder ${selectedFolder}:`, error);
          }
        }
    };

    // Image selection

    const handleImageClick = async (image) => {
        setSelectedImage(image);
        setBoundingBoxes([]); // Reset bounding boxes when a new image is selected
        getBoundingBoxes(image.name);
    };
    const getBoundingBoxes = async (imageName) => {
        try {
            const response = await axios.get(`${config.backendUrl}/api/labels/${selectedFolder}/${imageName}`);
            if (response.data) {
                setBoundingBoxes(sortImagesByAttribute(response.data,'category'));
            } else {
                setBoundingBoxes([]);
            }
        } catch (error) {
            console.error('Error fetching labels for image:', error);
        }
    };
    const handleDeleteImage = async (folderName, fileName) => {
        if (window.confirm('Are you sure you want to delete this image?')) {
            setSelectedImage(null);
            setBoundingBoxes([]); // Reset bounding boxes when an image is deleted
            console.log('Deleting image from folderName: ', folderName,', fileName: ', fileName);
            try {
            await axios.delete(`${config.backendUrl}/api/deleteImage`, {
                data: {
                folderName,
                fileName,
                },
            }).then(async response => {
                console.log('Image deletion status: ', response.data);
                // Refresh images after deletion
                fetchImages(selectedFolder);
            });
            } catch (error) {
            console.error('Error deleting image:', error);
            }
        }
    };

    const imageItemStyle = (image) => ({
        border: selectedImage === image ? '5px solid red' : '1px solid #ccc',
        padding: '3px',
    });

    const handleActiveOrShownChange = async (box, isChangeActive) => {
        if (isChangeActive) {
            box.isActive = !box.isActive;
        } else {
            box.isShown = !box.isShown;
        };
        // Call the /api/label endpoint
        try {
            const response = await axios.post(`${config.backendUrl}/api/label`, {
                folderName: selectedFolder,
                fileName: selectedImage.name,
                email: box.email, 
                name: box.name,
                category: box.category,
                x: box.x,
                y: box.y,
                width: box.width,
                height: box.height,
                isActive: box.isActive,
                isShown: box.isShown,
            });
            console.log('Label saved:', response.data);
        } catch (error) {
            console.error('Error saving label:', error);
        }
        try {
            const response = await axios.get(`${config.backendUrl}/api/labels/${selectedFolder}/${selectedImage.name}`);
            if (response.data) {
                console.log('Labels: ', response.data);
                setBoundingBoxes(sortImagesByAttribute(response.data,'category'));
            } else {
                setBoundingBoxes([]);
            }
        } catch (error) {
            console.error('Error fetching labels for image:', error);
        }
        setStartPoint(null);
    };

    // Image Labelling

    const handleMouseDown = (e) => {
      if (isDrawing) {
        const rect = e.target.getBoundingClientRect();
        setStartPoint({ 
            x: e.clientX - rect.left, 
            y: e.clientY - rect.top,
            width: 0, 
            height: 0 
        });
      }
    };

    const handleMouseMove = (e) => {
        if (isDrawing && startPoint) {
            const rect = e.target.getBoundingClientRect();
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            setStartPoint((prevPoint) => ({
                ...prevPoint,
                width: currentX - prevPoint.x,
                height: currentY - prevPoint.y,
            }));
        } else {
            return;
        }
    };
    
    const handleMouseUp = async (e) => {
      if (isDrawing && startPoint) {
        const rect = e.target.getBoundingClientRect();
        const endPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const imageWidth = rect.width;
        const imageHeight = rect.height;
        let newBox = {
          x: Math.min(startPoint.x, endPoint.x) / imageWidth,
          y: Math.min(startPoint.y, endPoint.y) / imageHeight,
          width: Math.abs(startPoint.x - endPoint.x) / imageWidth,
          height: Math.abs(startPoint.y - endPoint.y) / imageHeight,
        };

        const category = prompt("Enter a Category for the selected image:");
        if (category !== null) {
            newBox.category = category
            .toLowerCase() // Convert to lowercase
            .trim() // Trim spaces at the front and back
            .replace(/[^a-z0-9]+/g, '-'); // Replace non-alphanumeric characters with dashes
            console.log("Labelled image: ", category + ", X: " + newBox.x + ", Y: " + newBox.y + ", Width: " + newBox.width + ", Height: " + newBox.height);
        
            // Call the /api/label endpoint
            try {
                const response = await axios.post(`${config.backendUrl}/api/label`, {
                    folderName: selectedFolder,
                    fileName: selectedImage.name,
                    email: user.email, 
                    category: newBox.category,
                    x: newBox.x,
                    y: newBox.y,
                    width: newBox.width,
                    height: newBox.height,
                    isActive: true,
                    isShown: true,
                });
                console.log('Label saved:', response.data);
                setIsDrawing(false);
            } catch (error) {
                console.error('Error saving label:', error);
                setIsDrawing(false);
            }
        
        } else {
            console.log("User cancelled the image labelling operation.");
        }
        
        try {
            const response = await axios.get(`${config.backendUrl}/api/labels/${selectedFolder}/${selectedImage.name}`);
            if (response.data) {
                setBoundingBoxes(sortImagesByAttribute(response.data,'category'));
            } else {
                setBoundingBoxes([]);
            }
        } catch (error) {
            console.error('Error fetching labels for image:', error);
        }
        setStartPoint(null);
      }
    };

    const handleDeleteLabel = async (label) => {
      if (window.confirm('Are you sure you want to delete this label?')) {
        try {
            //console.log(user.email, selectedFolder, selectedImage.name, label.category);
            await axios.delete(`${config.backendUrl}/api/deleteImageLabel`, {
                data: {
                    email: label.email,
                    modelName: label.name,
                    folderName: selectedFolder,
                    fileName: selectedImage.name,
                    category: label.category,
                }
            });
            // Refresh bounding boxes after deletion
            const response = await axios.get(`${config.backendUrl}/api/labels/${selectedFolder}/${selectedImage.name}`);
            if (response.data) {
                setBoundingBoxes(sortImagesByAttribute(response.data,'category'));
            } else {
                setBoundingBoxes([]);
            }
        } catch (error) {
            console.error('Error deleting label:', error);
        }
      }
    };


    // card-divider dragging functionality
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

        {/* New Card */}
        <div className="card mb-3">
          <div className="card-header">
            <h4 className="card-title">Image Bounding-Box & Category Labelling</h4>
          </div>
          <div className="card-body">
            <div className="row card-container" style={{ display: 'flex' }}>
              {/* Left Section */}
              <div className='left-section' style={{ width: `${leftWidth}%`, marginRight: '2px'}}>
                {/* Content for the left section */}
                {/* <label htmlFor="folder-select">Select Folder:</label> */}
                <div className="folder-dropdown">
                    <select
                        id="folder-select"
                        value={selectedFolder}
                        onChange={handleFolderChange}
                        style={{ padding: '10px', marginBottom: '10px',
                                fontSize: '16px', width: '100%' }}
                    >
                        <option value="" disabled>-- Select a folder --</option>
                        {folders.map(folder => (
                            <option key={folder} value={folder}>
                                {folder}
                            </option>
                        ))}
                    </select>
                    { selectedFolder && 
                        <button className="delete-folder-button" 
                                onClick={handleDeleteFolder}>
                        X
                        </button>
                    }
                </div>
                
                { totalNumOfPages > 1 && 
                <div className="pagination" style={{overflowX: "auto", maxWidth: "100%"}}>
                    {Array.from({ length: totalNumOfPages }, (_, index) => (
                    <button
                        key={index + 1}
                        className={`pagination-button ${currentPage === index + 1 ? 'active' : ''}`}
                        onClick={() => handlePageClick(index + 1)}
                    >
                        {index + 1}
                    </button>
                    ))}
                </div>
                }

                {loading ? <h2><em>Loading...</em></h2> : null}

                {/* Image list view */}
                <div className="image-list" style={{ 
                    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
                    maxHeight: '75vh', overflowY: 'auto'
                 }}>
                    {images.length === 0 && !loading && (
                        <div style={{ gridColumn: 'span 2', textAlign: 'center', fontSize: '20px' }}>
                            Select a folder that contains images.
                        </div>
                    )}
                    {images.map((image, index) => (
                        <div
                            key={index}
                            className="image-list-item"
                            style={imageItemStyle(image)}
                            onClick={() => handleImageClick(image)}
                        >
                            <img src={image.data} alt={`${index}`} style={{ width: '100%' }} />
                            <div
                                className="delete-image-button"
                                onClick={() => handleDeleteImage(selectedFolder, image.name)}
                                >
                                X
                            </div>
                        </div>
                    ))}
                </div>

              </div>

              {/* Draggable Divider */}
              <div
                onMouseDown={startDragging}
                style={{ cursor: 'ew-resize', width: '4px', backgroundColor: 'grey' }}
              ></div>

              {/* Content for the Right Section */}
              <div className="right-section col-md-6" style={{ flex: 1, minHeight: '250px' }}>
                {selectedImage ? 
                <>
                    <div>
                        {selectedModel === '' ? (
                            <button onClick={() => setIsDrawing(!isDrawing)}>
                                {isDrawing ? 'Disable Drawing' : 'Enable Drawing'}
                            </button>
                        ) : (
                            <button onClick={handlePredictNow}>Predict Now</button>
                        )}
                        
                        <select 
                        value={selectedModel} 
                        onChange={(e) => setSelectedModel(e.target.value)} 
                        style={{marginLeft: '12px', width: '250px'}}>
                            {availableModels.length === 0 ? (
                                <option value="" disabled>
                                    --No models available--
                                </option>
                            ) : (
                                <>
                                <option value="">
                                    --No model selected--
                                </option>
                                {availableModels.map((modelName, index) => (
                                    <option key={modelName} value={modelName}>
                                    {modelName}
                                    </option>
                                ))}
                                </>
                            )}
                        </select>
                    </div>
                    
                    <div
                        style={{ position: 'relative', cursor: isDrawing ? 'crosshair' : 'default' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                    >
                        <img
                            src={selectedImage.data}
                            alt="Selected"
                            style={{ width: '100%', userSelect: 'none' }}
                            draggable="false"
                        />
                        {boundingBoxes.map((box, index) => (
                            box.isShown && (
                                <div key={index}>
                                    <div
                                        style={{
                                            position: 'absolute',
                                            border: '5px solid '+`${box.isActive ? '#04bd3b' : '#e60e0e'}`,
                                            left: `${box.x * 100}%`, //`${box.x}px`,
                                            top: `${box.y * 100}%`,
                                            width: `${box.width * 100}%`,
                                            height: `${box.height * 100}%`,
                                            pointerEvents: 'none',
                                        }}
                                    ></div>
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: `${box.x * 100}%`,
                                            top: `${(box.y + box.height) * 100}%`,
                                            backgroundColor: `${box.isActive ? '#04ba3a' : '#d00202'}`,
                                            color: '#fff',
                                            padding: '2px 5px',
                                            cursor: 'pointer',
                                        }}
                                        className="bounding-box-info"
                                    >
                                        {box.category} 
                                        <span className='bounding-box-delete'>
                                            <span 
                                            style={{padding: '5px', backgroundColor: '#eb9e10'}}
                                            onClick={() => handleDeleteLabel(box)}>
                                                X
                                            </span>
                                            <span style={{
                                                padding: '5px',
                                                color: '#fff9a1',
                                                backgroundColor: `${box.isActive ? '#04ba3a' : '#d00202'}`}}>
                                                {box.email ? box.email : box.name}
                                            </span>
                                        </span>
                                        <div className="bounding-box-details"
                                        style={{backgroundColor: `${box.isActive ? '#04ba3a' : '#d00202'}`}}>
                                            X: {(box.x * 100).toFixed(2)}%, Y: {(box.y * 100).toFixed(2)}%, 
                                            Width: {(box.width * 100).toFixed(2)}%, Height: {(box.height * 100).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                            )       
                        ))}
                        {startPoint && (
                            <div
                            className="bounding-box"
                            style={{
                                left: `${startPoint.x}px`,
                                top: `${startPoint.y}px`,
                                width: `${startPoint.width}px`,
                                height: `${startPoint.height}px`,
                            }}
                            />
                        )}
                    </div> 
                    {/* Table for labels */}
                    <div style={{ marginTop: '10px', overflowX: 'scroll', overflowY: 'auto' }}>
                        <table style={{ width: '900px', 
                            borderCollapse: 'collapse', border: '1px solid black' }}>
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Active</th>
                                    <th>Show</th>
                                    <th>X</th>
                                    <th>Y</th>
                                    <th>Width</th>
                                    <th>Height</th>
                                    <th>Labeller</th>
                                </tr>
                            </thead>
                            <tbody>
                                {boundingBoxes.length === 0 && (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: 'center' }}>
                                            No bounding-boxes saved for this image.
                                        </td>
                                    </tr>
                                )}
                                {boundingBoxes.map((box, index) => (
                                    <tr key={index}>
                                        <td>{box.category}</td>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={box.isActive}
                                                onChange={() => handleActiveOrShownChange(box, true)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={box.isShown}
                                                onChange={() => handleActiveOrShownChange(box, false)}
                                            />
                                        </td>
                                        <td>{(box.x * 100).toFixed(2)}%</td>
                                        <td>{(box.y * 100).toFixed(2)}%</td>
                                        <td>{(box.width * 100).toFixed(2)}%</td>
                                        <td>{(box.height * 100).toFixed(2)}%</td>
                                        <td>{box.email ? box.email : box.name}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
                : 
                <div style={{ gridColumn: 'span 2', textAlign: 'center', fontSize: '20px' }}>
                    Select an image to label.
                </div>
                }
              </div>
            </div>
          </div>
        </div>

        
      </div>
    );
};

const sortImagesByAttribute = (images, attribute) => {
  return images.sort((a, b) => {
    if (a[attribute] < b[attribute]) {
      return -1;
    }
    if (a[attribute] > b[attribute]) {
      return 1;
    }
    return 0;
  });
};

export default ImageLabel;
