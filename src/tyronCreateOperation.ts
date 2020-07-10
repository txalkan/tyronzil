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
    encodedUpdateRevealValue: string;
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
    encodedDelta: string;
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
    encodedUpdateRevealValue: string;
}

/** Generates a Sidetree-based `DID-create` tyron-operation */
export default class tyronCreateOperation {

    /**
     * Generates an array of service endpoints with the specified ids
     * @param ids array of service-endpoint ids
     */
    public static serviceEndpoints(ids: string[]): ServiceEndpointModel[] {
        const SERVICE_ENDPOINTS = []; 
        for (const id of ids) {
            SERVICE_ENDPOINTS.push(
                {
                    'id': id,
                    'type': 'someType',
                    'endpoint': 'https://www.url.com'
                }
            );
        }
        return SERVICE_ENDPOINTS;
    }

    /** Generates a Sidetree-based `DID-create` tyron-operation */
    public static async createOperation(): Promise<CreateOperationOutput> {
        
        /** To create the DID main public key */
        const SIGNING_KEY_INPUT: OperationKeyPairInput = {
            id: 'signingKey',
        };
        // Creates DID main key-pair:
        const [SIGNING_KEY, SIGNING_PRIVATE_KEY] = await tyronCryptography.operationKeyPair(SIGNING_KEY_INPUT);
        
        // to-do define
        const ENCODED_UPDATE_REVEAL_VALUE = Multihash.canonicalizeThenHashThenEncode(SIGNING_KEY.jwk);
        
        // Creates service endpoints:
        const SERVICE_ENDPOINTS = tyronCreateOperation.serviceEndpoints(['serviceEndpointId001', 'serviceEndpointId002']);

        // Creates key-pair for the updateCommitment:
        const [UPDATE_KEY, UPDATE_PRIVATE_KEY] = await Jwk.generateEs256kKeyPair();
        
        // Creates key-pair for the recoveryCommitment:
        const [RECOVERY_KEY, RECOVERY_PRIVATE_KEY] = await Jwk.generateEs256kKeyPair();
        
        /** Input data for the operation-EncodedStringrequest */
        const OPERATION_REQUEST_INPUT: CreateOperationRequestInput = {
            mainPublicKeys: [SIGNING_KEY],
            serviceEndpoints: SERVICE_ENDPOINTS,
            updateKey: UPDATE_KEY,
            recoveryKey: RECOVERY_KEY
        };
        /** DID data from the create operation-request */
        const OPERATION_REQUEST = await tyronCreateOperation.createOperationRequest(OPERATION_REQUEST_INPUT);
            const OPERATION_BUFFER = Buffer.from(JSON.stringify(OPERATION_REQUEST));
        
        /** DID data from the Sidetree create operation */
        const CREATE_OPERATION = await CreateOperation.parse(OPERATION_BUFFER);
        
        /** Data from a new Sidetree-based `DID-create` tyron-operation */
        const OPERATION_OUTPUT: CreateOperationOutput = {
            signingKey: SIGNING_KEY,
            signingPrivateKey: SIGNING_PRIVATE_KEY,
            encodedUpdateRevealValue: ENCODED_UPDATE_REVEAL_VALUE,
            updateKey: UPDATE_KEY,
            updatePrivateKey: UPDATE_PRIVATE_KEY,
            recoveryKey: RECOVERY_KEY,
            recoveryPrivateKey: RECOVERY_PRIVATE_KEY,
            operationRequest: OPERATION_REQUEST,
            createOperation: CREATE_OPERATION
        };
        return OPERATION_OUTPUT;

    }

    /** Generates a Sidetree-based `DID-create` tyron-operation REQUEST  */
    public static async createOperationRequest(input: CreateOperationRequestInput): Promise<CreateOperationRequestOutput> {
        
        // to-do define and fix import name convention publicKeys
        const DOCUMENT: DocumentModel = {
            public_keys: input.mainPublicKeys,
            service_endpoints: input.serviceEndpoints
        };
        const PATCH = [{ // to-do learn about patches
            action: 'replace',
            DOCUMENT
        }];
        
        /** Takes the input.updateKey and makes the updateCommitment value */
        const UPDATE_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(input.updateKey);

        /** The Create Operation Delta Object */
        const DELTA: DeltaModel = {
            patches: PATCH,
            updateCommitment: UPDATE_COMMITMENT,
        };
        const DELTA_BUFFER = Buffer.from(JSON.stringify(DELTA));
            const ENCODED_DELTA = Encoder.encode(DELTA_BUFFER);    
            const DELTA_HASH = Encoder.encode(Multihash.hash(DELTA_BUFFER));

        /** Takes the input.recoveryKey and makes the recoveryCommitment */
        const RECOVERY_COMMITMENT = Multihash.canonicalizeThenHashThenEncode(input.recoveryKey);
        
        /** The Create Operation Suffix Data Object */
        const SUFFIX_DATA = {
            deltaHash: DELTA_HASH,
            recoveryCommitment: RECOVERY_COMMITMENT
        };
        const ENCODED_SUFFIX_DATA = Encoder.encode(JSON.stringify(SUFFIX_DATA));
        
        /** DID data to create a new Sidetree-based `DID-update` tyron-operation */
        const OPERATION_REQUEST: CreateOperationRequestOutput = {
            type: OperationType.Create,
            suffixData: ENCODED_SUFFIX_DATA,
            encodedDelta: ENCODED_DELTA
        };
        return OPERATION_REQUEST;    
    }

    /** Generates an anchored `DID-create` tyron-operation */
    public static async anchoredCreateOperation(input: AnchoredCreateOperationInput): Promise<AnchoredCreateOperationOutput> {
        const CREATE_OPERATION_OUTPUT = await tyronCreateOperation.createOperation();
        
        const ANCHORED_OPERATION_MODEL: AnchoredOperationModel = {
            type: OperationType.Create,
            didUniqueSuffix: CREATE_OPERATION_OUTPUT.createOperation.didUniqueSuffix,
            operationBuffer: CREATE_OPERATION_OUTPUT.createOperation.operationBuffer,
            transactionNumber: input.transactionNumber,
            ledgerTime: input.ledgerTime,
            operationIndex: input.operationIndex
        };
        
        const ANCHORED_CREATE_OPERATION: AnchoredCreateOperationOutput = {
            createOperation: CREATE_OPERATION_OUTPUT.createOperation,
            operationRequest: CREATE_OPERATION_OUTPUT.operationRequest,
            anchoredOperationModel: ANCHORED_OPERATION_MODEL,
            recoveryKey: CREATE_OPERATION_OUTPUT.recoveryKey,
            recoveryPrivateKey: CREATE_OPERATION_OUTPUT.recoveryPrivateKey,
            updateKey: CREATE_OPERATION_OUTPUT.updateKey,
            updatePrivateKey: CREATE_OPERATION_OUTPUT.updatePrivateKey,
            signingKey: CREATE_OPERATION_OUTPUT.signingKey,
            signingPrivateKey: CREATE_OPERATION_OUTPUT.signingPrivateKey,
            encodedUpdateRevealValue: CREATE_OPERATION_OUTPUT.encodedUpdateRevealValue
        };
        return ANCHORED_CREATE_OPERATION;
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