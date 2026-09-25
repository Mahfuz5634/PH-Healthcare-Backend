import { Router } from "express";
import { AppointmentController } from "./appointment.controller";   


const router = Router();

router.post("/book-appointment", AppointmentController.bookAppointment);

//book appointment payment callback route
router.get(
    "/book-appointment/payment/callback",
    AppointmentController.bookAppointment,(req, res) => {
        res.send("Payment callback received");
    }
);

export const AppointmentRoutes = router;