const uuid = require('uuid/v1');
const { verifySignature} = require('../util');
const { REWARD_INPUT, MINING_REWARD} = require('../config');

class Transaction {
    constructor({senderWallet, recipient, amount, outputMap, input}) {
        this.id = uuid();
        //if outputmap is already given then new output map is not created 
        this.outputMap = outputMap || this.createOutputMap({senderWallet, recipient, amount});
        this.input = input || this.createInput({ senderWallet, outputMap: this.outputMap});
     }
//details of sender,reciever after the transaction
    createOutputMap({ senderWallet, recipient, amount}) {
        const outputMap = {};

        outputMap[recipient] = amount;
        outputMap[senderWallet.publicKey] = senderWallet.balance - amount;

        return outputMap;
    }
//senders details before the transactions
    createInput({senderWallet, outputMap}) {
        return {
            timestamp: Date.now(),
            amount: senderWallet.balance,
            address: senderWallet.publicKey,
            signature : senderWallet.sign(outputMap)
        };
    }
//this is used in validtransactiondat() now
    static validTransaction(transaction) {

        const {input: {address, amount, signature}, outputMap} = transaction;
//check of sum of output values is equal to the initial input amount
        const outputTotal = Object.values(outputMap)
        .reduce((total,outputAmount) => total + outputAmount);

        if(amount !== outputTotal) {
            console.error(`Invalid transaction from ${address}`);
            return false;
        }

        if(!verifySignature( {publicKey:address,data:outputMap, signature})) {
            console.error(`Invalid signature from ${address}`);
            return false;
        }
        return true;
    }
// modify the output map and input of the last trans
    update({ senderWallet, recipient, amount})
    {
        if (amount > this.outputMap[senderWallet.publicKey]){
        throw new Error('Amount exceeds balance');  
        }

        if(!this.outputMap[recipient]) {
            this.outputMap[recipient] = amount;
        } else {
            this.outputMap[recipient] = this.outputMap[recipient] + amount;
        }
        
        this.outputMap[senderWallet.publicKey] = 
        this.outputMap[senderWallet.publicKey] - amount;
        this.input = this.createInput({ senderWallet, outputMap: this.outputMap});    
    }

    static rewardTransaction({minerWallet}) {
        //console.log(MINING_REWARD);
        return new this({
            input: REWARD_INPUT,
            outputMap: { [minerWallet.publicKey]: MINING_REWARD}   
        });
    
    }
}


module.exports = Transaction;