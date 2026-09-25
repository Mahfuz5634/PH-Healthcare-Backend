import config from "../../config"
import { getBkashIdToken } from "../../lib/bkash"

const bookAppointment = async() =>{

    const bkashCreatePayment= await fetch(`${config.bkash_base_url}/tokenized/checkout/payment/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${await getBkashIdToken()}`, 
            "X-APP-Key": config.bkash_app_key,

},
         body: JSON.stringify({
              "mode": "0011",
              "payerReference": "01700000000",
              "amount": "100.00",
              "currency": "BDT",
              "intent": "sale",
              "merchantInvoiceNumber": "inv0001",
              "callbackURL": `${config.bkash_callback_url}/appoinment/book-appoinment/payment/callback`,
              "agreementID": "AGREEMENT_ID",
              "marchantAssociationInfo": "MERCHANT_ASSOCIATION_INFO",

            })
           })
            const bakashCreatePaymentResponse = await bkashCreatePayment.json();
            return bakashCreatePaymentResponse;
}


export const AppointmentService = {
    bookAppointment,
}