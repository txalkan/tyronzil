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

import * as readline from 'readline-sync';
import LogColors from '../../../bin/log-colors';
import * as fs from 'fs';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import Compressor from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Compressor';
import { NetworkNamespace } from '../../sidetree/tyronZIL-schemes/did-scheme';
import { ContractInit } from '../tyron-contract';

export default class SmartContract {
    /** Encodes the contract into a Base64URL string */
    public static async encode(): Promise<void> {
        const contractName = readline.question(LogColors.green(`What is the name of the contract that you'd like to encode? - `) + LogColors.lightBlue(`Your answer: `));
        try {
            const CONTRACT_STRING = (fs.readFileSync(`src/lib/blockchain/smart-contracts/${contractName}.scilla`)).toString();
            const CONTRACT_BUFFER = Buffer.from(CONTRACT_STRING);
            const COMPRESSED_CONTRACT = await Compressor.compress(CONTRACT_BUFFER);
            const ENCODED_CONTRACT = Encoder.encode(COMPRESSED_CONTRACT);
            console.log(ENCODED_CONTRACT);

        } catch (error) {
            console.error(error)
        }
    }

    public static async fetch(network: NetworkNamespace, init: ContractInit, tyron_addr: string): Promise<void | TyronState> {
        
        const ZIL_INIT = new ZilliqaInit(network, init, tyron_addr);
        const ZIL_API = ZIL_INIT.API;
        const tyron_state = await ZIL_API.blockchain.getSmartContractState(tyron_addr)
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
            return new TyronState(init, tyron_addr, STATE);
        })
        .catch(error => console.error(error));
        return tyron_state;
    }

}