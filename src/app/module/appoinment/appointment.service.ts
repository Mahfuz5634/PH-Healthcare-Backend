import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";

const bookAppointment = async () => {
	const idToken = await getBkashIdToken();

	const bkashCreatePayment = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/create`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				Authorization: idToken,
				"X-APP-Key": config.bkash_app_key,
			},
			body: JSON.stringify({
				mode: "0011",
				payerReference: "01700000000",
				amount: "100.00",
				currency: "BDT",
				intent: "sale",
				merchantInvoiceNumber: `INV_${Date.now()}`,
				callbackURL: `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
			}),
		},
	);

	const bkashCreatePaymentResponse = await bkashCreatePayment.json();

	if (
		!bkashCreatePayment.ok ||
		bkashCreatePaymentResponse.statusCode !== "0000"
	) {
		throw new Error(
			bkashCreatePaymentResponse.statusMessage ||
				bkashCreatePaymentResponse.message ||
				"Failed to create bKash payment",
		);
	}

	return bkashCreatePaymentResponse;
};

export const AppointmentService = {
	bookAppointment,
};
