import { Request, Response } from "express";
import { omit } from "lodash";
import { CreateUserInput, createUserSchema } from "../dbSchema/user.schema";
import { createUser, findUserByEmail, findAllUsersEmailAndRole } from "../service/user.service";


export async function createUserHandler(
  req: Request<{}, {}, CreateUserInput>,
  res: Response
) {
  try {
    // Validate request body
    const validatedBody = createUserSchema.parse(req.body);

    // Check if a user with the same email already exists
    const existingUser = await findUserByEmail(validatedBody.body.email);
    if (existingUser) {
      return res.status(200).json({ message: "User already exists with that email." });
    }

    // Create the new user
    const user = await createUser(validatedBody.body);
    return res.status(200).json({ message: "User created successfully." });

  } catch (e: any) {
    // Handle validation errors
    if (e.errors) {
      return res.status(400).send(e.errors); // Respond with validation errors
    }

    // Log and respond to other errors
    console.error(e);
    return res.status(500).send(e.message); // Respond with server error
  }
}

export async function getAllUsersHandler(req: Request, res: Response): Promise<void> {
  try {
    const users = await findAllUsersEmailAndRole(); // Only fetch email and role
    console.log('Preloaded Users:', users);
    
    // Send the user data back in the response
    res.status(200).json(users); // Sends the users as JSON response
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Error fetching users'); // Send an error response
  }
}

export async function getCurrentUser(req: Request, res: Response) {
  console.log("User in getCurrentUser: " + res.locals.user);
  return res.send(res.locals.user);
}
