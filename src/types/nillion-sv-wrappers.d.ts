declare module 'nillion-sv-wrappers' {
  export class SecretVaultWrapper {
    constructor(nodes: any[], orgCredentials: any, schemaId?: string);
    init(): Promise<void>;
    createSchema(schema: any, collectionName: string): Promise<any>;
    writeToNodes(data: any[]): Promise<any>;
    readFromNodes(query: any): Promise<any>;
    deleteFromNodes(query: any): Promise<any>;
  }
}
