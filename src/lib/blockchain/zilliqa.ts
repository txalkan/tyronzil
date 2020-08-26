/*
    TyronZIL-js: Decentralized identity client for the Zilliqa blockchain platform
    Copyright (C) 2020 Julio Cesar Cabrapan Duarte

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/

import { NetworkNamespace } from '../sidetree/tyronZIL-schemes/did-scheme';
import TyronContract, { ContractInit } from './tyron-contract';
import * as API from '@zilliqa-js/zilliqa';
import * as Crypto from '@zilliqa-js/crypto';
import * as Util from '@zilliqa-js/util';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../ErrorCode';
import LogColors from '../../bin/log-colors';

export class ZilliqaInit extends TyronContract {
    public readonly endpoint: ZilliqaEndpoint;
    public readonly chainID: ZilliqaChainID;
    public readonly API: API.Zilliqa;
    public readonly version: number;

    constructor(
        network: NetworkNamespace,
        init: ContractInit,
        tyron_addr: string
    ) {
        super(init, tyron_addr);
        let NETWORK_ENDPOINT;
        let CHAIN_ID;
        switch (network) {
            case NetworkNamespace.Mainnet:
                NETWORK_ENDPOINT = ZilliqaEndpoint.Mainnet;
                CHAIN_ID = ZilliqaChainID.Mainnet;                
                break;
            case NetworkNamespace.Testnet:
                NETWORK_ENDPOINT = ZilliqaEndpoint.Testnet;
                CHAIN_ID = ZilliqaChainID.Testnet;
                break;
        }
        this.endpoint = NETWORK_ENDPOINT;
        this.chainID = CHAIN_ID;
        this.API = new API.Zilliqa(this.endpoint);
        this.version = Util.bytes.pack(this.chainID, 1);
    }
}

enum ZilliqaEndpoint {
    Mainnet = 'https://api.zilliqa.com/',
    Testnet = 'https://dev-api.zilliqa.com/',
}

enum ZilliqaChainID {
    Mainnet = 1,
    Testnet = 333,
}

export class Transaction extends ZilliqaInit {
    /** The client's private key */
    private readonly client_privateKey: string;
    /** The client's current nonce */
    private readonly client_nonce: number;
    
    /** The user's private key */
    readonly user_privateKey: string;
    /** The user's current nonce */
    readonly user_nonce: number;

    private constructor(
        network: NetworkNamespace,
        init: ContractInit,
        tyron_addr: string,
        client_key: string,
        client_nonce: number,
        user_key: string,
        user_nonce: number
    ) {
        super(network, init, tyron_addr);
        this.client_privateKey = client_key;
        this.client_nonce = client_nonce;
        this.user_privateKey = user_key;
        this.user_nonce = user_nonce; 
    }
    
    /** Validates whether the user and client accounts have provided the correct private keys and have enough funds
     * @returns Transaction instance */
    public static async initialize(
        network: NetworkNamespace,
        init: ContractInit,
        tyron_addr: string,
        client_privateKey: string,
        user_privateKey: string
    ): Promise<void | Transaction> {

        const ZIL_INIT = new ZilliqaInit(network, init, tyron_addr);
        const ZIL_API = ZIL_INIT.API;
        
        const transaction_init = Promise.resolve(Crypto.getAddressFromPrivateKey(client_privateKey))
        .then(async CLIENT_ADDR => {

            if (CLIENT_ADDR !== ZIL_INIT.client_addr) {
                throw new SidetreeError(ErrorCode.WrongKey);
            }
            /** Gets the current balance of the account (in Qa = 10^-12 ZIL as string)
            * & the current nonce of the account (as number) */
            const GET_BALANCE = await ZIL_API.blockchain.getBalance(CLIENT_ADDR);
            const BALANCE_RESULT = GET_BALANCE.result;

            // The account's balance MUST be greater than a minimum stake amount
            if (Number(BALANCE_RESULT.balance) < ZIL_INIT.tyron_stake) {
            throw new SidetreeError(ErrorCode.NotEnoughBalance)
            }
            return Number(BALANCE_RESULT.nonce);
        })
        .then(async client_nonce => {
        
            const USER_ADDRESS = Crypto.getAddressFromPrivateKey(user_privateKey);
            if (USER_ADDRESS !== ZIL_INIT.contract_owner) {
                throw new SidetreeError(ErrorCode.WrongKey);
            }
            /** Gets the current balance of the account (in Qa = 10^-12 ZIL as string)
            * & the current nonce of the account (as number) */
            const GET_BALANCE = await ZIL_API.blockchain.getBalance(USER_ADDRESS);
            const BALANCE_RESULT = GET_BALANCE.result;

            // The account's balance MUST be greater than the cost to initialize the `tyron-smart-contract`, e.g. 100ZIL
            if (Number(BALANCE_RESULT.balance) < 100000000000000) {
            throw new SidetreeError(ErrorCode.NotEnoughBalance)
            }
            const USER_NONCE = Number(BALANCE_RESULT.nonce);

            return new Transaction(network, init, tyron_addr, client_privateKey, client_nonce, user_privateKey, USER_NONCE);
        })
        .catch(error => console.error(error));
        return transaction_init;
    }

    public static async submit(init: Transaction, tag: TransitionTag, params: TransitionParams[]): Promise<void> {
        
        await init.API.blockchain.getSmartContractState(init.tyron_addr)
        .then(async SMART_CONTRACT_STATE => {
            
            return SMART_CONTRACT_STATE.result.operation_cost;
        })
        .then(async operation_cost => {
            
            const AMOUNT = new Util.BN(operation_cost);
            const MIN_GAS_PRICE = await init.API.blockchain.getMinimumGasPrice();
            const GAS_PRICE = new Util.BN(MIN_GAS_PRICE.result!);
            const GAS_LIMIT = new Util.Long(15000);
            const PUB_KEY = Crypto.getPubKeyFromPrivateKey(init.client_privateKey);
        
            const TRANSITION: Transition = {
                _tag: tag,
                _amount: String(operation_cost),
                _sender: init.client_addr,
                params: params
            };

            const TX_OBJECT: TxObject = {
                version: init.version,
                amount: AMOUNT,
                nonce: init.client_nonce + 1,
                gasLimit: GAS_LIMIT,
                gasPrice: GAS_PRICE,
                toAddr: init.tyron_addr,
                pubKey: PUB_KEY,
                data: JSON.stringify(TRANSITION),
            };

            const RAW_TX = init.API.transactions.new(TX_OBJECT);
            return RAW_TX;
        })
        .then(async raw_tx  => {
            
            init.API.wallet.addByPrivateKey(init.client_privateKey);
            const SIGNED_TX = await init.API.wallet.signWith(raw_tx, init.client_addr);
            return SIGNED_TX;
        })
        .then(async signed_tx => {

            /** Sends the transaction to the Zilliqa blockchain platform */
            const TX = await init.API.provider.send('CreateTransaction', signed_tx.txParams);
            const TX_RESULT = TX.result;
            console.log(`The transaction result is: ${JSON.stringify(TX_RESULT, null, 2)}`);

            const TRAN_ID = TX_RESULT.TranID;

            const TRANSACTION = await signed_tx.confirm(TRAN_ID, 33, 1000)
            console.log(`The TX is: ${JSON.stringify(TRANSACTION, null, 2)}`);

            const STATUS = signed_tx.isConfirmed();
            console.log(`The status of the transaction is: ${STATUS}`);

            return TRAN_ID;
        })
        .then(async zilliqa_tranID => {
            const GET_TRANSACTION = await init.API.blockchain.getTransaction(zilliqa_tranID);
            const TX_RECEIPT = GET_TRANSACTION.getReceipt();

            const CUMULATIVE_GAS = TX_RECEIPT!.cumulative_gas;
            console.log(`The total gas consumed in this transaction is: ${CUMULATIVE_GAS}`);

            console.log(LogColors.green(`The tyronZIL transaction ${tag} has been successful!`));
        })
        .catch(error => console.error(error));
    }

    public static async create(
        did: string,
        suffixData: string,
        encodedDelta: string | undefined,
        updateCommitment: string,
        recoveryCommitment: string
    ): Promise<TransitionParams[]> {

        const PARAMS = [];
        const DID: TransitionParams = {
            vname: "did",
            type: "String",
            value: did,
        };
        PARAMS.push(DID);

        const SUFFIX: TransitionParams = {
            vname: "suffixData",
            type: "String",
            value: suffixData,
        };
        PARAMS.push(SUFFIX);

        const DELTA: TransitionParams = {
            vname: "encodedDelta",
            type: "String",
            value: encodedDelta!,
        };
        PARAMS.push(DELTA);

        const UPDATE_COMMIT: TransitionParams = {
            vname: "updateCommitment",
            type: "String",
            value: updateCommitment,
        };
        PARAMS.push(UPDATE_COMMIT);

        const RECOVERY_COMMIT: TransitionParams = {
            vname: "recoveryCommitment",
            type: "String",
            value: recoveryCommitment,
        };
        PARAMS.push(RECOVERY_COMMIT);

        return PARAMS;
    }
}

interface Transition {
    _tag: string;               // transition to be invoked
    _amount: string; 	        // number of QA to be transferred
    _sender: string;	        // address of the invoker
    params: TransitionParams[] 	// an array of parameter objects
}

export enum TransitionTag {
    Create = "DidCreate"
}

interface TransitionParams {
    vname: string;
    type: string;
    value: string;
}

interface TxObject {
    version: number;
    amount: Util.BN;
    nonce: number;
    gasLimit: Util.Long;
    gasPrice: Util.BN;
    toAddr: string;
    pubKey: string;
    code?: string;
    data?: string;
    priority?: boolean;
}