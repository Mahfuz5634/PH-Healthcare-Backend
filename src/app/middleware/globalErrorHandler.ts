import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { Prisma } from "../../generated/prisma/client";
import config from "../config";

export const globalErrorHandler = async (
	err: any,
	_req: Request,
	res: Response,
	_next: NextFunction,
) => {
	if (config.node_env === "development") {
		console.error("❌ Error from Global Error Handler:", err);
	}

	let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
	let errorMessage: string = err?.message || "Internal Server Error";
	const errorName: string = err?.name || "Error";

	if (err instanceof Prisma.PrismaClientValidationError) {
		statusCode = httpStatus.BAD_REQUEST;
		errorMessage = "You have provided incorrect field type or missing fields";
	} else if (err instanceof Prisma.PrismaClientKnownRequestError) {
		if (err.code === "P2002") {
			statusCode = httpStatus.BAD_REQUEST;
			errorMessage =
				"Duplicate key error: A record with this value already exists";
		} else if (err.code === "P2003") {
			statusCode = httpStatus.BAD_REQUEST;
			errorMessage = "Foreign key constraint failed";
		} else if (err.code === "P2025") {
			statusCode = httpStatus.NOT_FOUND;
			errorMessage =
				"An operation failed because the required record was not found.";
		}
	} else if (err instanceof Prisma.PrismaClientInitializationError) {
		if (err.errorCode === "P1000") {
			statusCode = httpStatus.UNAUTHORIZED;
			errorMessage =
				"Authentication failed against database server. Please check your credentials.";
		} else if (err.errorCode === "P1001") {
			statusCode = httpStatus.BAD_GATEWAY;
			errorMessage = "Can't reach database server";
		}
	} else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
		statusCode = httpStatus.INTERNAL_SERVER_ERROR;
		errorMessage = "Error occurred during database query execution";
	} else if (err instanceof Error) {
		errorMessage = err.message;
		if (
			err.message.includes("not found") ||
			err.message.includes("Not Found")
		) {
			statusCode = httpStatus.NOT_FOUND;
		} else if (
			err.message.includes("Invalid credentials") ||
			err.message.includes("Unauthorized") ||
			err.message.includes("not logged in") ||
			err.message.includes("expired")
		) {
			statusCode = httpStatus.UNAUTHORIZED;
		} else if (
			err.message.includes("Forbidden") ||
			err.message.includes("permission")
		) {
			statusCode = httpStatus.FORBIDDEN;
		} else if (
			err.message.includes("already exists") ||
			err.message.includes("blocked") ||
			err.message.includes("Blocked") ||
			err.message.includes("deleted") ||
			err.message.includes("OTP") ||
			err.message.includes("Otp") ||
			err.message.includes("wait") ||
			err.message.includes("verified")
		) {
			statusCode = httpStatus.BAD_REQUEST;
		}
	}

	res.status(statusCode).json({
		success: false,
		statusCode,
		name: errorName,
		message: errorMessage,
		error: config.node_env === "development" ? err : undefined,
		stack: config.node_env === "development" ? err?.stack : undefined,
	});
};
