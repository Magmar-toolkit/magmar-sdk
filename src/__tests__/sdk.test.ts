import { ethers } from 'ethers';
import {AAmagmar, AAmagmarTG} from '../index';
import {erc721_abi} from "./ERC721_ABI"
import {erc20_abi} from "./ERC20_ABI"
import { ClientOptions, TelegramClientOptions } from '../types';

require('dotenv').config();
const getChainName = async (chainId: number) => {
	switch (chainId) {
        case 1:
            return "ethereum"
		case 137:
			return "polygon";
		case 11155111:
			return "sepolia";
		default:
			return null;
	}
};

interface testERC721Obj {
    [key: number]: string;
    11155111: string;
}

const testERC721:testERC721Obj = {
    1: "0x3eF6031d65D7ad5BaF06fe3Cb4Dcb168E0c2Cb7a",
    11155111: "0x2C529fc29FEeB5d111d9954B922EEe023DEf7e88",
}

describe('AAmagmar SDK', () => {
    let provider:any;
    let wallet: any;
    const options: ClientOptions = {
        privateKey: process.env.PRIVATE_KEY,
        chainId: 1, //eth
        rpcUrl: process.env.ETH_RPC,
        // chainId: 11155111,
        // rpcUrl: process.env.SEPOLIA_RPC,
        isSponsoredTrx: true
    }

    beforeEach(() => {
        //@ts-ignore
        wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
	    provider = new ethers.providers.JsonRpcProvider(options.rpcUrl);
    })


    it.skip('create account successfully', async () => {
        const apiKey = process.env.API_KEY || "";
        const sdk = new AAmagmar(apiKey);
        //@ts-ignore
        const address = await sdk.init(provider,options);
        console.log("address", address);
        console.log(ethers.utils.hashMessage("hello world"));
        console.log("wallet", wallet.address)
        const signature = await wallet.signMessage("hello world");
        console.log("sig",signature);

    }, 80000);

    it('send transaction gasless', async () => {
        // Arrange
        const apiKey = process.env.API_KEY || "";
        const sdk = new AAmagmar(apiKey);
        // options.bundlerEndpoint="https://sepolia.voltaire.candidewallet.com/rpc"
        options.bundlerEndpoint= `https://api.pimlico.io/v2/1/rpc?apikey=${process.env.PIMLICO_BUNDLER_API_KEY}`
        //`https://rpc.etherspot.io/ethereum?api-key=${process.env.ETHERSPOT_API_KEY}` 

        options.paymaster = 'MAGMAR';
        // options.paymasterEndpoint = `https://api.magmar.xyz/v1/11155111/rpc?apiKey=${apiKey}`
        options.paymasterEndpoint = `https://api.magmar.xyz/v1/1/rpc?apiKey=${apiKey}`
        // options.paymasterEndpoint = `http://localhost:3000/v1/11155111/rpc?apiKey=${apiKey}`
        // options.paymasterEndpoint = `http://localhost:3000/v1/1/rpc?apiKey=${apiKey}`
        options.paymasterId =  "0xf0fa48450d520d9f3954f06e7185dd3043c99a1ded7b08688673719d79735f26" 
        
        const address = await sdk.init(provider,options);
        console.log("smart account address", address);
        
        const contractAddress = testERC721[options.chainId];
        const abi = erc721_abi
        const erc721Contract = new ethers.Contract(contractAddress, abi);

        const trx = {
            target: contractAddress as `0x${string}`,
            data: erc721Contract.interface.encodeFunctionData("safeMint", ["0x55010370E052a4AEd262030A13c5068A2760E65D"]) as `0x${string}`
        }

        const userOpHash = await sdk.sendUserOp(trx);
        console.log("userOpHash",userOpHash);
        expect(userOpHash.userOpHash).toHaveLength(66)
    }, 80000);

    it.skip('send transaction gasless by providing bundler endpoint', async () => {
        const apiKey = process.env.API_KEY || "";
        const sdk = new AAmagmar(apiKey);
        const chain = await getChainName(options.chainId);
        
        //ETHERSPOT
        options.bundlerEndpoint = `https://arbitrumgoerli-bundler.etherspot.io/`

        //Voltaire
        // options.bundlerEndpoint = `https://goerli.voltaire.candidewallet.com/rpc`

        
        const address = await sdk.init(provider,options);
        console.log("smart account address", address);
        const contractAddress =  testERC721[options.chainId];
        const abi = erc721_abi
        const erc721Contract = new ethers.Contract(contractAddress, abi);

        const trx = {
            target: contractAddress as `0x${string}`,
            data: erc721Contract.interface.encodeFunctionData("safeMint", ["0x8981A711029Af1B20A0B5A713cF35646716f2b30"]) as `0x${string}`
        }
        const userOpHash = await sdk.sendUserOp(trx);
        console.log("userOpHash",userOpHash);
        expect(userOpHash.userOpHash).toHaveLength(66)
    }, 80000)

    it.skip('send transaction gasless by providing paymaster endpoint', async () => {
        const apiKey = process.env.API_KEY || "";
        const sdk = new AAmagmar(apiKey);
        const chain = await getChainName(options.chainId);
        
        options.paymasterEndpoint = "https://api.stackup.sh/v1/paymaster/f207eaba85a875cc344d0ddae82430a56bf8ff04472c621f8d36e1c194f2f81b"
        options.paymaster = 'STACKUP';

        
        const address = await sdk.init(provider,options);
        console.log("smart account address", address);
        
        const contractAddress = testERC721[options.chainId];

        const abi = erc721_abi
        const erc721Contract = new ethers.Contract(contractAddress, abi);

        const trx = {
            target: contractAddress as `0x${string}`,
            data: erc721Contract.interface.encodeFunctionData("safeMint", ["0x8981A711029Af1B20A0B5A713cF35646716f2b30"]) as `0x${string}`
        }
        const userOpHash = await sdk.sendUserOp(trx);
        console.log("userOpHash",userOpHash);
        expect(userOpHash.userOpHash).toHaveLength(66)
    }, 80000);

    it.skip('send bactch transaction gasless ERC20', async () => {
        // Arrange
        const apiKey = process.env.API_KEY || "";
        const sdk = new AAmagmar(apiKey);
        const address = await sdk.init(provider,options);
        console.log("smart account address", address);
        
        const contractAddress = "0x6EFC3817b0536Ca6fA75f58F42F148cfccBe9f92";
        const abi = erc20_abi;
        const erc20Contract = new ethers.Contract(contractAddress, abi);

        const trx1 = {
            target: contractAddress as `0x${string}`,
            data: erc20Contract.interface.encodeFunctionData("mint", ["1000000"]) as `0x${string}`
        }

        const trx2 = {
            target: contractAddress as `0x${string}`,
            data: erc20Contract.interface.encodeFunctionData("approve", ["0x8981A711029Af1B20A0B5A713cF35646716f2b30", "1000000"]) as `0x${string}`
        }

        const userOpHash = await sdk.sendUserOpsBatch([trx1, trx2]);
        console.log("userOpHash",userOpHash);
        expect(userOpHash.userOpHash).toHaveLength(66)
    }, 80000);

    it.skip('send bactch transaction gasless ERC721', async () => {
        // Arrange
        const apiKey = process.env.API_KEY || "";
        const sdk = new AAmagmar(apiKey);
        const address = await sdk.init(provider,options);
        console.log("smart account address", address);
        
        const contractAddress = testERC721[options.chainId];

        const abi = erc721_abi
        const erc721Contract = new ethers.Contract(contractAddress, abi);

        const trx1 = {
            target: contractAddress as `0x${string}`,
            data: erc721Contract.interface.encodeFunctionData("safeMint", ["0x8981A711029Af1B20A0B5A713cF35646716f2b30"]) as `0x${string}`
        }

        const trx2 = {
            target: contractAddress as `0x${string}`,
            data: erc721Contract.interface.encodeFunctionData("safeMint", ["0x8981A711029Af1B20A0B5A713cF35646716f2b30"]) as `0x${string}`
        }
        const userOpHash = await sdk.sendUserOpsBatch([trx1,trx2]);
        console.log("userOpHash",userOpHash);
        expect(userOpHash.userOpHash).toHaveLength(66)
    }, 80000);

    it.skip('add funds to entry point from EOA on behalf of AA', async () => {
        // Arrange
        const apiKey = process.env.API_KEY || "";
        const sdk = new AAmagmar(apiKey);
        const address = await sdk.init(provider,options);
        console.log("smart account address", address);
        
        const trxReceipt = await sdk.addFundsToEntryPoint("10000000000000");
        console.log("trxReceipt",trxReceipt);
    }, 80000);

    it.skip('withdraw funds from entry point to EOA', async () => {
        // Arrange
        const apiKey = process.env.API_KEY || "";
        const sdk = new AAmagmar(apiKey);
        const address = await sdk.init(provider,options);
        console.log("smart account address", address);
        const toAddress = "0x8981A711029Af1B20A0B5A713cF35646716f2b30"
        const trxReceipt = await sdk.withdrawFundsFromEntryPoint(toAddress,"100");
        console.log("trxReceipt",trxReceipt);
    }, 80000);


    const tgOptions: TelegramClientOptions = {
        telegramUserId: "6732034940",
        walletAddress: "0x8981A711029Af1B20A0B5A713cF35646716f2b30",
        chainId: 11155111, //arb goerli
        rpcUrl: process.env.SEPOLIA_RPC,
        isSponsoredTrx: true
    }

    it.skip('prepare userop for gasless tx using telegram module', async () => {
        const apiKey = process.env.API_KEY || "";
        const sdk = new AAmagmarTG(apiKey);
        const address = await sdk.init(provider,tgOptions);
        console.log("smart account address", address);
        
        const contractAddress = testERC721[options.chainId];

        const abi = erc721_abi
        const erc721Contract = new ethers.Contract(contractAddress, abi);

        const trx = {
            target: contractAddress as `0x${string}`,
            data: erc721Contract.interface.encodeFunctionData("safeMint", ["0x8981A711029Af1B20A0B5A713cF35646716f2b30"]) as `0x${string}`
        }
        const data = await sdk.prepareUserOp(trx);
        const requestId = data.requestId;
        const otpSent = data.otpSent;
        console.log("prepareUserOp",requestId,otpSent);
        expect(otpSent).toEqual("success")
    }, 80000);

    it.skip('send requesId and OTP for sending gasless tx using telegram module', async () => {
        const apiKey = process.env.API_KEY || "";
        const sdk = new AAmagmarTG(apiKey);
        const address = await sdk.init(provider,tgOptions);

        //get it from above test case
        const requestId = "6542b332b8d49b84bb57b4be";
        const otp = "132003";

        const resHash = await sdk.sendUserOp(requestId, otp);
        console.log("resHash",resHash);
        expect(resHash.userOpHash).toHaveLength(66);
    }, 80000);

    it.skip('prepare userop for gasless batch txs using telegram module', async () => {
        const apiKey = process.env.API_KEY || "";
        const sdk = new AAmagmarTG(apiKey);
        const address = await sdk.init(provider,tgOptions);
        console.log("smart account address", address);
        
        const contractAddress = testERC721[options.chainId];

        const abi = erc721_abi
        const erc721Contract = new ethers.Contract(contractAddress, abi);

        const trx1 = {
            target: contractAddress as `0x${string}`,
            data: erc721Contract.interface.encodeFunctionData("safeMint", ["0x8981A711029Af1B20A0B5A713cF35646716f2b30"]) as `0x${string}`
        }

        const trx2 = {
            target: contractAddress as `0x${string}`,
            data: erc721Contract.interface.encodeFunctionData("safeMint", ["0x8981A711029Af1B20A0B5A713cF35646716f2b30"]) as `0x${string}`
        }
        const data = await sdk.prepareUserOpBatch([trx1,trx2]);
        const requestId = data.requestId;
        const otpSent = data.otpSent;
        console.log("prepareUserOp",requestId,otpSent);
        expect(otpSent).toEqual("success")
    }, 80000);


    it.skip('get userop receipt by userophash', async () => {
        const apiKey = process.env.API_KEY || "";
        const sdk = new AAmagmar(apiKey);
        const address = await sdk.init(provider,options);
        const userOpHash = "0x574b64726c1fa87bd3c8b2316d4cf8c6ef7878cdf385f0d768ba54437fd8c320";
        const chainId = 421613
        const receipt = await sdk.getTrxReceiptByUserOpHash(userOpHash ,chainId );
        console.log("receipt",receipt.transactionHash);
    }, 80000);

});