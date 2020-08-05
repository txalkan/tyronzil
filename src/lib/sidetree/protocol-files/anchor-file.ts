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

import { NetworkNamespace } from '../tyronZIL-schemes/did-scheme';
import AnchorFile from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/AnchorFile';
import AnchorFileModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/AnchorFileModel';
import ChunkFileModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ChunkFileModel';
import OperationType from '@decentralized-identity/sidetree/dist/lib/core/enums/OperationType';
import Cas from '@decentralized-identity/sidetree/dist/lib/core/Cas';
import Compressor from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Compressor';
import ArrayMethods from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/ArrayMethods';
import SidetreeError from '@decentralized-identity/sidetree/dist/lib/common/SidetreeError';
import ErrorCode from '../ErrorCode';
import TyronMap, { MapFileInput } from './map-file';
import { CreateDataRequest } from '../did-operations/did-create';
import MapFileModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/MapFileModel';

/** Handles the creation of an Anchor file */
export default class TyronAnchor {
    /** The network namespace */
    public readonly network: NetworkNamespace;
    
    /** The content-addressable storage */
    public static readonly CAS: Cas;

    /** The Sidetree Anchor file model */
    public readonly model: AnchorFileModel;
        /** The CAS URI of the Anchor file */
        public readonly casUri: string;

    /** The number of operations included in the Anchor file */
    public readonly count: number = 0;
        /** The maximum number of operations (including the update operations in the Map file) */
        public static readonly maxCount = 10000;

    /** The Anchor string to submit in a tyronZIL transaction */
    public readonly anchorString: string;

    /** The tyronZIL DIDs included in the Anchor file - cannot be repeated */
    public readonly didUniqueSuffixes: string[];

    /** The create, recover and deactivate operations in the Anchor file */
    public readonly operations: AnchoredOperations;

    /** The associated Map file */
    public readonly mapFile: TyronMap | undefined      // it is undefined if and only all operations are of type Deactivate
        /** The CAS URI of the Map file */
        public readonly mapFileUri: string | undefined     // it is undefined if and only all operations are of type Deactivate

    /** The associated Chunk file */
    public readonly chunkFile: ChunkFileData | undefined    // it is undefined if and only all operations are of type Deactivate
        /** The CAS URI of the Chunk file */
        public readonly chunkFileUri: string | undefined    // it is undefined if and only all operations are of type Deactivate
    
    /** The maximum size of the compressed Anchor/Map file = 1MB */
    public static readonly maxSize = 1000000;
    
    /** The maximum size of the compressed Chunk file = 10MB */
    public static readonly maxSizeChunk = 10000000;
    
    /***            ****            ***/
   
    private constructor (
        anchorData: AnchoreFileData
    ) {
        this.network = anchorData.network;
        this.model = anchorData.model;
        this.casUri = anchorData.casUri;
        this.count = anchorData.count;
        this.anchorString = String(anchorData.count) + "-ANCHOR-" + anchorData.casUri;
        this.didUniqueSuffixes = anchorData.didUniqueSuffixes;
        this.operations = anchorData.operations;
        this.mapFile = anchorData.mapFile;
        this.mapFileUri = this.mapFile!.casUri;
        this.chunkFile = anchorData.chunkFile;
        this.chunkFileUri = this.chunkFile!.casUri;
    }

    /***            ****            ***/
   
    public static async execute(input: AnchorFileInput): Promise<TyronAnchor> {
         
        /** The DIDs' unique suffixes */
        const DIDs: string[] = [];

        /** The operations to anchor */
        const OPERATIONS: AnchoredOperations = {};

        /** The enconded Delta objects */
        const DELTAS: string[] = [];

        /** Create operations data to anchor */
        const CREATE: {suffix_data: string}[] = [];

        input.batch.createRequestMap!.forEach((value: CreateDataRequest, key: string) => {
            DIDs.push(key);
            CREATE.push({suffix_data: value.suffix_data});
            DELTAS.push(value.delta!);
        });
        if (CREATE.length > 0) {
            OPERATIONS.create = CREATE;
        }

        /** Operations with signed data */
        const RECOVER: AnchorMode[] = []; 
        const DEACTIVATE: AnchorMode[] = [];
        const UPDATE: AnchorMode[] = [];

        input.batch.signedRequestMap!.forEach((value: SignedDataRequest, key: string) => {
            DIDs.push(key);
            const ANCHOR_MODE: AnchorMode = {
                did_suffix: value.did_suffix,
                signed_data: value.signed_data,
            }
            if (value.type === OperationType.Recover){
                RECOVER.push(ANCHOR_MODE);
                DELTAS.push(value.delta!);
            } else if (value.type === OperationType.Deactivate) {
                DEACTIVATE.push(ANCHOR_MODE);
            } else if (value.type === OperationType.Update) {
                UPDATE.push(ANCHOR_MODE);
                DELTAS.push(value.delta!);
            }
        })

        if (RECOVER.length > 0) {
            OPERATIONS.recover = RECOVER;
        }

        if (DEACTIVATE.length > 0) {
            OPERATIONS.deactivate = DEACTIVATE;
        }

        // Checks that no DID suffix is repeated
        if (ArrayMethods.hasDuplicates(DIDs)) {
            throw new SidetreeError(ErrorCode.RepeatedDID);
        }
        
        /***            ****            ***/

        /** The Sidetree Chunk file */
        let CHUNK_FILE: ChunkFileData | undefined;
        if (DELTAS. length === 0) {
            CHUNK_FILE = undefined;
        } else {
            CHUNK_FILE = await this.chunk(DELTAS);
        }

        /***            ****            ***/
        
        /** The Sidetree Map file */
        let MAP_FILE: TyronMap | undefined;
        if (UPDATE.length === 0){
            MAP_FILE = undefined;
        } else {
            const MAP_INPUT: MapFileInput = {
                network: input.network,
                chunkFileUri: CHUNK_FILE!.casUri,
                updateOperations: UPDATE,
            };
            MAP_FILE = await TyronMap.execute(MAP_INPUT);
        }
        
        /***            ****            ***/
        
        /** The Anchor file model for Sidetree validation */
        const ANCHOR_MODEL: AnchorFileModel = {
            writer_lock_id: undefined,
            map_file_uri: MAP_FILE!.casUri,
            operations: OPERATIONS,
        }

        /** Anchor model compressed buffer */
        const ANCHOR_MODEL_BUFFER = await Compressor.compress(Buffer.from(JSON.stringify(ANCHOR_MODEL)));

        /** Sidetree validation on Anchor file */
        const ANCHOR_FILE = await AnchorFile.parse(ANCHOR_MODEL_BUFFER);

        /***            ****            ***/
        
        const DID_SUFFIXES = ANCHOR_FILE.didUniqueSuffixes;
        DID_SUFFIXES.concat(MAP_FILE!.didUniqueSuffixes);

        /** The total number of operations */
        const COUNT = DID_SUFFIXES.length;
        
        // Checks that the number of operations is within the limit
        if (COUNT > this.maxCount){
            throw new SidetreeError(ErrorCode.BeyondCountLimit);
        }

        /***            ****            ***/
        
        await this.checkMaxSize(ANCHOR_FILE.model, MAP_FILE!.model, CHUNK_FILE!.model);

        /***            ****            ***/

        /** To calculate the CAS URI of the Anchor file */
        const ANCHOR_BUFFER = await Compressor.compress(Buffer.from(JSON.stringify(ANCHOR_FILE.model)));

        /** Anchor file CAS URI */
        const CAS_URI = await this.CAS.write(ANCHOR_BUFFER);

        /***            ****            ***/
        
        const ANCHOR_DATA: AnchoreFileData = {
            network: input.network,
            model: ANCHOR_FILE.model,
            casUri: CAS_URI,
            count: COUNT,
            didUniqueSuffixes: DID_SUFFIXES,
            operations: OPERATIONS,
            mapFile: MAP_FILE,
            chunkFile: CHUNK_FILE,
        }
        return new TyronAnchor(ANCHOR_DATA)
    }

    /***            ****            ***/

    /** Generates the Sidetree Chunk file */
    private static async chunk(deltas: string[]): Promise<ChunkFileData> {
        const CHUNK_MODEL: ChunkFileModel = {
            deltas: deltas
        }
        const CHUNK_BUFFER = await Compressor.compress(Buffer.from(JSON.stringify(CHUNK_MODEL)));
        const CAS_URI = await this.CAS.write(CHUNK_BUFFER);

        const CHUNK_DATA: ChunkFileData = {
            casUri: CAS_URI,
            model: CHUNK_MODEL
        };

        return CHUNK_DATA;
    }

    /***            ****            ***/

    /** Verifies that the sizes of the files do not exceed the limit */
    private static async checkMaxSize(anchorModel: AnchorFileModel, mapModel?: MapFileModel, chunkModel?: ChunkFileModel): Promise<void> {
        const ANCHOR_BUFFER = await Compressor.compress(Buffer.from(JSON.stringify(anchorModel)));
        if (ANCHOR_BUFFER.length > this.maxSize) {
            throw new SidetreeError(
                ErrorCode.FileSizeExceedsLimit,
                `The compressed Anchor file size of ${ANCHOR_BUFFER.length} bytes exceeds the allowed limit of ${this.maxSize} bytes`
            );
        }

        const MAP_BUFFER = await Compressor.compress(Buffer.from(JSON.stringify(mapModel)));
        if (MAP_BUFFER.length > this.maxSize) {
            throw new SidetreeError(
                ErrorCode.FileSizeExceedsLimit,
                `The compressed Map file size of ${MAP_BUFFER.length} bytes exceeds the allowed limit of ${this.maxSize} bytes`
            );
        }

        const CHUNK_BUFFER = await Compressor.compress(Buffer.from(JSON.stringify(chunkModel)));    
        if (CHUNK_BUFFER.length > this.maxSizeChunk) {
            throw new SidetreeError(
                ErrorCode.FileSizeExceedsLimit,
                `The compressed Chunk file size of ${CHUNK_BUFFER.length} bytes exceeds the allowed limit of ${this.maxSizeChunk} bytes`
            );
        }
    }    
}

/***            ** interfaces **            ***/

/** The model for a recover, update or deactivate operation in the Anchor file */
export interface AnchorMode {
    type?: OperationType;
    did_suffix: string;
    signed_data: string;
}

interface AnchoreFileData {
    network: NetworkNamespace;
    model: AnchorFileModel;
    casUri: string;
    count: number;
    didUniqueSuffixes: string[];
    operations: AnchoredOperations;
    mapFile?: TyronMap,
    chunkFile?: ChunkFileData;
}

export interface AnchorFileInput {
    network: NetworkNamespace;
    batch: OperationBatch;
}

interface OperationBatch {
    network: NetworkNamespace;
    count: number;
    createRequestMap?: Map<string, CreateDataRequest>;
    signedRequestMap?: Map<string, SignedDataRequest>;   
}

export interface AnchoredOperations {
    create?: {suffix_data: string}[];
    recover?: AnchorMode[];
    deactivate?: AnchorMode[];
}

interface SignedDataRequest {
    did_suffix: string;
    signed_data: string;
    type: OperationType.Recover | OperationType.Deactivate | OperationType.Update;
    delta?: string;
}

interface ChunkFileData {
    casUri: string;
    model: ChunkFileModel
}