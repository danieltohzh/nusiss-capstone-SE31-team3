import mongoose from "mongoose";

export interface ModelDefintiionDocument extends mongoose.Document {
  email: string;
  script: string;
  jobName: string;
  modelName: string;
  createdAt: Date;
  updatedAt: Date;
}

//Create your schema definition 
const modelDefinitionSchema = new mongoose.Schema(
  {
    email: { type: String, required: true},
    script: { type: String },
    jobName: { type: String },
    modelName: { type: String },
  },
  {
    timestamps: true,
  }
);


const ModelDefinitionModel = mongoose.model<ModelDefintiionDocument>("ModelDefinition", modelDefinitionSchema);

export default ModelDefinitionModel;
