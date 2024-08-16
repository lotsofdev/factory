import { __defineConfig, __getConfig } from '@lotsof/config';
import { __dirname } from '@lotsof/sugar/fs';
import __path from 'path';
const componentsConfig = __getConfig().components.settings;
const config = {
    components: componentsConfig,
    server: {
        hostname: '0.0.0.0',
        port: 5183,
        entrypoint: __path.resolve(__dirname(), '../../src/php/index.php'),
    },
    ui: {
        assets: {
            js: '//0.0.0.0:5184/src/js/index.ts',
            css: '//0.0.0.0:5184/src/css/index.css',
        },
    },
    project: {
        rootDir: process.cwd(),
        server: {
            protocol: 'http',
            hostname: '0.0.0.0',
            port: 5173,
        },
        assets: {
            js: 'src/js/index.ts',
            css: 'src/css/index.css',
        },
    },
};
__defineConfig({
    factory: config,
}, {
    defaults: true,
});
export default config;
//# sourceMappingURL=factory.config.js.map