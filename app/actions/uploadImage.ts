'use server'
import {v2 as Cloudinary} from "cloudinary"

export async function uploadImage(path: string, patientName: string, patientid: number){
    
    //console.log(path)
    const allPath = `../../../Pictures/${path}` //las imagenes deben estar en la carpeta de pictures.
    const options = {
      use_filename: true,
      unique_filename: false,
      overwrite: true,
      folder: `/pacientes/${patientName+"_"+patientid}/fotoPerfil`
    };

    try {
      // Upload the image
      const result = await Cloudinary.uploader.upload(allPath, options);
      console.log(result);
      return result.public_id;
    } catch (error) {
      console.error(error);
    }

}