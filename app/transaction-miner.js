/*  
Miners delete invalid transactions, wallets
delete whats not on their blockchain. 
Transactions are only broadcasted by the nodes, 
miners only broadcast the blockchains. 
Wallets have blockchain, miners have blockchains.
*/

//get command -> transaction miner class -> then transactions are put on blockchain
// what we want: automatic background -> miner class -> updating transactions with each other -> simultaneously? sending validations for the
//transactions with each other -> checking validation for all transactions, which ledger? 
//transactions are put on a ledger and then published?      

 //collect name of all ports
        //sync with them iteratively every transaction
        // then sync with them iteratively whole ledger
        //check if 80% agree
        //if yes, add the transactions to the block
        
const Transaction = require('../wallet/transaction');

//all these constructor values belong to the miners and wallets ***
class TransactionMiner {
    constructor({ blockchain, transactionPool, wallet, pubsub }) {
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;
        this.wallet = wallet;
        this.pubsub = pubsub;
    }

    mineTransactions() {
        const validTransactions = this.transactionPool.validTransactions();// just checks individual transaction, not the whole history of an account

        validTransactions.push(
            Transaction.rewardTransaction({ minerWallet: this.wallet })
          );
       
        this.blockchain.addBlock({data: validTransactions}); //sees last block of the chain and uses its hash and difficulty to mine the block 

        this.pubsub.broadcastChain();

        this.transactionPool.clear(); 

    }
}

module.exports = TransactionMiner;