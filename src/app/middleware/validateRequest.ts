import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { formatZodErrorMessage } from "../lib/formatZoderrormsg";

export const validateRequest = (schema: z.ZodSchema) => {
	return async (req: Request, _res: Response, next: NextFunction) => {
		try {
			const result = await schema.safeParseAsync(req.body ?? {});

			if (!result.success) {
				const formattedError = formatZodErrorMessage(result.error);
				throw new Error(formattedError);
			}

			req.body = result.data;
			next();
		} catch (error) {
			next(error);
		}
	};
};
