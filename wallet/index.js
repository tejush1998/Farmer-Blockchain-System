/* gives user a public adress
calculate balance by examining blockchain history
generate a digital signature, also verify others */

const { STARTING_BALANCE} = require('../config');
const {ec, cryptoHash } = require('../util');
const Transaction = require('./transaction');

class Wallet {
    constructor() {
        this.balance = STARTING_BALANCE; //this. is used to use these variables outside constructor
        
        this.keyPair = ec.genKeyPair(); //generate a key pair

        this.publicKey = this.keyPair.getPublic().encode('hex');

    }

    sign(data) {
        return this.keyPair.sign(cryptoHash(data))
    }

    createTransaction({ recipient, amount, chain}) {
        if(chain) {
            this.balance = Wallet.calculateBalance({
                chain,
                address: this.publicKey
            });
        }
        
        if(amount >this.balance) {
            throw new Error('Amount exceeds balance');
        }

        return new Transaction({senderWallet: this,recipient,amount});
    }

    static calculateBalance({chain, address}) {
        let hasConductedTransaction = false;  //if recent transaction is conducted, then output before that is disregarded
        let outputsTotal = 0;

        for(let i=chain.length-1; i>0 ; i--) { // start from behind
            const block = chain[i];

            for( let transaction of block.data){

                if( transaction.input.address === address){
                    hasConductedTransaction= true;
                }
                const addressOutput = transaction.outputMap[address];

                if(addressOutput) {
                    outputsTotal = outputsTotal + addressOutput;                  
                }
            }

            if(hasConductedTransaction) {
                break;
            }
        }
        return hasConductedTransaction ? outputsTotal: STARTING_BALANCE + outputsTotal;
    }
};

//output of the owner wallet contains the latest balance
//if its last transaction is a recipient then, you have to add it to the last output

module.exports = Wallet;