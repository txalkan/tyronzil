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
import { PrivateKeyModel, PublicKeyModel, PublicKeyPurpose } from '../sidetree-protocol/models/verification-method-models';
import ErrorCode from './ErrorCode';

/** Defines input data to generate a cryptographic key pair */
export interface OperationKeyPairInput {
    id: string
}

/** Generates cryptographic operations */
export class Cryptography {
  /** Asymmetric cryptography to generate the key pair using the KEY_ALGORITHM (secp256k1)
   * @returns [publicKey, privateKey] */
  public static async operationKeyPair(input: OperationKeyPairInput): Promise<[PublicKeyModel, PrivateKeyModel]> {
    const PRIVATE_KEY = zcrypto.schnorr.generatePrivateKey();
    const PUBLIC_KEY = zcrypto.getPubKeyFromPrivateKey(PRIVATE_KEY);
    const PUBKEY_MODEL: PublicKeyModel = {
      id: input.id,
      key: PUBLIC_KEY
    };
    const PRIVATE_KEY_MODEL: PrivateKeyModel = {
      id: input.id,
      key: PRIVATE_KEY
    };

    return [PUBKEY_MODEL, PRIVATE_KEY_MODEL];
  }

  /** Generates a secp256k1 key pair
   * @returns [publicKey, privateKey] */
  public static async keyPair(id: string): Promise<[string, PrivateKeyModel]> {
    const PRIVATE_KEY = zcrypto.schnorr.generatePrivateKey();
    const PUBLIC_KEY = zcrypto.getPubKeyFromPrivateKey(PRIVATE_KEY);
    const PRIVATE_KEY_MODEL = {
      id: id,
      key: PRIVATE_KEY
    }
    return [PUBLIC_KEY, PRIVATE_KEY_MODEL];
  }

  public static async processKeys(input: PublicKeyModel[]|PrivateKeyModel[]): Promise<TyronPublicKeys|TyronPrivateKeys> {
    const KEY_ID_SET: Set<string> = new Set();
    let KEYS = {};
    let NEW_KEY;
    for(const key of input) {
      // IDs must be unique
      if(!KEY_ID_SET.has(key.id)) {
        KEY_ID_SET.add(key.id);
      } else {
        throw new ErrorCode("KeyDuplicated", "The key ID must be unique");
      }
      switch (key.id) {
        case PublicKeyPurpose.General:
            NEW_KEY = {
              general: "0x"+ key.key
            };
            Object.assign(KEYS, NEW_KEY)             
            break;
        case PublicKeyPurpose.Auth:
            NEW_KEY = {
              authentication: "0x"+ key.key
            };
            Object.assign(KEYS, NEW_KEY)  
            break;
        case PublicKeyPurpose.Assertion:
            NEW_KEY = {
              assertion: "0x"+ key.key
            };
            Object.assign(KEYS, NEW_KEY);                
            break;
        case PublicKeyPurpose.Agreement:
            NEW_KEY = {
              agreement: "0x"+ key.key
            };
            Object.assign(KEYS, NEW_KEY);
            break;
        case PublicKeyPurpose.Invocation:
            NEW_KEY = {
              invocation: "0x"+ key.key
            };
            Object.assign(KEYS, NEW_KEY);
            break;
        case PublicKeyPurpose.Delegation:
            NEW_KEY = {
              delegation: "0x"+ key.key
            };
            Object.assign(KEYS, NEW_KEY);
            break;
        case PublicKeyPurpose.XSGD:
            NEW_KEY = {
              xsgd: "0x"+ key.key
            };
            Object.assign(KEYS, NEW_KEY);
            break;
        case "update":
            NEW_KEY = {
              did_update: key.key
            };
            Object.assign(KEYS, NEW_KEY);
            break;  
        case "recovery":
            NEW_KEY = {
              did_recovery: key.key
            };
            Object.assign(KEYS, NEW_KEY);
            break;               
        default:
            throw new ErrorCode("InvalidID", `The client detected an invalid key ID`);
      }
    }
    return KEYS;      
  }
}

export interface TyronPublicKeys {
  general?: string;
  authentication?: string;
  assertion?: string;
  agreement?: string;
  invocation?: string;
  delegation?: string;
  xsgd?: string;
}

export interface TyronPrivateKeys extends TyronPublicKeys {
  did_update?: string;
  did_recovery?: string;
}
