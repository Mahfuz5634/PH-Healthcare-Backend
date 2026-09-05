import z from "zod";

export const PatientRegistrationZodSchema = z.object({
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

export const LoginUserZodSchema = z.object({
  email: z
    .email({ message: "Please provide a valid email address" })
    .trim()
    .toLowerCase(),
  password: z
    .string({ message: "Password is required" })
    .min(8, { message: "Password must be at least 8 characters long" }),
});
