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

import { Transaction } from '@zilliqa-js/account';
import { Contract} from '@zilliqa-js/contract';
import * as zcrypto from '@zilliqa-js/crypto';
import * as Util from '@zilliqa-js/util';
import ZilliqaInit from './zilliqa-init';
import SmartUtil from './smart-contracts/smart-util';
import { NetworkNamespace } from '../decentralized-identity/tyronZIL-schemes/did-scheme';
import ErrorCode from '../decentralized-identity/util/ErrorCode';
import LogColors from '../../bin/log-colors';

/** The `init.tyron smart-contracts` */
export enum InitTyronSM {
    Testnet = "0x08392647c23115f1d027b9d2bbcc9f532b0f003a",
    Mainnet = "0x1c8272a79b5b4920bcae80f310d638c8dd4bd8aa"
}

export default class TyronTransaction extends ZilliqaInit {
    /** The Zilliqa address where the `init.tyron smart-contract` resides */
    public readonly init_tyron: InitTyronSM;

    /** The client's private key */
    private readonly client_privateKey: string;

    /** The client's address */
    public readonly client_addr: string;

    /** The user is the owner of their DIDC */
    public readonly contract_owner?: string;

    public readonly gas_price: Util.BN;
    public readonly gas_limit: Util.Long;

    private constructor(
        network: NetworkNamespace,
        initTyron: InitTyronSM,
        clientPrivateKey: string,
        clientAddr: string,
        gasPrice: Util.BN,
        gasLimit: Util.Long,
        contractOwner?: string        
    ) {
        super(network);
        this.init_tyron = initTyron;
        this.client_privateKey = clientPrivateKey;
        this.client_addr = clientAddr;
        this.contract_owner = contractOwner;
        this.gas_price = gasPrice;
        this.gas_limit = gasLimit
               
    }
    
    /** Retrieves the minimum gas price & validates the client and user info */
    public static async initialize(
        network: NetworkNamespace,
        initTyron: InitTyronSM,
        clientPrivateKey: string,
        gasLimit: string,
        userAddr?: string
    ): Promise<TyronTransaction> {
        let CONTRACT_OWNER: string | undefined;
        if(userAddr !== undefined) {
            CONTRACT_OWNER = zcrypto.fromBech32Address(userAddr);
        }

        const CLIENT_ADDR = zcrypto.getAddressFromPrivateKey(clientPrivateKey);

        let GAS_LIMIT: Util.Long.Long;
        if(!Number(gasLimit) || Number(gasLimit) < 0) {
            throw new ErrorCode("WrongAmount", "The gas limit MUST be a number greater than 0")
        } else {
            GAS_LIMIT = new Util.Long(Number(gasLimit));
        }
        
        const ZIL_INIT = new ZilliqaInit(network);
        const transaction_init = await ZIL_INIT.API.blockchain.getMinimumGasPrice()
        .then(min_gas_price => {
            const GAS_PRICE = new Util.BN(min_gas_price.result!);
            console.log(LogColors.yellow(`The minimum gas price retrieved from the network is: `) + LogColors.brightYellow(`${Number(GAS_PRICE)/1000000000000} ZIL`))
            
            return new TyronTransaction(
                network,
                initTyron,
                clientPrivateKey,
                CLIENT_ADDR,
                GAS_PRICE,
                GAS_LIMIT,
                CONTRACT_OWNER                
            );
        })
        .catch(err => {throw err});
        return transaction_init;
    }

    /***            ****            ***/
    
    /** Deploys the DIDC by version
     * & calls the ContractInit transition with the client_addr */
    public static async deploy(input: TyronTransaction, version: string): Promise<DeployedContract> {
        const deployed_contract = await SmartUtil.decode(input.API, input.init_tyron, version)
        .then(contract_code => {
            console.log(LogColors.brightGreen(`DIDC-code successfully downloaded & decoded from the "init.tyron" smart-contract!`));
            
            const CONTRACT_INIT = [
                {
                    vname: '_scilla_version',
                    type: 'Uint32',
                    value: '0',
                },
                {
                    vname: 'contract_owner',
                    type: 'ByStr20',
                    value: `${input.contract_owner}`,
                },
                {
                    vname: 'init_tyron',
                    type: 'ByStr20',
                    value: `${input.init_tyron}`,
                }
            ];
            const CONTRACT = input.API.contracts.new(contract_code, CONTRACT_INIT);
            return CONTRACT;
        })
        .then(async contract => {
            console.log(LogColors.yellow(`The user's DIDC got properly instantiated: `) + LogColors.brightYellow(`${JSON.stringify(contract, null, 2)}`));
            input.API.wallet.addByPrivateKey(input.client_privateKey!);

            const CLIENT_BALANCE = await input.API.blockchain.getBalance(input.client_addr);

            console.log(LogColors.brightGreen(`Deploying...`));
            const [deployTx, tyron_smart_contract] = await contract.deploy(
                {
                    version: input.zil_version,
                    gasPrice: input.gas_price,
                    gasLimit: input.gas_limit,
                    nonce: Number(CLIENT_BALANCE.result.nonce)+ 1,
                },
                33,
                1000,
                false,
            );
            const IS_DEPLOYED = deployTx.isConfirmed();
            if(!IS_DEPLOYED) {
                throw new ErrorCode("Wrong-Deployment","The user's DIDC did not get deployed")
            }
            console.log(LogColors.yellow(`The user's Tyron DID-Smart-Contract is deployed: `) + LogColors.brightYellow(`${IS_DEPLOYED}`));
            console.log(LogColors.yellow(`Its Zilliqa address is: `) + LogColors.brightYellow(`${tyron_smart_contract.address}`));
            console.log(LogColors.yellow(`Deployment Transaction ID: `) + LogColors.brightYellow(`${deployTx.id}`));

            const DEPLOYMENT_GAS = (deployTx.getReceipt())!.cumulative_gas;
            console.log(LogColors.yellow(`The total gas consumed by deploying the DIDC was: `) + LogColors.brightYellow(`${DEPLOYMENT_GAS}`));
            
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
                        value: `${input.client_addr}`
                    }
                ],
                {
                    version: input.zil_version,
                    amount: new Util.BN(0),
                    gasPrice: input.gas_price,
                    gasLimit: input.gas_limit
                },
                33,
                1000,
                false
            );
            console.log(LogColors.yellow(`The user's Tyron DID-Smart-Contract is initialized: `) + LogColors.brightYellow(`${CALL.isConfirmed()}`));
            const CUMULATIVE_GAS = (CALL.getReceipt())!.cumulative_gas;
            console.log(LogColors.yellow(`The total gas consumed by the ContractInit transition was: `) + LogColors.brightYellow(`${CUMULATIVE_GAS}`));
            return deployed_contract;
        })
        .catch(err => { throw err });
        return deployed_contract;
    }

    /** Submits a tyronZIL transaction (DID operation) */
    public static async submit(input: TyronTransaction, tyronAddr: string, tag: TransitionTag, params: TransitionParams[]): Promise<void> {
        console.log(LogColors.brightGreen(`Processing the ${tag} tyronZIL transaction...`));
        
        await input.API.blockchain.getSmartContractState(tyronAddr)
        .then(async SMART_CONTRACT_STATE => {
            return SMART_CONTRACT_STATE.result.operation_cost;
        })
        .then(async operation_cost => {
            const AMOUNT = new Util.BN(operation_cost);
            const CLIENT_PUBKEY = zcrypto.getPubKeyFromPrivateKey(input.client_privateKey);
            const CLIENT_ADDR = zcrypto.getAddressFromPrivateKey(input.client_privateKey);
            
            const CLIENT_BALANCE = await input.API.blockchain.getBalance(CLIENT_ADDR);
       
            const TRANSITION: Transition = {
                _tag: tag,
                _amount: String(AMOUNT),
                _sender: CLIENT_ADDR,
                params: params
            };

            const TX_OBJECT: TxObject = {
                version: input.zil_version,
                amount: AMOUNT,
                nonce: Number(CLIENT_BALANCE.result.nonce)+ 1,
                gasLimit: input.gas_limit,
                gasPrice: input.gas_price,
                toAddr: tyronAddr,
                pubKey: CLIENT_PUBKEY,
                data: JSON.stringify(TRANSITION),
            };
            
            const RAW_TX = input.API.transactions.new(TX_OBJECT);
            return RAW_TX;
        })
        .then(async raw_tx  => {
            input.API.wallet.addByPrivateKey(input.client_privateKey);
            
            const SIGNED_TX = await input.API.wallet.signWith(raw_tx, input.client_addr);
            return SIGNED_TX;
        })
        .then(async signed_tx => {
            /** Sends the transaction to the Zilliqa blockchain platform */
            const TX = await input.API.blockchain.createTransaction(signed_tx, 33, 1000);
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
        didContractOwner: string,
        signature: string,
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

        const DID_CONTRACT_OWNER: TransitionParams = {
            vname: 'didContractOwner',
            type: 'ByStr33',
            value: didContractOwner,
        };
        PARAMS.push(DID_CONTRACT_OWNER);
        
        const SIGNATURE: TransitionParams = {
            vname: 'signature',
            type: 'ByStr64',
            value: signature,
        };
        PARAMS.push(SIGNATURE);

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

/***            ** interfaces **            ***/

/** The result of a DIDC deployment */
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
