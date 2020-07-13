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