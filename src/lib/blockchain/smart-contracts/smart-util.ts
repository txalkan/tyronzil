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
import * as API from '@zilliqa-js/zilliqa';
import * as util from 'util';
import * as zlib from 'zlib';
import { TyronInitContracts } from '../tyron-contract';

/** Tools to manage smart contracts */
export default class SmartUtil {
    /** Encodes the given contract into a Base64URL string to save it into the `TyronInit-smart-contract` */
    public static async encode(): Promise<void> {
        const contractName = readline.question(LogColors.green(`What is the name of the contract that you'd like to encode? - `) + LogColors.lightBlue(`Your answer: `));
        try {
            const CONTRACT_STRING = (fs.readFileSync(`src/lib/blockchain/smart-contracts/${contractName}.scilla`)).toString();
            const COMPRESSED_CONTRACT = await (util.promisify(zlib.gzip))(CONTRACT_STRING) as Buffer;
            console.log(Encoder.encode(COMPRESSED_CONTRACT));
            console.log(`The size of the compressed smart-contract is: ${COMPRESSED_CONTRACT.byteLength}`)
        } catch (error) {
            console.error(error)
        }
    }

    /** Fetches the `tyron-smart-contract` by version & decodes it */
    public static async decode(api: API.Zilliqa, tyronInit: TyronInitContracts, contractVersion: string): Promise<string> {
        const TYRON_ADDRESS = tyronInit as string;
        const THIS_CONTRACT = await api.blockchain.getSmartContractState(TYRON_ADDRESS)
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
        .catch(err => { throw err });
        return THIS_CONTRACT;
    }

    /** Gets the value out of a TSM field Option */
    public static async getValue(object: any): Promise<string> {
        const ENTRIES = Object.entries(object);
        let VALUE: string;
        ENTRIES.forEach((value: [string, unknown]) => {
            if (value[0] === "arguments") {
                VALUE = value[1] as string;
            }
        });
        return VALUE![0];
    }

    /** Gets the DID-Status out of a TSM field Option */
    public static async getStatus(object: any): Promise<string> {
        const ENTRIES = Object.entries(object);
        let VALUE: string;
        ENTRIES.forEach((value: [string, unknown]) => {
            if (value[0] === "constructor") {
                VALUE = value[1] as string;
            }
        });
        return VALUE!;
    }
}
