import { get } from "lodash";
import AuditModel, { AuditDocument } from "../dbModel/audit.model";

export async function createAuditLog(userId: string, userAgent: string, actionDesc: string, userModule: string) {
  const audit = await AuditModel.create({ user: userId, userAgent, actionDesc, userModule });

  return audit.toJSON();
}



