import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })
    
        // console.log("File is uploaded at cloudinary: ", response.url);
        fs.unlinkSync(localFilePath);
        
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); // File is removed from local server as it is not uploaded

        return null;
    }
   
}

// cloudinary.v2.uploader.upload("",
//     { public_id: ""},
//     function(error, result) {
//         console.log(result);
//     }
// );

export {uploadOnCloudinary}