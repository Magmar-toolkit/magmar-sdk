import { JsonRpcProvider } from "@ethersproject/providers";
import { AATelegramClient } from "./modules/aa-telegram-client";
import { Address, BatchUserOperationCallData, ClientOptions, Hash,  SendUserOpResponse,  TelegramClientOptions,  UserOperationCallData, UserOperationReceiptObject, UserOperationResponse } from "./types";
import { _api } from "./api";
import { CONSTANTS } from "./constants";
const supportedChains = [...CONSTANTS.SUPPORTED_MAIN_CHAIN_IDS, ...CONSTANTS.SUPPORTED_TEST_CHAIN_IDS]; 

class AAmagmarTG {

    private aaClient: AATelegramClient;
    private apiKey: string;

    constructor(apiKey: string) {
        this.aaClient = new AATelegramClient(apiKey);
        this.apiKey = apiKey;
    }

    public init(provider: JsonRpcProvider, options: TelegramClientOptions ): Promise<Object> {
        if(!options.chainId) throw new Error("chainId not provided in options");
        if(!supportedChains.includes(options.chainId)) throw new Error("chainId not supported");
        if(CONSTANTS.SUPPORTED_MAIN_CHAIN_IDS.includes(options.chainId) && (!options.paymasterEndpoint && options.isSponsoredTrx)){
            throw new Error("paymaster endpoint required for sponsored trx on mainnet chains");
        }
        return this.aaClient.init(provider,options);
    }

    public prepareUserOp(userOp: UserOperationCallData): Promise<{requestId:string, otpSent: string}> {
        return this.aaClient.prepareUserOperation(userOp);
    }

    async prepareUserOpBatch(userOps:BatchUserOperationCallData) {
        return this.aaClient.prepareUserOperationBatch(userOps);
    }

    async sendUserOp(requestId:string, otp:string) : Promise<SendUserOpResponse>{
        const userOpHash = await this.aaClient.sendUserOperation(requestId, otp)
        let useropReceipt;
        try {
            useropReceipt = await this.getTrxReceiptByUserOpHash(userOpHash, this.aaClient.chainId)
        } catch (error) {}

        return {userOpHash: userOpHash, transactionHash: useropReceipt && useropReceipt.transactionHash}
    }

    public async getTrxReceiptByUserOpHash(userOpHash: Hash, chainId:number): Promise<UserOperationReceiptObject> {
        return await _api.getTrxReceipt(userOpHash, this.apiKey, chainId);
    }
}

export default AAmagmarTG;