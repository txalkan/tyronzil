/*
    tyronzil: Tyron Self-Sovereign Identity client for Node.js
    Copyright (C) 2021 Tyron Pungtas Open Association

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
import TyronZIL, { TransitionValue } from '../../blockchain/tyronzil';
import { Action, DocumentElement } from '../protocols/models/document-model';
import { PrivateKeyModel, PublicKeyModel, PublicKeyPurpose } from '../protocols/models/verification-method-models';
import ErrorCode from './ErrorCode';

/** Defines input data to generate a cryptographic key pair */
export interface OperationKeyPairInput {
  id: string        //the key purpose      
}

/** Generates cryptographic operations */
export class Cryptography {
  /** Asymmetric cryptography to generate the key pair using the KEY_ALGORITHM (secp256k1)
   * @returns [publicKey, privateKey] */
  public static async operationKeyPair(input: OperationKeyPairInput): Promise<[TransitionValue, PrivateKeyModel]> {
    const PRIVATE_KEY = zcrypto.schnorr.generatePrivateKey();
    const PUBLIC_KEY = "0x"+ zcrypto.getPubKeyFromPrivateKey(PRIVATE_KEY);
    const VERIFICATION_METHOD: PublicKeyModel = {
      id: input.id,
      key: PUBLIC_KEY
    };
    const DOC_ELEMENT = await TyronZIL.documentElement(
      DocumentElement.VerificationMethod,
      Action.Adding,
      VERIFICATION_METHOD
    );
    const PRIVATE_KEY_MODEL: PrivateKeyModel = {
      id: input.id,
      key: PRIVATE_KEY
    };

    return [DOC_ELEMENT, PRIVATE_KEY_MODEL];
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
