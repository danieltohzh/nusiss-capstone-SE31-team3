import { object, string, TypeOf } from "zod";

// Updated schema with role instead of admin
export const createUserSchema = object({
  body: object({
    email: string({
      required_error: "Email is required",
    }).email("Not a valid email"),
    role: string({
      required_error: "Role is required",
    }), // Changed from admin to role
  }),
});

// Type definition that matches your UserInput structure
export type CreateUserInput = Omit<TypeOf<typeof createUserSchema>, "body.passwordConfirmation">;
