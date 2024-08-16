import { JsonRpcProvider } from "@ethersproject/providers";
import { AAClient } from "./modules/aa-client";
import { AATelegramClient } from "./modules/aa-telegram-client";
import { Address, BatchUserOperationCallData, ClientOptions, Hash,  UserOperationCallData, UserOperationResponse,SendUserOpResponse, UserOperationReceipt, UserOperationReceiptObject } from "./types";
import { _api } from "./api";
import { CONSTANTS } from "./constants";
import AAmagmarTG from "./AAmagmarTG";
export * from './types';

const supportedChains = [...CONSTANTS.SUPPORTED_MAIN_CHAIN_IDS,...CONSTANTS.SUPPORTED_TEST_CHAIN_IDS]; 
class AAmagmar {

    private aaClient: AAClient;
    private apiKey: string;

    constructor(apiKey: string) {
        this.aaClient = new AAClient(apiKey);
        this.apiKey = apiKey;
    }

    public init(provider: JsonRpcProvider, options: ClientOptions ): Promise<Object> {
        if(!options.chainId) throw new Error("chainId not provided in options");
        if(!supportedChains.includes(options.chainId)) throw new Error("chainId not supported");
        if(CONSTANTS.SUPPORTED_MAIN_CHAIN_IDS.includes(options.chainId) && (!options.paymasterEndpoint && options.isSponsoredTrx)){
            throw new Error("paymaster endpoint required for sponsored trx on mainnet chains");
        }
        return this.aaClient.init(provider,options);
    }

    public async sendUserOp(userOp: UserOperationCallData): Promise<SendUserOpResponse> {
        const userOpHash = await this.aaClient.sendUserOperation(userOp);
        let useropReceipt;
        try {
            useropReceipt = await this.getTrxReceiptByUserOpHash(userOpHash, this.aaClient.chainId)
        } catch (error) {}

        return {userOpHash: userOpHash, transactionHash: useropReceipt && useropReceipt.transactionHash}
    }

    public async getTrxReceiptByUserOpHash(userOpHash: Hash, chainId:number): Promise<UserOperationReceiptObject> {
        return await _api.getTrxReceipt(userOpHash, this.apiKey, chainId);
    }

    async sendUserOpsBatch(userOps:BatchUserOperationCallData): Promise<SendUserOpResponse> {
        const userOpHash = await this.aaClient.sendUserOperationBatch(userOps);
        let useropReceipt;
        try {
            useropReceipt = await this.getTrxReceiptByUserOpHash(userOpHash, this.aaClient.chainId)
        } catch (error) {}

        return {userOpHash: userOpHash, transactionHash: useropReceipt && useropReceipt.transactionHash}
    }

    //add funds from EOA to EntryPoint on behalf of AA wallet
    async addFundsToEntryPoint(value: string) {
        return this.aaClient.addFunds(value);
    }

    //withdraw funds from EntryPoint to toAddress
    async withdrawFundsFromEntryPoint(toAddress:Address, value: string) {
        return this.aaClient.withdrawFunds(toAddress, value);
    }

}

export {AAmagmarTG, AAmagmar};