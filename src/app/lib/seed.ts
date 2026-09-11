import bcrypt from "bcryptjs";
import { AuthProvider, Role, UserStatus } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "./prisma";

interface ISeedUser {
	name: string;
	email: string;
	password: string;
	role: Role;
}

const seedUsersData: ISeedUser[] = [
	{
		name: "PH Super Admin",
		email: config.super_admin_email,
		password: config.super_admin_password,
		role: Role.SUPER_ADMIN,
	},
	{
		name: "PH Tester Admin",
		email: config.tester_admin_email,
		password: config.tester_admin_password,
		role: Role.ADMIN,
	},
	{
		name: "PH Tester Doctor",
		email: config.tester_doctor_email,
		password: config.tester_doctor_password,
		role: Role.DOCTOR,
	},
];

const seedSingleUser = async (user: ISeedUser) => {
	if (!user.email || !user.password) {
		console.warn(
			`⚠️ [SEED] Skipping ${user.role}: Email or password is not configured in .env`,
		);
		return;
	}

	const isRoleExists = await prisma.user.findFirst({
		where: {
			role: user.role,
		},
	});

	if (isRoleExists) {
		console.log(`[SEED] ${user.role} already exists in database. Skipping...`);
		return;
	}

	const saltRounds = Number(config.bcrypt_salt_rounds) || 10;
	const hashedPassword = await bcrypt.hash(user.password, saltRounds);

	await prisma.$transaction(async (tx) => {
		await tx.user.create({
			data: {
				name: user.name,
				email: user.email,
				password: hashedPassword,
				role: user.role,
				status: UserStatus.ACTIVE,
				emailVerified: true,
				authProvider: AuthProvider.CREDENTIALS,
			},
		});

		console.log(`[SEED] ${user.role} created successfully.`);
	});
};

export const seedSuperAdmin = async () => {
	const superAdmin = seedUsersData.find((u) => u.role === Role.SUPER_ADMIN);
	if (superAdmin) {
		await seedSingleUser(superAdmin);
	}
};

export const seedTesterAdmin = async () => {
	const testerAdmin = seedUsersData.find((u) => u.role === Role.ADMIN);
	if (testerAdmin) {
		await seedSingleUser(testerAdmin);
	}
};

export const seedTesterDoctor = async () => {
	const testerDoctor = seedUsersData.find((u) => u.role === Role.DOCTOR);
	if (testerDoctor) {
		await seedSingleUser(testerDoctor);
	}
};

export const seedUsers = async () => {
	try {
		console.log("🌱 Starting user seeding...");
		for (const user of seedUsersData) {
			try {
				await seedSingleUser(user);
			} catch (userError) {
				console.error(`❌ Failed to seed ${user.role}:`, userError);
			}
		}
		console.log("🌱 User seeding completed.");
	} catch (error) {
		console.error("❌ Unexpected error occurred while seeding users:", error);
	}
};
