import { z } from "zod";

export const formatZodErrorMessage = (error: z.ZodError) => {
	return error.issues
		.map((issue) => {
			const field = issue.path.length ? issue.path.join(".") : "request";
			return `${field}: ${issue.message}`;
		})
		.join("; ");
};
