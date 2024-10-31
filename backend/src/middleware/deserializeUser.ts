import { get } from "lodash";
import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt.utils";
import { reIssueAccessToken } from "../service/session.service";
import config from "../../loadConfig";

const deserializeUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.info('Inside deserializeUser (Backend)');
  console.info("Request cookies:", req.cookies); // Log cookies
  console.info("res.locals.user at deserizlied:", res.locals.user); // Log cookies

  const accessToken =
    get(req, "cookies.accessToken") ||
    get(req, "headers.authorization", "").replace(/^Bearer\s/, "");

  const refreshToken =
    get(req, "cookies.refreshToken") || get(req, "headers.x-refresh");

    console.info("accessToken at deserializeUser.ts: " + accessToken);

  if (!accessToken) {
    console.info("accessToken is empty");
    return next();
  }

  console.info("accessToken at deserializeUser.ts: " + accessToken);
  const { decoded, expired } = verifyJwt(accessToken);
  console.info("decoded: ", decoded);
  
  if (decoded) {
    res.locals.user = decoded;
    return next();
  }

  // To handle expired token
  if (expired && refreshToken) {
    const newAccessToken = await reIssueAccessToken({ refreshToken });

    if (newAccessToken) {
      res.setHeader("x-access-token", newAccessToken);

      res.cookie("accessToken", newAccessToken, {
           maxAge: 900000, // 15 mins
           httpOnly: true,
           domain: config.domain, //"uat-demo.link", 
           path: "/",
           sameSite: "strict",
           secure: config.secure, //true, 
      });
    }

    const result = verifyJwt(newAccessToken as string);

    res.locals.user = result.decoded;
    return next();
  }

  return next();
};

export default deserializeUser;
