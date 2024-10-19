import {v2 as Cloudinary} from "cloudinary"

Cloudinary.config({
    cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_NAME,
    api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export async function POST(request : Request){
    console.log()
    const body = await request.json();
    const {paramsToSign} = body;

    const signature = Cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET as string)

    return Response.json({signature});
}

