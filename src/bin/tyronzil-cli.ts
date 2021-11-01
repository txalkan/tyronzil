/*
SSI Protocol's client for Node.js
Self-Sovereign Identity Protocol.
Copyright (C) Tyron Pungtas and its affiliates.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.*/

import * as tyron from 'tyron';
import * as zcrypto from '@zilliqa-js/crypto';
import * as fs from 'fs';
import LogColors from './log-colors';
import * as readline from 'readline-sync';

/** Address of the init.tyron smart contract
 * @TODO: configure globally, environment variable?
 */
export enum InitTyron {
    Testnet = "0xc85Bc1768CA028039Ceb733b881586D6293A1d4F",
    Mainnet = "",
    Isolated = ""
}

export const controller_secret_key = '8cefad33c6b2eafe6456e80cd69fda3fcd23b5c4a6719275340f340a9259c26a';

/** Handle the tyronzil command-line interface */
export default class tyronzilCLI {

    /** Get network choice from the user */
    public static async network(): Promise<{ network: tyron.DidScheme.NetworkNamespace, initTyron: InitTyron }> {
        const choice = readline.question(LogColors.green(`On which Zilliqa network would you like to operate, mainnet(m), testnet(t) or isolated server(i)?`) + ` [m/t/i] - Defaults to testnet. ` + LogColors.lightBlue(`Your answer: `));
        let network;
        let init_tyron;
        switch(choice.toLowerCase()) {
            case 'm':
                network = tyron.DidScheme.NetworkNamespace.Mainnet;
                init_tyron = InitTyron.Mainnet;
                break;
            case 'i':
                network = tyron.DidScheme.NetworkNamespace.Isolated;
                init_tyron = InitTyron.Isolated;
                break;
            default:
                // Defaults to testnet
                network = tyron.DidScheme.NetworkNamespace.Testnet;
                init_tyron = InitTyron.Testnet;
                break;
        }
        return {
            network: network,
            initTyron: init_tyron
        }
    }

    /** Saves the `DID Document` in local storage */
    public static async write(did: string, input: tyron.DidDocument.default|tyron.DidDocument.ResolutionResult): Promise<void> {
        try {
            const PRINT_STATE = JSON.stringify(input, null, 2);
            let FILE_NAME;
            if(input instanceof tyron.DidDocument.default) {
                FILE_NAME = `DID_DOCUMENT_${did}.json`;        
            } else {
                FILE_NAME = `DID_RESOLVED_${did}.json`;
            }
            fs.writeFileSync(FILE_NAME, PRINT_STATE);
            console.info(LogColors.yellow(`DID resolved as: ${LogColors.brightYellow(FILE_NAME)}`));
        } catch (error) {
            throw new tyron.ErrorCode.default("CodeCouldNotSave", "The DID file did not get saved");            
        }
    }

    public static async fetchAddr(set_network: { network: tyron.DidScheme.NetworkNamespace, initTyron: InitTyron }): Promise<string> {
        const choice = readline.question(LogColors.green(`Would you like to access your SSI wallet by NFT username(1) or with its address(2?`) + ` [1/2] - Defaults to NFT Username. ` + LogColors.lightBlue(`Your answer: `));
        switch( choice ){  
            case '2':
                return zcrypto.toChecksumAddress(choice)
            default:
                const userDomain = readline.question(LogColors.green(`What is NFT Username?`) + ` [e.g. tralcan.did] ` + LogColors.lightBlue(`Your answer: `));
                const resolve = userDomain.split(".");
                const addr = await tyron.Resolver.default.resolveDns(set_network.network, set_network.initTyron, resolve[0], resolve[1]);
                return addr
        }        
    }

    /** Handle the deployment of DIDxWallets, NFT Coops and init.tyron smart contracts */
    public static async handleDeploy(): Promise<void> {
        await this.network()
        .then( async set_network => {
            const init = await tyron.TyronZil.default.initialize(
                set_network.network,
                controller_secret_key,
                50000,
                set_network.initTyron
            );
            console.log("Address paying for ZIL gas:", init.controller)
            const tyron_ = readline.question(LogColors.green(`What tyron smart contract would you like to deploy?`)+` [did, xwallet, init, etc.] ` + LogColors.lightBlue(`Your answer: `));
            const contract_code = fs.readFileSync(`src/lib/smart-contracts/${tyron_}.scilla`).toString();
            const contract_init = [
                {
                    vname: '_scilla_version',
                    type: 'Uint32',
                    value: '0',
                },
            ];
            switch ( tyron_ ) {
                case 'controller':
                    contract_init.push(
                        {
                            vname: 'init_controller',
                            type: 'ByStr20',
                            value: `${init.controller}`,
                        }
                    )
                    break;
                case 'init':
                    contract_init.push(
                        {
                            vname: 'init_controller',
                            type: 'ByStr20',
                            value: '0x23E38E219295302Dd3abC69b108E94dc5129286b',
                        }
                    )
                    break;
                case 'initi':
                    contract_init.push(
                        {
                            vname: 'init_controller',
                            type: 'ByStr20',
                            value: `${init.controller}`,
                        },
                        {
                            vname: 'init',
                            type: 'ByStr20',
                            value: `${InitTyron.Testnet}`,
                        }
                    )
                    break;
                case 'token':
                    contract_init.push(
                        {
                            vname: 'init_controller',
                            type: 'ByStr20',
                            value: '0x23E38E219295302Dd3abC69b108E94dc5129286b',
                        },
                        {
                            vname: 'fund',
                            type: 'ByStr20',
                            value: `${init.controller}`,
                        },
                        {
                            vname: 'name',
                            type: 'String',
                            value: 'Tyron Self-Sovereign Identity Protocol/ Fungible, utility token',
                        },
                        {
                            vname: 'symbol',
                            type: 'String',
                            value: 'TYRON',
                        },
                        {
                            vname: 'decimals',
                            type: 'Uint32',
                            value: '12',
                        },
                        {
                            vname: 'total_supply',
                            type: 'Uint128',
                            value: '10000000000000000000',
                        }
                    )
                    break;
                case 'tokeni':
                    contract_init.push(
                        {
                            vname: 'init_controller',
                            type: 'ByStr20',
                            value: `${init.controller}`,
                        },
                        {
                            vname: 'proxy',
                            type: 'ByStr20',
                            value: `0xFd86B2E2F20d396c1cc1d41a16c72753D5B41279`,
                        },
                    )
                    break;
                case 'did':
                    contract_init.push(
                        {
                            vname: 'init_controller',
                            type: 'ByStr20',
                            value: `${init.controller}`,
                        },
                    )
                    break;
                case 'xwallet':
                    contract_init.push(
                        {
                            vname: 'init_controller',
                            type: 'ByStr20',
                            value: `${init.controller}`,
                        },
                        {
                            vname: 'init',
                            type: 'ByStr20',
                            value: `${init.init_tyron}`,
                        }
                    )
                    break;
            }

            // Deploy smart contract
            console.log(LogColors.yellow(`Deploying...`));
            const deployed_contract = await tyron.TyronZil.default.deploy(contract_init, init, contract_code);
            const addr = deployed_contract.contract.address!;
            console.log(LogColors.green(`The smart contract's address is: `) + LogColors.brightGreen(addr));
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }
}
