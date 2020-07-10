import PublicKeyPurpose from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/PublicKeyPurpose';
import PublicKeyModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/PublicKeyModel';
import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';
import Jwk from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jwk';
import Jws from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jws';
import * as crypto from 'crypto';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';

/** Defines input data to generate a cryptographic key pair */
export interface OperationKeyPairInput {
    id: string,
    purpose?: PublicKeyPurpose[]
}

/** Generates tyron cryptographic operations */
export class tyronCryptography {

    /** 
     * Asymmetric cryptography to generate the key pair using the KEY_ALGORITHM (secp256k1)
     * @returns [publicKey, privateKey] */
    public static async operationKeyPair(input: OperationKeyPairInput): Promise<[PublicKeyModel, JwkEs256k]> {
        const [publicKey, privateKey] = await Jwk.generateEs256kKeyPair();
        const publicKeyModel: PublicKeyModel = {
            id: input.id,
            type: 'EcdsaSecp256k1VerificationKey2019',
            jwk: publicKey,
            purpose: input.purpose || Object.values(PublicKeyPurpose)
        };
        return [publicKeyModel, privateKey];
    }

    /** Signs the given payload as a ES256K compact JWS */
    public static async signUsingEs256k (payload: any, privateKey: JwkEs256k): Promise<string> {
        const protectedHeader = {
            alg: 'ES256K'
        };
        const compactJws = Jws.signAsCompactJws(payload, privateKey, protectedHeader);
        return compactJws;
    }
    
    /** Generates a random hash */
    public static randomHash(): string {
        const randomBuffer = crypto.randomBytes(32);
        const randomHash = Encoder.encode(Multihash.hash(randomBuffer));
        return randomHash;
    }
}