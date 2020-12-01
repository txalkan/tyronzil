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

import * as zcrypto from '@zilliqa-js/crypto';
import LogColors from "../../../../bin/log-colors";
import SmartUtil from "../../../blockchain/smart-contracts/smart-util";
import { InitTyron } from "../../../blockchain/tyronzil";
import ZilliqaInit from '../../../blockchain/zilliqa-init';
import { NetworkNamespace } from '../../tyronZIL-schemes/did-scheme';
import CodeError from '../../util/ErrorCode';

export default class Resolver {
    public static async validateAvatar(avatar: string): Promise<void> {
        const regex = /^[\w\d_]+$/;
        if(!regex.test(avatar) || avatar.length > 15 ) {
            throw new CodeError("DidUsernameInvalid", "The username must be 15 characters or less and contain only letters, numbers and underscores, and no spaces") 
        }
    }
    public static async resolveDns(network: NetworkNamespace, initTyron: InitTyron, domainName: string): Promise<string> {
        const ZIL_INIT = new ZilliqaInit(network);
        const DOT_INDEX = domainName.lastIndexOf(".");
        const SSI_DOMAIN = domainName.substring(DOT_INDEX);
        const AVATAR = domainName.substring(0, DOT_INDEX);
        
        const DIDC_ADDRESS = await this.validateAvatar(AVATAR)
        .then( async() => {
            return await ZIL_INIT.API.blockchain.getSmartContractState(initTyron)
        })
        .then(async STATE => {
            return STATE.result.dns;
        })
        .then(async (dns: any) => {
            return await SmartUtil.getValuefromMap(dns, SSI_DOMAIN);
        })
        .then(async (resourceRecords: any) => {
            return await SmartUtil.getValuefromMap(resourceRecords, AVATAR);
        })
        .catch((err: any) => { throw err });

        console.log(LogColors.brightGreen(`${domainName}'s contract address is: ${DIDC_ADDRESS}`));
        return zcrypto.toBech32Address(DIDC_ADDRESS)
    }
}