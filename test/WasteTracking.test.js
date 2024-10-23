// test/WasteTracking.test.js
const WasteTracking = artifacts.require('WasteTracking');
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { assert } = require('chai');

contract('WasteTracking', (accounts) => {
    const [admin, generator, transporter, processor, other] = accounts;

    let instance;

    beforeEach(async () => {
        instance = await WasteTracking.new({ from: admin });

        // Grant roles
        await instance.grantRole(web3.utils.keccak256('GENERATOR_ROLE'), generator, { from: admin });
        await instance.grantRole(web3.utils.keccak256('TRANSPORTER_ROLE'), transporter, { from: admin });
        await instance.grantRole(web3.utils.keccak256('PROCESSOR_ROLE'), processor, { from: admin });
    });

    it('should allow generator to create waste', async () => {
        const tx = await instance.createWaste(
            'Blood Bag',
            'Hospital A',
            5,
            'Biohazard',
            'Handle with gloves',
            { from: generator }
        );

        // Check event
        expectEvent(tx, 'WasteCreated', {
            id: web3.utils.toBN(1),
            wasteType: 'Blood Bag',
            origin: 'Hospital A',
            weight: web3.utils.toBN(5),
            hazardLevel: 'Biohazard',
            handlingInstructions: 'Handle with gloves',
            currentHolder: generator,
        });

        // Verify waste data
        const waste = await instance.getWaste(1);
        assert.equal(waste.id.toNumber(), 1);
        assert.equal(waste.wasteType, 'Blood Bag');
        assert.equal(waste.origin, 'Hospital A');
        assert.equal(waste.weight.toNumber(), 5);
        assert.equal(waste.hazardLevel, 'Biohazard');
        assert.equal(waste.handlingInstructions, 'Handle with gloves');
        assert.equal(waste.currentHolder, generator);
        assert.equal(waste.isProcessed, false);
        assert.equal(waste.status, 'Created');
    });

    it('should not allow non-generator to create waste', async () => {
        await expectRevert(
            instance.createWaste(
                'Syringes',
                'Clinic B',
                10,
                'Sharps',
                'Dispose properly',
                { from: other }
            ),
            'AccessControl: Access denied'
        );
    });

    it('should allow transporter to transfer waste', async () => {
        // Generator creates waste
        await instance.createWaste(
            'Blood Bag',
            'Hospital A',
            5,
            'Biohazard',
            'Handle with gloves',
            { from: generator }
        );

        // Generator transfers waste to transporter
        await instance.transferWaste(1, transporter, { from: generator });

        // Transporter transfers waste to processor
        const tx = await instance.transferWaste(1, processor, { from: transporter });

        // Check event
        expectEvent(tx, 'WasteTransferred', {
            id: web3.utils.toBN(1),
            from: transporter,
            to: processor,
        });

        // Verify current holder
        const waste = await instance.getWaste(1);
        assert.equal(waste.currentHolder, processor);
        assert.equal(waste.status, 'In Transit');
    });

    it('should not allow transfer by non-current holder', async () => {
        // Generator creates waste
        await instance.createWaste(
            'Blood Bag',
            'Hospital A',
            5,
            'Biohazard',
            'Handle with gloves',
            { from: generator }
        );

        // Attempt transfer by non-holder
        await expectRevert(
            instance.transferWaste(1, transporter, { from: other }),
            'Only current holder can transfer waste'
        );
    });

    it('should allow processor to process waste', async () => {
        // Generator creates waste
        await instance.createWaste(
            'Blood Bag',
            'Hospital A',
            5,
            'Biohazard',
            'Handle with gloves',
            { from: generator }
        );

        // Generator transfers waste to processor
        await instance.transferWaste(1, processor, { from: generator });

        // Processor processes waste
        const tx = await instance.processWaste(1, { from: processor });

        // Check event
        expectEvent(tx, 'WasteProcessed', {
            id: web3.utils.toBN(1),
            processor: processor,
        });

        // Verify waste is processed
        const waste = await instance.getWaste(1);
        assert.equal(waste.isProcessed, true);
        assert.equal(waste.status, 'Processed');
    });

    it('should not allow processing by non-processor', async () => {
        // Generator creates waste
        await instance.createWaste(
            'Syringes',
            'Clinic B',
            10,
            'Sharps',
            'Dispose properly',
            { from: generator }
        );

        // Generator transfers waste to other
        await instance.transferWaste(1, other, { from: generator });

        // Attempt to process waste by non-processor
        await expectRevert(
            instance.processWaste(1, { from: other }),
            'AccessControl: Access denied'
        );
    });

    it('should retrieve waste history', async () => {
        // Generator creates waste
        await instance.createWaste(
            'Blood Bag',
            'Hospital A',
            5,
            'Biohazard',
            'Handle with gloves',
            { from: generator }
        );

        // Transfer waste through multiple holders
        await instance.transferWaste(1, transporter, { from: generator });
        await instance.transferWaste(1, processor, { from: transporter });

        // Get holders history
        const history = await instance.getWasteHistory(1);

        assert.equal(history.length, 3);
        assert.equal(history[0], generator);
        assert.equal(history[1], transporter);
        assert.equal(history[2], processor);
    });

    it('should pause and unpause contract', async () => {
        // Admin pauses the contract
        await instance.pauseContract({ from: admin });

        // Attempt to create waste while paused
        await expectRevert(
            instance.createWaste(
                'Blood Bag',
                'Hospital A',
                5,
                'Biohazard',
                'Handle with gloves',
                { from: generator }
            ),
            'Pausable: paused'
        );

        // Admin unpauses the contract
        await instance.unpauseContract({ from: admin });

        // Now creating waste should succeed
        const tx = await instance.createWaste(
            'Syringes',
            'Clinic B',
            10,
            'Sharps',
            'Dispose properly',
            { from: generator }
        );

        // Check event
        expectEvent(tx, 'WasteCreated', {
            id: web3.utils.toBN(1),
            wasteType: 'Syringes',
        });
    });
});
