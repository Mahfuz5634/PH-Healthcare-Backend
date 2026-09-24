import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";

const uploadProfileImage = async (userId: string, buffer: Buffer) => {
	const user = await prisma.user.findUnique({
		where: { id: userId },
	});

	if (!user) {
		throw new Error("User not found");
	}

	// Delete previous image from Cloudinary if user already has an image
	if (user.image_publicId) {
		try {
			await cloudinary.uploader.destroy(user.image_publicId);
		} catch (error) {
			console.error("Failed to delete previous image from Cloudinary:", error);
		}
	}

	const uploadResult = await new Promise<{
		secure_url: string;
		public_id: string;
	}>((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: "ph-healthcare/profiles",
				resource_type: "image",
			},
			(error, result) => {
				if (error || !result) {
					reject(new Error("Failed to upload image to Cloudinary"));
				} else {
					resolve({
						secure_url: result.secure_url,
						public_id: result.public_id,
					});
				}
			},
		);
		uploadStream.end(buffer);
	});

	const updatedUser = await prisma.user.update({
		where: { id: userId },
		data: {
			imageUrl: uploadResult.secure_url,
			image_publicId: uploadResult.public_id,
		},
		select: {
			id: true,
			name: true,
			email: true,
			role: true,
			imageUrl: true,
			image_publicId: true,
			updatedAt: true,
		},
	});

	return updatedUser;
};

export const userServices = {
	uploadProfileImage,
	UploadProfileImage: uploadProfileImage,
};
