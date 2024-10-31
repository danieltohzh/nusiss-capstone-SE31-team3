import {
  FilterQuery,
  QueryOptions,
  UpdateQuery,
} from "mongoose";
import qs from "qs";
import axios from "axios";
import { omit } from "lodash";
import UserModel, { UserDocument, UserInput } from "../dbModel/user.model";
import config from "../../loadConfig";
import neo4j, { Driver, Session } from 'neo4j-driver';

// Neo4j connection details
const driver: Driver = neo4j.driver(
  config.neo4jUri,
  neo4j.auth.basic(config.neo4jUser, config.neo4jPassword)
);

export async function createUser(
  input: UserInput){
  try {
    const user = await UserModel.create(input);
    return user; 
    // return omit(user.toJSON(), "password");
  } catch (e: any) {
    throw new Error(e);
  }
}

export async function findAllUsersEmailAndRole(){
  try {
    const user = await UserModel.find().select('email role')
    return user; 
  } catch (e: any) {
    throw new Error(e);
  }
}


export async function findUser(query: FilterQuery<UserDocument>) {
  return UserModel.findOne(query).lean();
}

// Example of a function to find a user by email
export async function findUserByEmail(email: string) {
  // Replace with your actual database query logic
  return await UserModel.findOne({ email });
}

// Example of a function to find a user by email
export async function findUserByEmailInNeo4j(email: string) : Promise<any> {
    const session: Session = driver.session();

    try {
      const existingUserquery = `
      MATCH (u:User {email: $email})
      RETURN  u`;
  
      const result = await session.run(existingUserquery, { email });
      // Extract the user from the result
      if (result.records.length > 0) {
        return result.records[0].get('u'); 
      }

      return null; // Return null if no user is found
    } finally {
      await session.close();
    }

}

interface GoogleTokensResult {
  access_token: string;
  expires_in: Number;
  refresh_token: string;
  scope: string;
  id_token: string;
}

export async function getGoogleOAuthTokens({
  code,
}: {
  code: string;
}): Promise<GoogleTokensResult> {
  const url = "https://oauth2.googleapis.com/token";
  const clientId = config.googleClientId as string;
  const clientSecret = config.googleClientSecret as string;
  const redirectUri = config.googleOauthRedirectUrl as string;

  const values = {
    code,
    // client_id: "644275109199-xxxxxxxxxxxxx.apps.googleusercontent.com",
    // client_secret: "GOCSPX-xxxxxxxxxxxxx",
    // redirect_uri: "https://api.uat-demo.link/api/sessions/oauth/google",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  };

  try {
    const res = await axios.post<GoogleTokensResult>(
      url,
      qs.stringify(values),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return res.data;
  } catch (error: any) {
    console.error(error.response.data.error);
    console.error(error, "Failed to fetch Google Oauth Tokens");
    throw new Error(error.message);
  }
}

interface GoogleUserResult {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

export async function getGoogleUser({
  id_token,
  access_token ,
}): Promise<GoogleUserResult> {
  try {
    const res = await axios.get<GoogleUserResult>(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
      {
        headers: {
          Authorization: `Bearer ${id_token}`,
        },
      }
    );
    return res.data;
  } catch (error: any) {
    console.error(error, "Error fetching Google user");
    throw new Error(error.message);
  }
}

export async function findAndUpdateUser(
  query: FilterQuery<UserDocument>,
  update: UpdateQuery<UserDocument>,
  options: QueryOptions = {}
) {
  return UserModel.findOneAndUpdate(query, update, options);
}
