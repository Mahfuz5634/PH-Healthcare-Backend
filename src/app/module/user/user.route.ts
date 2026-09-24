import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { userController } from "./user.controller";

const router = Router();

router.patch(
	"/profile-image",
	auth(Role.ADMIN, Role.DOCTOR, Role.PATIENT, Role.SUPER_ADMIN),
	upload.single("profileImage"),
	userController.uploadProfileImage,
);

export const UserRoutes = router;
