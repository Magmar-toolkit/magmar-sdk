import * as API from "../../api";
import {
	EntryPoint__factory,
	EntryPoint,
	UserOperationStruct,
} from "@account-abstraction/contracts";
import {
	Provider,
	TransactionRequest,
	TransactionResponse,
	JsonRpcProvider,
} from "@ethersproject/providers";
import {
	ECDSAValidator__factory,
	IKernelValidator__factory,
	Kernel__factory,
	KernelFactory,
	KernelFactory__factory,
	KernelStorage,
	KernelStorage__factory,
} from "../../contracts";
import {
	BatchUserOperationCallData,
	ClientOptions,
	UserOperationCallData,
	UserOperationResponse,
	Address,
	Hex,
	UserOperationRequest,
	Hash,
    TelegramClientOptions,
} from "../../types";
import { BigNumber, Signer, Wallet, ethers, utils } from "ethers";
import { SmartAccount } from "../smart-account";
import { CONSTANTS } from "../../constants";
import { _api } from "../../api";

export class AATelegramClient {
	private apiKey: string;
	private signer!: Signer;
	private signerAddress!: Address;
	private telegramUserId!: string;
	private provider: JsonRpcProvider = new JsonRpcProvider();
	private options!: ClientOptions;
	public chainId!: number;
	private entryPoint!: EntryPoint;
	private kernelAccountFactory!: KernelFactory;
	public smartAccountAddress!: Address;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	async init(
		provider: JsonRpcProvider,
		options: TelegramClientOptions
	): Promise<Object> {
		try {
			if (!this.apiKey)
				throw new Error("api key not provided during init");
			const isValid = await _api.validateAPIKey(this.apiKey);
			if (!isValid) throw new Error("api key invalid");

			this.options = options;
			this.provider = provider;
			if (!options.chainId)
				throw new Error("chainId not provided in options");
			this.chainId = options.chainId;
			this.signerAddress = options.walletAddress;
			this.telegramUserId = options.telegramUserId;
			return await this.setupContractConfigs();
		} catch (error) {
			throw error;
		}
	}

	private async getAccountCallData() {
		const _data = utils.solidityPack(["address"], [this.signerAddress]);
		const iface = new ethers.utils.Interface(KernelStorage__factory.abi);
		return iface.encodeFunctionData("initialize", [
			CONSTANTS.ECDSA_VALIDATOR_ADDRESS,
			_data,
		]);
	}

	private async setupContractConfigs() {
		try {
			this.entryPoint = EntryPoint__factory.connect(
				CONSTANTS.ENTRY_POINT_ADDRESS,
				this.provider
			);
			this.kernelAccountFactory = KernelFactory__factory.connect(
				CONSTANTS.KERNEL_FACTORY_ADDRESS,
				this.provider
			);
			this.smartAccountAddress = await this.getSmartContractAddress() as `0x${string}`;
			return { smartAccountAddress: this.smartAccountAddress };
		} catch (error) {
			throw error;
		}
	}

	private async getSmartContractAddress() {
		const kernelAccountFactory = KernelFactory__factory.connect(
			CONSTANTS.KERNEL_FACTORY_ADDRESS,
			this.provider
		);
		const callData = await this.getAccountCallData();
		const smartAccountAddress = await kernelAccountFactory.getAccountAddress(
				callData,
				CONSTANTS.SALT
			);
		return smartAccountAddress;
	}


	private async initalizeSmartAccount(): Promise<Address> {
		try {
			const kernelAccountFactory = KernelFactory__factory.connect(
				CONSTANTS.KERNEL_FACTORY_ADDRESS,
				this.provider
			);
			const calldata = await this.getAccountCallData();
			const smartAccountAddress =
				await kernelAccountFactory.getAccountAddress(
					calldata,
					CONSTANTS.SALT
				);
			const contractCode = await this.provider.getCode(
				smartAccountAddress
			);
			if (contractCode === "0x" || contractCode === undefined) {
				const { receipt } =
					await _api.createSmartAccountForTelegramUser(
						this.apiKey,
						this.telegramUserId,
						this.signerAddress,
						this.chainId,
						calldata
					);
			}
			return smartAccountAddress as `0x${string}`;
		} catch (error) {
			throw error;
		}
	}

	private async getPaymasterDataUsingEndpoint(op: UserOperationRequest) {
		try {
			const paymasterEndpoint = this.options.paymasterEndpoint;
			if (!paymasterEndpoint)
				throw new Error("paymaster endpoint not provided");
			if (!this.options.paymaster)
				throw new Error("paymaster not specified");
			const pmProvider = new ethers.providers.StaticJsonRpcProvider(
				paymasterEndpoint
			);

			let requestParams;
			switch (this.options.paymaster) {
				case "STACKUP":
					requestParams = [
						op,
						CONSTANTS.ENTRY_POINT_ADDRESS,
						{
							type: "payg",
						},
					];
					break;
				case "PIMLICO":
					requestParams = [
						op,
						CONSTANTS.ENTRY_POINT_ADDRESS,
					];
					break;
				case "MAGMAR":
					requestParams = [
						op,
						CONSTANTS.ENTRY_POINT_ADDRESS,
						this.options.paymasterId
					];
					break;
			}

			let sponsorUserOperation = await pmProvider.send(
				"pm_sponsorUserOperation",
				requestParams
			);
			const paymasterAndData = sponsorUserOperation.paymasterAndData;
			switch (this.options.paymaster) {
				case "PIMLICO":
					// case "BICONOMY":
					op.paymasterAndData = paymasterAndData;
					op.preVerificationGas =
						sponsorUserOperation.preVerificationGas;
					op.verificationGasLimit =
						sponsorUserOperation.verificationGasLimit;
					op.callGasLimit = sponsorUserOperation.callGasLimit;
					break;
				case "STACKUP":
					op.paymasterAndData = paymasterAndData;
					op.preVerificationGas =
						sponsorUserOperation.preVerificationGas;
					op.verificationGasLimit =
						sponsorUserOperation.verificationGasLimit;
					op.callGasLimit = sponsorUserOperation.callGasLimit;
					break;
			}
			// const paymasterAndData = sponsorUserOperation.paymasterAndData;
			// op.paymasterAndData = paymasterAndData;
			return op;
		} catch (error) {
			throw error;
		}
	}

	async prepareUserOperation(userOp: UserOperationCallData) {
		try {
			let { target, value, data } = userOp;
			if (!value) value = BigInt(0);
			let op = await this.makeUserOp(target, value, data);
			if (this.options.isSponsoredTrx) {
				if (!this.options.paymasterEndpoint) {
					op = await _api.getPMData(
						this.apiKey || "",
						op,
						this.options.chainId
					);
				} else {
					if (!this.options.paymaster)
						throw new Error("Paymaster not specified");
					op = await this.getPaymasterDataUsingEndpoint(op);
				}
			}
			const prepareOpReq = await _api.logPrepareUseropRequest(
				this.apiKey,
				op,
				this.chainId,
				this.telegramUserId
			);
			return await _api.sendTelegramOTP(
				this.apiKey,
				this.telegramUserId,
				prepareOpReq._id.toString()
			);
		} catch (error) {
			throw error;
		}
	}

	async sendUserOperation(
		prepareOpReqId: string,
		otp: string
	): Promise<Hash> {
		try {
			await this.initalizeSmartAccount();
			if(this.options.bundlerEndpoint){
				try {
					const signedOp = await _api.verifyTelegramOTPAndGetSignedOp(
						this.apiKey,
						prepareOpReqId,
						this.telegramUserId,
						otp
					);
					const bundlerProvider = new ethers.providers.StaticJsonRpcProvider(this.options.bundlerEndpoint);
					const userOperationHash = await bundlerProvider.send(
						"eth_sendUserOperation",
						[signedOp, CONSTANTS.ENTRY_POINT_ADDRESS]
					);
					return userOperationHash;
				} catch (error) {
					throw new Error(`error while sending trx through given bundler endpoint: ${error}`);
				}
			}
			else{
				const res = await _api.sendTelegramUseropRequest(
					this.apiKey,
					prepareOpReqId,
					this.telegramUserId,
					otp
				);
				return res;
			}
		} catch (error) {
			throw error;
		}
	}

	private async makeUserOp(
		target: Address,
		value: bigint,
		data: Hex
	): Promise<UserOperationRequest> {
		try {
			const kernelAccount = Kernel__factory.connect(
				this.smartAccountAddress,
				this.provider
			);
			const callData = kernelAccount.interface.encodeFunctionData(
				"execute",
				[target, value, data, 0]
			) as `0x${string}`;

			const gasPrice = await this.provider.getGasPrice();
			const latestBlock = await this.provider.getBlock("latest");
			const baseFeePerGas = ethers.BigNumber.from(latestBlock.baseFeePerGas);
			const priorityFeePerGas = ethers.utils.parseUnits("1.5", 'gwei');
			const maxFeePerGas = baseFeePerGas.add(priorityFeePerGas);

			const smartWalletDeployed = await this.initalizeSmartAccount();
			const nonce = smartWalletDeployed
				? await this.entryPoint.callStatic.getNonce(
						this.smartAccountAddress,
						0
				  )
				: 0;

			const userOperation: UserOperationRequest = {
				sender: this.smartAccountAddress,
				nonce: utils.hexlify(nonce) as `0x${string}`,
				initCode: "0x",
				callData,
				callGasLimit: utils.hexlify(250_000) as `0x${string}`,
				verificationGasLimit: utils.hexlify(600_000) as `0x${string}`,
				preVerificationGas: utils.hexlify(200_000) as `0x${string}`,
				maxFeePerGas: maxFeePerGas?._hex as `0x${string}`,
				maxPriorityFeePerGas: priorityFeePerGas._hex  as `0x${string}`,
				paymasterAndData: "0x",
				signature: "0x",
			};
			return userOperation;
		} catch (error) {
			throw error;
		}
	}


	async prepareUserOperationBatch(userOps: BatchUserOperationCallData) {
		try {
			let target = [],
				value = [],
				data = [];
			for (let i = 0; i < userOps.length; i++) {
				target[i] = userOps[i].target;
				value[i] = userOps[i].value ? userOps[i].value : BigInt(0);
				data[i] = userOps[i].data;
			}

			let op = await this.makeUserOpBatch(
				target as `0x${string}`[],
				value as bigint[],
				data as Hex[]
			);
			if (this.options.isSponsoredTrx) {
				if (!this.options.paymasterEndpoint) {
					op = await _api.getPMData(
						this.apiKey || "",
						op,
						this.options.chainId
					);
				} else {
					if (!this.options.paymaster)
						throw new Error("Paymaster not specified");
					op = await this.getPaymasterDataUsingEndpoint(op);
				}
			}
			const prepareOpReq = await _api.logPrepareUseropRequest(
				this.apiKey,
				op,
				this.chainId,
				this.telegramUserId
			);
			return await _api.sendTelegramOTP(
				this.apiKey,
				this.telegramUserId,
				prepareOpReq._id.toString()
			);
		} catch (error) {
			throw error;
		}
	}

	private async makeUserOpBatch(
		target: Address[],
		value: bigint[],
		data: Hex[]
	): Promise<UserOperationRequest> {
		try {
			const kernelAccount = Kernel__factory.connect(
				this.smartAccountAddress,
				this.provider
			);
			const callData = kernelAccount.interface.encodeFunctionData(
				"executeBatch",
				[target, value, data, 0]
			) as `0x${string}`;

			const gasPrice = await this.provider.getGasPrice();
			const latestBlock = await this.provider.getBlock("latest");
			const baseFeePerGas = ethers.BigNumber.from(latestBlock.baseFeePerGas);
			const priorityFeePerGas = ethers.utils.parseUnits("1.5", 'gwei');
			const maxFeePerGas = baseFeePerGas.add(priorityFeePerGas);

			const smartWalletDeployed = await this.initalizeSmartAccount();
			const nonce = smartWalletDeployed
				? await this.entryPoint.callStatic.getNonce(
						this.smartAccountAddress,
						0
				  )
				: 0;
			const userOperation: UserOperationRequest = {
				sender: this.smartAccountAddress,
				nonce: utils.hexlify(nonce) as `0x${string}`,
				initCode: "0x",
				callData,
				callGasLimit: utils.hexlify(250_000) as `0x${string}`,
				verificationGasLimit: utils.hexlify(600_000) as `0x${string}`,
				preVerificationGas: utils.hexlify(200_000) as `0x${string}`,
				maxFeePerGas: maxFeePerGas._hex as `0x${string}`,
				maxPriorityFeePerGas: priorityFeePerGas._hex  as `0x${string}`,
				paymasterAndData: "0x",
				signature: "0x",
			};
			return userOperation;
		} catch (error) {
			throw error;
		}
	}

}
