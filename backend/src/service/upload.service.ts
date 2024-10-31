import AWS from 'aws-sdk';
import neo4j, { Driver, Session } from 'neo4j-driver';
import config from '../../loadConfig';
import { model } from 'mongoose';

//import { Request } from 'express';
//import { File as MulterFile } from 'multer';

const bucketName = 'dsai-imageuploads';
const s3 = new AWS.S3({
  accessKeyId: 'AKIAXIxxxxxxxxxxxxx', //process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: 'wH74YaSxxxxxxxxxxxxx', //process.env.AWS_SECRET_ACCESS_KEY,
  region:  'ap-southeast-1'//process.env.AWS_REGION,
});
// Initialize Neo4j connection
const driver: Driver = neo4j.driver(
  config.neo4jUri,
  neo4j.auth.basic(config.neo4jUser, config.neo4jPassword)
);

export const uploadToS3 = async (imageFolderName: string, files: Express.Multer.File[]) => {
  const neo4jSession = driver.session();
  const tx = neo4jSession.beginTransaction();
  try {
    const uploadPromises = files.map((file) => {
      const fileName = `${imageFolderName}/${file.originalname}`;
      //const fileExtension = path.extname(file.originalname);
      //const fileName = `${imageFolderName}/${uuidv4()}${fileExtension}`;

      const params = {
        Bucket: bucketName,//process.env.AWS_S3_BUCKET!,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        //ACL: 'public-read',
      };

      return s3.upload(params).promise().then((data) => {
        const imageUrl = data.Location;

        // Create Image node in Neo4j, within a transaction
        return tx.run(
          `WITH $folderName AS folderName, 
          $fileName AS fileName 
          MERGE (i:Image {folderName: folderName, fileName: fileName})
          ON CREATE SET i.CreatedOn = datetime(), i.UpdatedOn = datetime(), 
          i.uploadedUrl = $uploadedUrl 
          ON MATCH SET i.UpdatedOn = datetime(), 
          i.uploadedUrl = $uploadedUrl`,
          {
            folderName: imageFolderName,
            fileName: file.originalname,
            uploadedUrl: imageUrl,
          }
        ).then(() => imageUrl);
      });
    });

    const uploadedImages = await Promise.all(uploadPromises);
    await tx.commit();
    return uploadedImages;
  } catch (error) {
    await tx.rollback();
    console.error('Error uploading files:', error);
    throw error;
  } finally {
    await neo4jSession.close();
  }
};

export const listS3Folders = async (): Promise<string[]> => {
  const params = {
    Bucket: bucketName,
    Delimiter: '/',
  };

  try {
    const data = await s3.listObjectsV2(params).promise();
    const folders = (data.CommonPrefixes?.map(prefix => prefix.Prefix).filter((prefix): prefix is string => !!prefix)) || [];
    const trimmedFolders = folders.map(folder => folder.slice(0, -1)); // Remove the last character from each item
    
    // Sort the trimmedFolders array in alphabetical order
    trimmedFolders.sort((a, b) => a.localeCompare(b));
    return trimmedFolders;
  } catch (error) {
    console.error('Error listing S3 folders:', error);
    throw error;
  }
};

export const fetchActiveCategoriesInFolder = async (folderName: string) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `
      MATCH (i:Image {folderName: $folderName})<-[b:Labelled {isActive: true}]-(u)
      WITH b.category AS category, COUNT(i) AS count  
      RETURN category, count ORDER BY category ASC 
      `,
      { folderName }
    );

    return result.records.map(record => ({
      category: record.get('category'),
      count: record.get('count').toNumber() // Convert Neo4j Integer to JavaScript number
    }));
  } catch (error) {
    console.error('Error fetching labels count:', error);
    throw error;
  } finally {
    await session.close();
  }
};

export const deleteS3Folder = async (folderName: string): Promise<void> => {
  // List all objects in the folder
  const listParams = {
    Bucket: bucketName,
    Prefix: `${folderName}/`,
  };

  try {
    const listedObjects = await s3.listObjectsV2(listParams).promise();

    if (listedObjects.Contents && listedObjects.Contents.length > 0) {
      // Delete all objects in the folder
      const deleteParams = {
        Bucket: bucketName,
        Delete: { Objects: [] as { Key: string }[] },
      };

      listedObjects.Contents.forEach(({ Key }) => {
        if (Key) {
          deleteParams.Delete.Objects.push({ Key });
        }
      });

      await s3.deleteObjects(deleteParams).promise();
      console.log(`Successfully deleted all objects in ${folderName}`);
    }

    // Delete all image nodes in Neo4j
    const neo4jSession = driver.session();
    const tx = neo4jSession.beginTransaction();
    try {
      await tx.run(
        `MATCH (i:Image {folderName: $folderName})
         DETACH DELETE i`,
        { folderName }
      );
      await tx.commit();
      console.log(`Successfully deleted all image nodes in ${folderName} from Neo4j`);
    } catch (error) {
      await tx.rollback();
      console.error(`Error deleting image nodes in ${folderName} from Neo4j:`, error);
      throw error;
    } finally {
      await neo4jSession.close();
    }

    // Delete the folder itself in S3
    const folderParams = {
      Bucket: bucketName,
      Key: `${folderName}/`,
    };

    await s3.deleteObject(folderParams).promise();
    console.log(`Successfully deleted folder ${folderName} from S3`);
  } catch (error) {
    console.error(`Error deleting folder ${folderName} from S3:`, error);
    throw error;
  }
};

export const fetchImages = async (folder: string, itemsPerPage: number, pageNumber: number): Promise<{ images: Object[], currentPageNo: number, totalNumOfPages: number }> => {
  let continuationToken: string | undefined = undefined;
  let totalItems = 0;
  let totalNumOfPages = 0;
  let currentPage = 1;

  // Fetch all items to determine the total number of pages
  while (true) {
    const params = {
      Bucket: bucketName,
      Prefix: `${folder}/`,
      ContinuationToken: continuationToken,
    };

    const data = await s3.listObjectsV2(params).promise();
    totalItems += data.Contents?.length || 0;
    continuationToken = data.NextContinuationToken;

    if (!continuationToken) {
      break;
    }
  }

  totalNumOfPages = Math.ceil(totalItems / itemsPerPage);

  // Reset continuationToken for fetching the specific page
  continuationToken = undefined;

  // Calculate the continuation token for the desired page
  while (currentPage < pageNumber) {
    const params = {
      Bucket: bucketName,
      Prefix: `${folder}/`,
      ContinuationToken: continuationToken,
      MaxKeys: itemsPerPage,
    };

    const data = await s3.listObjectsV2(params).promise();
    continuationToken = data.NextContinuationToken;

    if (!continuationToken) {
      // If there is no next continuation token, it means we have reached the end of the list
      return { images: [], currentPageNo: pageNumber, totalNumOfPages };
    }

    currentPage++;
  }

  // Fetch the images for the desired page
  const params = {
    Bucket: bucketName,
    Prefix: `${folder}/`,
    ContinuationToken: continuationToken,
    MaxKeys: itemsPerPage,
  };

  const data = await s3.listObjectsV2(params).promise();
  const imagePromises = (data.Contents?.map(async item => {
    const key = item.Key;
    if (!key) {
      throw new Error('Key is undefined');
    }

    const imageData = await s3.getObject({ Bucket: bucketName, Key: key }).promise();
    if (!imageData.Body) {
      throw new Error(`Image data for key ${key} is undefined`);
    }
    return {
      name: key.split('/').pop(),
      data: imageData.Body.toString('base64')
    };
  })) || [];

  const imageDataArray = await Promise.all(imagePromises);

  return { images: imageDataArray, currentPageNo: pageNumber, totalNumOfPages };
};

export const deleteS3Image = async (folderName: string, fileName: string): Promise<void> => {
  const params = {
    Bucket: bucketName,
    Key: `${folderName}/${fileName}`,
  };

  try {
    await s3.deleteObject(params).promise();
    console.log(`Successfully deleted ${fileName} from ${folderName}`);
  } catch (error) {
    console.error(`Error deleting ${fileName} from ${folderName} at S3:`, error);
    throw error;
  }

  const neo4jSession = driver.session();
  const tx = neo4jSession.beginTransaction();
  try {
    await tx.run(
      `MATCH (i:Image {folderName: $folderName, fileName: $fileName})
       DETACH DELETE i`,
      { folderName, fileName }
    );
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    console.error('Error deleting Image node from Neo4j:', error);
    throw error;
  } finally {
    await neo4jSession.close();
  }
};

export const labelImageService = async (
  folderName: string, // Image folder name
  fileName: string,   // Image file name
  email: string,      // User email
  name: string,       // Model name
  category: string,
  x: number,
  y: number,
  width: number,
  height: number,
  isActive: boolean,
  isShown: boolean
) => {
  const session = driver.session();
  const tx = session.beginTransaction();
  try {
    console.log("Labelling... email : ", email, ", name : ", name, ", folderName : ", folderName, ", fileName : ", fileName, ", category : ", category, ", x : ", x, ", y : ", y, ", width : ", width, ", height : ", height, ", isActive : ", isActive, ", isShown : ", isShown);
    if (email) {
      await tx.run(
        `
        MATCH (u:User {email: $email}), (i:Image {folderName: $folderName, fileName: $fileName})
        MERGE (u)-[r:Labelled {category: $category}]->(i)
        ON CREATE SET r.x = $x, r.y = $y, r.width = $width, r.height = $height, 
                      r.createdOn = datetime(), r.updatedOn = datetime(), 
                      r.isActive = $isActive, r.isShown = $isShown 
        ON MATCH SET r.x = $x, r.y = $y, r.width = $width, r.height = $height,
                     r.updatedOn = datetime(),
                     r.isActive = $isActive, r.isShown = $isShown
        WITH u, i, r
        WHERE $isActive
        MATCH (um)-[r2:Labelled {category: $category}]->(i)
        WHERE (um:User OR um:Model) AND id(um) <> id(u) AND r2.isActive <> false
        SET r2.isActive = false
        `,
        {
          email,
          folderName,
          fileName,
          category,
          x,
          y,
          width,
          height,
          isActive,
          isShown
        }
      );
    } else {
      await tx.run(
        `
        MATCH (m:Model {name: $name}), (i:Image {folderName: $folderName, fileName: $fileName})
        MERGE (m)-[r:Labelled {category: $category}]->(i)
        ON CREATE SET r.x = $x, r.y = $y, r.width = $width, r.height = $height, 
                      r.createdOn = datetime(), r.updatedOn = datetime(), 
                      r.isActive = $isActive, r.isShown = $isShown 
        ON MATCH SET r.x = $x, r.y = $y, r.width = $width, r.height = $height,
                     r.updatedOn = datetime(),
                     r.isActive = $isActive, r.isShown = $isShown
        WITH m, i, r
        WHERE $isActive
        MATCH (um)-[r2:Labelled {category: $category}]->(i)
        WHERE (um:User OR um:Model) AND id(um) <> id(m) AND r2.isActive <> false
        SET r2.isActive = false
        `,
        {
          name,
          folderName,
          fileName,
          category,
          x,
          y,
          width,
          height,
          isActive,
          isShown
        }
      );
    }
    
    await tx.commit();
    
  } catch (error) {
    await tx.rollback();
    console.error('Error labeling image:', error);
    throw error;
  } finally {
    await session.close();
  }
};

export const deleteImageLabelService = async (
  email: string,
  modelName: string,
  folderName: string,
  fileName: string,
  category: string
) => {
  const session = driver.session();
  const tx = session.beginTransaction();
  try {
    console.log("email : ", email, ", modelName : ", modelName, ", folderName : ", folderName, ", fileName : ", fileName, ", category : ", category);
    await tx.run(
      `OPTIONAL MATCH (u:User {email: $email})-[r:Labelled {category: $category}]->(i:Image {folderName: $folderName, fileName: $fileName})  
       DELETE r`,
      {
        email,
        folderName,
        fileName,
        category,
      }
    );
    await tx.run(
      `OPTIONAL MATCH (m:Model {name: $modelName})-[r:Labelled {category: $category}]->(i:Image {folderName: $folderName, fileName: $fileName}) 
       DELETE r`,
      {
        modelName,
        folderName,
        fileName,
        category,
      }
    );
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    console.error('Error deleting labelled relationship:', error);
    throw error;
  } finally {
    await session.close();
  }
};

export const deleteImageLabelsService = async (
  relationships: {
    email: string,
    folderName: string,
    fileName: string,
    category: string
  }[]
) => {
  const session = driver.session();
  const tx = session.beginTransaction();
  try {
    for (const relationship of relationships) {
      await tx.run(
        `MATCH (u:User {email: $email})-[r:Labelled {category: $category}]->(i:Image {folderName: $folderName, fileName: $fileName})
         DELETE r`,
        {
          email: relationship.email,
          folderName: relationship.folderName,
          fileName: relationship.fileName,
          category: relationship.category
        }
      );
    }
    await tx.commit();
  } catch (error) {
    await tx.rollback();
    throw error;
  } finally {
    await session.close();
  }
};

export const getLabelsForImageService = async (
  folderName: string, // Image folder name
  fileName: string   // Image file name
) => {
  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (i:Image {folderName: $folderName, fileName: $fileName})<-[r:Labelled]-(u)
       RETURN r.category AS category, 
       r.x AS x, r.y AS y, r.width AS width, r.height AS height, 
       u.email AS email, u.name AS name, r.isActive AS isActive, r.isShown AS isShown`,
      { folderName, fileName }
    );

    return result.records.map(record => ({
      category: record.get('category'),
      x: record.get('x'),
      y: record.get('y'),
      width: record.get('width'),
      height: record.get('height'),
      email: record.get('email'),
      name: record.get('name'),
      isActive: record.get('isActive'),
      isShown: record.get('isShown')
    }));
  } catch (error) {
    console.error('Error fetching labels for image:', error);
    throw error;
  } finally {
    await session.close();
  }
};

