import mongoose from "mongoose";
import { UserDocument } from "./user.model";

export interface AuditDocument extends mongoose.Document {
  user: UserDocument['_id'];
  valid: boolean;
  userAgent: string;
  actionDesc: string;
  userModule: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditSchema = new mongoose.Schema(
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      valid: { type: Boolean, default: true },
      userAgent: { type: String },
      actionDesc: { type: String },
      userModule: { type: String },
    },
    {
      timestamps: true,
    }
  );
  
  const AuditModel = mongoose.model<AuditDocument>("Audit", auditSchema);
  
  export default AuditModel;
  