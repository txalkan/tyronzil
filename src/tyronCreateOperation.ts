import {
    tyronCryptography,
    OperationKeyPairInput
 } from './tyronKeys';
import PublicKeyModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/PublicKeyModel';
import JwkEs256k from '@decentralized-identity/sidetree/dist/lib/core/models/JwkEs256k';
import Jwk from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Jwk';
import Encoder from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Encoder';
import Multihash from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/Multihash';

import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import CreateOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/CreateOperation';

import ServiceEndpointModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel';
//import RecoverOperation from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/RecoverOperation';
import DocumentModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DocumentModel';
import DeltaModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/DeltaModel';

/** Defines input data for a Sidetree-based `DID-create` tyron-operation REQUEST*/
interface CreateOperationRequestInput {
    recoveryKey: JwkEs256k;
    updateKey: JwkEs256k;
    otherPublicKeys: PublicKeyModel[];
    serviceEndpoints?: ServiceEndpointModel[];
}

/** Defines output data of a Sidetree-based `DID-create` tyron-operation REQUEST*/
interface CreateOperationRequestOutput {
    type: OperationType;
    suffix_data: string;
    delta: string;
}

/** Defines output data of a Sidetree-based `DID-create` tyron-operation */
interface CreateOperationOutput {
    createOperation: CreateOperation;
    operationRequest: CreateOperationRequestOutput;
    recoveryKey: JwkEs256k;
    recoveryPrivateKey: JwkEs256k;
    updateKey: JwkEs256k;
    updatePrivateKey: JwkEs256k;
    signingKey: PublicKeyModel;
    signingPrivateKey: JwkEs256k;
    nextUpdateRevealValueEncodedString: string;
}

/** Defines input data to anchor a Sidetree-based `DID-create` tyron-operation */
interface AnchoredCreateOperationInput {
    transactionNumber: number;
    ledgerTime: number;
    operationIndex: number;
}

/** Model for the anchored `DID-create` tyron-operation */
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

    /** Generates a Sidetree-based `DID-create` tyron-operation REQUEST  */
    public static async createOperationRequest(input: CreateOperationRequestInput): Promise<CreateOperationRequestOutput> {
        const document: DocumentModel = {
            public_keys: input.otherPublicKeys,
            service_endpoints: input.serviceEndpoints
        };
        const patch = [{
            action: 'replace',
            document
        }];
        const update_commitment = Multihash.canonicalizeThenHashThenEncode(input.updateKey);

        /** The Create Operation Delta Object */
        const delta: DeltaModel = {
            patches: patch,
            updateCommitment: update_commitment,
        };
        const deltaBuffer = Buffer.from(JSON.stringify(delta));
        const delta_hash = Encoder.encode(Multihash.hash(deltaBuffer));
        const recovery_commitment = Multihash.canonicalizeThenHashThenEncode(input.recoveryKey);
        
        /** Create Operation Suffix Data Object */
        const suffixData = {
            deltaHash: delta_hash,
            recoveryCommitment: recovery_commitment
        };
        const suffixDataEncodedString = Encoder.encode(JSON.stringify(suffixData));
        const deltaEncodedString = Encoder.encode(deltaBuffer);
        
        const createOperationRequestOutput: CreateOperationRequestOutput = {
            type: OperationType.Create,
            delta: deltaEncodedString,
            suffix_data: suffixDataEncodedString
        };
        return createOperationRequestOutput;    
    }

    /** Generates a Sidetree-based `DID-create` tyron-operation */
    public static async createOperation(): Promise<CreateOperationOutput> {
        const signing_key_input: OperationKeyPairInput = {
            id: 'signingKey',
        };
        const [update_key, update_private_key] = await Jwk.generateEs256kKeyPair();
        const [recovery_key, recovery_private_key] = await Jwk.generateEs256kKeyPair();
        const [signing_key, signing_private_key] = await tyronCryptography.operationKeyPair(signing_key_input);
        const services = tyronCreateOperation.serviceEndpoints(['serviceEndpointId001', 'serviceEndpointId002']);

        const createOperationRequestInput: CreateOperationRequestInput = {
            recoveryKey: recovery_key,
            updateKey: update_key,
            otherPublicKeys: [signing_key],
            serviceEndpoints: services
        };
        const operation_request = await tyronCreateOperation.createOperationRequest(createOperationRequestInput);
        const operation_buffer = Buffer.from(JSON.stringify(operation_request));
        const create_operation = await CreateOperation.parse(operation_buffer);
        const next_update_reveal_value_encoded_string = Multihash.canonicalizeThenHashThenEncode(signing_key.jwk);
        
        const createOperationOutput: CreateOperationOutput = {
            createOperation: create_operation,
            operationRequest: operation_request,
            recoveryKey: recovery_key,
            recoveryPrivateKey: recovery_private_key,
            updateKey: update_key,
            updatePrivateKey: update_private_key,
            signingKey: signing_key,
            signingPrivateKey: signing_private_key,
            nextUpdateRevealValueEncodedString: next_update_reveal_value_encoded_string
        };
        return createOperationOutput;

    }

    /** Generates an anchored `DID-create` tyron-operation */
    public static async anchoredCreateOperation(input: AnchoredCreateOperationInput): Promise<AnchoredCreateOperationOutput> {
        const createOperationOutput = await tyronCreateOperation.createOperation();
        const anchoredOperationModel: AnchoredOperationModel = {
            type: OperationType.Create,
            didUniqueSuffix: createOperationOutput.createOperation.didUniqueSuffix,
            operationBuffer: createOperationOutput.createOperation.operationBuffer,
            transactionNumber: input.transactionNumber,
            ledgerTime: input.ledgerTime,
            operationIndex: input.operationIndex
        };
        
        const anchoredCreateOperationOutput: AnchoredCreateOperationOutput = {
            createOperation: createOperationOutput.createOperation,
            operationRequest: createOperationOutput.operationRequest,
            anchoredOperationModel,
            recoveryKey: createOperationOutput.recoveryKey,
            recoveryPrivateKey: createOperationOutput.recoveryPrivateKey,
            updateKey: createOperationOutput.updateKey,
            updatePrivateKey: createOperationOutput.updatePrivateKey,
            signingKey: createOperationOutput.signingKey,
            signingPrivateKey: createOperationOutput.signingPrivateKey,
            nextUpdateRevealValueEncodedString: createOperationOutput.nextUpdateRevealValueEncodedString
        }
        return anchoredCreateOperationOutput;
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