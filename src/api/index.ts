import { CONSTANTS } from "../constants";
import { UserOperationRequest } from "../types";

const API_URL=CONSTANTS.API_URL;

export const _api  = {

    async validateAPIKey(apiKey:string){
        try {
            const headers = {
                "x-api-key": apiKey
            }
            const res = await fetch(
                `${API_URL}/api-key/verify`,{
                    method: "GET",
                    headers
                }
            );
            if (res.status >= 400) {
                // Optionally, parse the res body for more details to include in the error
                const errorDetails = await res.json();
                throw new Error(`Error ${res.status}: ${errorDetails.message}`);
            }
            const resData = await res.json(); 
            if(resData.valid) return true;
            else return false;

        } catch (error) {
            throw error;
        }

    },

    async getTrxReceipt(userOpHash:string, apiKey: string, chainId: number){
        try {
            const headers = {
                "x-api-key": apiKey
            }
            const res = await fetch(
                `${API_URL}/transaction/receipt/${chainId}/${userOpHash}`,{
                    method: "GET",
                    headers
                }
            );
            if (res.status >= 400) {
                // Optionally, parse the res body for more details to include in the error
                const errorDetails = await res.json();
                throw new Error(`Error ${res.status}: ${errorDetails.message}`);
            }
            const resData = res && await res.json(); 
            if(!res) throw new Error("unable to get response");
            return resData.receipt;

        } catch (error) {
            throw error;
        }

    },

    // async createSmartAccount(apiKey:string,chainId:number, signerAddress: string): Promise<Object>{
    //     try {
    //         const headers = {
    //             "x-api-key": apiKey,
    //             'Accept': 'application/json',
    //               'Content-Type': 'application/json'
    //         };
    //         const res = await fetch(
    //             `${API_URL}/aa-account/create`,
    //             {
    //                 method: "POST",
    //                 body: JSON.stringify({chainId,
    //                 eoa: signerAddress,
    //                 salt: CONSTANTS.SALT}),
    //                 headers
    //             },
    //         );
    //         return await res.json();
    //     } catch (error) {
    //         throw error;
    //     }
       
    // },

    async getPMData(apiKey:string, userOp: UserOperationRequest, chainId: number){
        try {
            const headers = {
                "x-api-key": apiKey,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            const res = await fetch(
                `${API_URL}/transaction/userop-pm-data`,
                {
                    method: "POST",
                    body: JSON.stringify({chainId,userOperation:userOp}),
                    headers
                },
            );
            if (res.status >= 400) {
                // Optionally, parse the res body for more details to include in the error
                const errorDetails = await res.json();
                throw new Error(`Error ${res.status}: ${errorDetails.message}`);
            }
            const resData = await res.json();
            return resData;
        } catch (error) {
            throw error;
        }
    },

    async sendUserOpToBundler(apiKey:string, userOp: UserOperationRequest, chainId: number){
        try {
            const headers = {
                "x-api-key": apiKey,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            const res = await fetch(
                `${API_URL}/transaction/send`,{
                    method: "POST",
                    body: JSON.stringify({
                        chainId,
                        userOperation:userOp,
                    }),
                    headers 
                }
            );
            if (res.status >= 400) {
                // Optionally, parse the res body for more details to include in the error
                const errorDetails = await res.json();
                throw new Error(`Error ${res.status}: ${errorDetails.message}`);
            }
            const resData = await res.json();
            return resData.userOperationHash;
        } catch (error) {
            throw error;   
        }
    },

    async sendTelegramOTP(apiKey:string, telegramUserId:string, requestId: string ){
        try {
            const headers = {
                "x-api-key": apiKey
            }
            const res = await fetch(
                `${API_URL}/telegram-auth/trx-otp/${telegramUserId}/${requestId}`,{
                    method: "GET",
                    headers
                }
            );
            if (res.status >= 400) {
                // Optionally, parse the res body for more details to include in the error
                const errorDetails = await res.json();
                throw new Error(`Error ${res.status}: ${errorDetails.message}`);
            }
            const resData = await res.json(); 
            return resData;

        } catch (error) {
            throw error;
        }

    },


    async createSmartAccountForTelegramUser(apiKey:string, telegramUserId: string, walletAddress: string, chainId: number, calldata: string){
        try {
            const headers = {
                "x-api-key": apiKey,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            const res = await fetch(
                `${API_URL}/telegram-auth/trx/create-smart-account`,{
                    method: "POST",
                    body: JSON.stringify({
                        telegramUserId,
                        walletAddress,
                        chainId,
                        calldata
                    }),
                    headers 
                }
            );
            if (res.status >= 400) {
                // Optionally, parse the res body for more details to include in the error
                const errorDetails = await res.json();
                throw new Error(`Error ${res.status}: ${errorDetails.message}`);
            }
            const resData = await res.json();
            return resData;
        } catch (error) {
            throw error;   
        }
    },

    async logPrepareUseropRequest(apiKey:string, userOp: UserOperationRequest, chainId: number,telegramUserId:string){
        try {
            const headers = {
                "x-api-key": apiKey,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            const res = await fetch(
                `${API_URL}/telegram-auth/trx/log-prepareop-req`,{
                    method: "POST",
                    body: JSON.stringify({
                        userOp,
                        chainId,
                        telegramUserId
                    }),
                    headers 
                }
            );
            if (res.status >= 400) {
                // Optionally, parse the res body for more details to include in the error
                const errorDetails = await res.json();
                throw new Error(`Error ${res.status}: ${errorDetails.message}`);
            }
            const resData = await res.json();
            return resData;
        } catch (error) {
            throw error;   
        }
    },

    async sendTelegramUseropRequest(apiKey:string, requestId: string,telegramUserId:string, otp:string){
        try {
            const headers = {
                "x-api-key": apiKey,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            const res = await fetch(
                `${API_URL}/telegram-auth/trx/send`,{
                    method: "POST",
                    body: JSON.stringify({
                        requestId,
                        telegramUserId,
                        otp
                    }),
                    headers 
                }
            );
            if (res.status >= 400) {
                // Optionally, parse the res body for more details to include in the error
                const errorDetails = await res.json();
                throw new Error(`Error ${res.status}: ${errorDetails.message}`);
            }
            const resData = await res.json();
            return resData.userOperationHash;
        } catch (error) {
            console.log("sendTelegramUseropRequest, error:", error)
            throw error;   
        }
    },

    async verifyTelegramOTPAndGetSignedOp(apiKey:string, requestId: string,telegramUserId:string, otp:string){
        try {
            const headers = {
                "x-api-key": apiKey,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            const res = await fetch(
                `${API_URL}/telegram-auth/trx-otp/verify`,{
                    method: "POST",
                    body: JSON.stringify({
                        requestId,
                        telegramUserId,
                        otp
                    }),
                    headers 
                }
            );
            if (res.status >= 400) {
                const errorDetails = await res.json();
                throw new Error(`Error ${res.status}: ${errorDetails.message}`);
            }
            const resData = await res.json();
            return resData.signedOp;
        } catch (error) {
            console.log("sendTelegramUseropRequest, error:", error)
            throw error;   
        }
    },
   
    async createmagmarSmartAccountForUser(apiKey:string, eoa: string, chainId: number){
        try {
            const headers = {
                "x-api-key": apiKey,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };
            const res = await fetch(
                `${API_URL}/transaction/create-0xsmart-account`,{
                    method: "POST",
                    body: JSON.stringify({
                        eoa,
                        chainId
                    }),
                    headers 
                }
            );
            if (res.status >= 400) {
                // Optionally, parse the res body for more details to include in the error
                const errorDetails = await res.json();
                throw new Error(`Error ${res.status}: ${errorDetails.message}`);
            }
            const resData = await res.json();
            console.log("resData createmagmarSmartAccountForUser", resData);
            return resData;
        } catch (error) {
            throw error;   
        }
    },


}