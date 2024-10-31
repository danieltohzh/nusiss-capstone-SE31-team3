import { Request, Response } from "express";
import { omit } from "lodash";
import ModelDefinitionModel, { ModelDefintiionDocument } from "../dbModel/modelDefinition.model";

export const createModelDefinition = async (email: string, script: string, jobName: string, modelName: string) => {
  try {
    // Create a new model definition instance
    const newModelDefinition = new ModelDefinitionModel({
      email,
      script,
      jobName,
      modelName,
    });

    // Save the model definition to the database
    const savedModelDefinition: ModelDefintiionDocument = await newModelDefinition.save();

    console.log("Model definition created successfully:", savedModelDefinition);
    return savedModelDefinition; // Return the saved document if needed
  } catch (error) {
    console.log("Error creating model definition:", error);
    throw error; // You may want to handle this differently based on your application
  }
};