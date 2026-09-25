import config from "../config"  
import { redisClient } from "./redis";


//get the bkash id token
export const getBkashIdToken = async () => { 
     try{
       const idTokenKey="bkash:idToken";
       const refreshTokenKey="bkash:refreshToken";

       let BkashidToken = await redisClient.get(idTokenKey);
       let BkashRefreshToken = await redisClient.get(refreshTokenKey);
       const BkashIdTokenttl = await redisClient.ttl(idTokenKey);
       const BkashRefreshTokenttl = await redisClient.ttl(refreshTokenKey);

       if(BkashIdTokenttl <= 600 && BkashRefreshToken && BkashRefreshTokenttl > 600){
        //if id token is not found but refresh token is found then get new id token using refresh token
        const response = await fetch(`${config.bkash_base_url}/tokenized/checkout/token/refresh`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            username: config.bkash_username,
            password: config.bkash_password,
          },
          body: JSON.stringify({
            app_key: config.bkash_app_key,
            app_secret: config.bkash_app_secret,
            refresh_token: BkashRefreshToken,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to refresh bKash ID token: ${response.statusText}`);
        }

        const data = await response.json();
        await redisClient.set(idTokenKey, data.id_token, {
          EX: 3600,
        });
        return data.id_token;
      }

       if (BkashIdTokenttl > 600) {
        return BkashidToken;
      }
     


    //grant token api to get new id token and refresh token
    const response = await fetch(`${config.bkash_base_url}/tokenized/checkout/token/grant`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            username: config.bkash_username,
            password: config.bkash_password,
        },
        body: JSON.stringify({
            app_key: config.bkash_app_key,
            app_secret: config.bkash_app_secret,
        }),
       
    });

    if(!response.ok){
        throw new Error(`Failed to get bKash ID token: ${response.statusText}`);
    }
    const data = await response.json();
    
    //bkash id token set in redis with expiration time of 1 hour
    await redisClient.set(idTokenKey, data.id_token, {
        EX: 3600, // Set expiration time in seconds (1 hour)
    });
    
    //bkash refresh token set in redis with expiration time of 30 days
    await redisClient.set(refreshTokenKey, data.refresh_token, {
        EX: 28 * 24 * 60 * 60, // Set expiration time in seconds (28 days)
    });

    return data.id_token;
     }
     catch(err:any){ 
        throw new Error(`Error in getBkashIdToken: ${err.message}`);
    }
    
}