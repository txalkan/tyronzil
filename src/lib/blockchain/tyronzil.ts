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
import { Action, DocumentElement, ServiceModel } from '../decentralized-identity/protocols/models/document-model';
import CodeError from '../decentralized-identity/util/ErrorCode';
import { PublicKeyModel } from '../decentralized-identity/protocols/models/verification-method-models';

/** The `init.tyron smart contracts */
export enum InitTyron {
    Testnet = "0x63e2d8484187de4f66a571c098f3b51a793f055b",
    Mainnet = "0x1c8272a79b5b4920bcae80f310d638c8dd4bd8aa",
    Isolated = "0x9ded7118b3386108f1bc4e0e0699d7ab23997265"
}

/** The tyronZIL transaction class */
export default class TyronZIL extends ZilliqaInit {
    /** The user is the owner of their DIDC */
    public readonly contractOwner: string;
    public readonly userPrivateKey: string;

    /** The Zilliqa address where the `init.tyron smart-contract` resides */
    public readonly initTyron: InitTyron;

    public readonly gasPrice: Util.BN;
    public readonly gasLimit: Util.Long;

    private constructor(
        network: NetworkNamespace,
        contractOwner: string,
        userPrivateKey: string,
        initTyron: InitTyron,
        gasPrice: Util.BN,
        gasLimit: Util.Long,
    ) {
        super(network);
        this.contractOwner = contractOwner;
        this.userPrivateKey = userPrivateKey;
        this.initTyron = initTyron;
        this.gasPrice = gasPrice;
        this.gasLimit = gasLimit
    }
    
    /** Retrieves the minimum gas price & validates the account info */
    public static async initialize(
        network: NetworkNamespace,
        initTyron: InitTyron,
        userPrivateKey: string,
        gasLimit: string
    ): Promise<TyronZIL> {
        let CONTRACT_OWNER = zcrypto.getAddressFromPrivateKey(userPrivateKey);

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
            
            return new TyronZIL(
                network,
                CONTRACT_OWNER,
                userPrivateKey,
                initTyron,
                GAS_PRICE,
                GAS_LIMIT               
            );
        })
        .catch(err => {throw err});
        return transaction_init;
    }

    /***            ****            ***/
    
    /** Deploys the DIDC by version
     * & calls the Init transition with the avatar.agent */
    public static async deploy(input: TyronZIL, version: string): Promise<DeployedContract> {
        const deployed_contract = await SmartUtil.decode(input.API, input.initTyron, version)
        .then(contract_code => {
            console.log(LogColors.brightGreen(`DIDC-code successfully downloaded & decoded from the "init.tyron" smart contract!`));
            
            const CONTRACT_INIT = [
                {
                    vname: '_scilla_version',
                    type: 'Uint32',
                    value: '0',
                },
                {
                    vname: 'initContractOwner',
                    type: 'ByStr20',
                    value: `${input.contractOwner}`,
                },
                {
                    vname: 'initTyron',
                    type: 'ByStr20',
                    value: `${input.initTyron}`,
                }
            ];
            const CONTRACT = input.API.contracts.new(contract_code, CONTRACT_INIT);
            return CONTRACT;
        })
        .then(async contract => {
            console.log(LogColors.yellow(`The user's DIDC got properly instantiated: `) + LogColors.brightYellow(`${JSON.stringify(contract, null, 2)}`));
            input.API.wallet.addByPrivateKey(input.userPrivateKey);

            const USER_BALANCE = await input.API.blockchain.getBalance(input.contractOwner);

            console.log(LogColors.brightGreen(`Deploying...`));
            const [deployTx, didc] = await contract.deploy(
                {
                    version: input.zilVersion,
                    gasPrice: input.gasPrice,
                    gasLimit: input.gasLimit,
                    nonce: Number(USER_BALANCE.result.nonce)+ 1,
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
            console.log(LogColors.yellow(`Its Zilliqa address is: `) + LogColors.brightYellow(`${didc.address}`));
            console.log(LogColors.yellow(`Deployment Transaction ID: `) + LogColors.brightYellow(`${deployTx.id}`));

            const DEPLOYMENT_GAS = (deployTx.getReceipt())!.cumulative_gas;
            console.log(LogColors.yellow(`The total gas consumed by deploying the DIDC was: `) + LogColors.brightYellow(`${DEPLOYMENT_GAS}`));
            
            const DEPLOYED_CONTRACT = {
                transaction: deployTx,
                contract: didc
            };
            return DEPLOYED_CONTRACT;
        })
        .then(async deployed_contract => {
            console.log(LogColors.brightGreen(`Calling the Init transition...`))
            const agent = "pungtas";
            const CALL = await deployed_contract.contract.call(
                'Init',
                [
                    {
                        vname: 'agent',
                        type: 'String',
                        value: `${agent}`
                    }
                ],
                {
                    version: input.zilVersion,
                    amount: new Util.BN(0),
                    gasPrice: input.gasPrice,
                    gasLimit: input.gasLimit
                },
                33,
                1000,
                false
            );
            console.log(LogColors.yellow(`The user's Tyron DID-Smart-Contract is initialized: `) + LogColors.brightYellow(`${CALL.isConfirmed()}`));
            const CUMULATIVE_GAS = (CALL.getReceipt())!.cumulative_gas;
            console.log(LogColors.yellow(`The total gas consumed by the Init transition was: `) + LogColors.brightYellow(`${CUMULATIVE_GAS}`));
            console.log(LogColors.yellow(`The transaction ID is: `) + LogColors.brightYellow(`${CALL.id}`));
            if(!CALL.isConfirmed()) {
                throw new ErrorCode("CodeNotInitialized", "The DIDC did not get initialized")
            }
            return deployed_contract;
        })
        .catch(err => { throw err });
        return deployed_contract;
    }

    /** Submits a tyronZIL transaction (DID operation) */
    public static async submit(
        input: TyronZIL,
        tyronAddr: string,
        tag: TransitionTag,
        params: TransitionParams[],
        operation: string
        ): Promise<void> {
        
        console.log(LogColors.brightGreen(`Processing the ${tag} tyronZIL transaction...`));
        
        await input.API.blockchain.getSmartContractState(tyronAddr)
        .then(async SMART_CONTRACT_STATE => {
            const OPERATION_COST = SMART_CONTRACT_STATE.result.operation_cost;
            return await SmartUtil.getValuefromMap(OPERATION_COST, operation);
        })
        .then(async operation_cost => {
            const AMOUNT = new Util.BN(operation_cost);
            const USER_PUBKEY = zcrypto.getPubKeyFromPrivateKey(input.userPrivateKey);
            
            const USER_BALANCE = await input.API.blockchain.getBalance(input.contractOwner);
       
            const TRANSITION: Transition = {
                _tag: tag,
                _amount: String(AMOUNT),
                _sender: input.contractOwner,
                params: params
            };

            const TX_OBJECT: TxObject = {
                version: input.zilVersion,
                amount: AMOUNT,
                nonce: Number(USER_BALANCE.result.nonce)+ 1,
                gasLimit: input.gasLimit,
                gasPrice: input.gasPrice,
                toAddr: tyronAddr,
                pubKey: USER_PUBKEY,
                data: JSON.stringify(TRANSITION),
            };
            
            const RAW_TX = input.API.transactions.new(TX_OBJECT);
            return RAW_TX;
        })
        .then(async raw_tx  => {
            input.API.wallet.addByPrivateKey(input.userPrivateKey);
            
            const SIGNED_TX = await input.API.wallet.signWith(raw_tx, input.contractOwner);
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
                console.log(LogColors.brightGreen(`The ${tag} tyronZIL transaction was successful!`));
            } else {
                console.log(LogColors.red(`The ${tag} tyronZIL transaction was unsuccessful!`));
            }
            
            const TX_RECEIPT = transaction.getReceipt();
            const CUMULATIVE_GAS = TX_RECEIPT!.cumulative_gas;
            console.log(LogColors.yellow(`The total gas consumed in this ${tag} transaction was: `) + LogColors.brightYellow(`${CUMULATIVE_GAS}`));
        })
        .catch(err => { throw err })
    }

    public static async create(
        agent: string,
        document: any[],
        updateKey: string,
        recoveryKey: string
    ): Promise<TransitionParams[]> {
        
        const PARAMS = [];

        const AGENT: TransitionParams = {
            vname: 'agent',
            type: 'String',
            value: agent,
        };
        PARAMS.push(AGENT);

        const DOCUMENT: TransitionParams = {
            vname: 'document',
            type: 'List Document',
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

    public static async recover(
        agent: string,
        newDocument: any[],
        signature: string,
        newUpdateKey: string,
        newRecoveryKey: string
    ): Promise<TransitionParams[]> {

        const PARAMS = [];

        const AGENT: TransitionParams = {
            vname: 'agent',
            type: 'String',
            value: agent,
        };
        PARAMS.push(AGENT);

        const DOCUMENT: TransitionParams = {
            vname: 'newDocument',
            type: 'List Document',
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

    public static async update(
        agent: string,
        newDocument: any[],
        signature: string,
        newUpdateKey: string
    ): Promise<TransitionParams[]> {

        const PARAMS = [];
        
        const AGENT: TransitionParams = {
            vname: 'agent',
            type: 'String',
            value: agent,
        };
        PARAMS.push(AGENT);

        const DOCUMENT: TransitionParams = {
            vname: 'newDocument',
            type: 'List Document',
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

    public static async deactivate(
        agent: string,
        signature: string
    ): Promise<TransitionParams[]> {

        const PARAMS = [];
        
        const AGENT: TransitionParams = {
            vname: 'agent',
            type: 'String',
            value: agent,
        };
        PARAMS.push(AGENT);

        const SIGNATURE: TransitionParams = {
            vname: 'signature',
            type: 'ByStr64',
            value: signature,
        };
        PARAMS.push(SIGNATURE);

        return PARAMS;
    }

    public static async dns(
        domain: string,
        avatar: string
    ): Promise<TransitionParams[]> {
        
        const PARAMS = [];

        const DOMAIN: TransitionParams = {
            vname: 'domain',
            type: 'String',
            value: domain,
        };
        PARAMS.push(DOMAIN);

        const AVATAR: TransitionParams = {
            vname: 'avatar',
            type: 'String',
            value: avatar,
        };
        PARAMS.push(AVATAR);
        return PARAMS;
    }
    
    /** Returns a DID-Document element transition value */
    public static async documentElement(
        element: DocumentElement,       
        action: Action,
        key?: PublicKeyModel,
        service?: ServiceModel
    ): Promise<TransitionValue> {
        let VALUE: TransitionValue;
        let ADD: TransitionValue = {
            constructor: Action.Adding,
            argtypes: [],
            arguments: []
        };
        let REMOVE: TransitionValue = {
            constructor: Action.Removing,
            argtypes: [],
            arguments: []
        };
        switch (element) {
            case DocumentElement.VerificationMethod:
                VALUE = {
                    argtypes: [],
                    arguments: [],
                    constructor: "VerificationMethod"
                };
                switch (action) {
                    case Action.Adding:
                        Object.assign(VALUE, {
                            arguments: [
                                ADD,
                                `${key!.id}`,
                                `${key!.key}`
                            ]
                        });
                        break;
                    case Action.Removing:
                        Object.assign(VALUE, {
                            arguments: [
                                REMOVE,
                                `${key!.id}`,
                                "0x024caf04aa4f660db04adf65daf5b993b3383fcdb2ef0479ca8866b1336334b5b4"
                            ]
                        });
                        break;
                }
                break;
            case DocumentElement.Service:
                VALUE = {
                    argtypes: [],
                    arguments: [],
                    constructor: "Service"
                };
                let DID_SERVICE = {
                    constructor: "DidService",
                    argtypes: [],
                    arguments: [
                        `${service!.type}`,
                        {
                            constructor: "ServiceEndpoint",
                            argtypes: [],
                            arguments: [
                                {
                                    constructor: `${service!.transferProtocol}`,
                                    argtypes: [],
                                    arguments: []
                                },
                                `${service!.uri}`
                            ]
                        }
                    ]
                };
                switch (action) {
                    case Action.Adding:
                        Object.assign(VALUE, {
                            arguments: [
                                ADD,
                                `${service!.id}`,
                                DID_SERVICE
                            ]
                        });
                        break;
                    case Action.Removing:
                        Object.assign(VALUE, {
                            arguments: [
                                REMOVE,
                                `${service!.id}`,
                                DID_SERVICE
                            ]
                        });
                        break;
                }
                break;
            default:
                throw new CodeError("UnsupportedElement", "That is not a DID-Document supported element");
        }
        return VALUE;
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
    Deactivate = "DidDeactivate",
    Dns = "SetSsiDomain"
}

interface TransitionParams {
    vname: string;
    type: any;
    value: unknown;
}

export interface TransitionValue {
    constructor: string;
    argtypes: any[];
    arguments: any[]
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
