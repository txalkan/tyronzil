import {
    tyronCryptography,
    OperationKeyPairInput
 } from './tyronKeys';
import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';
import Jwk from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jwk';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';

import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import UpdateOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/UpdateOperation';
import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';

/** Defines input data for a Sidetree-based `DID-update` tyron-operation*/
interface UpdateOperationInput {
    didUniqueSuffix: string;
}

/** Defines input data for a Sidetree-based `DID-update` tyron-operation REQUEST*/
interface UpdateOperationRequestInput {
    didUniqueSuffix: string;
    nextUpdateKey: JwkEs256k;
    nextupdatePrivateKey: JwkEs256k;
    nextUpdateCommitment: string;
    patches: any;
}


/** Defines model for the JWS payload object required by the Update Operation Signed Data Object */
interface jwsPayload {
    /** The JCS canonicalized IETF RFC 7517 compliant JWK representation matching the previous updateCommitment value */
    updateKey: JwkEs256k;
    
    /** Encoded representation of the Update Operation Delta Object hash */
    deltaHash: string;
}

/** Defines output data of a Sidetree-based `DID-update` tyron-operation REQUEST*/
interface UpdateOperationRequestOutput {
    type: OperationType.Update;
    didUniqueSuffix: string;
    encodedDelta: string;
    signedData: string;
}

/** Defines output data of a Sidetree-based `DID-update` tyron-operation */
interface UpdateOperationOutput {
    operationRequest: UpdateOperationRequestOutput;
    buffer: Buffer;
    updateOperation: UpdateOperation;
}

/** Generates a Sidetree-based `DID-update` tyron-operation */
export default class tyronUpdateOperation {

    /** Generates a Sidetree-based `DID-update` tyron-operation */
    public static async updateOperation(input: UpdateOperationInput): Promise<UpdateOperationOutput> {
        
        /** To make the next updateCommitment */
        /*const next_update_key_input: OperationKeyPairInput = {
            id: 'nextUpdateKey'
        };
        const [update_key, update_private_key] = await Jwk.generateEs256kKeyPair();
        // Next DID update key-pair:
        const [next_update_key, next_update_private_key] = await tyronCryptography.operationKeyPair(next_update_key_input);*/
        
        // Creates a new key-pair for the next updateCommitment:
        const [next_update_key, next_update_private_key] = await Jwk.generateEs256kKeyPair();
        
        /** Takes the next_update_key and makes the new/next updateCommitment value */
        const next_update_commitment = Multihash.canonicalizeThenHashThenEncode(next_update_key);

        /** To create a new main DID key-pair to update the DID document */
        const new_signing_key_input: OperationKeyPairInput = {
            id: 'newSigningKey'
        };
        // Creates a new DID main key-pair:
        const [new_signing_key, new_signing_private_key] = await tyronCryptography.operationKeyPair(new_signing_key_input);

        const patch = [
            {
                action: "add-new-public-key",
                public_keys: [
                    new_signing_key
                ]
            }
        ];

        /** Input data for the update operation-request */
        const operation_request_input: UpdateOperationRequestInput = {
            didUniqueSuffix: input.didUniqueSuffix,
            nextUpdateKey: next_update_key,
            nextupdatePrivateKey: next_update_private_key,
            nextUpdateCommitment: next_update_commitment,
            patches: patch
        };
        /** DID data from the update operation-request */
        const operation_request = await tyronUpdateOperation.updateOperationRequest(operation_request_input);
            const operation_buffer = Buffer.from(JSON.stringify(operation_request));
        
        /** DID data from the Sidetree update operation 
         * @returns UpdateOperation = {operationBuffer, didUniqueSuffix, signedData, signedDataModel, encodedDelta, delta}
        */
        const update_operation = await UpdateOperation.parse(operation_buffer);
        
        /** Data from a Sidetree-based `DID-update` tyron-operation */
        const operation_output: UpdateOperationOutput = {
            operationRequest: operation_request,
            buffer: operation_buffer,
            updateOperation: update_operation
        };
        return operation_output;
    }

    /** Generates a Sidetree-based `DID-update` tyron-operation REQUEST  */
    public static async updateOperationRequest(input: UpdateOperationRequestInput): Promise<UpdateOperationRequestOutput> {
        
        /** The Update Operation Delta Object */
        const delta: DeltaModel = {
            patches: input.patches,
            updateCommitment: input.nextUpdateCommitment,
        };
        const delta_buffer = Buffer.from(JSON.stringify(delta));
            const encoded_delta = Encoder.encode(delta_buffer);
            const delta_hash = Encoder.encode(Multihash.hash(delta_buffer));
            
        /** To create the Update Operation Signed Data Object */
        const payload: jwsPayload = {
            updateKey: input.updateKey,
            deltaHash: delta_hash
        };
        const signed_data = await tyronCryptography.signUsingEs256k(payload, input.updatePrivateKey);
        
        /** DID data to update the Sidetree-based `DID-update` tyron-operation to-do document? */
        const operation_request: UpdateOperationRequestOutput = {
            type: OperationType.Update,
            didUniqueSuffix: input.didUniqueSuffix,
            encodedDelta: encoded_delta,
            signedData: signed_data
        };
        return operation_request;
    }
}
