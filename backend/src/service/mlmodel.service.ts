import AWS from 'aws-sdk';
import neo4j, { Driver, Session } from 'neo4j-driver';
import config from '../../loadConfig';

// To run PyTorch script as Kubernetes Job.
// npm install express aws-sdk @kubernetes/client-node
import { MongoClient } from 'mongodb';
import * as fs from "fs";
import * as path from 'path';
import * as os from 'os';
import { execSync, exec } from "child_process";
import { promisify } from "util";
import { KubeConfig, BatchV1Api, V1Job } from "@kubernetes/client-node";
import { createModelDefinition } from '../controller/modelDefinition.controller';
import constants from '../utils/constants';

// for making predictions using .pkl from S3
//import * as tf from '@tensorflow/tfjs-node';
//import pickle from 'picklejs';
//import pickle from 'node-pickle';
//import * as ort from 'onnxruntime-web';

//import Jimp from 'jimp';
//import sharp from 'sharp';

// Normalization parameters
const mean = [0.485, 0.456, 0.406];
const std = [0.229, 0.224, 0.225];

// Function to normalize the tensor
// function normalize(value, channel) {
//     return (value - mean[channel]) / std[channel];
// }

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  category: string;
}

const execAsync = promisify(exec);

// AWS S3 connection details
const evalBucketName = 'dsai-modelevaluations';
const modelBucketName = 'dsai-modelstates';
const s3 = new AWS.S3({
  accessKeyId: 'AKIAXIxxxxxxxxxxxxx', //process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: 'wH74YaSxxxxxxxxxxxxx', //process.env.AWS_SECRET_ACCESS_KEY,
  region:  'ap-southeast-1'//process.env.AWS_REGION,
});
// Neo4j connection details
const driver: Driver = neo4j.driver(
  config.neo4jUri,
  neo4j.auth.basic(config.neo4jUser, config.neo4jPassword)
);
// MongoDB connection details
const uri = 'mongodb://xxxxxxxxxxxxx.ap-southeast-1.compute.amazonaws.com:27017';
const mongoClient = new MongoClient(uri);
const dbName = 'test';
const collectionName = 'modeldefinitions';



interface ExtractedPart {
  methodName: string;
  cleanedParams: string;
}


export const serviceActions = {
  // 301 Get Model Definition Options
  async filterModelDefinitionOptions(
    Stages: Record<string, any> = [],
    Types: Record<string, any> = [],
    Methods: Record<string, any> = []
  ): Promise<any> {
    const session: Session = driver.session();
    try {
      const getAllStage = Stages.length == 0;
      const getAllTypes = Types.length == 0;
      const getAllAllowable = Methods.length == 0;
      const query = `
        MATCH (n:Option)
        WHERE (${getAllStage} OR n.Stage in [${Object.keys(Stages).map(
            key => `'${Stages[key]}'`
          ).join(',')}] ) 
          AND (${getAllTypes} OR n.Type in [${Object.keys(Types).map(
            key => `'${Types[key]}'`
          ).join(',')}] )
          AND (${getAllAllowable} OR n.Method in [${Object.keys(Methods).map(
            key => `'${Methods[key]}'`
          ).join(',')}] )
        RETURN n.Stage as Stage, n.Type as Type, 
               n.Method as Method, n.Name as Name, 
               n.Code as Code, 
               n.InputNames as InputNames, n.InputTypes as InputTypes,
               n.NextAllowable as NextAllowables
      `;
      const result = await session.run(query, { Stages, ...Types, ...Methods });
      console.log(result.records.map(record => record.toObject()));
      console.log("Response returned at " + new Date().toISOString());
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  },
  // 302 Get Model Definition Options
  async getModelDefinitionOptions(
    Method: string
  ): Promise<any> {
    const session: Session = driver.session();
    try {
      const query = `
        MATCH (n:Option)
        WHERE n.Method = '${Method}' 
        RETURN n.Stage as Stage, n.Type as Type, 
               n.Method as Method, n.Name as Name, 
               n.Code as Code, 
               n.InputNames as InputNames, n.InputTypes as InputTypes,
               n.NextAllowable as NextAllowables
      `;
      const result = await session.run(query, { Method });
      console.log(result.records.map(record => record.toObject()));
      console.log("Response returned at " + new Date().toISOString());
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  },
  // 303 Get Model Next Allowable Options
  async getModelNextAllowableOptions(
    Method: string
  ): Promise<any> {
    const session: Session = driver.session();
    try {
      const query = `
        MATCH (n:Option)
        WHERE n.Method = '${Method}' 
        WITH n.NextAllowable AS nextAllowables
        MATCH (m:Option)
            WHERE m.Method IN nextAllowables
        RETURN m.Stage as Stage, m.Type as Type, 
               m.Method as Method, m.Name as Name, 
               m.Code as Code, 
               m.InputNames as InputNames, m.InputTypes as InputTypes,
               m.NextAllowable as NextAllowables
      `;
      const result = await session.run(query, { Method });
      console.log(result.records.map(record => record.toObject()));
      console.log("Response returned at " + new Date().toISOString());
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  },

  //To create new model in neo4j
  async createNewModelAndRelationship(
    UserEmail: string, 
    JobName: string,
    MlScript: string[],
    pyTorchScript: string[]
  ): Promise<any> {
    const session: Session = driver.session();
    const transaction = session.beginTransaction(); // Start a transaction
    console.log("UserEmail: " + UserEmail);
    console.log("JobName: " + JobName);
    console.log("MlScript: " + MlScript);
    //console.log("pyTorchScript: " + pyTorchScript);
    const allNewJobNames: string[] = [];

    function getCurrentFormattedDate(): string {
      const now = new Date();
      const yyyy = now.getFullYear();
      const MM = String(now.getMonth() + 1).padStart(2, '0'); // Months are zero-based
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
    
      return `${yyyy}-${MM}-${dd}-${hh}:${mm}:${ss}`;
    }

    const formattedDate = getCurrentFormattedDate();
    console.log("formattedDate: " + formattedDate);
    let newJobName = JobName + "_" + UserEmail + "_" + formattedDate;
    console.log("newJobName: " + newJobName);
    allNewJobNames.push(newJobName);
    //This is to clean up the mlscript to only extract out the method name and the user input parameters 
    const extractParts = (script: string) => {
      // Split the script into lines
      const lines = script.split('\n');

      // Initialize an array to hold the results
      const results: ExtractedPart[] = [];
  
      // Loop through each line to extract method name and parameters
      lines.forEach(line => {
          // Regex to extract method name and parameters
          const methodMatch = line.match(/nn\.(\w+)\((.*)\)/);
          if (methodMatch) {
              const methodName = methodMatch[1];
              const params = methodMatch[2]; // Extract parameters
  
              // Extract the actual values from the parameters
              const paramValues = params.match(/=(\d+)/g) || []; // Matches '=10', '=20', etc.
              const cleanedParams = paramValues
                  .map(p => p.replace(/=/g, '')) // Remove '='
                  .map(value => `'${value}'`) // Enclose each value in single quotes
                  .join(','); // Join with commas
  
              results.push({
                  methodName,
                  cleanedParams
              });
          }
      });
  
      return results;
  };

    //2. To Create new model node & new relationship in neo4j (Start)
    try {
      let updatedText = "";
      //2.1 Create the Job node 
      const createNewJobNode = `
      CREATE (j:Job {CreatedOn: datetime(), UpdatedOn: datetime(), name:'${newJobName}'})
      RETURN j
      `;
      const jobResult = await transaction.run(createNewJobNode);
      const jobNode = jobResult.records[0].get('j');
      console.log('Job Node Created:', jobNode);

      // 2.2 Create relationship between the newly created job and the user who login
      const createRelationshipBetweenJobAndUser = `
            MATCH (u:User {email: '${UserEmail}'})
            MATCH (j:Job)
              WHERE j.name = '${newJobName}' 
            CREATE (u) -[:CREATES {CreatedOn: datetime(), UpdatedOn: datetime()}]->(j)
            RETURN u, j, [(u)-[r:CREATES]->(j) | r][0] AS relationship
      `;
      const jobAndUserRelationshipResult = await transaction.run(createRelationshipBetweenJobAndUser);
      const jobAndUserRelationshipNode = jobAndUserRelationshipResult.records[0].get('relationship');
      console.log('Relationship Created for user and job:', jobAndUserRelationshipNode);


      // 2.4 Create relationships between the model and the option within the same transaction
      const tasks = pyTorchScript.map(async (line, index) => {
        const modelNumber = index + 1;
        let newModelName = newJobName+"_M"+modelNumber; 

        //Regex for modalName, accessKey, secretKey, region
        const modelNameRegex: RegExp = /modelName\s*=\s*(['"])(.*?)\1/;
        const accessKeyRegex: RegExp = /aws_access_key_id=\s*(['"])(.*?)\1/;
        const secretKeyRegex: RegExp = /aws_secret_access_key=\s*(['"])(.*?)\1/;
        const regionRegex: RegExp = /region_name=\s*(['"])(.*?)\1/;

        const matchForModelName: RegExpMatchArray | null = line.match(modelNameRegex);
        const matchForAccessKey: RegExpMatchArray | null = line.match(accessKeyRegex);
        const matchForSecretKey: RegExpMatchArray | null = line.match(secretKeyRegex);
        const matchForRegion: RegExpMatchArray | null = line.match(regionRegex);

        if (matchForModelName && matchForAccessKey && matchForSecretKey && matchForRegion) {
            //console.log("Line found and will be replacing with the following values : " , newModelName, " , " , config.awsAccessKeyId, " , ", config.awsSecretAccessKey , " , " , config.regionName);
            updatedText = line
            .replace(modelNameRegex, `modelName ='${newModelName}'`)
            .replace(accessKeyRegex, `aws_access_key_id='${config.awsAccessKeyId}'`)
            .replace(secretKeyRegex, `aws_secret_access_key='${config.awsSecretAccessKey}'`)
            .replace(regionRegex, `region_name='${config.regionName}'`)
        }   

        // console.log("updatedText: " , updatedText);

        createModelDefinition(UserEmail, updatedText, newJobName, newModelName);

      });

      const neo4jTasks = MlScript.map(async (line, index) => {
        const modelNumber = index + 1;
        const extractedParts = extractParts(line);
        console.log('index: ' , index);
        console.log('line: ', line);
        console.log('modelNumber: ', modelNumber);
        let newModelName = newJobName+"_M"+modelNumber; 
        console.log('newModelName: ' + newModelName);
        

        // 2.5 Create the Model node within the transaction
        const modelQuery = `
              CREATE (m:Model {CreatedOn: datetime(), UpdatedOn: datetime(), name:'${newModelName}', script:'${MlScript}', status:'${constants.MODEL_STATUS_NEW}'})
              RETURN m
            `;
        const modelResult = await transaction.run(modelQuery);
        const modelNode = modelResult.records[0].get('m');
        console.log('Model Node Created:', modelNode);
      
        // 2.6 Create relationship between the newly create job and model
        const createRelationshipBetweenJobAndModel = `
              MATCH (j:Job {name: '${newJobName}'})
              MATCH (m:Model)
                WHERE m.name = '${newModelName}' 
              CREATE (j) -[:CREATES {CreatedOn: datetime(), UpdatedOn: datetime()}]->(m)
              RETURN j, m, [(j)-[r:CREATES]->(m) | r][0] AS relationship
            `;
        const jobAndModelRelationshipResult = await transaction.run(createRelationshipBetweenJobAndModel);
        const jobAndModelRelationshipNode = jobAndModelRelationshipResult.records[0].get('relationship');
        console.log('Relationship Created for Job and Model:', jobAndModelRelationshipNode);

          extractedParts.forEach(async (part, index) => {
            const stepNumber = index + 1;
            console.log('Method Name:', part.methodName);
            console.log('Cleaned Params:', part.cleanedParams);

            try {
              const query = `
                MATCH (m:Model {name: '${newModelName}'})
                MATCH (o:Option)
                  WHERE o.Method = '${part.methodName}' 
                CREATE (m) -[:RUN {Step: ${stepNumber}, CreatedOn: datetime(), UpdatedOn: datetime(), UserInput:[${part.cleanedParams}]}]->(o)
              `;
              await transaction.run(query);
            } catch (error) {
              console.error('Error creating relationship:', error);
            }

          });
        }); // End for MlScript

    
      //Wait for all tasks to complete
      await Promise.all([...tasks, ...neo4jTasks]);

      // Commit the transaction
      await transaction.commit();
      console.log('Transaction committed successfully.');
      
      return allNewJobNames;
        
    } catch (error) {
      console.error('Error creating model or relationships:', error);
      // Rollback the transaction in case of an error
      await transaction.rollback();
    } finally {
      // Close the session
      await session.close();
    }
    //To Create new model node & new relationship in neo4j (End)
  
  }, 

  //  async createMLScript(
  //   MlScript: string){
  //   try {
  //     const user = await ScriptModel.create(MlScript);
  //     return user; 
  //   } catch (e: any) {
  //     throw new Error(e);
  //   }
  // }


  async getJobs(itemsPerPage: number, pageNumber: number) {
    // Runtime validation to ensure inputs are positive integers
    if (!Number.isInteger(itemsPerPage) || itemsPerPage <= 0 || !Number.isInteger(pageNumber) || pageNumber <= 0) {
      throw new Error('itemsPerPage and pageNumber must be positive integers');
    }

    const session: Session = driver.session();
    const offset = (pageNumber - 1) * itemsPerPage;

    try {
      const result = await session.run(
        'MATCH (j:Job) ' +
        'RETURN j.name AS name, j.CreatedOn AS createdOn, j.UpdatedOn AS updatedOn ' +
        'ORDER BY updatedOn DESC ' +
        'SKIP toInteger($offset) LIMIT toInteger($itemsPerPage)',
        { offset: offset, itemsPerPage: itemsPerPage }
      );
      const result2 = await session.run(
        'MATCH (j:Job) RETURN COUNT(j) AS totalJobs'
      );
      return {
        jobs: result.records.map(record => ({
                name: record.get('name'),
                createdOn: record.get('createdOn'),
                updatedOn: record.get('updatedOn')
              })),
        totalJobs: result2.records.map(record => record.get('totalJobs'))[0]
      };
    } catch (error) {
      console.error('Error executing Neo4j query:', error);
      throw error;
    } finally {
      await session.close();
    }
  },

  async getModelsInJob(jobName: string, itemsPerPage: number, pageNumber: number) {
    // Runtime validation to ensure inputs are positive integers
    if (!Number.isInteger(itemsPerPage) || itemsPerPage <= 0 || !Number.isInteger(pageNumber) || pageNumber <= 0) {
      throw new Error('itemsPerPage and pageNumber must be positive integers');
    }
    if (!jobName) {
      throw new Error('jobName must be provided');
    }

    const session: Session = driver.session();
    const offset = (pageNumber - 1) * itemsPerPage;

    try {
      const result = await session.run(
        'MATCH (j:Job {name: $jobName})-[:CREATES]->(m:Model) ' + 
        'RETURN m.name AS name, m.CreatedOn AS createdOn, m.UpdatedOn AS updatedOn, ' + 
        'm.evalAccuracy AS accuracy, m.evalPrecision AS precision, m.evalRecall AS recall,' + 
        'm.evalF1Score AS f1Score, m.evalRmse AS rmse,' +
        'm.classifierKeys AS classifierKeys, m.classifierCategories AS classifierCategories,' +
        'm.status AS status ORDER BY updatedOn DESC ' + 
        'SKIP toInteger($offset) LIMIT toInteger($itemsPerPage)',
        { jobName: jobName, offset: offset, itemsPerPage: itemsPerPage }
      );
      const result2 = await session.run(
        'MATCH (j:Job {name: $jobName})-[:CREATES]->(m:Model) RETURN COUNT(m) AS totalModels',
        { jobName: jobName }
      );
      return {
        models: result.records.map(record => ({
                name: record.get('name'),
                createdOn: record.get('createdOn'),
                updatedOn: record.get('updatedOn'),
                status: record.get('status'),
                accuracy: record.get('accuracy'),
                precision: record.get('precision'),
                recall: record.get('recall'),
                f1Score: record.get('f1Score'),
                rmse: record.get('rmse'),
                classifierKeys: record.get('classifierKeys'),
                classifierCategories: record.get('classifierCategories')
              })),
        totalModels: result2.records.map(record => record.get('totalModels'))[0]
      };
      
    } catch (error) {
      console.error('Error executing Neo4j query:', error);
      throw error;
    } finally {
      await session.close();
    }
  },

  async deleteJobByName(jobName:string) {
    if (!jobName) {
      throw new Error('Job name is required');
    }

    const session: Session = driver.session();

    try {
      const result = await session.run(
        'MATCH (j:Job {name: $jobName})-[:CREATES]->(m:Model) ' +
        'WITH j, collect(m) as models ' +
        'WHERE NONE(model IN models WHERE coalesce(model.status, "") IN ["N", "P", "R"] OR (model)-[:Labelled]->(:Image)) ' +
        'UNWIND models as model ' +
        'DETACH DELETE j, model',
        { jobName: jobName }
      );

      if (result.summary.counters.updates().nodesDeleted === 0) {
        throw new Error(`Job ${jobName} could not be deleted`);
      }

      console.log(`Job ${jobName} deleted successfully`);
    } catch (error) {
      console.error('Error deleting job:', error);
      throw error;
    } finally {
      await session.close();
    }
  },

  async deleteModelByName(jobName:string, modelName: string) {
    if (!jobName || !modelName) {
      throw new Error('Job name and Model name are required');
    }

    const session: Session = driver.session();

    try {
      const result = await session.run(
        'MATCH (j:Job {name: $jobName})-[:CREATES]->(m:Model {name: $modelName}) ' +
        'WHERE coalesce(m.status, "") <> "N" AND coalesce(m.status, "") <> "P" ' +
        'AND coalesce(m.status, "") <> "R" ' + 
        // statuses Error(E)/Completed(C)/undefined can be deleted
        // statuses New(N)/Processing(P)/Running(R) cannot be deleted
        'AND NOT (m)-[:Labelled]->(:Image) ' + 
        'DETACH DELETE m',
        { jobName: jobName, modelName: modelName }
      );

      if (result.summary.counters.updates().nodesDeleted === 0) {
        throw new Error(`No model found with name: ${modelName}`);
      }

      console.log(`Model ${modelName} from Job ${jobName} deleted successfully`);
    } catch (error) {
      console.error('Error deleting model:', error);
      throw error;
    } finally {
      await session.close();
    }
  },

  async getModelEvaluationResults(jobName: string, modelName: string) {
    if (!jobName || !modelName) {
      throw new Error('Job name and Model name are required');
    }
    try {
      // List objects in the S3 bucket
      const listParams = {
        Bucket: evalBucketName,
      };
      const data = await s3.listObjectsV2(listParams).promise();

      // Check if data.Contents is defined and is an array
      if (!data.Contents || !Array.isArray(data.Contents)) {
        throw new Error('No contents found in the S3 bucket');
      }

      // Filter and sort .png files containing the modelName
      const filteredFiles = data.Contents
        .filter(item => item.Key && item.Key.includes(modelName) && item.Key.endsWith('.png'))
        .sort((a, b) => {
          if (!a.Key || !b.Key) {
            return 0;
          }
          return a.Key.localeCompare(b.Key);
        });

      // Fetch binary data for each filtered file and convert to base64
      const imageBase64Array = await Promise.all(filteredFiles.map(async (file) => {
        const getObjectParams = {
          Bucket: evalBucketName,
          Key: file.Key!,
        };
        const fileData = await s3.getObject(getObjectParams).promise();
        if (!fileData.Body) {
            throw new Error('The file body is undefined');
        }
        const base64String = fileData.Body.toString('base64');
        return base64String;
      }));

      return imageBase64Array;
      
    } catch (error) {
      console.error('Error fetching model evaluation results:', error);
      throw new Error('Could not fetch model evaluation results');
    }
  },

  async updateModelStatusByName(modelName: string, newStatus: string) {
    const session = driver.session();
    try {
      const result = await session.run(
        "MATCH (m:Model {name: $modelName}) SET m.status = $newStatus RETURN m",
        { modelName, newStatus }
      );
  
      if (result.records.length === 0) {
        throw new Error(`Model with name ${modelName} not found`);
      }
  
      return `Model status updated to ${newStatus}`;
    } catch (error) {
      console.error('Error updating model status:', error);
      throw new Error('Could not update model status');
    } finally {
      await session.close();
    }
  },

  async findModelsByStatus(status: string) {
    const session = driver.session();
    try {
      const result = await session.run(
        "MATCH (m:Model {status: $status}) RETURN m.name AS name",
        { status }
      );
  
      const models = result.records.map(record => record.get('name'));
  
      return models;
    } catch {
      console.log(`Error finding models with status ${status}.`);
      throw new Error(`Error finding models with status ${status}.`);
    } finally {
      await session.close();
    } 
  },
/*
  async predictBoundingBoxes(modelName: string, folderName: string, fileName: string, base64Image: string) {
    try{
      const modelFileName = `${modelName}-model.onnx`;
      const params = {
        Bucket: modelBucketName,
        Key: modelFileName
      };

      // Read the .onnx file from S3 into memory
      const modelBuffer = await new Promise<Buffer>((resolve, reject) => {
        s3.getObject(params, (err, data) => {
          if (err) {
            console.error('Error downloading model: ', err);
            reject(err);
          } else {
            resolve(data.Body as Buffer);
          }
        });
      });

      // Load the model from the buffer
      const session = await ort.InferenceSession.create(modelBuffer);
      
      // Log the first 30 characters of the base64 string
      console.log('Base64 Image (first 30 chars): ', base64Image.substring(0, 30));
      // Remove the base64 prefix if it exists
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      // Decode the base64 image
      const buffer = Buffer.from(base64Data, 'base64');

      // Log length of buffer to ensure base64 string is correctly decoded
      console.log('Buffer length: ', buffer.length);
      const image = await sharp(buffer)//.toFormat('png') // Specify the format if known
                          .resize(128, 128) // Resize the image to 128x128
                          .ensureAlpha() // Ensure the image has an alpha channel
                          .removeAlpha() // Remove the alpha channel to get RGB
                          .raw().toBuffer({ resolveWithObject: true });
      // Convert the image to a tensor
      let { data, info } = image;
      console.log('Image info: ', info); // Log image information
      // Check if the image has 4 channels (RGBA)
      if (info.channels === 4) {
        // Create a new buffer for RGB data
        const rgbData = new Uint8Array((info.width * info.height) * 3);

        // Copy RGB channels from the original buffer to the new buffer
        for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
          rgbData[j] = data[i];     // R
          rgbData[j + 1] = data[i + 1]; // G
          rgbData[j + 2] = data[i + 2]; // B
        }

        // Update the data and info to reflect the new buffer and channel count
        data = Buffer.from(rgbData); // Convert Uint8Array to Buffer
        info.channels = 3;
      }

      // Convert the image data to a Float32Array
      const float32Array = new Float32Array(data);

      // Normalize the image
      const mean = [0.485, 0.456, 0.406];
      const std = [0.229, 0.224, 0.225];
      for (let i = 0; i < float32Array.length; i += 3) {
        float32Array[i] = (float32Array[i] / 255.0 - mean[0]) / std[0];     // R channel
        float32Array[i + 1] = (float32Array[i + 1] / 255.0 - mean[1]) / std[1]; // G channel
        float32Array[i + 2] = (float32Array[i + 2] / 255.0 - mean[2]) / std[2]; // B channel
      }

      // Create a tensor from the normalized data
      const imageTensor = new ort.Tensor('float32', float32Array, [1, 3, 128, 128]);

      // Run the model
      const feeds = { input: imageTensor };
      const results = await session.run(feeds);
      console.log('Predicted: ', results);

      // Ensure the results are numbers before comparison
      const x = typeof results.coords_pred.data[0] === 'number' && results.coords_pred.data[0] < 0 ? 0 : results.coords_pred.data[0] as number;
      const y = typeof results.coords_pred.data[1] === 'number' && results.coords_pred.data[1] < 0 ? 0 : results.coords_pred.data[1] as number;
      const width = typeof results.coords_pred.data[2] === 'number' && results.coords_pred.data[2] < 0 ? 0 : results.coords_pred.data[2] as number;
      const height = typeof results.coords_pred.data[3] === 'number' && results.coords_pred.data[3] < 0 ? 0 : results.coords_pred.data[3] as number;

      // Ensure the data array is of type number[]
      const dataArray = Array.from(results.class_logits.data as Float32Array);

      // Find the index of the maximum value in the category array
      const catIndex = dataArray.indexOf(Math.max(...dataArray)); 

      const neo4jSession = driver.session();
      const neo4jResult = await neo4jSession.run(
        "MATCH (m:Model {name: $modelName}) RETURN m.classifierCategories AS classes",
        { modelName }
      );
      const category = neo4jResult.records.map(record => record.get('classes')[catIndex])[0];

      await neo4jSession.run(
        `MATCH (m:Model {name: $modelName}),
        (i:Image {folderName: $folderName, fileName: $fileName})
        MERGE (m)-[r:Labelled {category: $category}]->(i)
        ON CREATE SET r.x = $x, r.y = $y, r.width = $width, r.height = $height, 
        r.createdOn = datetime(), r.updatedOn = datetime(), 
        r.isActive = $isActive, r.isShown = $isShown 
        ON MATCH SET r.x = $x, r.y = $y, r.width = $width, r.height = $height,
        r.updatedOn = datetime(),
        r.isActive = $isActive, r.isShown = $isShown`,
      {
        modelName,
        folderName,
        fileName,
        category,
        x,
        y,
        width,
        height,
        isActive: false,
        isShown: true,
      }
      );

      return { x: x, y: y, width: width, height: height, category: category };

    } catch (error) {
      console.error('Error predicting bounding boxes:', error);
      throw new Error('Could not predict bounding boxes');
    }
    
  },
//*/
  // to run PyTorch scripts as Kubernetes Jobs
  async processPyTorchJob(jobName: string) {
    try {
      
      console.log('Processing PyTorch job:', jobName);
      const session: Session = driver.session();

      //1. To query all the status 'N' 
      const toGetNewStatusModelBasedOnJobName  = `MATCH (j:Job {name: $jobName})-[r]->(m:Model)
        WHERE m.status = 'N'
        RETURN m.name`

      // 2. Based on job name, find the model names 
      let modelNames = [""];
      const result = await session.run(toGetNewStatusModelBasedOnJobName, { jobName });
        // Check if there are any records returned
        if (result.records.length === 0) {
              console.log('No results found for the specified model name.');
              return []; // or handle accordingly
        }else{
          modelNames = result.records.map(record => record.get('m.name'));
        }
        
         // 3. Loop the model names 
        modelNames.forEach( async name => {
          try {
            const toUpdateStatusToProcessing = `MATCH (m:Model {name:  $name})  // Assuming you're using modelId as a unique identifier
            SET m.status = 'P'
            RETURN m`
          
            const result = await session.run(toUpdateStatusToProcessing, { name });
    
            if (result.records.length > 0) {
                const updatedModel = result.records[0].get('m');
                console.log('Update successful:', updatedModel);
            } else {
                console.log('No model found with the specified name.');
            }
          } catch (error) {
              console.error('Error updating model status:', error);
              throw error;  // Handle the error appropriately
          } finally {
              await session.close();  // Ensure the session is closed
          }


            console.log("To check model name: " + name); 
            
            mongoClient.connect();
            console.log('Connected to MongoDB');
            const database = mongoClient.db(dbName); 
            const collection = database.collection(collectionName);
            // Example query: Find documents where the field 'name' is 'example'
            const query = { modelName: name };
            const results = await collection.find(query).toArray();
            console.log('Query results:', results);
            
            const scripts: string = results.map(result => result.script).join('\n');
            
            // To set it to status P 
            console.log('Combined script:',scripts);

            let script = scripts;



            const modelClassDefPath = "./ModelClassDefinition.py";
            const scriptPath = "./pytorch_script.py";
            const dockerfilePath = "./dockerfile";
            const imageName = "issdsai-k8s-job";
            const ecrUri = "499969923602.dkr.ecr.ap-southeast-1.amazonaws.com";

            // Identify MultiTaskCNN class definition, and dependency import statements
            const classRegex = /class\s+MultiTaskCNN\s*\([\s\S]*?\)\s*:\s*[\s\S]*?^(\S|\Z)/gm;
            const importRegex = /^(import .*|from .* import .*)$/gm;

            // Extract the class definition
            const classMatch = script.match(classRegex);
            if (!classMatch) {
                console.error('MultiTaskCNN class definition not found.');
                return;
            }
            const classDefinition = classMatch[0];
            // Extract the import statements
            const importMatches = script.match(importRegex);
            const imports = importMatches ? importMatches.join('\n') : '';
            // Combine the imports and class definition
            const extractedScript = `${imports}\n\n${classDefinition}`;

            // Save the model class definition to a file
            console.log('Saving MultiTaskCNN class definition script...');
            fs.writeFileSync(modelClassDefPath, extractedScript);

            // Upload the file to S3
            const fileContent = fs.readFileSync(modelClassDefPath);
            const params = {
                Bucket: modelBucketName,
                Key: `${name}-ClassDefinition.py`,
                Body: fileContent
            };
            s3.upload(params, (err: Error, data: AWS.S3.ManagedUpload.SendData) => {
                if (err) {
                    console.error('Error uploading model class definition file to S3:', err);
                } else {
                    console.log('Model class definition file uploaded successfully to S3:', data.Location);
                }
            });

            // Save the script to a file
            console.log('Saving PyTorch script...');
            fs.writeFileSync(scriptPath, script);

            // Create a Dockerfile
            console.log('Creating Dockerfile...');
            const dockerfileContent = `
            FROM python:3.8-slim
            COPY pytorch_script.py /app/pytorch_script.py
            RUN pip install boto3 matplotlib torch torchvision scikit-learn neo4j onnx
            CMD ["python", "/app/pytorch_script.py"]
            `;
            fs.writeFileSync(dockerfilePath, dockerfileContent);

            // Build the Docker image
            console.log('Building Docker image...');
            await execAsync(`docker build -t ${imageName} .`);

            // Authenticate Docker to the ECR registry
            console.log('Authenticating Docker to ECR...');
            await execAsync(`aws ecr get-login-password --region ap-southeast-1 | docker login --username AWS --password-stdin ${ecrUri}`);

            // Tag the Docker image
            console.log('Tagging Docker image...');
            await execAsync(`docker tag ${imageName} ${ecrUri}/${imageName}:latest`);

            // Push the Docker image to ECR
            console.log('Pushing Docker image to ECR...');
            await execAsync(`docker push ${ecrUri}/${imageName}`);

            // Create a Kubernetes job manifest
            console.log('Creating Kubernetes job manifest...');
            const jobManifest: V1Job = {
              apiVersion: "batch/v1",
              kind: "Job",
              metadata: {
                name: "pytorch-job",
              },
              spec: {
                template: {
                  spec: {
                    containers: [
                      {
                        name: "pytorch-container",
                        image: `${ecrUri}/${imageName}`,
                        resources: {
                          requests: {
                            memory: "4Gi",
                            cpu: "1",
                          },
                          limits: {
                            memory: "8Gi",
                            cpu: "2",
                            //"nvidia.com/gpu": "1"
                          }
                        },
                      },
                    ],
                    restartPolicy: "Never",
                  },
                },
              },
            };
          
            // Load Kubernetes configuration
            console.log('Loading Kubernetes configuration...');
            const kubeConfig = new KubeConfig();
            await execAsync("aws eks --region ap-southeast-1 update-kubeconfig --name issdsai");
            try {
              if (!fs.existsSync("/root/.kube")) {
                await execAsync("mkdir -p /root/.kube");
              }
              await execAsync("cp ~/.kube/config /root/.kube/config");
              kubeConfig.loadFromFile('/root/.kube/config');
            } catch (error) {
              console.log("Error copying kubeconfig file: " + error);
              if (!fs.existsSync("C:\\root\\.kube")) {
                await execAsync("mkdir C:\\root\\.kube");
              }
              await execAsync('copy %USERPROFILE%\\.kube\\config C:\\root\\.kube\\config');
              kubeConfig.loadFromFile('C:\\root\\.kube\\config');
            } 
            //kubeConfig.loadFromDefault();
          
            // Create a Kubernetes client
            console.log('Creating Kubernetes client...');
            const batchV1Api = kubeConfig.makeApiClient(BatchV1Api);
          
            // Start the Kubernetes job
            console.log('Starting Kubernetes job...');
            await batchV1Api.createNamespacedJob("default", jobManifest);
            
            console.log('Kubernetes job started successfully!');

      });
    }catch (error) {
      console.error('Error starting Kubernetes job: ', error);
      throw error;
    }
  },
    //For Testing  
    async getExistingCompletedModel(
      classifierCategories:  string,
      classifierTrainFolder: string
    ): Promise<any> {
  
      const session: Session = driver.session();
      console.log("classifierCategories: " + classifierCategories);
      console.log("classifierTrainFolder: " + classifierTrainFolder);
  
    // Base query
      let query = `
          MATCH (p:Model)
          WHERE p.status = $status
          AND p.classifierTrainFolder = $classifierTrainFolder 
      `;
  
      // Prepare parameters
      const params: { [key: string]: any } = {
        status: constants.MODEL_STATUS_COMPLETED,
        classifierTrainFolder: classifierTrainFolder
      };
  
      // Conditionally add filters to the query
      if (classifierCategories == '[]') {
        query += ` AND p.classifierCategories = $classifierCategories`;
        params.classifierCategories = classifierCategories;
      }
  
      query += ` RETURN 
    p.name AS name, 
    p.evalAccuracy AS evalAccuracy, 
    p.evalAvgLoss AS evalAvgLoss, 
    p.evalF1Score AS evalF1Score, 
    p.evalFalsePositiveRate AS evalFalsePositiveRate, 
    p.evalPrecision AS evalPrecision, 
    p.evalRecall AS evalRecall, 
    p.evalRmse AS evalRmse`;
  
      console.log("My query : " + query);
  
      try {
          const result = await session.run(query, params);
                  // Check if there are any records returned
                  if (result.records.length === 0) {
                    console.log('No results found for the specified model name.');
                    return []; // or handle accordingly
                }
          
              // Map the results to a more usable format
    return result.records.map(record => {
      return {
        name: record.get('name'),
        evalAccuracy: record.get('evalAccuracy'),
        evalAvgLoss: record.get('evalAvgLoss'),
        evalF1Score: record.get('evalF1Score'),
        evalFalsePositiveRate: record.get('evalFalsePositiveRate'),
        evalPrecision: record.get('evalPrecision'),
        evalRecall: record.get('evalRecall'),
        evalRmse: record.get('evalRmse')
      };
    });

  
      } catch (error) {
          console.error('Error fetching data from Neo4j:', error);
          throw error; // or handle it as needed
      } finally {
          await session.close();
      }
  },
  //For Testing  
  async getSelectedExistingModel(
    existingModelName:  string
  ): Promise<any> {

    
    console.log("modelName: " + existingModelName);
    const session: Session = driver.session();

    const query = `
      MATCH (p:Model {name: $existingModelName})
      RETURN  p.name AS name, p.script AS script
    `;

    // const query = `
    //     MATCH (p:Model {name: $existingModelName})-[r]-(o:Option)
    //     RETURN p, r, o
    //     ORDER BY r.Step
    // `;

    try {
        const result = await session.run(query, { existingModelName });
            // Check if there are any records returned
            if (result.records.length === 0) {
                console.log('No results found for the specified model name.');
                return []; // or handle accordingly
            }

            // Map the results to a more usable format
            return result.records.map(record => {
              return {
                name: record.get('name'),
                script: record.get('script')
              };
            });
                
        //     console.log("result.records.length: " , result.records.length);
        //     const modelData = result.records.map(record => {
        //     const model = record.get('p').properties;
        //     const option = record.get('o').properties;
        //     const relationship = record.get('r').properties;
        //     // console.log("model result: " , model);
        //     //console.log("option result: " , option);
        //     //console.log("relationship result: " , relationship);
        //     // Helper function to get the low value
        //     const getValue = (value) => value && value.low !== undefined ? value.low : value;

        //     return {
        //       model: {
        //         Name: model.name, 
        //         Script:model.script,
        //         ClassifierTrainFolder: model.classifierTrainFolder,
        //         ClassifierCategories: model.classifierCategories,
        //         ClassifierKeys: model.classifierKeys,
        //         EvalAccuracy: model.evalAccuracy,
        //         EvalAvgLoss: model.evalAvgLoss,
        //         EvalF1Score: model.evalF1Score,
        //         EvalFalsePositiveRate: model.evalFalsePositiveRate,
        //         EvalPrecision: model.evalPrecision,
        //         EvalRecall: model.evalRecall,
        //         EvalRmse: model.evalRmse,
        //     },
        //       option: {
        //         Name: option.Name, 
        //         Method: option.Method,
        //         NextAllowable: option.NextAllowable,
        //         InputNames: option.InputNames,
        //         InputTypes: option.InputTypes,

        //     },
        //       relationship: {
        //           UserInput: relationship.UserInput, // Assuming UserInput is already an array
        //           Step: getValue(relationship.Step),
        //       }
        //   };
        // });

        // return modelData;

    } catch (error) {
        console.error('Error fetching data from Neo4j:', error);
        throw error; // or handle it as needed
    } finally {
        await session.close();
    }
},

  
};


