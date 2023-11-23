import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinay } from "../utils/cloudinary.js";
import { APiResponse } from "../utils/ApiResponse.js";

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
  const existedUser = User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User with Email or Username allready exits.");
  }

  //   5. chech images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0].path;

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

export { registerUser };
