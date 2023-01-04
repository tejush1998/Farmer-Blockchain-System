const hexToBinary = require('hex-to-binary');
const { GENESIS_DATA, MINE_RATE } = require('../config');
const {cryptoHash} = require('../util');

class Block {
     constructor ({ timestamp, lastHash, hash, data, nonce, difficulty }) {
       this.timestamp = timestamp;
       this.lastHash = lastHash;
       this.hash = hash;
       this.data = data;
       this.nonce = nonce;
       this.difficulty = difficulty;
     }

     static genesis() {
         return new this(GENESIS_DATA);
     }

     static mineBlock({lastBlock, data}) {
        let hash, timestamp;
        const lastHash = lastBlock.hash;
        let {difficulty} = lastBlock; //grabs difficulty of last block
        let nonce = 0; //dynamic nonce

        do {
            nonce++;
            timestamp = Date.now(); //hash is generated first, nonce is modified to make required no of 0
            difficulty = Block.adjustDifficulty({originalBlock: lastBlock, timestamp}); //will adjust difficulty based on last block difference
            hash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);

        } while(hexToBinary(hash).substring(0,difficulty) !=='0'.repeat(difficulty));

         return new this({timestamp,lastHash,data,difficulty,nonce,hash});
     }

     static adjustDifficulty( { originalBlock, timestamp}) {
         const {difficulty} = originalBlock;

         if(difficulty<1) return 1;

         if((timestamp - originalBlock.timestamp)>MINE_RATE) return difficulty-1;

         return difficulty+1;
     }

}
//PoW makes it difficult to make a 51% attack, as itll take computation high
//create a test, add some false values, and expect the correction from the main code implemented
module.exports = Block;
