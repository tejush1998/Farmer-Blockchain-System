const Transaction = require('../wallet/transaction');
const Block = require('./block');
const {cryptoHash} = require('../util');
const { REWARD_INPUT, MINING_REWARD } =require('../config');
const Wallet = require('../wallet');


class Blockchain { //blockchain is class, chain is array
    constructor() {
        this.chain = [Block.genesis()];
    }

    addBlock( {data}) { 

        const newBlock = Block.mineBlock({ //mineblock matches hash with difficulty using nonce
            lastBlock: this.chain[this.chain.length-1],
            data
        });

        this.chain.push(newBlock);
    }

    replaceChain(chain, validateTransactions,onSuccess) {  
        if (chain.length <= this.chain.length)
        {
            console.error('The incoming chain must be longer');
            return;
        }

        if( !Blockchain.isValidChain(chain)) {   //checks hash, genesis block
            console.error('The incoming chain must be valid');
            return;
        }

        if(validateTransactions && !this.validTransactionData({chain})) { //checks transaction validity(input output and sign), 
                                                                          //and after that wallet history validity ( balance match)
            console.error('The incoming chain has invalid data');
            // console.log(chain, "invalid")
            return;
        }

        if(onSuccess) onSuccess();
        console.log('replacing chain with', chain)
        this.chain = chain;
    }
//check the data through the block
validTransactionData({ chain }) {
    for (let i=1; i<chain.length; i++) {
      const block = chain[i];
      const transactionSet = new Set();
      let rewardTransactionCount = 0;

      for (let transaction of block.data) {
        if (transaction.input.address === REWARD_INPUT.address) {
          rewardTransactionCount += 1;

          if (rewardTransactionCount > 1) {
            console.error('Miner rewards exceed limit');
            return false;
          }

          if (Object.values(transaction.outputMap)[0] !== MINING_REWARD) {
            console.error('Miner reward amount is invalid');
            return false;
          }
        } else {
          if (!Transaction.validTransaction(transaction)) {
            console.error('Invalid transaction');
            return false;
          }

          const trueBalance = Wallet.calculateBalance({
            chain: this.chain,
            address: transaction.input.address
          });

          if (transaction.input.amount !== trueBalance) {
            console.error('Invalid input amount');
            return false;
          }

          if (transactionSet.has(transaction)) {
            console.error('An identical transaction appears more than once in the block');
            return false;
          } else {
            transactionSet.add(transaction);
          }
        }
      }
    }

    return true;
  }

    static isValidChain(chain) { //genesis block, last hash refernces, and the actual hash of the block
        //also checking if difficulty was not manipulated
        if (JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())){
        return false
        };

        for (let i=1; i<chain.length;i++) {
            const {timestamp, lastHash, hash, nonce, difficulty, data} = chain[i];

            const actualLastHash = chain[i-1].hash;
            const lastDifficulty= chain[i-1].difficulty;


            if(lastHash !== actualLastHash) return false;

            const validatedHash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);

            if (hash!== validatedHash) return false;

            if(Math.abs(lastDifficulty-difficulty)>1) return false;

        };

        return true;
    }

    
}

module.exports = Blockchain;