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

import Cas from '@decentralized-identity/sidetree/dist/lib/core/Cas';
import MapFileModel from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/MapFileModel';
import MapFile from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/MapFile';
import { AnchorMode } from './anchor-file';
import { NetworkNamespace } from '../tyronZIL-schemes/did-scheme';
import Compressor from '@decentralized-identity/sidetree/dist/lib/core/versions/latest/util/Compressor';

/** Handles the creation of a Map file */
export default class TyronMap {
    
    /** The content-addressable storage */
    public static readonly CAS: Cas;
    
    /** The Sidetree Map file model */
    public readonly model: MapFileModel;
        /** The CAS URI of the Map file */
        public readonly casUri: string;
    
    /** The amount of operations included in the Map file */
    public readonly count: number;

    /** The tyronZIL DIDs included in the Map file - cannot be repeated */
    public readonly didUniqueSuffixes: string[];

    /** The update operations in the Map file */
    public readonly operations: AnchorMode[];

    /** The CAS URI of the associated Chunk file */
    public readonly chunkFileUri: string;
    
    /** The maximum size of a compressed Map file = 1MB */
    public static readonly maxSize = 1000000;

    /***            ****            ***/
   
    private constructor (
        mapData: MapFileData
    ) {
        this.casUri = mapData.casUri;
        this.model = mapData.model;
        this.chunkFileUri = mapData.chunkFileUri;
        this.count = mapData.count;
        this.didUniqueSuffixes = mapData.didUniqueSuffixes;
        this.operations = mapData.operations;
    }

    /***            ****            ***/

    public static async execute(input: MapFileInput): Promise<TyronMap> {
        
        /** The update operations */
        const UPDATE: AnchorMode[] = input.updateOperations;
        
        /***            ****            ***/
        
        /** The Map file model for Sidetree validation */
        const MAP_MODEL: MapFileModel = {
            chunks: [{
                chunk_file_uri: input.chunkFileUri
            }],
            operations: {
                update: UPDATE
            }
        }
        
        /** Map file compressed buffer */
        const MAP_MODEL_BUFFER = await Compressor.compress(Buffer.from(JSON.stringify(MAP_MODEL)));

        /** Sidetree validation on Map file */
        const MAP_FILE = await MapFile.parse(MAP_MODEL_BUFFER);
        const MAP_COUNT = MAP_FILE.didUniqueSuffixes.length;

        /***            ****            ***/

        //const MAP_BUFFER = await Compressor.compress(Buffer.from(JSON.stringify(MAP_FILE.model)));

        /** Map file CAS URI */
        const CAS_URI = "EiCzVSv6RI-LJvOvYoPvAfk4YvDgH0Gs2727Ixqgku0B2g"; //await this.CAS.write(MAP_BUFFER);

        /***            ****            ***/
        
        const MAP_DATA: MapFileData = {
            network: input.network,
            model: MAP_FILE.model,
            casUri: CAS_URI,
            count: MAP_COUNT,
            didUniqueSuffixes: MAP_FILE.didUniqueSuffixes,
            operations: UPDATE,
            chunkFileUri: input.chunkFileUri,
        }

        return new TyronMap(MAP_DATA);

    }

}

interface MapFileData {
    network: NetworkNamespace;
    model: MapFileModel;
    casUri: string;
    count: number;
    didUniqueSuffixes: string[];
    operations: AnchorMode[];
    chunkFileUri: string;
}

export interface MapFileInput {
    network: NetworkNamespace;
    chunkFileUri: string;
    updateOperations: AnchorMode[];
}
