import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinay } from "../utils/cloudinary.js";
import { APiResponse } from "../utils/ApiResponse.js";

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

export { registerUser, loginUser, logoutUser };
