import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { AuthService } from "../auth/auth.service";
import { Request, Response } from "express";
import { AppointmentService } from "./appointment.service";


const bookAppointment = catchAsync(async (req: Request, res: Response) => {

    const result = await AppointmentService.bookAppointment();

	

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Appointment booked successfully",
		data: result,
	});
});



export const AppointmentController = {
    bookAppointment,
};