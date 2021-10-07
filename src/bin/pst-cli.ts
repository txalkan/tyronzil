/*
SSI Client for Node.js
Tyron Self-Sovereign Identity Protocol
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
import LogColors from './log-colors';
import * as readline from 'readline-sync';
import tyronzilCLI, { admin_zil_secret_key } from './tyronzil-cli';
import SmartUtil from '../lib/smart-util';
import TyronZIL, { DeployedContract } from 'tyron/dist/blockchain/tyronzil';
//import * as zcrypto from '@zilliqa-js/crypto';
import * as zutil from '@zilliqa-js/util';

/** Handle the profit-sharing token (PST) command-line interface */
export default class pstCLI {

    public static async handleDeploy(): Promise<void> {
        await tyronzilCLI.network()
        .then( async set_network => {
            
            console.log(LogColors.yellow(`Fetching $GZIL holders...`));
            //const zil_mainnet = await new tyron.ZilliqaInit.default(tyron.DidScheme.NetworkNamespace.Mainnet);
            //const gzil = zcrypto.toChecksumAddress('0xa845C1034CD077bD8D32be0447239c7E4be6cb21');
            //const gzil_state = await zil_mainnet.API.blockchain.getSmartContractState(gzil);
            const gzil_balances = //gzil_state.result.balances;
            [
                {
                    "key": "0x12345678901234567890123456789012345678cd",
                    "val": "200000000000000"
                }
            ];
            const init = await tyron.TyronZil.default.initialize(
                set_network.network,
                admin_zil_secret_key,
                50000,
                set_network.initTyron
            );
            
            const version = readline.question(LogColors.green(`What version of the pst.tyron smart contract would you like to deploy?`)+` [number] ` + LogColors.lightBlue(`Your answer: `));
            const contract_code = await SmartUtil.decode(init, set_network.initTyron, "pst", version);
            
            console.log(LogColors.yellow(`Deploying...`));
            const deployed_contract = await this.deploy(init, contract_code, gzil_balances);
            const addr = deployed_contract.contract.address!;
            console.log(LogColors.green(`The smart contract's address is: `) + LogColors.brightGreen(addr));
        })
        .catch((err: unknown) => console.error(LogColors.red(err)))            
    }

    public static async deploy(
        tyronzil: TyronZIL,
        contractCode: string,
        balances: any
    ): Promise<DeployedContract> {
        const contract_init = [
            {
                vname: '_scilla_version',
                type: 'Uint32',
                value: '0',
            },
            {
                vname: 'init_admin',
                type: 'ByStr20',
                value: `${tyronzil.admin}`,
            },
            {
                vname: 'init_fund',
                type: 'ByStr20',
                value: `${tyronzil.admin}`,
            },
            {
                vname: 'name',
                type: 'String',
                value: 'profit-sharing-token',
            },
            {
                vname: 'symbol',
                type: 'String',
                value: 'pst',
            },
            {
                vname: 'decimals',
                type: 'Uint32',
                value: '15',
            },
            {
                vname: 'init_supply',
                type: 'Uint128',
                value: '500000000000000000000',
            },
            {
                vname: 'init_factor',
                type: 'Uint128',
                value: '5000000000',
            },
            {
                vname: 'init_balances',
                type: 'Map ByStr20 Uint128',
                value: balances
            }
        ];
        const smart_contract = tyronzil.API.contracts.new(contractCode, contract_init);
        
        tyronzil.API.wallet.addByPrivateKey(tyronzil.adminZilSecretKey);
        
        const deployed_contract = await tyronzil.API.blockchain.getBalance(tyronzil.admin)
        .then( async account => {
            let gas_limit: zutil.Long.Long = new zutil.Long(50000);
            const [deployTx, contract] = await smart_contract.deploy(
                {
                    version: tyronzil.zilVersion,
                    gasPrice: tyronzil.gasPrice,
                    gasLimit: gas_limit,
                    nonce: Number(account.result.nonce)+ 1,
                },
                33,
                1000,
                false,
            );
            const is_deployed = deployTx.isConfirmed();
            if(!is_deployed) {
                throw ("Wrong-Deployment, the contract did not get deployed.")
            }
            
            const deployment_gas = deployTx.getReceipt()!.cumulative_gas;
        
            const deployed_contract: DeployedContract = {
                transaction: deployTx,
                contract: contract,
                gas: deployment_gas
            };
            return deployed_contract;
        })
        .catch((err: any) => { throw err });
        return deployed_contract;
    }
}