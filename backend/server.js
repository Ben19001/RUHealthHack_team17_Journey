// Add the following code to backend/server.js

// Route for transferring waste
app.post('/transferWaste', async (req, res) => {
    const { wasteId, toAddress } = req.body;

    try {
        const receipt = await contract.methods
            .transferWaste(wasteId, toAddress)
            .send({ from: account, gas: 500000 });

        res.json({ status: 'success', transactionHash: receipt.transactionHash });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.toString() });
    }
});

// Route for processing waste
app.post('/processWaste', async (req, res) => {
    const { wasteId } = req.body;

    try {
        const receipt = await contract.methods
            .processWaste(wasteId)
            .send({ from: account, gas: 500000 });

        res.json({ status: 'success', transactionHash: receipt.transactionHash });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.toString() });
    }
});

// Route for getting waste details
app.get('/getWaste/:id', async (req, res) => {
    const wasteId = req.params.id;

    try {
        const waste = await contract.methods.getWaste(wasteId).call();
        res.json(waste);
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.toString() });
    }
});
