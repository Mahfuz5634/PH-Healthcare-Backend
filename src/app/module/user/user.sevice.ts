import { cloudinary } from "../../lib/cloudinary";

const UploadProfileImage = async (buffer: Buffer) => {
     return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream({ resource_type: "image" }, (error, result) => {
            if (error) {
                reject(new Error("Failed to upload image to Cloudinary"));
            } else {
                resolve(result);

                const updatedUser = await prisma.user.update({
                    where: { id: userId },
                    data: { profileImageUrl: result.secure_url, image_publicId: result.public_id    },
                }); 
        }).end(buffer);
    });
}


export const userServices = {
    UploadProfileImage
}