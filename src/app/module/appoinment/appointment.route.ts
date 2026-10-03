import { Router } from "express";
import { AppointmentController } from "./appointment.controller";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../lib/role";

const router = Router();

router.post("/book-appointment",auth(Role.PATIENT), AppointmentController.bookAppointment);

//book appointment payment callback route
router.get(
	"/book-appointment/payment/callback",
	AppointmentController.bookAppointmentCallback,
	(req, res) => {
		res.send("Payment callback received");
	},
);

export const AppointmentRoutes = router;
