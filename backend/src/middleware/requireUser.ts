import { Request, Response, NextFunction } from "express";

const requireUser = (req: Request, res: Response, next: NextFunction) => {
  console.log('Inside requireUser');
  const user = res.locals.user; // Change to req.user
  console.log("requireUser middleware - user: ", user);

  if (!user) {
    return res.sendStatus(403);
  }

  return next();
};

export default requireUser;
