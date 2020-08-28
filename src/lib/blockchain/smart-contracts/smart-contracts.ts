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
import { NetworkNamespace } from '../../sidetree/tyronZIL-schemes/did-scheme';
import { ContractInit } from '../tyron-contract';
import { ZilliqaInit } from '../zilliqa';
import * as util from 'util';
import * as zlib from 'zlib';

export default class SmartContract {
    /** Encodes the given contract into a Base64URL string to save it into the `TyronInit-smart-contract` */
    public static async encode(): Promise<void> {
        const contractName = readline.question(LogColors.green(`What is the name of the contract that you'd like to encode? - `) + LogColors.lightBlue(`Your answer: `));
        try {
            const CONTRACT_STRING = (fs.readFileSync(`src/lib/blockchain/smart-contracts/${contractName}.scilla`)).toString();
            const COMPRESSED_CONTRACT = await (util.promisify(zlib.gzip))(CONTRACT_STRING) as Buffer;
            console.log(Encoder.encode(COMPRESSED_CONTRACT));
            console.log(COMPRESSED_CONTRACT.byteLength)
        } catch (error) {
            console.error(error)
        }
    }

    /** Fetches the `tyron-smart-contract` by version & decodes it */
    public static async decode(/*network: NetworkNamespace, init: ContractInit, contractVersion: string*/): Promise<string | void> {
        const network = NetworkNamespace.Testnet;
        const init: ContractInit = {
            tyron_init: "0x75d8297b8bd2e35de1c17e19d2c13504de623793",
            contract_owner: "0x059f722D2E94C0A6C710e628D14b18BeEe2a62db",
            client_addr: "0xccDdFAD074cd608B6B43e14eb3440240f5bFf087",
            tyron_stake: 100000000000000,
        };
        const contractVersion = "0.3.1";
        const ZIL_INIT = new ZilliqaInit(network, init);
        const THIS_CONTRACT = await ZIL_INIT.API.blockchain.getSmartContractState(init.tyron_init)
        .then(async STATE => {
            const INIT = {
                tyron_smart_contracts: STATE.result.tyron_smart_contracts,
            };
            const CONTRACTS = Object.entries(INIT.tyron_smart_contracts);            
            let ENCODED_CONTRACT: string;
            CONTRACTS.forEach((value: [string, unknown]) => {
                if (value[0] === contractVersion) {
                    ENCODED_CONTRACT = value[1] as string;
                }
            });
            
            const COMPRESSED_CONTRACT = Encoder.decodeAsBuffer(ENCODED_CONTRACT!);
            const DECOMPRESSED_CONTRACT = await (util.promisify(zlib.unzip))(COMPRESSED_CONTRACT) as Buffer;
            return DECOMPRESSED_CONTRACT.toString();
        })
        .catch(error => console.error(error));
        return THIS_CONTRACT;
    }
}