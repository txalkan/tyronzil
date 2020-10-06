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
import { PublicKeyModel, PublicKeyPurpose } from '../sidetree-protocol/models/verification-method-models';

/** Defines input data to generate a cryptographic key pair */
export interface OperationKeyPairInput {
    id: string,
    purpose?: PublicKeyPurpose[]
}

/** Generates cryptographic operations */
export class Cryptography {
  /** Asymmetric cryptography to generate the key pair using the KEY_ALGORITHM (secp256k1)
   * @returns [publicKey, privateKey] */
  public static async operationKeyPair(input: OperationKeyPairInput): Promise<[PublicKeyModel, string]> {
    const PRIVATE_KEY = zcrypto.schnorr.generatePrivateKey();
    const PUBLIC_KEY = zcrypto.getPubKeyFromPrivateKey(PRIVATE_KEY);
    const PUBLIC_KEY_BASE58 = zcrypto.encodeBase58(PUBLIC_KEY);
    const PUBKEY_MODEL: PublicKeyModel = {
      id: input.id,
      type: 'SchnorrSecp256k1VerificationKey2019',
      publicKeyBase58: PUBLIC_KEY_BASE58,
      purpose: input.purpose || Object.values(PublicKeyPurpose)
    };
    return [PUBKEY_MODEL, PRIVATE_KEY];
  }

  /** Generates a secp256k1 key pair
   * @returns [publicKey, privateKey] */
  public static async keyPair(): Promise<[string, string]> {
    const PRIVATE_KEY = zcrypto.schnorr.generatePrivateKey();
    const PUBLIC_KEY = zcrypto.getPubKeyFromPrivateKey(PRIVATE_KEY);
    return [PUBLIC_KEY, PRIVATE_KEY];
  }
}
