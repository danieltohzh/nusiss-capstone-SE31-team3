import { Request, Response } from "express";
import { serviceActions as mlmodelService } from "../service/mlmodel.service";

export async function filterMlModelOptionsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { Stages, Types, Methods } = req.body;
    const data = await mlmodelService.filterModelDefinitionOptions(Stages, Types, Methods);
    res.status(200).json(data);
  } catch (error) {
    const err = error as Error;
    res.status(500).send(err.message);
  }
}

export async function getMlModelOptionsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { Method } = req.params;
    const data = await mlmodelService.getModelDefinitionOptions(Method);
    res.status(200).json(data);
  } catch (error) {
    const err = error as Error;
    res.status(500).send(err.message);
  }
}

export async function getModelNextAllowableOptionsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { Method } = req.params;
    const data = await mlmodelService.getModelNextAllowableOptions(Method);
    res.status(200).json(data);
  } catch (error) {
    const err = error as Error;
    res.status(500).send(err.message);
  }
}

export async function createNewModelHandler(req: Request, res: Response): Promise<void> {

  try {
    // const { UserEmail, JobName, MlScript, pyTorchScript, kubernetesToggleSwitch } = req.body;
    const { UserEmail, JobName, MlScript, pyTorchScript} = req.body;
    const dataArray = await mlmodelService.createNewModelAndRelationship(UserEmail, JobName, MlScript, pyTorchScript);

    for (const data of dataArray) {
      mlmodelService.processPyTorchJob(data);
    }

    // if(kubernetesToggleSwitch){
    //   console.log("Run kubernetes");
    //   // Step 2: Loop through the array and handle each job
    //   for (const data of dataArray) {
    //     mlmodelService.processPyTorchJob(data);
    //   }
    // }

    // Send a success response with a message and the data
    res.status(200).send({ message: `Job created successfully` });
  } catch (error) {
    const err = error as Error;
    res.status(500).send(err.message);
  }
}

export async function getSelectedExistingModelHandler(req: Request, res: Response): Promise<void> {
  console.log("Inside getSelectedExistingModelOptionsHandler....");
  try {
    const { existingModelName } = req.body;
    console.log("existingModelName in controller: " , existingModelName);
    const data = await mlmodelService.getSelectedExistingModel(existingModelName);
    // Send a success response with a message and the data
    res.status(200).json(data);
  } catch (error) {
    const err = error as Error;
    res.status(500).send(err.message);
  }
}

export async function getExistingCompletedModelHandler(req: Request, res: Response): Promise<void> {
  console.log("Inside getExistingCompletedModel....");
  try {
    const { classifierCategories, classifierTrainFolder } = req.body;
    console.log("classifierCategories in controller: " , classifierCategories);
    console.log("classifierTrainFolder in controller: " , classifierTrainFolder);
    const data = await mlmodelService.getExistingCompletedModel(classifierCategories,classifierTrainFolder);
    // Send a success response with a message and the data
    res.status(200).json(data);
  } catch (error) {
    const err = error as Error;
    res.status(500).send(err.message);
  }
}


// For Evaluation page 
export const getJobs = async (req: Request, res: Response) => {
    try {
      const { itemsPerPage, pageNumber} = req.params;
      console.log('itemsPerPage: ', itemsPerPage, ', pageNumber: ', pageNumber);
      
      // Convert params to integers
      const itemsPerPageNum = parseInt(itemsPerPage, 10);
      const pageNumberNum = parseInt(pageNumber, 10);

      // Validate if both params are positive integers
      if (!Number.isInteger(itemsPerPageNum) || itemsPerPageNum <= 0 || !Number.isInteger(pageNumberNum) || pageNumberNum <= 0) {
        return res.status(400).json({ error: 'itemsPerPage and pageNumber must be positive integers' });
      }

      const jobs = await mlmodelService.getJobs(itemsPerPageNum, pageNumberNum);
      res.json(jobs);
    } catch (error) {
      console.error('Error fetching jobs: ', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const getModelsInJob = async (req: Request, res: Response) => {
  try {
    const { jobName, itemsPerPage, pageNumber } = req.body;
    console.log('jobName: ', jobName, 
      ', itemsPerPage: ', itemsPerPage, ', pageNumber: ', pageNumber);

    // Convert params to integers
    const itemsPerPageNum = parseInt(itemsPerPage, 10);
    const pageNumberNum = parseInt(pageNumber, 10);

    // Validate if both params are positive integers
    if (!Number.isInteger(itemsPerPageNum) || itemsPerPageNum <= 0 || !Number.isInteger(pageNumberNum) || pageNumberNum <= 0) {
      return res.status(400).json({ error: 'itemsPerPage and pageNumber must be positive integers' });
    }

    if (!jobName) {
      return res.status(400).json({ error: 'jobName must be provided' });
    }

    const models = await mlmodelService.getModelsInJob(jobName, itemsPerPageNum, pageNumberNum);
    res.json(models);
  } catch (error) {
    console.error('Error fetching models: ', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteJobByName = async (req: Request, res: Response) => {
  const { jobName } = req.body;

  try {
    await mlmodelService.deleteJobByName(jobName);
    res.status(200).send({ message: `Job ${jobName} deleted successfully` });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send({ error: error.message });
    } else {
      res.status(500).send({ error: 'Unknown error' });
    }
  }
};

export const deleteModelByName = async (req: Request, res: Response) => {
  const { jobName, modelName } = req.body;

  try {
    await mlmodelService.deleteModelByName(jobName, modelName);
    res.status(200).send({ message: `Model ${modelName} from Job ${jobName} deleted successfully` });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send({ error: error.message });
    } else {
      res.status(500).send({ error: 'Unknown error' });
    }
  }
};

export const getModelEvaluationResults = async (req: Request, res: Response) => {
  const { jobName, modelName } = req.body;

  if (!jobName || !modelName) {
    return res.status(400).json({ error: 'Job name and Model name are required' });
  }

  try {
    const base64Images = await mlmodelService.getModelEvaluationResults(jobName, modelName);
    return res.status(200).json(base64Images);
  } catch (error) {
    console.error('Error fetching model evaluation results:', error);
    return res.status(500).json({ error: 'Could not fetch model evaluation results' });
  }
}

export async function findModelsByStatusController(req: Request, res: Response) {
  try {
    const { status } = req.params;
    const result = await mlmodelService.findModelsByStatus(status);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
}

export async function updateModelStatusByNameController(req: Request, res: Response) {
  try {
    const { modelName, newStatus } = req.body;
    const result = await mlmodelService.updateModelStatusByName(modelName, newStatus);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
}
/*
export async function predictBoundingBoxesController(req: Request, res: Response) {
  try {
    const { modelName, folderName, fileName, base64Image } = req.body;
    if (!modelName || !folderName || !fileName || !base64Image) {
      return res.status(400).json({ error: 'modelName, folderName, fileName, and base64Image are required' });
    }
    const result = await mlmodelService.predictBoundingBoxes(modelName, folderName, fileName, base64Image);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'An unknown error occurred' });
    }
  }
}
//*/
export const handlePyTorchJob = async (req: Request, res: Response) => {
  const jobName = req.body.jobName;
  if (!jobName) {
    return res.status(400).send("jobName is mandatory!");
  }

  try {
    await mlmodelService.processPyTorchJob(jobName);
    res.status(200).send("PyTorch Job is being processed.");
  } catch (error) {
    res.status(500).send("Error processing jobName: " + jobName);
  }
};


