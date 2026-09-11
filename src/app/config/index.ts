import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
	node_env: process.env.NODE_ENV,
	port: process.env.PORT,
	database_url: process.env.DATABASE_URL,
	backend_url:
		process.env.BACKEND_URL || process.env.APP_URL || "http://localhost:5000",
	frontend_url: process.env.FRONTEND_URL || "http://localhost:3000",
	bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
	jwt_access_secret: process.env.JWT_ACCESS_SECRET!,
	jwt_refresh_secret: process.env.JWT_REFRESH_SECRET!,
	jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN!,
	jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN!,
	google_client_id: process.env.GOOGLE_CLIENT_ID!,
	super_admin_email: process.env.SUPER_ADMIN_EMAIL!,
	super_admin_password: process.env.SUPER_ADMIN_PASSWORD!,
	tester_admin_email: process.env.TESTER_ADMIN_EMAIL!,
	tester_admin_password: process.env.TESTER_ADMIN_PASSWORD!,
	tester_doctor_email: process.env.TESTER_DOCTOR_EMAIL!,
	tester_doctor_password: process.env.TESTER_DOCTOR_PASSWORD!,
	redis_user: process.env.REDIS_USER || "default",
	redis_password: process.env.REDIS_PASSWORD!,
	redis_host: process.env.REDIS_HOST!,
	redis_port: process.env.REDIS_PORT!,
	smtp_user: process.env.SMTP_USER!,
	smtp_password: process.env.SMTP_PASSWORD!,
	SMTP_USER: process.env.SMTP_USER!,
	SMTP_PASSWORD: process.env.SMTP_PASSWORD!,
};
