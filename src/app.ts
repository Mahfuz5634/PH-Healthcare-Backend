import cookieParser from "cookie-parser";
import cors from "cors";
import express, {
	type Application,
	type Request,
	type Response,
} from "express";
import httpStatus from "http-status";
import config from "./app/config";
import { redisClient } from "./app/lib/redis";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";
import { AuthRoutes } from "./app/module/auth/auth.route";
import { UserRoutes } from "./app/module/user/user.route";
import { getBkashIdToken } from "./app/lib/bkash";
import { AppoinmentRoutes, appoinmentRoutes } from "./app/module/appoinment/appoinment.route";
import { AppointmentRoutes } from "./app/module/appoinment/appointment.route";

const app: Application = express();

app.use(
	cors({
		origin: config.frontend_url,
		credentials: true,
	}),
);

// Enable URL-encoded form data parsing
app.use(express.urlencoded({ extended: true }));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", AuthRoutes);
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/appointment", AppointmentRoutes);

app.get("/test-bkash", async (req: Request, res: Response) => {
	try {
		const data = await getBkashIdToken();
		console.log(data);
		res.status(httpStatus.OK).json({
			success: true,
			data,
		});
	} catch (error) {
		console.error("Error in /test-bkash route:", error);
		res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
			success: false,
			message: "Failed to retrieve bKash ID token",
		});
	}
});

// Basic health check route
app.get("/", async (_req: Request, res: Response) => {
	res.status(httpStatus.OK).json({
		success: true,
		message: "Welcome to PH Healthcare System Backend",
	});
});

// Redis connection check route (development only)
if (config.node_env === "development") {
	app.get("/redis-test", async (_req: Request, res: Response) => {
		const ping = await redisClient.ping();
		res.status(httpStatus.OK).json({
			success: true,
			message: "Redis is connected and responding",
			ping,
		});
	});
}

app.use(globalErrorHandler);
app.use(notFound);

export default app;
