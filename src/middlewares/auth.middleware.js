import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // access the token from cookie or header
    const token =
      req.cookie?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    console.log(token);

    if (!token) {
      throw new ApiError(401, "Unauthorize request");
    }

    // verify the token
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      // TODO: discuss about front-end in next video
      throw new ApiError(401, "Invalid access token");
    }
    // add an obj to request from parameter inside
    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access toekn");
  }
});
