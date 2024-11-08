import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
    {
    username: {
        type: String, 
        required: true,
        unique: true,
        trim: true, 
        lowercase: true,
        index: true
    },
    email: {
        type: String, 
        required: true,
        unique: true,
        trim: true, 
        lowercase: true,
    },
    fullname: {
        type: String, 
        required: true,
        trim: true, 
        index: true
    },
    avatar: {
        type: String, // cloudnary url
        required: true
    },
    coverImage: {
        type: String, 
    },
    watchHistory: [
        {
        type: Schema.Types.ObjectId,
        ref: "Video"
        }
    ],

    password: {
        type: String,
        required: [true, "Password is required!"] 
    },

    refreshToken: {
        type: String,
    }
    
    },
    {
        timestamps: true
});

userSchema.pre("save", async function(next) {
    if(!this.isModified("password")) return next();

    this.password = bcrypt.hash(this.password, 10);
    next();
}) // this will encypt the password before saving it to the database using the bcrypt library (hash)

userSchema.methods.isPasswordCorrect = async function(password) {
    return await bcrypt.compare(password, this.password)
} // this is used to check the password that is input by user is correct or not

userSchema.methods.generateAccessToken = function() {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken = function() {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}
export const User = mongoose.model("User", userSchema);