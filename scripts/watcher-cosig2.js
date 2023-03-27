const Web3 = require('web3');
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const { AggregateTransaction, Deadline, TransferTransaction, Address, Mosaic, UInt64, PlainMessage, NetworkType, PublicAccount, TransactionService, TransactionHttp, HashLockHttp, ReceiptHttp, HashLockTransaction, Listener, Account, NamespaceHttp, MosaicId, TransactionGroup, CosignatureTransaction, Order, TransactionType } = require('symbol-sdk');

const web3 = createAlchemyWeb3(`wss://eth-sepolia.g.alchemy.com/v2/U4H2r9cd2JTquAXAeneEYFBhDzbehXKx`);

const CONTRACT_ADDRESS = "0x72f09C2b0e3afB935CdED47Dd27106B335026Cdc";

var bridgeData = [];
var signed = [];

const multisig_sender = PublicAccount.createFromPublicKey(
    "***",
    NetworkType.TEST_NET
)

const multisig_address = PublicAccount.createFromPublicKey(
    "***",
    NetworkType.TEST_NET
);
const x_mosaicId = new MosaicId("1BA8011E3CF54F48");
const m_account = Account.createFromPrivateKey(
    "***",
    NetworkType.TEST_NET
);
const gene = "49D6E1CE276A85B70EAFE52349AACCA389302E7A9754BCF1221E79494FC665A4";
const ep = 1667250467;
const node = "***";
const wsEndpoint = node.replace('http', 'ws') + "/ws";
const txRepo = new TransactionHttp(node);
const receiptRepo = new ReceiptHttp(node);
const nameRepo = new NamespaceHttp(node);
const txService = new TransactionService(txRepo, receiptRepo);
const listener = new Listener(wsEndpoint,nameRepo);

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

listener.open().then(() => {
    listener.newBlock()
    .subscribe(async block =>{
        console.log("block:",block.height.compact())
        console.log(bridgeData)
        searchPartial(m_account.address);
        await sleep(10000);
        searchPartial(m_account.address);
    },err=>{
      console.error("error");
    });


});

const transferTopic = web3.eth.abi.encodeEventSignature({
    name: 'Transfer',
    type: 'event',
    inputs: [
      { type: 'address', name: 'from', indexed: true },
      { type: 'address', name: 'to', indexed: true },
      { type: 'uint256', name: 'value', indexed: false },
    ],
  });


web3.eth.subscribe('logs', {
  address: CONTRACT_ADDRESS
}, (error, result) => {
  if (!error) {
    let amount;
    let address;
    console.log("reshash:",result.transactionHash)
    web3.eth.getTransactionReceipt(result.transactionHash).then((x)=>{
        for (const log of x.logs) {
            // console.log(log)
            if (log.topics.includes(transferTopic)) {
              const decodedLog = web3.eth.abi.decodeLog(
                [
                  { type: 'address', name: 'from', indexed: true },
                  { type: 'address', name: 'to', indexed: true },
                  { type: 'uint256', name: 'value', indexed: false },
                ],
                log.data,
                log.topics.slice(1)
              );
      
              amount = Number(decodedLog.value);
              web3.eth.getTransaction(result.transactionHash, function(error, tx) {
                if (!error &&
                    !signed.includes(result.transactionHash)
                    ){
                    address = web3.utils.hexToAscii(tx.input).replace(/\0/g, '').trim().slice(-39,);
                    if(
                        Address.isValidRawAddress(address)&&
                        !Number.isNaN(parseInt(amount))
                    ){
                        console.log(Address.isValidRawAddress(address),
                        !Number.isNaN(parseInt(amount)))
                        let data = {address:address, amount:amount, hash: result.transactionHash}
                        bridgeData.push(data)
                    }else{
                        console.log("Value error")
                    }
                } else {
                  console.log("transaction error");
                }
            });
            }
          }
    });
    // web3.eth.getTransaction(result.transactionHash, function(error, tx) {
    //     if (!error &&
    //         !signed.includes(result.transactionHash)
    //         ){
    //         address = web3.utils.hexToAscii(tx.input).replace(/\0/g, '').trim().slice(-39,);
    //         if(
    //             Address.isValidRawAddress(address)&&
    //             !Number.isNaN(parseInt(amount))
    //         ){
    //             console.log(Address.isValidRawAddress(address),
    //             !Number.isNaN(parseInt(amount)))
    //             let data = {address:address, amount:amount, hash: result.transactionHash}
    //             bridgeData.push(data)
    //         }else{
    //             console.log("Value error")
    //         }
    //     } else {
    //       console.log("transaction error");
    //     }
    // });

  }
})
.on("error", console.error);

const searchPartial = async (address) =>{
    if(bridgeData.length !== 0){ 
        const partial = await txRepo.search(
            {
                group: TransactionGroup.Partial,
                address :address,
                order: Order.Desc,
                pageSize: 100
                // embedded:true
            }).toPromise()
        console.log("partial length:", partial.data.length)
        for(t = 0; t<partial.data.length ; t++){
            const tx  = await txRepo.getTransaction(partial.data[t].transactionInfo.hash, TransactionGroup.Partial).toPromise();
            // console.log(
            //     !tx.signedByAccount(m_account.publicAccount) ,
            //     tx.signer.equals(multisig_sender) ,
            //     tx.innerTransactions.length === 1 ,
            //     tx.innerTransactions[0].mosaics.length === 1)
            if(
                // validate aggregate transaction structure
                !tx.signedByAccount(m_account.publicAccount) &&
                tx.signer.equals(multisig_sender) &&
                tx.innerTransactions.length === 1 &&
                tx.innerTransactions[0].mosaics.length === 1
            ){
                // validate transaction information
                for(i=0;i<bridgeData.length;i++){
                    // console.log( tx.innerTransactions[0].type == TransactionType.TRANSFER ,
                    // bridgeData[i]["amount"] === tx.innerTransactions[0].mosaics[0].amount.compact() ,
                    // bridgeData[i]["address"] === tx.innerTransactions[0].recipientAddress.plain() ,
                    // bridgeData[i]["hash"] === tx.innerTransactions[0].message.payload)
                    // console.log(bridgeData[i]["hash"],tx.innerTransactions[0].message.payload)
                    if(
                        tx.innerTransactions[0].type == TransactionType.TRANSFER &&
                        bridgeData[i]["amount"] === tx.innerTransactions[0].mosaics[0].amount.compact() &&
                        bridgeData[i]["address"] === tx.innerTransactions[0].recipientAddress.plain() &&
                        bridgeData[i]["hash"] === tx.innerTransactions[0].message.payload
                    ){
                        console.log("validation ok")
                        const cosigtx = CosignatureTransaction.create(partial.data[t]);
                        const sct = m_account.signCosignatureTransaction(cosigtx);
                        await txRepo.announceAggregateBondedCosignature(sct).toPromise();
                        bridgeData.splice(i,1);
                        console.log("signed:",sct.parentHash)

                    }else{
                        console.log(partial.data[t])
                        console.log("transaction error:",partial.data[t].transactionInfo.hash)
                    }
                }

            }else{
                console.log("structure error:",partial.data[t].transactionInfo.hash)
            }

        }
    }

}
searchPartial(m_account.address)


