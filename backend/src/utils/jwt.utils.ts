import jwt from "jsonwebtoken";
import config from "../../loadConfig";
import AWS from 'aws-sdk';

const privateKey = config.privateKey;
const publicKey = config.publicKey;

export function signJwt(object: Object, options?: jwt.SignOptions | undefined) {
  console.log("inside signJwt");
  return jwt.sign(object, privateKey, {
    algorithm: "RS256",
    ...options
  });
}

export function verifyJwt(token: string) {
  console.log("inside verifyJwt");
  try {
    console.log("token at jwt.utils: " + token);
    const decoded = jwt.verify(token, publicKey);
    return {
      valid: true,
      expired: false,
      decoded,
    };
  } catch (e: any) {
    console.error(e);
    return {
      valid: false,
      expired: e.message === "jwt expired",
      decoded: null,
    };
  }
}
