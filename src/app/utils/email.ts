import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";
import config from "../config";
import { transporter } from "../lib/nodemailer";

const getTemplatePath = (templateName: string): string => {
	// 1. Check relative to src/app/templates
	const srcPath = path.join(
		process.cwd(),
		"src",
		"app",
		"templates",
		`${templateName}.ejs`,
	);
	if (fs.existsSync(srcPath)) {
		return srcPath;
	}

	// 2. Check relative to current file location (useful if built to dist)
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const relativePath = path.join(
		__dirname,
		"..",
		"templates",
		`${templateName}.ejs`,
	);
	if (fs.existsSync(relativePath)) {
		return relativePath;
	}

	return srcPath;
};

export interface ISendEmailOptions {
	to: string;
	subject: string;
	templateName?: string;
	templateData?: Record<string, unknown>;
	html?: string;
	text?: string;
}

export const sendEmail = async (options: ISendEmailOptions) => {
	try {
		let htmlContent = options.html;

		if (options.templateName) {
			const templatePath = getTemplatePath(options.templateName);
			htmlContent = await ejs.renderFile(
				templatePath,
				options.templateData || {},
			);
		}

		const info = await transporter.sendMail({
			from: `"PH Healthcare" <${config.smtp_user}>`,
			to: options.to,
			subject: options.subject,
			html: htmlContent,
			text: options.text,
		});

		return info;
	} catch (error) {
		console.error(`❌ Failed to send email to ${options.to}:`, error);
		throw new Error("Failed to send email. Please try again later.");
	}
};
