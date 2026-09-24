import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IRequestUser } from "../auth/auth.interface";
import { userServices } from "./user.service";

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {
	if (!req.file || !req.file.buffer) {
		res.status(httpStatus.BAD_REQUEST).json({
			success: false,
			message: "No image file uploaded",
		});
		return;
	}

	const user = req.user as unknown as IRequestUser;
	if (!user?.userId) {
		throw new Error("Unauthorized request: User information not found");
	}

	const result = await userServices.uploadProfileImage(
		user.userId,
		req.file.buffer,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile image uploaded successfully",
		data: result,
	});
});

export const userController = {
	uploadProfileImage,
	UploadProfileImage: uploadProfileImage,
};
