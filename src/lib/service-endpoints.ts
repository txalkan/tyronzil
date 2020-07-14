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

import ServiceEndpointModel from "@decentralized-identity/sidetree/dist/lib/core/versions/latest/models/ServiceEndpointModel";

export default class serviceEndpoints {
    /**
    * Generates an array of serviceEndpoints with the specified services
    * @param services array of service-endpoint models */
    public static async new (services: ServiceEndpointModel[]): Promise<ServiceEndpointModel[]> {
        const SERVICE_ENDPOINTS = [];
        for (const service of services) {
            const serviceEndpoint = service;
            SERVICE_ENDPOINTS.push(serviceEndpoint)
        }
        return SERVICE_ENDPOINTS;
    }
}
