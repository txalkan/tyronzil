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
import ZilliqaInit from './zilliqa-init';
import TyronContract, { ContractInit } from './tyron-contract';
import { Transaction } from '@zilliqa-js/account';
import { Contract} from '@zilliqa-js/contract';
import * as Crypto from '@zilliqa-js/crypto';
import * as Util from '@zilliqa-js/util';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../ErrorCode';
import LogColors from '../../bin/log-colors';
import SmartUtil from './smart-contracts/smart-util';

export default class TyronTransaction extends TyronContract {
    private readonly gas_price: Util.BN;
    private readonly gas_limit: Util.Long;

    /** The client's private key */
    private readonly client_privateKey: string;
    /** The client's current nonce */
    private readonly client_nonce: number;
    
    /** The user's private key */
    private readonly user_privateKey: string;
    /** The user's current nonce */
    private readonly user_nonce: number;

    private constructor(
        network: NetworkNamespace,
        init: ContractInit,
        gas_price: Util.BN,
        gas_limit: Util.Long,
        client_key: string,
        client_nonce: number,
        user_key: string,
        user_nonce: number
    ) {
        super(network, init);
        this.gas_price = gas_price;
        this.gas_limit = gas_limit
        this.client_privateKey = client_key;
        this.client_nonce = client_nonce;
        this.user_privateKey = user_key;
        this.user_nonce = user_nonce;            
    }
    
    /** Validates whether the user and client accounts have provided the correct private keys and have enough funds
     * @returns TyronTransaction instance */
    public static async initialize(
        network: NetworkNamespace,
        init: ContractInit,
        clientPrivateKey: string,
        userPrivateKey: string,
        gasLimit: number
    ): Promise<TyronTransaction | void> {
        const ZIL_INIT = new ZilliqaInit(network);
        const transaction_init = await ZIL_INIT.API.blockchain.getMinimumGasPrice()
        .then(min_gas_price => {
            const GAS_PRICE = new Util.BN(min_gas_price.result!);
            const GAS_LIMIT = new Util.Long(gasLimit);
            const GAS = {
                price: GAS_PRICE,
                limit: GAS_LIMIT
            };
            return GAS
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
            throw new SidetreeError(ErrorCode.NotEnoughBalance)
            }
            const PARAMETERS = {
                gas: gas,
                client_nonce: Number(BALANCE_RESULT.nonce)
            };
            return PARAMETERS;
        })
        .then(async parameters => {
            const USER_ADDRESS = Crypto.getAddressFromPrivateKey(userPrivateKey);
            if (USER_ADDRESS !== init.contract_owner) {
                throw new SidetreeError(ErrorCode.WrongKey);
            }
            /** Gets the current balance of the account (in Qa = 10^-12 ZIL as string)
            * & the current nonce of the account (as number) */
            const GET_BALANCE = await ZIL_INIT.API.blockchain.getBalance(USER_ADDRESS);
            const BALANCE_RESULT = GET_BALANCE.result;

            // The account's balance MUST be greater than the cost to initialize the `tyron-smart-contract`, e.g. 100ZIL
            if (Number(BALANCE_RESULT.balance) < 100000000000000) {
            throw new SidetreeError(ErrorCode.NotEnoughBalance)
            }
            const USER_NONCE = Number(BALANCE_RESULT.nonce);

            return new TyronTransaction(
                network,
                init,
                parameters.gas.price,
                parameters.gas.limit,
                clientPrivateKey,
                parameters.client_nonce,
                userPrivateKey,
                USER_NONCE);
        })
        .catch(error => console.error(error));
        return transaction_init;
    }

    /***            ****            ***/
    
    /** Deploys the `tyron-smart-contract` by version
     * & calls the ContractInit transition with the client_addr to set the operation_cost, the foundation_addr & client_commission from the TyronInit contract 
    */
    public static async deploy(init: TyronTransaction, version: string): Promise<DeployedContract | void> {
        const deployed_contract = await SmartUtil.decode(init.API, init.tyron_init, version)
        .then(contract_code => {
            const CODE = contract_code as string;

            const CONTRACT_INIT = [
                {
                  vname: '_scilla_version',
                  type: 'Uint32',
                  value: '0',
                },
                {
                    vname: 'tyron_init',
                    type: 'ByStr20',
                    value: `${init.tyron_init}`,
                },
                {
                  vname: 'contract_owner',
                  type: 'ByStr20',
                  value: `${init.contract_owner}`,
                },
            ];

            const CONTRACT = init.API.contracts.new(CODE, CONTRACT_INIT);
            return CONTRACT;
        })
        .then(async contract => {
            init.API.wallet.addByPrivateKey(init.user_privateKey);
            const [deployTx, tyron_smart_contract] = await contract.deploy(
                {
                version: init.version,
                gasPrice: init.gas_price,
                gasLimit: init.gas_limit,
                nonce: init.user_nonce + 1,
                },
                33,
                1000,
                false,
            );
            console.log(LogColors.yellow(`Deployment Transaction ID: `) + LogColors.brightYellow(`${deployTx.id}`));
            
            console.log(LogColors.yellow(`Your tyron-smart-contract address is: `) + LogColors.brightYellow(`${tyron_smart_contract.address}`));
            
            const DEPLOYED_CONTRACT = {
                transaction: deployTx,
                contract: tyron_smart_contract
            };
            const CUMULATIVE_GAS = (deployTx.getReceipt())!.cumulative_gas;
            console.log(LogColors.yellow(`The total gas consumed by deploying your tyron-smart-contract is: `) + LogColors.brightYellow(`${CUMULATIVE_GAS}`));
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
            const CUMULATIVE_GAS = (CALL.getReceipt())!.cumulative_gas;
            console.log(LogColors.yellow(`The total gas consumed by the ContractInit transition is: `) + LogColors.brightYellow(`${CUMULATIVE_GAS}`));
            return deployed_contract;
        })
        .catch(err => console.error(err));
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
            const TX = await init.API.provider.send('CreateTransaction', signed_tx.txParams);
            const TX_RESULT = TX.result;
            console.log(LogColors.yellow(`The transaction result is: `) + LogColors.brightYellow(`${JSON.stringify(TX_RESULT, null, 2)}`));

            const TRAN_ID = TX_RESULT.TranID;
            
            const TRANSACTION = await signed_tx.confirm(TRAN_ID, 33, 1000)
            console.log(LogColors.yellow(`The ${tag} tyronZIL transaction is: `) + LogColors.brightYellow(`${JSON.stringify(TRANSACTION, null, 2)}`));
            const STATUS = signed_tx.isConfirmed();
            console.log(LogColors.yellow(`The transaction is confirmed: `) + LogColors.brightYellow(`${STATUS}`));

            return TRAN_ID;
        })
        .then(async zilliqa_tranID => {
            const GET_TRANSACTION = await init.API.blockchain.getTransaction(zilliqa_tranID);
            const TX_RECEIPT = GET_TRANSACTION.getReceipt();

            const CUMULATIVE_GAS = TX_RECEIPT!.cumulative_gas;
            console.log(LogColors.yellow(`The total gas consumed in this ${tag} transaction is: `) + LogColors.brightYellow(`${CUMULATIVE_GAS}`));

            console.log(LogColors.brightGreen(`The ${tag} tyronZIL transaction has been successful!`));
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
            vname: 'did',
            type: 'String',
            value: did,
        };
        PARAMS.push(DID);

        const SUFFIX: TransitionParams = {
            vname: 'suffixData',
            type: 'String',
            value: suffixData,
        };
        PARAMS.push(SUFFIX);

        const DELTA: TransitionParams = {
            vname: 'encodedDelta',
            type: 'String',
            value: encodedDelta!,
        };
        PARAMS.push(DELTA);

        const UPDATE_COMMIT: TransitionParams = {
            vname: 'updateCommitment',
            type: 'String',
            value: updateCommitment,
        };
        PARAMS.push(UPDATE_COMMIT);

        const RECOVERY_COMMIT: TransitionParams = {
            vname: 'recoveryCommitment',
            type: 'String',
            value: recoveryCommitment,
        };
        PARAMS.push(RECOVERY_COMMIT);

        return PARAMS;
    }
}

/***            ****            ***/

/** The result of a tyron-smart-contract deployment */
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
    Create = 'DidCreate'
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
