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

import { NetworkNamespace } from '../decentralized-identity/tyronZIL-schemes/did-scheme';
import ZilliqaInit from './zilliqa-init';
import TyronContract, { ContractInit } from './tyron-contract';
import { Transaction } from '@zilliqa-js/account';
import { Contract} from '@zilliqa-js/contract';
import * as Crypto from '@zilliqa-js/crypto';
import * as Util from '@zilliqa-js/util';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../decentralized-identity/util/ErrorCode';
import LogColors from '../../bin/log-colors';
import SmartUtil from './smart-contracts/smart-util';

export default class TyronTransaction extends TyronContract {
    private readonly gas_price: Util.BN;
    private readonly gas_limit: Util.Long;

    /** The client's private key */
    private readonly client_privateKey: string;
    
    /** The user's private key */
    private readonly user_privateKey?: string;
    /** The user's current nonce */
    private readonly user_nonce?: number;

    private constructor(
        network: NetworkNamespace,
        init: ContractInit,
        gas_price: Util.BN,
        gas_limit: Util.Long,
        client_key: string,
        user_key?: string,
        user_nonce?: number
    ) {
        super(network, init);
        this.gas_price = gas_price;
        this.gas_limit = gas_limit
        this.client_privateKey = client_key;
        this.user_privateKey = user_key;
        this.user_nonce = user_nonce;            
    }
    
    /** Validates whether the user and client accounts have provided the correct private keys and have enough funds
     * @returns TyronTransaction instance */
    public static async initialize(
        network: NetworkNamespace,
        init: ContractInit,
        clientPrivateKey: string,
        gasLimit: number,
        userPrivateKey?: string
    ): Promise<TyronTransaction> {
        const ZIL_INIT = new ZilliqaInit(network);
        const transaction_init = await ZIL_INIT.API.blockchain.getMinimumGasPrice()
        .then(min_gas_price => {
            const GAS_PRICE = new Util.BN(min_gas_price.result!);
            console.log(LogColors.yellow(`The minimum gas price retrieved from the network is: `) + LogColors.brightYellow(`${Number(GAS_PRICE)/1000000000000} ZIL`))
            const GAS_LIMIT = new Util.Long(gasLimit);
            return {
                price: GAS_PRICE,
                limit: GAS_LIMIT
            };
        })
        .then(async gas => {
            const CLIENT_ADDR = Crypto.getAddressFromPrivateKey(clientPrivateKey);
            if (CLIENT_ADDR !== init.client_addr) {
                throw new SidetreeError(ErrorCode.WrongKey);
            }
            /** Gets the current balance of the account (in Qa = 10^-12 ZIL as string)
            * & the current nonce of the account (as number) */
            const GET_BALANCE = await ZIL_INIT.API.blockchain.getBalance(CLIENT_ADDR);
            const BALANCE_RESULT = GET_BALANCE.result;

            // The account's balance MUST be greater than a minimum stake amount
            if (Number(BALANCE_RESULT.balance) < init.tyron_stake) {
            throw new SidetreeError("NotEnoughBalance", `The client's balance must be more than the tyron_stake of 50ZIL - Current balance: ${Number(BALANCE_RESULT.balance)/1000000000000} ZIL`)
            }

            let USER_NONCE;
            if(userPrivateKey !== undefined) {
                const USER_ADDRESS = Crypto.getAddressFromPrivateKey(userPrivateKey);
                if (USER_ADDRESS !== init.contract_owner) {
                    throw new SidetreeError(ErrorCode.WrongKey);
                }
                /** Gets the current balance of the account (in Qa = 10^-12 ZIL as string)
                * & the current nonce of the account (as number) */
                const GET_BALANCE = await ZIL_INIT.API.blockchain.getBalance(USER_ADDRESS);
                const BALANCE_RESULT = GET_BALANCE.result;

                // The account's balance MUST be greater than the cost to initialize the TSM
                if (Number(BALANCE_RESULT.balance) < 20000000000000) {
                    throw new SidetreeError("NotEnoughBalance", `The user's balance must be more than the cost to initialize their Tyron-Smart-Contract (~20ZIL) - Current balance: ${Number(BALANCE_RESULT.balance)/1000000000000} ZIL`)
                }
                USER_NONCE = Number(BALANCE_RESULT.nonce);
            }

            return new TyronTransaction(
                network,
                init,
                gas.price,
                gas.limit,
                clientPrivateKey,
                userPrivateKey,
                USER_NONCE);
        })
        .catch(err => {throw err});
        return transaction_init;
    }

    /***            ****            ***/
    
    /** Deploys the TSM by version
     * & calls the ContractInit transition with the client_addr to set the operation_cost, the foundation_addr & client_commission from the TyronInit contract 
    */
    public static async deploy(init: TyronTransaction, version: string): Promise<DeployedContract> {
        const deployed_contract = await SmartUtil.decode(init.API, init.tyron_init, version)
        .then(contract_code => {
            console.log(LogColors.brightGreen(`TSM-code successfully downloaded & decoded from the TyronInit contract!`));
            const CONTRACT_INIT = [
                {
                    vname: '_scilla_version',
                    type: 'Uint32',
                    value: '0',
                },
                {
                    vname: 'contract_owner',
                    type: 'ByStr20',
                    value: `${init.contract_owner}`,
                },
                {
                    vname: 'tyron_init',
                    type: 'ByStr20',
                    value: `${init.tyron_init}`,
                }
            ];
            const CONTRACT = init.API.contracts.new(contract_code, CONTRACT_INIT);
            return CONTRACT;
        })
        .then(async contract => {
            console.log(LogColors.yellow(`The user's TSM got properly instantiated: `) + LogColors.brightYellow(`${JSON.stringify(contract, null, 2)}`));
            init.API.wallet.addByPrivateKey(init.user_privateKey!);
            console.log(LogColors.brightGreen(`Deploying...`));
            const [deployTx, tyron_smart_contract] = await contract.deploy(
                {
                    version: init.version,
                    gasPrice: init.gas_price,
                    gasLimit: init.gas_limit,
                    nonce: init.user_nonce! + 1,
                },
                33,
                1000,
                false,
            );
            const IS_DEPLOYED = deployTx.isConfirmed();
            if(!IS_DEPLOYED) {
                throw new SidetreeError("Wrong-Deployment","The user's TSM did not get deployed")
            }
            console.log(LogColors.yellow(`Your Tyron-Smart-Contract is deployed: `) + LogColors.brightYellow(`${IS_DEPLOYED}`));
            console.log(LogColors.yellow(`Its Zilliqa address is: `) + LogColors.brightGreen(`${tyron_smart_contract.address}`));
            console.log(LogColors.yellow(`Deployment Transaction ID: `) + LogColors.brightYellow(`${deployTx.id}`));

            const DEPLOYMENT_GAS = (deployTx.getReceipt())!.cumulative_gas;
            console.log(LogColors.yellow(`The total gas consumed by deploying your TSM was: `) + LogColors.brightYellow(`${DEPLOYMENT_GAS}`));
            
            const DEPLOYED_CONTRACT = {
                transaction: deployTx,
                contract: tyron_smart_contract
            };
            return DEPLOYED_CONTRACT;
        })
        .then(async deployed_contract => {
            console.log(LogColors.brightGreen(`Calling the ContractInit transition...`))
            const CALL = await deployed_contract.contract.call(
                'ContractInit',
                [
                    {
                        vname: 'clientAddress',
                        type: 'String',
                        value: `${init.client_addr}`
                    }
                ],
                {
                    version: init.version,
                    amount: new Util.BN(0),
                    gasPrice: init.gas_price,
                    gasLimit: init.gas_limit
                },
                33,
                1000,
                false
            );
            console.log(LogColors.yellow(`Your Tyron-Smart-Contract is initialized: `) + LogColors.brightYellow(`${CALL.isConfirmed()}`));
            const CUMULATIVE_GAS = (CALL.getReceipt())!.cumulative_gas;
            console.log(LogColors.yellow(`The total gas consumed by the ContractInit transition was: `) + LogColors.brightYellow(`${CUMULATIVE_GAS}`));
            return deployed_contract;
        })
        .catch(err => { throw err });
        return deployed_contract;
    }

    /** Submits a tyronZIL transaction (DID operation) */
    public static async submit(init: TyronTransaction, tyronAddr: string, tag: TransitionTag, params: TransitionParams[]): Promise<void> {
        console.log(LogColors.brightGreen(`Processing your ${tag} tyronZIL transaction...`));
        
        await init.API.blockchain.getSmartContractState(tyronAddr)
        .then(async SMART_CONTRACT_STATE => {
            return SMART_CONTRACT_STATE.result.operation_cost;
        })
        .then(async operation_cost => {
            const AMOUNT = new Util.BN(operation_cost);
            const PUB_KEY = Crypto.getPubKeyFromPrivateKey(init.client_privateKey);
            const CLIENT_BALANCE = await init.API.blockchain.getBalance(init.client_addr);
       
            const TRANSITION: Transition = {
                _tag: tag,
                _amount: String(AMOUNT),
                _sender: init.client_addr,
                params: params
            };

            const TX_OBJECT: TxObject = {
                version: init.version,
                amount: AMOUNT,
                nonce: Number(CLIENT_BALANCE.result.nonce)+ 1,
                gasLimit: init.gas_limit,
                gasPrice: init.gas_price,
                toAddr: tyronAddr,
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
            const TX = await init.API.blockchain.createTransaction(signed_tx, 33, 1000);
            return TX;
        })
        .then( async transaction => {
            const TRAN_ID = transaction.id!;
            
            const TRANSACTION = await transaction.confirm(TRAN_ID, 33, 1000)
            console.log(LogColors.yellow(`For testing purposes, disclosing the ${tag} tyronZIL transaction: `) + LogColors.brightYellow(`${JSON.stringify(TRANSACTION, null, 2)}`));
            const STATUS = transaction.isConfirmed();
            console.log(LogColors.yellow(`The transaction is confirmed: `) + LogColors.brightYellow(`${STATUS}`));
            if(STATUS){
                console.log(LogColors.brightGreen(`The ${tag} tyronZIL transaction has been successful!`));
            } else {
                console.log(LogColors.red(`The ${tag} tyronZIL transaction has been unsuccessful!`));
            }
            
            const TX_RECEIPT = transaction.getReceipt();
            const CUMULATIVE_GAS = TX_RECEIPT!.cumulative_gas;
            console.log(LogColors.yellow(`The total gas consumed in this ${tag} transaction was: `) + LogColors.brightYellow(`${CUMULATIVE_GAS}`));
        })
        .catch(err => { throw err })
    }

    public static async create(
        document: string,
        updateKey: string,
        recoveryKey: string
    ): Promise<TransitionParams[]> {
        
        const PARAMS = [];

        const DOCUMENT: TransitionParams = {
            vname: 'document',
            type: 'ByStr',
            value: document,
        };
        PARAMS.push(DOCUMENT);

        const UPDATE_KEY: TransitionParams = {
            vname: 'updateKey',
            type: 'ByStr33',
            value: updateKey,
        };
        PARAMS.push(UPDATE_KEY);

        const RECOVERY_KEY: TransitionParams = {
            vname: 'recoveryKey',
            type: 'ByStr33',
            value: recoveryKey,
        };
        PARAMS.push(RECOVERY_KEY);

        return PARAMS;
    }

    public static async update(
        newDocument: string,
        signature: string,
        newUpdateKey: string
    ): Promise<TransitionParams[]> {

        const PARAMS = [];
        
        const DOCUMENT: TransitionParams = {
            vname: 'newDocument',
            type: 'ByStr',
            value: newDocument,
        };
        PARAMS.push(DOCUMENT);

        const SIGNATURE: TransitionParams = {
            vname: 'signature',
            type: 'ByStr64',
            value: signature,
        };
        PARAMS.push(SIGNATURE);

        const NEW_UPDATE_KEY: TransitionParams = {
            vname: 'newUpdateKey',
            type: 'ByStr33',
            value: newUpdateKey,
        };
        PARAMS.push(NEW_UPDATE_KEY);

        return PARAMS;
    }

    public static async recover(
        newDocument: string,
        signature: string,
        newUpdateKey: string,
        newRecoveryKey: string
    ): Promise<TransitionParams[]> {

        const PARAMS = [];

        const DOCUMENT: TransitionParams = {
            vname: 'newDocument',
            type: 'ByStr',
            value: newDocument,
        };
        PARAMS.push(DOCUMENT);

        const SIGNATURE: TransitionParams = {
            vname: 'signature',
            type: 'ByStr64',
            value: signature,
        };
        PARAMS.push(SIGNATURE);

        const NEW_UPDATE_KEY: TransitionParams = {
            vname: 'newUpdateKey',
            type: 'ByStr33',
            value: newUpdateKey,
        };
        PARAMS.push(NEW_UPDATE_KEY);

        const NEW_RECOVERY_KEY: TransitionParams = {
            vname: 'newRecoveryKey',
            type: 'ByStr33',
            value: newRecoveryKey,
        };
        PARAMS.push(NEW_RECOVERY_KEY);

        return PARAMS;
    }

    public static async deactivate(
        signature: string
    ): Promise<TransitionParams[]> {

        const PARAMS = [];
        
        const SIGNATURE: TransitionParams = {
            vname: 'signature',
            type: 'ByStr64',
            value: signature,
        };
        PARAMS.push(SIGNATURE);

        return PARAMS;
    }
}

/***            ****            ***/

/** The result of a TSM deployment */
export interface DeployedContract {
    transaction: Transaction,
    contract: Contract
}

interface Transition {
    _tag: string;               // transition to be invoked
    _amount: string; 	        // number of QA to be transferred
    _sender: string;	        // address of the invoker
    params: TransitionParams[] 	// an array of parameter objects
}

export enum TransitionTag {
    Create = 'DidCreate',
    Update = "DidUpdate",
    Recover = "DidRecover",
    Deactivate = "DidDeactivate"
}

interface TransitionParams {
    vname: string;
    type: any;
    value: unknown;
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
