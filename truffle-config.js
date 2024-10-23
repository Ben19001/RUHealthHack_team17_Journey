// truffle-config.js
const path = require('path');

module.exports = {
    contracts_build_directory: path.join(__dirname, 'build/contracts'),
    networks: {
        development: {
            host: '127.0.0.1',     // Localhost
            port: 7545,            // Ganache GUI default port
            network_id: '*',       // Any network
        },
    },
    compilers: {
        solc: {
            version: '0.8.0',       // Use Solidity version 0.8.0
        },
    },
};
