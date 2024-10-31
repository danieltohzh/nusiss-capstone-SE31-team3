import mongoose from "mongoose";
import argon2 from "argon2";

export interface UserInput{
  email: string;
  role: string;
}
export interface UserDocument extends UserInput, mongoose.Document {
  name: string;
  picture: string;
  createdAt: Date;
  updatedAt: Date;
}

//Create your schema definition 
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    role: { type: String, required: true },
    name: { type: String, required: false },
    picture: { type: String, required: false },
  },
  {
    timestamps: true,
  }
);


const UserModel = mongoose.model<UserDocument>("User", userSchema);

export default UserModel;
