// migrations/2_deploy_contracts.js
const WasteTracking = artifacts.require('WasteTracking');

module.exports = function (deployer) {
    deployer.deploy(WasteTracking);
};
