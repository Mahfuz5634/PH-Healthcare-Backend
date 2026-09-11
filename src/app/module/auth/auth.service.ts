import bcrypt from "bcryptjs";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import {
	AuthProvider,
	Role,
	UserStatus,
} from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import type {
	IGoogleLoginPayload,
	ILoginUserPayload,
	IRegisterPatientPayload,
	IRequestUser,
} from "./auth.interface";
import type { TokenPayload } from "google-auth-library";
import { googleClient } from "../../lib/googleAuth";
import { authValidation } from "./auth.validation";
import crypto from "crypto";
import { redisClient } from "../../lib/redis";
import { number } from "zod";
import { transporter } from "../../lib/nodemailer";

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

const forgotPassword = async (payload: any) => {
	const {email}=payload;

	const isUserExist = await prisma.user.findUnique({
		where:{
			email
		}
	});

	if(!isUserExist){
		throw new Error("User Not Found!")
	}

	if(isUserExist.status==="BLOCKED"){
        throw new Error("User is Blocked")
	}
	if(!isUserExist.emailVerified){
		throw new Error("User is not verified!")
	}
	if(isUserExist.isDeleted  || isUserExist.status === "DELETED"){
		 throw new Error("User is Blocked")
	}
	if( isUserExist.googleId &&  isUserExist.authProvider==="GOOGLE"){
		throw new Error("User has account with Google!")
	}
     
	 const key=`forgot-password-otp:${isUserExist.email}`
	 const otp = crypto.randomInt(1000,9999).toString();
	 await redisClient.set(key, otp,{
			 expiration:{
				type:"EX",
				value:5*60
			 }
		  });
	await transporter.sendMail({
		from: config.SMTP_USER,
		to: isUserExist.email,
		subject: "Password Reset OTP",
        html: `<p>Your OTP for password reset is: <strong>${otp}</strong></p><p>This OTP is valid for 5 minutes.</p>`,
	});
};


const resetPassword = async (payload:any) => {
	const {email,otp,newPassword}=payload;

	const isUserExist = await prisma.user.findUnique({
		where:{
			email
		}
	});

	if(!isUserExist){
		throw new Error("User Not Found!")
	}

	if(isUserExist.status==="BLOCKED"){
        throw new Error("User is Blocked")
	}
	if(!isUserExist.emailVerified){
		throw new Error("User is not verified!")
	}
	if(isUserExist.isDeleted  || isUserExist.status === "DELETED"){
		 throw new Error("User is Blocked")
	}
	if( isUserExist.googleId &&  isUserExist.authProvider==="GOOGLE"){
		throw new Error("User has account with Google!")
	}
	const key=`forgot-password-otp:${isUserExist.email}`;

	const redisOtp = redisClient.get(key);
	if(!redisOtp){
		throw new  Error("Invalid Otp");
	}
	if(redisOtp !== otp){
		throw new Error("Otp does not match!")
	}
	const hashedPassword = await bcrypt.hash(newPassword,Number(config.bcrypt_salt_rounds));
	await prisma.user.update({
		where : {
			email:isUserExist.email
		},
		data:{
			password:hashedPassword
		}
	})
	await redisClient.del([key]);
	await transporter.sendMail({
		from: config.SMTP_USER,
		to: isUserExist.email,
		subject: "Password Reset Successful",
        html: `<p>Your password has been reset successfully.</p>`,
	});
};
	

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
