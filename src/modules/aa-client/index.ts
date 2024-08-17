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
} from "../../types";
import { BigNumber, Signer, Wallet, ethers, utils } from "ethers";
import { SmartAccount } from "../smart-account";
import { CONSTANTS } from "../../constants";
import { _api } from "../../api";
export class AAClient {
	private apiKey: string;
	private signer!: Signer;
	private signerAddress!: Address;
	private provider: JsonRpcProvider = new JsonRpcProvider();
	private options!: ClientOptions;
	private entryPoint!: EntryPoint;
	private kernelAccountFactory!: KernelFactory;
	public smartAccountAddress!: Address;
	public chainId!: number;

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	async init(
		provider: JsonRpcProvider,
		options: ClientOptions
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

			if (options.privateKey)
				this.signer = new Wallet(options.privateKey, provider);
			else if (provider.getSigner()) this.signer = provider.getSigner();
			else throw new Error("private key or provider not found");
			return await this.setupContractConfigs(this.signer);
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


	private async getAccountCallDataByAddress(eoa:string) {
		const _data = utils.solidityPack(["address"], [eoa]);
		const iface = new ethers.utils.Interface(KernelStorage__factory.abi);
		return iface.encodeFunctionData("initialize", [
			CONSTANTS.ECDSA_VALIDATOR_ADDRESS,
			_data,
		]);
	}

	private async getSmartContractAddress(eoa: string) {
		const kernelAccountFactory = KernelFactory__factory.connect(
			CONSTANTS.KERNEL_FACTORY_ADDRESS,
			this.signer
		);
		const callData = this.getAccountCallDataByAddress(eoa);
		const smartAccountAddress =
			await kernelAccountFactory.getAccountAddress(
				callData,
				CONSTANTS.SALT
			);
		return smartAccountAddress;
	}

	private async setupContractConfigs(signer: Signer) {
		try {
			this.entryPoint = EntryPoint__factory.connect(
				CONSTANTS.ENTRY_POINT_ADDRESS,
				this.signer
			);
			this.kernelAccountFactory = KernelFactory__factory.connect(
				CONSTANTS.KERNEL_FACTORY_ADDRESS,
				this.signer
			);
			this.signerAddress =
				(await this.signer.getAddress()) as `0x${string}`;
			this.smartAccountAddress = await this.getSmartContractAddress(this.signerAddress) as `0x${string}`;
			return { smartAccountAddress: this.smartAccountAddress };
		} catch (error) {
			throw error;
		}
	}

	private async initalizeSmartAccount(): Promise<Address> {
		try {
			const kernelAccountFactory = KernelFactory__factory.connect(
				CONSTANTS.KERNEL_FACTORY_ADDRESS,
				this.signer
			);
			const callData = this.getAccountCallData();
			const smartAccountAddress =
				await kernelAccountFactory.getAccountAddress(
					callData,
					CONSTANTS.SALT
				);
			const contractCode = await this.provider.getCode(
				smartAccountAddress
			);
			if (contractCode === "0x" || contractCode === undefined) {
				let gasEstimate =
					await kernelAccountFactory.estimateGas.createAccount(
						CONSTANTS.KERNEL_IMPLEMENTATION,
						callData,
						CONSTANTS.SALT
					);

				if (!gasEstimate) gasEstimate = BigNumber.from(300000);
				// const gasPrice = await getGasPrice(chainId);
				// const options = gasPrice ? { gasLimit: gasEstimate, gasPrice: ethers.utils.parseUnits(gasPrice.toFixed(4), "gwei")} : { gasLimit: gasEstimate };
				const options = { gasLimit: gasEstimate };

				const accountTransaction =
					await kernelAccountFactory.createAccount(
						CONSTANTS.KERNEL_IMPLEMENTATION,
						callData,
						CONSTANTS.SALT,
						options
					);
				const receipt = await accountTransaction.wait();
			}
			return smartAccountAddress as `0x${string}`;
		} catch (error) {
			throw error;
		}
	}

	private async initalizemagmarSmartAccount(eoa:string): Promise<Address> {
		try {
			const contractCode = await this.provider.getCode(
				this.smartAccountAddress
			);
			if (contractCode === "0x" || contractCode == undefined) {
				if(this.options.noAccountCreateSponsorship){
					throw new Error("options.noAccountCreateSponsorship is false, can't create account with sponsorship");
				}
				const { receipt,smartAccountAddress: resSmartAccountAddress } =
					await _api.createmagmarSmartAccountForUser(
						this.apiKey,
						eoa,
						this.chainId
					);
			}
			return this.smartAccountAddress as `0x${string}`;
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
						CONSTANTS.ENTRY_POINT_ADDRESS
					];
					break;
				case "MAGMAR":
					if(this.options.erc20token){
						requestParams = [
							op,
							CONSTANTS.ENTRY_POINT_ADDRESS,
							this.options.paymasterId,
							{
								token: this.options.erc20token,
								type: "erc20"
							}	
						];
					}
					else{
						requestParams = [
							op,
							CONSTANTS.ENTRY_POINT_ADDRESS,
							this.options.paymasterId
						];
					}
					break;
			}

			let sponsorUserOperation = await pmProvider.send(
				"pm_sponsorUserOperation",
				requestParams
			);
			const paymasterAndData = sponsorUserOperation.paymasterAndData;
			switch (this.options.paymaster) {
				case "PIMLICO":
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
				case "MAGMAR":
					op.paymasterAndData = paymasterAndData;
					// op.preVerificationGas =
					// 	sponsorUserOperation.preVerificationGas;
					// op.verificationGasLimit =
					// 	sponsorUserOperation.verificationGasLimit;
					// op.callGasLimit = sponsorUserOperation.callGasLimit;
					break;
			}
			// const paymasterAndData = sponsorUserOperation.paymasterAndData;
			// op.paymasterAndData = paymasterAndData;
			return op;
		} catch (error) {
			throw error;
		}
	}

	async sendUserOperation(userOp: UserOperationCallData): Promise<Hash> {
		try {
			await this.initalizemagmarSmartAccount(this.signerAddress);
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
			const signedOp = await this.signUserOp(op);
			console.log("signedOp", signedOp);
			if(this.options.bundlerEndpoint){
				try {
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
				const res = await _api.sendUserOpToBundler(
					this.apiKey,
					signedOp,
					this.chainId
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

			const dummySignature = utils.hexConcat([
				"0x00000000",
				await this.signer.signMessage(
					utils.arrayify(utils.keccak256("0xdead"))
				),
			]);

			const userOperation: UserOperationRequest = {
				sender: this.smartAccountAddress,
				nonce: utils.hexlify(nonce) as `0x${string}`,
				initCode: "0x",
				callData,
				callGasLimit: utils.hexlify(2_000_000) as `0x${string}`,
				verificationGasLimit: utils.hexlify(2_000_000) as `0x${string}`,
				preVerificationGas: utils.hexlify(200_000) as `0x${string}`,
				maxFeePerGas: maxFeePerGas?._hex as `0x${string}`,//utils.hexlify(currentBaseFee) as `0x${string}`,
				maxPriorityFeePerGas: priorityFeePerGas._hex as `0x${string}`,
				paymasterAndData: "0x",
				signature: dummySignature as `0x${string}`,
			};
			return userOperation;
		} catch (error) {
			throw error;
		}
	}

	private async signUserOp(
		userOp: UserOperationRequest
	): Promise<UserOperationRequest> {
		try {
			const userOpHash = await this.entryPoint.getUserOpHash(userOp);
			const signature = await this.signer.signMessage(
				utils.arrayify(userOpHash)
			);
			const signatureWithPadding = utils.hexConcat([
				"0x00000000",
				signature,
			]);
			userOp.signature = signatureWithPadding as `0x${string}`;
			return userOp;
		} catch (error) {
			throw error;
		}
	}

	async sendUserOperationBatch(
		userOps: BatchUserOperationCallData
	): Promise<Hash> {
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
		const signedOp = await this.signUserOp(op);

		if(this.options.bundlerEndpoint){
			try {
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
			const res = await _api.sendUserOpToBundler(
				this.apiKey,
				signedOp,
				this.chainId
			);
			return res;
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

			const dummySignature = utils.hexConcat([
				"0x00000000",
				await this.signer.signMessage(
					utils.arrayify(utils.keccak256("0xdead"))
				),
			]);

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
				signature: dummySignature as `0x${string}`,
			};
			return userOperation;
		} catch (error) {
			throw error;
		}
	}

	async addFunds(value: string) {
		return await this.entryPoint.depositTo(this.smartAccountAddress, {
			value,
			from: this.signerAddress,
		});
	}

	async withdrawFunds(toAddress: Address, value: string) {
		return await this.entryPoint.withdrawTo(toAddress, value);
	}
}
