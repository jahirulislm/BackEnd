import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinay } from "../utils/cloudinary.js";
import { APiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    // find the user
    const user = await User.findById(userId);
    // create token access and refresh
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // adding value in obj and save in db
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // generate then return tokens
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // Breaking the task into smaller pieces to Register a User with following steps:=
  //   1. get user details from front-end
  const { fullName, email, username, password } = req.body;
  console.log("email :", email);

  //   2. Validation - at least empty
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All field are required!");
  }

  //   3. check if use already exists
  //   4. check using - "email" & "username"
  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User with Email or Username allready exits.");
  }

  // console.log(req.files);
  //   5. chech images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0].path;

  //  check the coverImage
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  //   6. upload them to cloudinary, check avatar
  const avatar = await uploadOnCloudinay(avatarLocalPath);
  const coverImage = await uploadOnCloudinay(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  //   7. create user object - create entry in db

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  // find an user with number 7 step
  //   8. remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    //  item dont want to get from users
    "-password -refreshToken"
  );

  //   9. check for user creation
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering users");
  }

  //   10. return responsive
  return res
    .status(201)
    .json(new APiResponse(200, createdUser, "User registered succesfully."));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  const { email, username, password } = req.body;
  console.log(email);
  // username or email
  if (!username && !email) {
    throw new ApiError(400, "Username or Email is required");
  }

  // find the user
  const user = await User.findOne({
    $or: [{ username }, { email }], // "or" method from mongodb
  });

  // no user find
  if (!user) {
    throw new ApiError(404, "User does not exist!");
  }

  // password check
  const isPasswordValid = await user.isPasswordCorrect(password); // got method from "user.model.js", created using bcrypt.js

  // password not correct
  if (!isPasswordValid) {
    throw new ApiError(401, "password not correct!");
  }

  // access token and refresh token
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // send to user in cookie
  const loggedinUser = await User.findById(user._id).select(
    "-password, -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new APiResponse(
        200,
        {
          user: loggedinUser,
          accessToken,
          refreshToken,
        },
        "User logged in seccussfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new APiResponse(200, {}, "Log out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    // verify the token
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // finding user from db and check
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    // matching the refresh tokens with both of db and user
    if (incomingRefreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    // generate new token
    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new APiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access Token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPasswrod, newPassword } = req.body;

  // getting user
  const user = User.findById(req.user?._id);

  // check the oldpassword by accessing the isPasswordCorrect method
  const isPasswordCorrect = await user.isPasswordCorrect(oldPasswrod);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new APiResponse(200, {}, "Password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.usr, "current user fetched successfully");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!(fullName || email)) {
    throw new ApiError(400, "All fields are required");
  }

  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new APiResponse(200, user, "Account details updated successfully"));
});

const upadateUserAvatar = asyncHandler(async (req, res) => {
  // getting file and filepath from user
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // upload file on db with cloudinary
  const avatar = await uploadOnCloudinay(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new APiResponse(200, user, "avatar uploaded successfully"));
});

const upadateUsercoverImage = asyncHandler(async (req, res) => {
  // getting file and filepath from user
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // upload file on db with cloudinary
  const coverImage = await uploadOnCloudinay(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Cover image file is missing");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  // `TODO`: create a function to delete older avatar image
  return res
    .status(200)
    .json(new APiResponse(200, user, "cover image uploaded successfully"));
});

const getUserChannlerProfile = asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  // find user
  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        channerlsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscriberCount: 1,
        channerlsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  // check the pipeline
  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exists");
  }

  return res
    .status(200)
    .json(
      new APiResponse(200, channel[0], "User channel fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watcHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          // going deeper in history
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new APiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  upadateUserAvatar,
  upadateUsercoverImage,
  getUserChannlerProfile,
  getWatchHistory,
};
