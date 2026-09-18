import { Router } from "express";
import { Role } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AuthController } from "./auth.controller";
import { authValidation, patientValidation } from "./auth.validation";
import { userController } from "./user.controller";
import { upload } from "../../lib/multer";

const router = Router();


router.patch(
    "/profile-image",auth(Role.ADMIN,Role.DOCTOR,Role.PATIENT,Role.SUPER_ADMIN),upload.single("profileImage"),
    AuthController.updateProfileImage,userController.UploadProfileImage
);
export const UserRoutes = router;
