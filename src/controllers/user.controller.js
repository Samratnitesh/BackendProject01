import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => 
{
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens!!")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    // get user details from the frontend
    // validation - not empty (correct format or blank etc)
    // check if user already exist (using email or username)
    // check for images, check for avatar
    // upload them to cloudinary(ref of the url fo the cloudinary), avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response / error (incase)

    const {fullname, email, username, password} = req.body

    console.log("Your email is: ", email);

   if(
    [fullname, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All field are required !!");
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })

    if(existedUser) {
        throw new ApiError(409, "username or email existed!!");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;

    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400, "avatar file is required!!");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar) {
        throw new ApiError(400, "Avatar is required!!");
    }

    const user = await User.create(
        {
            fullname, 
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            username: username.toLowerCase(),
            email, 
            password,
        }
    );


    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while creating user");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registed Successfully :-)")
    )

})

const loginUser = asyncHandler(async (req, res) => {
    // get req body -> data
    // username or email based login
    // find the user
    // password check for the user
    // access and refresh token -> user
    // send secure cookies 
    // send res

    const { email, username, password } = req.body;

    if(!(username || !email)) {
        throw new ApiError(400, "username or email is required!!")
    } // if user is not having email or username -> any one should be there
    
    const user = await User.findOne({
        $or: [{username}, {email}]
    }) // finding the user based on either username or email

    if(!user) {
        throw new ApiError(404, "user does not exist!!")
    } // checking if the user exist or not -> registered before or not

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid) {
        throw new ApiError(500, "password is wrong or not valid!");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

    // calling again the user from the database as we are calling the refersh and access tokens
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, 
            { user: loggedInUser, accessToken, refreshToken },
        "user Logged In Successfully :-)"
        )
    );

});

const logoutUser = asyncHandler (async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(
        200, 
        {}, 
        "User Logged Out Successfully "
    ))
});

const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized access!!");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, 
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken._id)
    
        if(!user) {
            throw new ApiError(401, "Invalid User!!");
        }
    
        if(incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "invalid refresh token!!")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken: newRefreshToken
                },
                "Access Token Refreshed"
            )
        )
    
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Refresh token")
    }

});

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    const user = await User.findById(req.user?._id); // this is from the req as user should be logged in 

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect) {
        throw new ApiError(400, "Incorrect Password!!")
    }

    user.password = newPassword;

    await user.save({validateBeforeSave: false});

    return res.status(200)
    .json(new ApiResponse(
        200, 
        {},
        "Password changes successfully"
    ))

});

const getCurrentUser = asyncHandler(async(req, res) => {
    return res.status(200).json(200, req.user, "Current user fetched successfully")
});

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullname, email} = req.body;

    if(!fullname && !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname,
                email: email
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(
        200, user,
        "Accout details upaded successfully"
    ));
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath) {
        throw new ApiError(400, "avatart file is missing!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url) {
        throw new ApiError(400, "Error while uploading avatar on cloudinary!!");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new : true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, user, "User Avatar upadted successfully"));
});

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing!")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url) {
        throw new ApiError(400, "Error while uploading cover image on cloudinary!!");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new : true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, user, "Cover Image Upadted successfully"))
});

export {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
    }