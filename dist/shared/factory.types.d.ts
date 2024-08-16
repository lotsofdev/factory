export interface IFactoryServerConfig {
    hostname: string;
    port: number;
    entrypoint: string;
    assets: Record<string, string>;
}
export interface IFactoryConfig {
    server: IFactoryServerConfig;
}
