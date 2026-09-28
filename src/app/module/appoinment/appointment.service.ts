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

const bookAppointmentCallback = async (query: Record<string, any>) => {
    const paymentID = query.paymentID;
	const status = query.status;

	if (!paymentID || !status) {
		throw new Error("Missing paymentID or status in query parameters");
	}

	if (status !== "success") {
		throw new Error(`Payment failed with status: ${status}`);
	}
;
	const bkashIdToken = await getBkashIdToken();
	if (!bkashIdToken) {
		throw new Error("Failed to get bKash ID token");
	}



	const paymentExecute = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/execute`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
				"X-APP-Key": config.bkash_app_key,
				Authorization: bkashIdToken,
			},
			body: JSON.stringify({
				paymentID: paymentID,
			}),
		}
	);
	const paymentExecuteResponse = await paymentExecute.json();

	if (!paymentExecute.ok || paymentExecuteResponse.statusCode !== "0000") {
		throw new Error(
			paymentExecuteResponse.statusMessage ||
				paymentExecuteResponse.message ||
				"Failed to execute bKash payment"
		);
	}
	if(status === "success") {
	   return {
		paymentExecuteResponse,
		redirectUrl:`${config.frontend_url}/dashboard/appointments?status=success`,
		
	   };
	} 
	if(status === "failure") {
	   return {
		paymentExecuteResponse,
		redirectUrl:`${config.frontend_url}/dashboard/appointments?status=success`,
		
	   };
	}

	if(status === "cancel") {
	   return {
		paymentExecuteResponse,
		redirectUrl:`${config.frontend_url}/dashboard/appointments?status=success`,
		
	   };
	}

	return paymentExecuteResponse;
};

export const AppointmentService = {
	bookAppointment,
	bookAppointmentCallback,
};
