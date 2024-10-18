"use server"

import {v2 as Cloudinary} from "cloudinary"
import { error } from "console"
import { useEffect } from "react"


export default function CloudinaryUpload({image}){

    useEffect(()=>{
      const uploadImage = async (image) => {

        // Use the uploaded file's name as the asset's public ID and 
        // allow overwriting the asset with new versions
        const options = {
          use_filename: true,
          unique_filename: false,
          overwrite: true,
        };
    
        try {
          // Upload the image
          const result = await Cloudinary.uploader.upload(image, options);
          console.log(result);
          return result.public_id;
        } catch (error) {
          console.error(error);
        }
    };

    uploadImage(image)

    }, []);

    return (
        <div>
          <h1>Uploading Image</h1>
        </div>
    )
}