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

import { PublicKeyModel, PublicKeyPurpose } from './models/verification-method-models';
import Jws from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jws';
import { UpdateSignedDataModel, RecoverSignedDataModel, DeactivateSignedDataModel } from './models/signed-data-models';
import { JWK } from 'jose';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../ErrorCode';

/** Defines input data to generate a cryptographic key pair */
export interface OperationKeyPairInput {
    id: string,
    purpose?: PublicKeyPurpose[]
}

/** Defines the model of a secp256k1 key as JWK */
export interface JwkEs256k {
    kty: string;
    crv: string;
    x: string;
    y: string;
    kid?: string;
    d?: string;       // For the privateKey ONLY
}

export interface PrivateKeys {
  privateKeys?: string[],    // encoded strings
  updatePrivateKey?: string,
  recoveryPrivateKey?: string,
}

/** Generates cryptographic operations */
export class Cryptography {
  
  /** 
  * Asymmetric cryptography to generate the key pair using the KEY_ALGORITHM (secp256k1)
   * @returns [publicKey, privateKey] */
  public static async operationKeyPair(input: OperationKeyPairInput): Promise<[PublicKeyModel, JwkEs256k]> {
    const [publicKey, privateKey] = await this.jwkPair();
    const publicKeyModel: PublicKeyModel = {
      id: input.id,
      type: 'EcdsaSecp256k1VerificationKey2019',
      publicKeyJwk: publicKey,
      purpose: input.purpose || Object.values(PublicKeyPurpose)
    };
    return [publicKeyModel, privateKey];
  }

  /** Signs the given payload as a es256k compact JWS */
  public static async signUsingEs256k (payload: UpdateSignedDataModel | RecoverSignedDataModel | DeactivateSignedDataModel, privateKey: JwkEs256k): Promise<string> {
    const protectedHeader = {
      alg: 'ES256K'
    };
    const compactJws = Jws.signAsCompactJws(payload, privateKey, protectedHeader);
    return compactJws;
  }

  /**
   * * Generates a secp256k1 key pair
   * @returns [publicKey, privateKey]
   * */
  public static async jwkPair(): Promise<[JwkEs256k, JwkEs256k]> {
    const KEY_PAIR = await JWK.generate('EC', 'secp256k1');
    const JWK_ECKey = KEY_PAIR.toJWK();

    const PUBLIC_KEY = {
      kty: JWK_ECKey.kty,
      crv: JWK_ECKey.crv,
      x: JWK_ECKey.x,
      y: JWK_ECKey.y,
      kid: JWK_ECKey.kid
    };

    const PRIVATE_KEY = Object.assign({ d: KEY_PAIR.d }, PUBLIC_KEY);
    return [PUBLIC_KEY, PRIVATE_KEY];
  }
  
  /**
   * * Validates if the given key is a secp256k1 public key in JWK format allowed by Sidetree
   * @throws SidetreeError
   * */
  // eslint-disable-next-line
  public static validateKey(jwk: any) {
    if (jwk === undefined) {
      throw new SidetreeError(ErrorCode.JwkEs256kUndefined);
    }

    const allowedProperties = new Set(['kty', 'crv', 'x', 'y', 'kid']);
    for (const property in jwk) {
      if (!allowedProperties.has(property)) {
        throw new SidetreeError(ErrorCode.JwkEs256kHasUnknownProperty);
      }
    }

    if (jwk.kty !== 'EC') {
      throw new SidetreeError(ErrorCode.JwkEs256kMissingOrInvalidKty);
    }

    if (jwk.crv !== 'secp256k1') {
      throw new SidetreeError(ErrorCode.JwkEs256kMissingOrInvalidCrv);
    }

    if (typeof jwk.x !== 'string') {
      throw new SidetreeError(ErrorCode.JwkEs256kMissingOrInvalidTypeX);
    }

    if (typeof jwk.y !== 'string') {
      throw new SidetreeError(ErrorCode.JwkEs256kMissingOrInvalidTypeY);
    }

    if (typeof jwk.kid !== 'string') {
      throw new SidetreeError(ErrorCode.JwkEs256kMissingOrInvalidTypeKid);
      }
  }

  /** Gets the public key corresponding to the given private es256k key */
  public static getPublicKey(privateKey: JwkEs256k): JwkEs256k {
    const KEY = Object.assign({}, privateKey);

    // Deletes the private key portion
    delete KEY.d;
    return KEY;
  }

  /** Gets the corresponding public key with NO KID */
  public static getPublicKeyNoKid(privateKey: JwkEs256k): JwkEs256k {
    const KEY = Object.assign({}, privateKey);
  
    // Deletes the private key portion
    delete KEY.d;
    delete KEY.kid;
    return KEY;
  }
  
  public static removeKid(key: JwkEs256k): JwkEs256k {
    const KEY = Object.assign({}, key);
  
    delete KEY.kid;
    return KEY;
  }
}
