import { Request, Response } from 'express';
import { uploadToS3, listS3Folders, fetchActiveCategoriesInFolder, deleteS3Folder, fetchImages, deleteS3Image, labelImageService, getLabelsForImageService, deleteImageLabelService, deleteImageLabelsService } from '../service/upload.service';

export const uploadImages = async (req: Request, res: Response) => {
  try {
    const imageFolderName = req.body.imageFolderName;
    const files = req.files as Express.Multer.File[];

    if (!imageFolderName || !files) {
      console.log("error 400 : imageFolderName and files are required.")
      return res.status(400).json({ message: 'imageFolderName and files are required' });
    }

    const fileUrls = await uploadToS3(imageFolderName, files);

    res.status(200).json({ fileUrls });
  } catch (error) {
    console.error('Error uploading images:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const listImageFolders = async (req: Request, res: Response) => {
  try {
    const folders = await listS3Folders();
    res.status(200).json({ folders });
  } catch (error) {
    console.error('Error listing folders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getActiveCategoriesInFolder = async (req: Request, res: Response) => {
  const { folderName } = req.params;
  if (!folderName) {
    return res.status(400).send('folderName is required');
  }

  try {
    const result = await fetchActiveCategoriesInFolder(folderName);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).send('Error fetching labels count');
  }
};

export const deleteFolder = async (req: Request, res: Response) => {
  const { folderName } = req.params;

  if (!folderName) {
    return res.status(400).json({ message: 'folderName is required' });
  }

  try {
    await deleteS3Folder(folderName);
    res.status(200).json({ message: `Successfully deleted folder ${folderName}` });
  } catch (error) {
    console.error(`Error deleting folder ${folderName}:`, error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const fetchImagesFromFolder = async (req: Request, res: Response) => {
  try {
    const { folder, itemsPerPage, pageNumber } = req.query;
    if (!folder) {
      return res.status(400).json({ message: 'folder is required' });
    }
    const itemsPerPageInt = parseInt(itemsPerPage as string, 10);
    const pageNumberInt = parseInt(pageNumber as string, 10);
    const { images, currentPageNo, totalNumOfPages } = await fetchImages(folder as string, itemsPerPageInt, pageNumberInt);
    res.status(200).json({ images, currentPageNo, totalNumOfPages });
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteImage = async (req: Request, res: Response): Promise<void> => {
  const { folderName, fileName } = req.body;

  if (!folderName || !fileName) {
    res.status(400).send('folderName and fileName are required');
    return;
  }

  try {
    await deleteS3Image(folderName, fileName);
    res.status(200).send(`Successfully deleted ${fileName} from ${folderName}`);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).send(`Error deleting ${fileName} from ${folderName}: ${error.message}`);
    } else {
      res.status(500).send(`Error deleting ${fileName} from ${folderName}: Unknown error`);
    }
  }
};

export const labelImage = async (req: Request, res: Response) => {
  const { folderName, fileName, email, name, category, x, y, width, height, isActive, isShown } = req.body;
  if (!folderName || !fileName || !category || x === undefined || y === undefined || width === undefined || height === undefined) {
    console.log("error 400 : folderName, fileName, category, x, y, width, and height are required.");
    console.log("folderName : ", folderName, ", fileName : ", fileName, ", email : ", email, ", category : ", category, ", x : ", x, ", y : ", y, ", width : ", width, ", height : ", height);
    return res.status(400).json({ message: 'folderName, fileName, email, category, x, y, width, and height are required.' });
  }
  try {
    await labelImageService(folderName, fileName, email, name, category, x, y, width, height, isActive, isShown);
    return res.status(200).json({ message: 'Image labeled successfully.' });
  } catch (error) {
    console.error('Error labeling image:', error);
    return res.status(500).json({ error: 'Internal Server Error.' });
  }
};

export const getLabelsForImage = async (req: Request, res: Response) => {
  const { folderName, fileName } = req.params;

  try {
    const labels = await getLabelsForImageService(folderName, fileName);
    return res.status(200).json(labels);
  } catch (error) {
    console.error('Error getting labels for image:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteImageLabel = async (req: Request, res: Response) => {
  const { email, modelName, folderName, fileName, category } = req.body;
  try {
    await deleteImageLabelService(email, modelName, folderName, fileName, category);
    res.status(200).json({ message: 'Labelled relationship deleted successfully' });
  } catch (error) {
    console.error('Error deleting labelled relationship:', error);
    res.status(500).json({ error: 'Failed to delete labelled relationship' });
  }
};

export const deleteImageLabels = async (req: Request, res: Response) => {
  const { relationships } = req.body; // Assuming relationships is an array of objects with email, folderName, fileName, and category
  try {
    await deleteImageLabelsService(relationships);
    res.status(200).json({ message: 'Labelled relationships deleted successfully' });
  } catch (error) {
    console.error('Error deleting labelled relationships:', error);
    res.status(500).json({ error: 'Failed to delete labelled relationships' });
  }
};
