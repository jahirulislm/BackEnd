import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  upadateUserAvatar,
  upadateUsercoverImage,
  getUserChannlerProfile,
  getWatchHistory,
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
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);

router
  .route("/avatar")
  .patch(verifyJWT, upload.single("avatar"), upadateUserAvatar);
router
  .route("cover-image")
  .patch(verifyJWT, upload.single("coverImage"), upadateUsercoverImage);

router.route("/C/:username").get(verifyJWT, getUserChannlerProfile);
router.route("/history").get(verifyJWT, getWatchHistory);
export default router;
