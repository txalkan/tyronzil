import {
    tyronCryptography,
    OperationKeyPairInput
 } from './tyronKeys';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';

import UpdateOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/UpdateOperation';
import PublicKeyModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/PublicKeyModel';
import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';

/** Defines input data for a Sidetree-based `DID-update` tyron-operation*/
interface UpdateOperationInput {
    didSuffix: string
}

/** Defines input data for a Sidetree-based `DID-update` tyron-operation REQUEST*/
interface UpdateOperationRequestInput {
    didSuffix: string,
    newSigningKey: PublicKeyModel,
    newSigningPrivateKey: JwkEs256k,
    nextUpdateCommitmentHash: string,
    patches: any
}

/** Defines output data of a Sidetree-based `DID-update` tyron-operation REQUEST*/
interface UpdateOperationRequestOutput {
    request: UpdateOperationRequestInput,
    buffer: Buffer,
    updateOperation: UpdateOperation
}

/** Generates a Sidetree-based `DID-update` tyron-operation */
export default class tyronUpdateOperation {

    /** Generates a Sidetree-based `DID-update` tyron-operation REQUEST  */
    public static async updateOperationRequest(input: UpdateOperationRequestInput): Promise<UpdateOperationRequestOutput> {
        /** The Update Operation Delta Object */
        const delta: DeltaModel = {
            patches: input.patches,
            updateCommitment: input.nextUpdateCommitmentHash,
        };
        const deltaBuffer = Buffer.from(JSON.stringify(delta));
        const delta_hash = Encoder.encode(Multihash.hash(deltaBuffer));
        const deltaEncodedString = Encoder.encode(deltaBuffer);
    }

    /** Generates a Sidetree-based `DID-update` tyron-operation */
    public static async updateOperation(input: UpdateOperationInput): Promise<UpdateOperationRequestOutput> {
        const next_update_key_input: OperationKeyPairInput = {
            id: 'nextUpdateKey'
        };
        const [next_update_key, next_update_private_key] = await tyronCryptography.operationKeyPair(next_update_key_input);
        const next_update_commitment = Multihash.canonicalizeThenHashThenEncode(next_update_key.jwk);

        const new_signing_key_input: OperationKeyPairInput = {
            id: 'newSigningKey'
        };
        const [new_signing_key, new_signing_private_key] = await tyronCryptography.operationKeyPair(new_signing_key_input);

        const patches = [
            {
                action: "add-new-public-key",
                public_keys: [
                    new_signing_key
                ]
            }
        ];

        const updateOperationRequestInput: UpdateOperationRequestInput = {
            didSuffix: input.didSuffix,
            newSigningKey: new_signing_key,
            newSigningPrivateKey: new_signing_private_key,
            nextUpdateCommitmentHash: next_update_commitment,
            patches: patches
        };

        const operationRequest = await tyronUpdateOperation.updateOperationRequest(updateOperationRequestInput);
    }
}
