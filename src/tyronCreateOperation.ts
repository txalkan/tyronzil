import {
    tyronCryptography,
    OperationKeyPairInput
 } from './tyronKeys';
import PublicKeyModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/PublicKeyModel';
import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';
import Jwk from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jwk';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';

import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import CreateOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/CreateOperation';

import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
//import RecoverOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/RecoverOperation';
import DocumentModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DocumentModel';
import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';

/** Defines output data of a Sidetree-based `DID-create` tyron-operation */
interface CreateOperationOutput {
    signingKey: PublicKeyModel;
    signingPrivateKey: JwkEs256k;
    updateRevealValueEncoded: string;
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
    recoveryKey: JwkEs256k;
    recoveryPrivateKey: JwkEs256k;
    operationRequest: CreateOperationRequestOutput;
    createOperation: CreateOperation;
}

/** Defines input data for a Sidetree-based `DID-create` tyron-operation REQUEST*/
interface CreateOperationRequestInput {
    mainPublicKeys: PublicKeyModel[];
    serviceEndpoints?: ServiceEndpointModel[];
    updateKey: JwkEs256k;
    recoveryKey: JwkEs256k;
}

/** Defines output data of a Sidetree-based `DID-create` tyron-operation REQUEST*/
interface CreateOperationRequestOutput {
    type: OperationType.Create;
    suffixData: string;
    deltaEncoded: string;
}

/** Defines input data to anchor a Sidetree-based `DID-create` tyron-operation */
interface AnchoredCreateOperationInput {
    transactionNumber: number;
    ledgerTime: number;
    operationIndex: number;
}

/** Defines model for the anchored data of a `DID-create` tyron-operation */
interface AnchoredOperationModel {
    type: OperationType;
    didUniqueSuffix: string;
    operationBuffer: Buffer;
    transactionNumber: number;
    ledgerTime: number;
    operationIndex: number;
}

/** Defines output data of an anchored `DID-create` tyron-operation */
interface AnchoredCreateOperationOutput {
    createOperation: CreateOperation;
    operationRequest: CreateOperationRequestOutput;
    anchoredOperationModel: AnchoredOperationModel;
    recoveryKey: JwkEs256k;
    recoveryPrivateKey: JwkEs256k;
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
    signingKey: PublicKeyModel;
    signingPrivateKey: JwkEs256k;
    nextUpdateRevealValueEncodedString: string;
}

/** Generates a Sidetree-based `DID-create` tyron-operation */
export default class tyronCreateOperation {

    /**
     * Generates an array of service endpoints with the specified ids
     * @param ids array of service-endpoint ids
     */
    public static serviceEndpoints(ids: string[]): ServiceEndpointModel[] {
        const serviceEndpoints = []; 
        for (const id of ids) {
            serviceEndpoints.push(
                {
                    'id': id,
                    'type': 'someType',
                    'endpoint': 'https://www.url.com'
                }
            );
        }
        return serviceEndpoints;
    }

    /** Generates a Sidetree-based `DID-create` tyron-operation */
    public static async createOperation(): Promise<CreateOperationOutput> {
        
        /** To create the DID main public key */
        const signing_key_input: OperationKeyPairInput = {
            id: 'signingKey',
        };
        // Creates DID main key-pair:
        const [signing_key, signing_private_key] = await tyronCryptography.operationKeyPair(signing_key_input);
        
        // to-do define
        const update_reveal_value_encoded = Multihash.canonicalizeThenHashThenEncode(signing_key.jwk);
        
        // Creates service endpoints:
        const service_endpoints = tyronCreateOperation.serviceEndpoints(['serviceEndpointId001', 'serviceEndpointId002']);

        // Creates key-pair for the updateCommitment:
        const [update_key, update_private_key] = await Jwk.generateEs256kKeyPair();
        
        // Creates key-pair for the recoveryCommitment:
        const [recovery_key, recovery_private_key] = await Jwk.generateEs256kKeyPair();
        
        /** Input data for the operation-request */
        const operation_request_input: CreateOperationRequestInput = {
            mainPublicKeys: [signing_key],
            serviceEndpoints: service_endpoints,
            updateKey: update_key,
            recoveryKey: recovery_key
        };
        /** DID data from the create operation-request */
        const operation_request = await tyronCreateOperation.createOperationRequest(operation_request_input);
            const operation_buffer = Buffer.from(JSON.stringify(operation_request));
        
        /** DID data from the Sidetree create operation */
        const create_operation = await CreateOperation.parse(operation_buffer);
        
        /** Data from a new Sidetree-based `DID-create` tyron-operation */
        const operation_output: CreateOperationOutput = {
            signingKey: signing_key,
            signingPrivateKey: signing_private_key,
            updateRevealValueEncoded: update_reveal_value_encoded,
            updateKey: update_key,
            updatePrivateKey: update_private_key,
            recoveryKey: recovery_key,
            recoveryPrivateKey: recovery_private_key,
            operationRequest: operation_request,
            createOperation: create_operation
        };
        return operation_output;

    }

    /** Generates a Sidetree-based `DID-create` tyron-operation REQUEST  */
    public static async createOperationRequest(input: CreateOperationRequestInput): Promise<CreateOperationRequestOutput> {
        
        // to-do define
        const document: DocumentModel = {
            public_keys: input.mainPublicKeys,
            service_endpoints: input.serviceEndpoints
        };
        const patch = [{
            action: 'replace',
            document
        }];
        
        /** Takes the input.updateKey and makes the updateCommitment value */
        const update_commitment = Multihash.canonicalizeThenHashThenEncode(input.updateKey);

        /** The Create Operation Delta Object */
        const delta: DeltaModel = {
            patches: patch,
            updateCommitment: update_commitment,
        };
        const delta_buffer = Buffer.from(JSON.stringify(delta));
            const delta_encoded = Encoder.encode(delta_buffer);    
            const delta_hash = Encoder.encode(Multihash.hash(delta_buffer));

        /** Takes the input.recoveryKey and makes the recoveryCommitment */
        const recovery_commitment = Multihash.canonicalizeThenHashThenEncode(input.recoveryKey);
        
        /** The Create Operation Suffix Data Object */
        const suffix_data = {
            deltaHash: delta_hash,
            recoveryCommitment: recovery_commitment
        };
        const suffix_data_encoded = Encoder.encode(JSON.stringify(suffix_data));
        
        /** DID data to create a new Sidetree-based `DID-update` tyron-operation */
        const operation_request: CreateOperationRequestOutput = {
            type: OperationType.Create,
            suffixData: suffix_data_encoded,
            deltaEncoded: delta_encoded
        };
        return operation_request;    
    }

    /** Generates an anchored `DID-create` tyron-operation */
    public static async anchoredCreateOperation(input: AnchoredCreateOperationInput): Promise<AnchoredCreateOperationOutput> {
        const create_operation_output = await tyronCreateOperation.createOperation();
        const anchored_operation_model: AnchoredOperationModel = {
            type: OperationType.Create,
            didUniqueSuffix: create_operation_output.createOperation.didUniqueSuffix,
            operationBuffer: create_operation_output.createOperation.operationBuffer,
            transactionNumber: input.transactionNumber,
            ledgerTime: input.ledgerTime,
            operationIndex: input.operationIndex
        };
        
        const create_operation_anchored: AnchoredCreateOperationOutput = {
            createOperation: create_operation_output.createOperation,
            operationRequest: create_operation_output.operationRequest,
            anchoredOperationModel: anchored_operation_model,
            recoveryKey: create_operation_output.recoveryKey,
            recoveryPrivateKey: create_operation_output.recoveryPrivateKey,
            updateKey: create_operation_output.updateKey,
            updatePrivateKey: create_operation_output.updatePrivateKey,
            signingKey: create_operation_output.signingKey,
            signingPrivateKey: create_operation_output.signingPrivateKey,
            nextUpdateRevealValueEncodedString: create_operation_output.nextUpdateRevealValueEncodedString
        };
        return create_operation_anchored;
    }
}

/*
/** Defines input data for a Sidetree-based `DID-recovery` tyron-operation */
/*interface RecoveryOperationInput {
    didUniqueSuffix: string;
    recoveryPrivateKey: JwkEs256k;
}

/** Defines output data for a Sidetree-based `DID-recovery` tyron-operation */
/*interface RecoveryOperationOutput {
    operationBuffer: Buffer;
    recoveryOperation: RecoverOperation;
    recoveryKey: JwkEs256k;
    recoveryPrivateKey: JwkEs256k;
    signingKey: PublicKeyModel;
    signingPrivateKey: JwkEs256k;
    updateKey: PublicKeyModel;
    updatePrivateKey: JwkEs256k;
}
*/