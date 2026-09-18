import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync"
import httpStatus from "http-status";
import { userServices } from "./user.sevice";


const UploadProfileImage = catchAsync ( async (req: Request, res: Response) => {
    if(!req.file || !req.file.buffer) {
        return res.status(httpStatus.BAD_REQUEST).json({
            success: false,
            message: "No file uploaded",
        });
    }
     const result = await userServices.UploadProfileImage(req.file.buffer);
     res.status(httpStatus.OK).json(result);
} );

export const userController = {
    UploadProfileImage
}