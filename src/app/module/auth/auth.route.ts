import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { authValidation, patientValidation } from "./auth.validation";

const router = Router();

router.post(
	"/register",
	validateRequest(patientValidation.PatientRegistrationZodSchema),
	AuthController.registerPatient,
);
router.post(
	"/login",
	validateRequest(patientValidation.LoginUserZodSchema),
	AuthController.loginUser,
);
router.get(
	"/me",
	auth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
	AuthController.getMe,
);
router.post("/refresh-token", AuthController.refreshToken);
router.post("/google", AuthController.googleLogin);
router.post("/forgot-password",validateRequest(authValidation.IForgotPasswordZodSchema
),AuthController.forgotPassword);
router.post("/reset-password",validateRequest(authValidation.IResetPasswordZodSchema),AuthController.resetPassword);
export const AuthRoutes = router;
