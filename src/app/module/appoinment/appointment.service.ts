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
                
              "amount": "100.00",
              "currency": "BDT",
              "intent": "sale",
              "merchantInvoiceNumber": "inv0001",
              "callbackURL": `${config.bkash_callback_url}/appointment/book-appointment/payment/callback`,
           
        

            })
           })
            const bakashCreatePaymentResponse = await bkashCreatePayment.json();
            return bakashCreatePaymentResponse;
}


export const AppointmentService = {
    bookAppointment,
}