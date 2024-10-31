import { config as devConfig } from './config/config.dev';
import { config as prodConfig } from './config/config.prod';

console.log("process.env.REACT_APP_BUILD_ENV: " + process.env.REACT_APP_BUILD_ENV);
const environment = (process.env.REACT_APP_BUILD_ENV || 'prod').trim();

console.log("BUILD_ENV: " + environment);

const config = environment === 'dev'?  devConfig : prodConfig;

console.log("frontend domain: " + config.domain);
console.log("frontend origin: " + config.origin);
console.log("frontend backend URL: " + config.backendUrl);

export default config;