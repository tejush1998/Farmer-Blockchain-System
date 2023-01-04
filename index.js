const bodyParser = require('body-parser');
const express = require('express');
const request = require('request'); //using this to send get request from program instead of browser
const Blockchain = require('./blockchain');
const PubSub = require('./app/pubsub');
const TransactionPool = require('./wallet/transaction-pool');
const Wallet = require('./wallet');
const app = express();
const TransactionMiner = require('./app/transaction-miner');//FOR MINING DO YOU REALLY NEED TO CALL API? THAT TOO CALLING SELF
                                                         
const blockchain = new Blockchain();
const wallet = new Wallet();  //main function of a port is to host a wallet. Can one port host multiple wallets ?
const transactionPool = new TransactionPool();
const pubsub = new PubSub ({ blockchain, transactionPool}); //pubsub syncs blockchain as well as transaction pool
const transactionMiner = new TransactionMiner( {blockchain, transactionPool, wallet, pubsub});

const DEFAULT_PORT =3000;
const ROOT_NODE_ADDRESS = `http://localhost:${DEFAULT_PORT}`;

app.use(bodyParser.json());

app.get('/api/blocks', (req, res) => {  //gets the whole chain if you type search this
    res.json(blockchain.chain);
});

app.post('/api/mine', (req, res) => {
    const { data } = req.body;  //data received by mining
    blockchain.addBlock({data}); //puts it on its bkchain
    pubsub.broadcastChain();  // then broadcasts it
    res.redirect('/api/blocks'); //showing the updated blockchain 

});
//once transaction happens, update it to pool and broadcast pool using pubsub
app.post('/api/transact', (req,res) => {
    const {amount, recipient} =req.body;
    let transaction = transactionPool.existingTransaction({inputAddress: wallet.publicKey});

    try {
        if(transaction){
            transaction.update( {senderWallet: wallet, recipient, amount});
        } else
     transaction= wallet.createTransaction({ 
         recipient, 
         amount,
        chain: blockchain.chain
    });
    } catch(error) {
        return res.status(400).json( { type: 'error', message: error.message });
    }

    transactionPool.setTransaction(transaction);
    pubsub.broadcastTransaction(transaction);
    res.json({type: 'success', transaction});

});

app.get('/api/transaction-pool-map', (req, res) => {
    res.json(transactionPool.transactionMap);
});
//replacing mine with mine transactions, this mines transactions and broadcasts it 
app.get('/api/mine-transactions', (req,res) => {
    transactionMiner.mineTransactions();

    res.redirect('/api/blocks');
});
//for wallets to know each others address
app.get('/api/wallet-info', (req, res) => {
    const address = wallet.publicKey
    res.json({
        address,
        balance: Wallet.calculateBalance({ chain:blockchain.chain, address})
    });
});

//sync pool and blockchain with root node
const syncWithRootState = () => {
     request({ url: `${ROOT_NODE_ADDRESS}/api/blocks`}, (error,response, body) => {
        if(!error && response.statusCode === 200) {
            const rootChain = JSON.parse(body);

            console.log('replace chain on a sync with', rootChain);
            blockchain.replaceChain(rootChain);
        }
    });
    request({ url: `${ROOT_NODE_ADDRESS}/api/transaction-pool-map`}, (error,response, body) => {
        if(!error && response.statusCode === 200) {
            const rootTransactionPoolMap = JSON.parse(body);

            console.log('replace transaction pool map on a sync with', rootTransactionPoolMap);
            transactionPool.setMap(rootTransactionPoolMap);
        }
    });
};
let PEER_PORT;

if(process.env.GENERATE_PEER_PORT === 'true') {
    PEER_PORT = DEFAULT_PORT + Math.ceil (Math.random() * 1000);
}
const PORT = PEER_PORT || DEFAULT_PORT; // first port is 3000, then peer ports are started dev peer

//used only because it has to WAIT for pubsub
app.listen(PORT, () => { 
    console.log(`listening at localhost:${PORT}`);
    if (PORT !== DEFAULT_PORT){
        syncWithRootState(); 

    }
});