//This file will handle all of the express routes
import { Express, Request, Response } from "express";
import cors from "cors";
import validateResource from "./middleware/validateResource";
import { createUserHandler, getAllUsersHandler } from "./controller/user.controller";
import { createUserSchema } from "./dbSchema/user.schema";
import { googleOauthHandler } from "./controller/session.controller";
import { createSessionSchema } from "./dbSchema/session.schema";
import requireUser from "./middleware/requireUser";
import { getJobs, getModelsInJob, deleteJobByName, deleteModelByName, 
    getModelEvaluationResults, findModelsByStatusController, 
    updateModelStatusByNameController, 
    //predictBoundingBoxesController, 
    handlePyTorchJob, filterMlModelOptionsHandler, getMlModelOptionsHandler, 
    getModelNextAllowableOptionsHandler, createNewModelHandler, 
    getSelectedExistingModelHandler, getExistingCompletedModelHandler  
} from "./controller/mlmodel.controller";

import multer from 'multer';
import { uploadImages, listImageFolders, deleteFolder, fetchImagesFromFolder, 
    deleteImage, labelImage, deleteImageLabel, deleteImageLabels, getLabelsForImage, 
    getActiveCategoriesInFolder 
} from './controller/upload.controller';

/*
npm install typescript -g --save-dev
npm install ts-node -g --save-dev
ts-node server.ts
*/

// TO START BACKEND IN DEV ENVIRONMENT
// npm run start:dev

const upload = multer({ storage: multer.memoryStorage() });

function routes(app: Express){
    // Enable CORS for all routes
    app.use(cors());

    app.get('/healthcheck', (req: Request, res: Response) => res.sendStatus(200));
    // For login and user 
    app.post('/api/createUserHandler', createUserHandler);
    app.get('/api/getAllUsersHandler', getAllUsersHandler);
    // app.post('/api/sessions', validateResource(createSessionSchema), createUserSessionHandler);
    // app.get('/api/sessions', requireUser, getUserSessionsHandler);
    // app.delete('/api/deleteSessions', requireUser, deleteSessionHandler);
    app.get('/api/sessions/oauth/google', googleOauthHandler);

    //For Training Page 
    app.post('/api/filterMlModelOptions', filterMlModelOptionsHandler);
    app.get('/api/getMlModelOption/:Method', getMlModelOptionsHandler);
    app.get('/api/getMlModelOptions/:Method', getModelNextAllowableOptionsHandler);
    app.post('/api/createModelHandler', createNewModelHandler);
    app.post('/api/getSelectedExistingModelHandler', getSelectedExistingModelHandler);
    app.post('/api/getExistingCompletedModelHandler', getExistingCompletedModelHandler);
    
    // for image upload
    app.post('/api/upload', upload.array('files'), uploadImages);
    // for listing image folders
    app.get('/api/imagefolders', listImageFolders);
    app.delete('/api/deleteFolder/:folderName', deleteFolder);
    // for fetching images from a folder in a paginated way
    app.get('/api/imagefetch', fetchImagesFromFolder);
    app.delete('/api/deleteImage', deleteImage);
    // for labelling an image with bounding box and category
    app.post('/api/label', labelImage);
    app.delete('/api/deleteImageLabel', deleteImageLabel);
    app.delete('/api/deleteImageLabels', deleteImageLabels);
    
    // to get labels for a specific image
    app.get('/api/labels/:folderName/:fileName', getLabelsForImage);
    // to get active categories for a specific folder
    app.get('/get-categories-in-folder/:folderName', getActiveCategoriesInFolder);

    // Routes for Containerising PyTorch, to run Kubernetes Jobs
    app.post("/run-pytorch-job", handlePyTorchJob);

    // ML Model Management Routes
    app.get('/get-jobs/:itemsPerPage/:pageNumber', getJobs);
    app.post('/get-models-in-job', getModelsInJob);
    app.post('/delete-job', deleteJobByName);
    app.post('/delete-model', deleteModelByName);
    app.post('/getModelEvaluationResults', getModelEvaluationResults);
    app.get('/models/status/:status', findModelsByStatusController);
    app.post('/models/status', updateModelStatusByNameController);
    //app.post('/predictBoundingBoxes', predictBoundingBoxesController);
    
}

export default routes;