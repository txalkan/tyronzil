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
import { ZilliqaInit } from './zilliqa';
import TyronContract, { ContractInit } from './tyron-contract';

export default class TyronState extends TyronContract {
    public readonly decentralized_identifier: string;
    public readonly suffix_data: string;
    public readonly signed_data: string;
    public readonly delta: string;
    public readonly update_commitment: string;
    public readonly recovery_commitment: string;
    public readonly previous_stamp: string;
    
    private constructor(
        init: ContractInit,
        state: StateModel
    ) {
        super(init);
        this.decentralized_identifier = state.decentralized_identifier;
        this.suffix_data = state.suffix_data;
        this.signed_data = state.signed_data;
        this.delta = state.delta;
        this.update_commitment = state.update_commitment;
        this.recovery_commitment = state.recovery_commitment;
        this.previous_stamp = state.previous_stamp;
    }

    /** Fetches the current state from the blockchain 
     * @params addr: the Zilliqa address of the user's smart-contract
    */
    public static async fetch(network: NetworkNamespace, init: ContractInit, tyronAddr: string): Promise<void | TyronState> {
        
        const ZIL_INIT = new ZilliqaInit(network, init);
        const ZIL_API = ZIL_INIT.API;
        await ZIL_API.blockchain.getSmartContractState(tyronAddr)
        .then(async SMART_CONTRACT_STATE => {
            const STATE: StateModel = {
                decentralized_identifier: SMART_CONTRACT_STATE.result.decentralized_identifier,
                suffix_data: SMART_CONTRACT_STATE.result.suffix_data,
                signed_data: SMART_CONTRACT_STATE.result.signed_data,
                delta: SMART_CONTRACT_STATE.result.delta,
                update_commitment: SMART_CONTRACT_STATE.result.update_commitment,
                recovery_commitment: SMART_CONTRACT_STATE.result.recovery_commitment,
                previous_stamp: SMART_CONTRACT_STATE.result.previous_stamp,
                timestamp: {
                    status: SMART_CONTRACT_STATE.result.status,
                    ledger_time: SMART_CONTRACT_STATE.result.ledger_time,
                    sidetree_transaction_number: SMART_CONTRACT_STATE.result.sidetree_transaction_number,
                    zilliqa_tranID: SMART_CONTRACT_STATE.result.zilliqa_tranID
                }
            };
            return new TyronState(init, STATE);
        })
        .catch(error => console.error(error));
    }
}

/***            ** interfaces **            ***/

/** The tyron state model */
export interface StateModel {
    decentralized_identifier: string;
    suffix_data: string;
    signed_data: string;
    delta: string;
    update_commitment: string;
    recovery_commitment: string;
    previous_stamp: string;         // hash of the previous timestamp
    timestamp: TimestampModel;
}

interface TimestampModel {
    //did: string; to-do add this in another way. like a commitment
    status: string;
    ledger_time: number;
    sidetree_transaction_number: number;
    zilliqa_tranID: number;
}
