# magmar Account Abstraction SDK
Account abstraction (ERC-4337) SDK layer

## Overview

This documentation provides an explanation of the AAmagmar SDK functionalities used for interacting with smart contracts, focusing on account abstraction in accordance with the ERC-4337 standard. The SDK is designed to simplify the process of executing transactions in a gasless manner and interacting with EVM contracts.

## Prerequisites

Before implementing the SDK, ensure the following requirements are met:
- Node.js installed.
- AAmagmar SDK installed.

## Environment Variables

Set up the following environment variable:
- `API_KEY`: Your unique API key for the AAmagmar SDK. Get the API key from magmar dashboard.

## SDK Initialization

1. **Initializing the SDK**:
    ```javascript
    const apiKey = process.env.API_KEY;
    const sdk = new AAmagmar(apiKey);
    const smartAccountAddress = await sdk.init(provider, options);
    ```
   Initialize the AAmagmar SDK with your API key. Replace `provider` and `options` with your specific configurations to set up the SDK properly.

### options 

The `ClientOptions` interface for the SDK configuration includes:
- `chainId` (number): The chain ID of the Ethereum network.
- `privateKey` (string, optional): The private key for signing transactions.
- `rpcUrl` (string, optional): The URL of the Ethereum RPC endpoint.
- `isSponsoredTrx` (boolean, optional): Indicates if the transaction is sponsored.
- `paymasterEndpoint` (string, optional): The endpoint URL for the paymaster.
- `paymaster` (string, optional): Type of paymaster, options are "PIMLICO" or "STACKUP".
- `bundlerEndpoint` (string, optional): The endpoint URL for the bundler.

Configure these options as per your application's requirements.

## Example: Simple Counter Contract Transaction
1. **Setting up Smart Contract Interaction**:
    ```javascript
    const apiKey = process.env.API_KEY;
    const sdk = new AAmagmar(apiKey);
    const smartAccountAddress = await sdk.init(provider, options);
    const contractAddress = "<contract_address>";
    const abi = COUNTER_CONTRACT_ABI;
    const counterContract = new ethers.Contract(contractAddress, abi);
    ```
   Define the contract address and ABI of the ERC-721 contract for interaction using the SDK.


2. **Creating a Transaction**:
    ```javascript
    const trx = {
        target: contractAddress,
        data: counterContract.interface.encodeFunctionData("increment") `
    };
    ```
   Formulate a transaction object for invoking the `increment` function on the Counter contract through the SDK.

3. **Executing the Transaction**:
    ```javascript
    const userOpHash = await sdk.sendUserOp(trx);
    console.log("userOpHash", userOpHash);
    ```
   Send the transaction using the AAmagmar SDK and get the operation hash and transaction hash.

## Conclusion

This guide covers the basic setup and interaction with an simple Counter smart contract for incremeting using the AAmagmar SDK. The SDK facilitates gasless transactions and simplifies the implementation of account abstraction as per ERC-4337.

Refer to the AAmagmar SDK and ERC-4337 documentation for more detailed information.
