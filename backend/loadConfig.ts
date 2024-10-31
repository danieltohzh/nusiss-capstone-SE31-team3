import { config as devConfig } from './config/config.dev';
import { config as prodConfig } from './config/config.prod';

// Load environment variable, default to 'prod' if not set
const environment = (process.env.BUILD_ENV || 'prod').trim();

console.log("BUILD_ENV: ", environment);

const config = environment === 'dev' ? devConfig : prodConfig;

// Log the selected configuration for debugging purposes
//console.log("Selected config: ", config);

console.log("domain: " + config.domain);
console.log("origin: " + config.origin);

export default config;