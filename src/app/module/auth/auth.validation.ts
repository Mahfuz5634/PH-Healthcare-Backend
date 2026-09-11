import z from "zod";

const PatientRegistrationZodSchema = z.object({
	name: z
		.string({ message: "Name is required" })
		.trim()
		.min(2, { message: "Name must be at least 2 characters long" })
		.max(100, { message: "Name must not exceed 100 characters" }),
	email: z
		.email({ message: "Please provide a valid email address" })
		.trim()
		.toLowerCase(),
	password: z
		.string({ message: "Password is required" })
		.min(8, { message: "Password must be at least 8 characters long" })
		.max(128, { message: "Password must not exceed 128 characters" }),
	patient: z
		.object({
			contactNumber: z
				.union([
					z
						.string()
						.trim()
						.regex(/^(?:\+88|88)?01[3-9]\d{8}$/, {
							message:
								"Contact number must be a valid Bangladeshi mobile number",
						}),
					z.literal(""),
				])
				.optional(),
		})
		.optional(),
});

const LoginUserZodSchema = z.object({
	email: z
		.email({ message: "Please provide a valid email address" })
		.trim()
		.toLowerCase(),
	password: z
		.string({ message: "Password is required" })
		.min(8, { message: "Password must be at least 8 characters long" }),
});

const IForgotPasswordZodSchema = z.object({
	email: z
		.email({ message: "Please provide a valid email address" })
		.trim()
		.toLowerCase(),
});

const IResetPasswordZodSchema = z.object({
	email: z
		.email({ message: "Please provide a valid email address" })
		.trim()
		.toLowerCase(),
	otp: z.string({ message: "Otp is required" }).trim(),
	newPassword: z
		.string({ message: "New password is required" })
		.min(8, { message: "New password must be at least 8 characters long" }),
});

export const authValidation = {
	PatientRegistrationZodSchema,
	LoginUserZodSchema,
	IForgotPasswordZodSchema,
	IResetPasswordZodSchema,
};

export const patientValidation = {
	PatientRegistrationZodSchema,
	LoginUserZodSchema,
};
