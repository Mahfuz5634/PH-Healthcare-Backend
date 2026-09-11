import crypto from "crypto";
import bcrypt from "bcryptjs";
import type { TokenPayload } from "google-auth-library";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import {
	AuthProvider,
	Role,
	UserStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { googleClient } from "../../lib/googleAuth";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { sendEmail } from "../../utils/email";
import { jwtUtils } from "../../utils/jwt";
import type {
	IForgotPasswordPayload,
	IGoogleLoginPayload,
	ILoginUserPayload,
	IRegisterPatientPayload,
	IRequestUser,
	IResetPasswordPayload,
} from "./auth.interface";

const registerPatient = async (payload: IRegisterPatientPayload) => {
	const { name, password } = payload;
	const email = payload.email.trim().toLowerCase();

	const isUserExists = await prisma.user.findUnique({
		where: { email },
	});

	if (isUserExists) {
		throw new Error("User with this email already exists");
	}

	const hashedPassword = await bcrypt.hash(password, 8);

	const createdUser = await prisma.user.create({
		data: {
			name,
			email,
			password: hashedPassword,
			role: Role.PATIENT,
			status: UserStatus.ACTIVE,
			emailVerified: false,
			patient: {
				create: { name, email },
			},
		},
		omit: { password: true },
		include: { patient: true },
	});

	const { patient, ...user } = createdUser;
	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		user,
		patient,
		accessToken,
		refreshToken,
	};
};

const loginUser = async (payload: ILoginUserPayload) => {
	const { password } = payload;
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({
		where: { email },
	});

	if (!user) {
		throw new Error("User not found");
	}

	if (user.status === UserStatus.BLOCKED) {
		throw new Error("User is blocked");
	}

	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new Error("User is deleted");
	}

	if (!user.password && user.googleId !== null) {
		throw new Error(
			"This account was registered using Google. Please log in with Google.",
		);
	}

	if (!user.password) {
		throw new Error("Invalid credentials");
	}

	const isPasswordMatched = await bcrypt.compare(password, user.password);

	if (!isPasswordMatched) {
		throw new Error("Invalid credentials");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const getMe = async (user: IRequestUser) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			id: user.userId,
		},
		include: {
			patient: true,
		},
		omit: {
			password: true,
		},
	});

	if (!isUserExists) {
		throw new Error("User not found");
	}

	return isUserExists;
};

const refreshToken = async (token: string) => {
	const verifiedRefreshToken = jwtUtils.verifyToken(
		token,
		config.jwt_refresh_secret,
	);

	if (!verifiedRefreshToken.success || !verifiedRefreshToken.data) {
		throw new Error(
			config.node_env === "development"
				? verifiedRefreshToken.error
				: "Invalid refresh token",
		);
	}

	const data = verifiedRefreshToken.data as JwtPayload;

	const user = await prisma.user.findUnique({
		where: { id: data.userId },
	});

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new Error("User is inactive or not found");
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
	};
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
	let googleIdTokenPayload: TokenPayload | null | undefined = null;

	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: payload.idToken,
			audience: config.google_client_id,
		});

		googleIdTokenPayload = ticket.getPayload();
	} catch (err) {
		console.error(err);
		throw new Error("Invalid Google ID token");
	}

	if (!googleIdTokenPayload || !googleIdTokenPayload.email) {
		throw new Error("Email not found in Google ID token");
	}

	const email = googleIdTokenPayload.email.trim().toLowerCase();
	const googleId = googleIdTokenPayload.sub;
	const name = googleIdTokenPayload.name || "Unknown";

	let user = await prisma.user.findUnique({
		where: { email },
	});

	if (user) {
		if (user.status === UserStatus.BLOCKED) {
			throw new Error("User is blocked");
		}
		if (user.isDeleted || user.status === UserStatus.DELETED) {
			throw new Error("User is deleted");
		}

		// Link Google ID if not linked yet
		if (!user.googleId) {
			user = await prisma.user.update({
				where: { id: user.id },
				data: {
					googleId,
					emailVerified: true,
				},
			});
		}
	} else {
		user = await prisma.user.create({
			data: {
				name,
				email,
				googleId,
				role: Role.PATIENT,
				authProvider: AuthProvider.GOOGLE,
				emailVerified: true,
				patient: {
					create: {
						name,
						email,
					},
				},
			},
		});
	}

	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions,
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions,
	);

	return {
		accessToken,
		refreshToken,
		user: {
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
		},
	};
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
	const email = payload.email.trim().toLowerCase();

	const isUserExist = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (!isUserExist) {
		throw new Error("User with this email does not exist!");
	}

	if (isUserExist.status === UserStatus.BLOCKED) {
		throw new Error("User account is blocked! Please contact support.");
	}
	if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
		throw new Error("User account has been deleted!");
	}
	if (!isUserExist.emailVerified) {
		throw new Error("User email is not verified!");
	}
	if (
		isUserExist.googleId &&
		isUserExist.authProvider === AuthProvider.GOOGLE &&
		!isUserExist.password
	) {
		throw new Error(
			"This account was registered using Google. Please log in with Google.",
		);
	}

	const key = `forgot-password-otp:${isUserExist.email}`;

	// Cooldown check: prevent requesting a new OTP within 60 seconds
	const remainingTtl = await redisClient.ttl(key);
	if (remainingTtl > 240) {
		const waitSeconds = remainingTtl - 240;
		throw new Error(
			`Please wait ${waitSeconds} seconds before requesting a new OTP.`,
		);
	}

	// 6-digit secure OTP
	const otp = crypto.randomInt(100000, 999999).toString();
	await redisClient.set(key, otp, {
		expiration: {
			type: "EX",
			value: 5 * 60, // 5 minutes validity
		},
	});

	await sendEmail({
		to: isUserExist.email,
		subject: "Password Reset Code - PH Healthcare",
		templateName: "forgot-password",
		templateData: {
			name: isUserExist.name,
			otp,
			expiresInMinutes: 5,
		},
	});
};

const resetPassword = async (payload: IResetPasswordPayload) => {
	const { otp, newPassword } = payload;
	const email = payload.email.trim().toLowerCase();

	const isUserExist = await prisma.user.findUnique({
		where: {
			email,
		},
	});

	if (!isUserExist) {
		throw new Error("User with this email does not exist!");
	}

	if (isUserExist.status === UserStatus.BLOCKED) {
		throw new Error("User account is blocked! Please contact support.");
	}
	if (isUserExist.isDeleted || isUserExist.status === UserStatus.DELETED) {
		throw new Error("User account has been deleted!");
	}
	if (!isUserExist.emailVerified) {
		throw new Error("User email is not verified!");
	}

	const key = `forgot-password-otp:${isUserExist.email}`;

	// Fix missing await
	const redisOtp = await redisClient.get(key);
	if (!redisOtp) {
		throw new Error("OTP has expired or is invalid. Please request a new one.");
	}
	if (redisOtp !== otp.trim()) {
		throw new Error("Invalid OTP! Please check the code sent to your email.");
	}

	const saltRounds = Number(config.bcrypt_salt_rounds) || 10;
	const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

	await prisma.user.update({
		where: {
			email: isUserExist.email,
		},
		data: {
			password: hashedPassword,
			needPasswordChange: false,
		},
	});

	await redisClient.del([key]);

	await sendEmail({
		to: isUserExist.email,
		subject: "Password Reset Successful - PH Healthcare",
		templateName: "reset-password-success",
		templateData: {
			name: isUserExist.name,
		},
	});
};

export const AuthService = {
	registerPatient,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
};
