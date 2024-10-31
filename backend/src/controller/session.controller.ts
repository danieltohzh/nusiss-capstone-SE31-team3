import { CookieOptions, Request, Response } from "express";
import config from "../../loadConfig";
import {
  createSession,
  findSessions,
  updateSession
} from "../service/session.service";
import {
  findAndUpdateUser,
  getGoogleOAuthTokens,
  getGoogleUser,
  findUserByEmailInNeo4j,
} from "../service/user.service";
import { signJwt } from "../utils/jwt.utils";
import { createAuditLog } from "../service/audit.service";
import neo4j, { Driver, Session } from 'neo4j-driver';

// Initialize Neo4j connection
const driver: Driver = neo4j.driver(
  config.neo4jUri,
  neo4j.auth.basic(config.neo4jUser, config.neo4jPassword)
);

export async function updateOrCreateNode(label: string, identifier: string, properties: Record<string, any>) {
  const query = `
    MERGE (n:${label} { identifier: $identifier })
    ON CREATE SET n += $properties
    ON MATCH SET n += $properties
    RETURN n
  `;
  const session: Session = driver.session();
  try {
    const result = await session.run(query, {
      identifier,
      properties,
    });

    const record = result.records[0]?.get('n');
    return record ? record.properties : null;
  } catch (error) {
    console.error('Error updating or creating node:', error);
  } finally {
    await session.close(); // Close the session after operations
    await driver.close();  // Close the driver when done
  }
}


const accessTokenCookieOptions: CookieOptions = {
  maxAge: 900000, 
  httpOnly: false,
  domain: config.domain, //"uat-demo.link",
  path: "/",
  sameSite: "lax",
  secure: config.secure, //true
};

const refreshTokenCookieOptions: CookieOptions = {
  ...accessTokenCookieOptions,
  maxAge: 3.154e10, // 1 year
};


// export async function createUserSessionHandler(req: Request, res: Response) {
//   // 1. Validate the user's password
//   const user = await validatePassword(req.body);

//   if (!user) {
//     return res.status(401).send("Invalid email or password");
//   }

//   // 2. create a session
//   const session = await createSession(user._id.toString(), req.get("user-agent") || "");

//   // 3. create an access token
//   const accessToken = signJwt(
//     { ...user, session: session._id },
//     { expiresIn: config.accessTokenTtl } // 15 minutes
//   );

//   // 4. create a refresh token
//   const refreshToken = signJwt(
//     { ...user, session: session._id },
//     { expiresIn: config.refreshTokenTtl } // 15 minutes
//   );

//   // 5. return access & refresh tokens

//   res.cookie("accessToken", accessToken, accessTokenCookieOptions);

//   res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

//   return res.send({ accessToken, refreshToken });
// }

// export async function getUserSessionsHandler(req: Request, res: Response) {
//   const userId = res.locals.user?._id;
//   console.log("getUserSessionsHandler - userId: ", userId);

//   const sessions = await findSessions({ user: userId, valid: true });
//   console.log("sessions: ", {sessions});

//   return res.send(sessions);
// }

export async function deleteSessionHandler(req: Request, res: Response) {
  try {
    const sessionId = res.locals.user.session;

    if (!sessionId) {
      console.error('Session ID not found');
      return res.status(400).send({ error: 'Session ID not found' });
    }

    await updateSession({ _id: sessionId }, { valid: false });

    console.log('Session invalidated successfully');

    return res.send({
      accessToken: null,
      refreshToken: null,
    });
  } catch (error) {
    console.error('Error during session invalidation:', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  }
}

export async function googleOauthHandler(req: Request, res: Response) {
  // 1. get the code from qs
  const code = req.query.code as string;

  try {
    // 2. get the id and access token with the code
    const { id_token, access_token } = await getGoogleOAuthTokens({ code });

    // 3. get user with tokens
    const googleUser = await getGoogleUser({ id_token, access_token });

    // const googleUserCheck = jwt.decode(id_token);
    // console.log({googleUserCheck});

    if (!googleUser.verified_email) {
      return res.status(403).send("Google account is not verified");
    }

    // check if the email exist in neo4j anot if no, then no access
    console.log("req.body.email: " + googleUser.email);

    const existingUser = await findUserByEmailInNeo4j(googleUser.email); // Adjust based on your identifier

    if (!existingUser) {
      return res.status(409).send("User does not exist, please contact administrator.");
    }
  
    // 4.upsert the user (to mongoDB)
    const user = await findAndUpdateUser(
      {
        email: googleUser.email,
      },
      {
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture,
      },
      {
        upsert: true,
        new: true,
      }
    );

    if (!user) {
      return res.status(500).send("Failed to upsert user");
    }

    // Ensure user._id is defined and convert to string
    const userId = user._id ? user._id.toString() : "";

    if (!userId) {
      return res.status(500).send("User ID is missing");
    }
    console.log("userId:" + userId);

    //4.1 Update or insert into neo4j 
    const datetime = (): string => {
      return new Date().toISOString(); // Returns current date/time in ISO format
    };

    (async () => {
      const label = 'User';
      const identifier = googleUser.email; // This should be a unique identifier for the node
      const properties = {
        name: googleUser.name,
        email: googleUser.email,
        picture:googleUser.picture,
        createdAt: datetime(), 
        updatedAt: datetime()
      };
    
      const updatedNode = await updateOrCreateNode(label, identifier, properties);
      console.log('Updated Node:', updatedNode);
    })();

    // 5. create a session
    const session = await createSession(userId, req.get("user-agent") || "");

    // 5.1 create an audit log 
    const userAgent = req.get("user-agent");
    if (userAgent === undefined) {
      throw new Error("User agent header is not provided");
    }
    const audit = await createAuditLog(userId, userAgent,  "Login", "Authenticated User at Home Page");

    // 6. create an access token

    const accessToken = signJwt(
      { ...user.toJSON(), session: session._id },
      { expiresIn: config.accessTokenTtl } // 15 minutes
    );

    // 7. create a refresh token
    const refreshToken = signJwt(
      { ...user.toJSON(), session: session._id },
      { expiresIn: config.refreshTokenTtl } // 15 minutes
    );

    //log.info("accessToken: " + accessToken);
    //log.info("refreshToken: " + refreshToken);
    // 8. set into cookies
    res.cookie("accessToken", accessToken, accessTokenCookieOptions);

    res.cookie("refreshToken", refreshToken, refreshTokenCookieOptions);

    // 9. redirect back to client
    const REDIRECT_URI = config.origin;
    res.redirect(REDIRECT_URI);
  } catch (error) {
    console.error(error, "Failed to authorize Google user");
    const REDIRECT_URI_ERROR = config.errorRedirectUrl;
    return res.redirect(REDIRECT_URI_ERROR);
  }
}


