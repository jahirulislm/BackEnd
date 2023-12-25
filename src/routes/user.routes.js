import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// routing for register
router.route("/register").post(
  // injecting a middleware just before the method call
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

// login router
router.route("/login").post(loginUser);

// secured routes with logout
router.route("/logout").post(verifyJWT, logoutUser);
export default router;
