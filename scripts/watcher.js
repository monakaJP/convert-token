const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const { AggregateTransaction, Deadline, TransferTransaction, Address, Mosaic, UInt64, PlainMessage, NetworkType, PublicAccount, TransactionService, TransactionHttp, HashLockHttp, ReceiptHttp, HashLockTransaction, Listener, Account, NamespaceHttp, MosaicId, TransactionType } = require('symbol-sdk');

const web3 = createAlchemyWeb3(`wss://eth-sepolia.g.alchemy.com/v2/***`);

const CONTRACT_ADDRESS = "0x72f09C2b0e3afB935CdED47Dd27106B335026Cdc";

const multisig_address = PublicAccount.createFromPublicKey(
    "****",
    NetworkType.TEST_NET
);
const m_account = Account.createFromPrivateKey(
    "****",
    NetworkType.TEST_NET
);


const mid = new MosaicId("1BA8011E3CF54F48");
const gene = "****";
const ep = 1667250467;
const node = "***";
const wsEndpoint = node.replace('http', 'ws') + "/ws";
const txRepo = new TransactionHttp(node);
const receiptRepo = new ReceiptHttp(node);
const nameRepo = new NamespaceHttp(node);
const txService = new TransactionService(txRepo, receiptRepo);
const listener = new Listener(wsEndpoint,nameRepo);

var wait_confirm = [];
// var wait_sig = [];
// var cosig1 = {};
// var cosig2 = {};
listener.open().then(() => {
    listener.newBlock()
    .subscribe( block =>{
        console.log("block:",block.height.compact());
        
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
    console.log("reshash:",result.transactionHash)
    let amount;
    let address;
    web3.eth.getTransactionReceipt(result.transactionHash).then((x)=>{
        for (const log of x.logs) {
            if (log.topics.includes(transferTopic)) {
              const decodedLog = web3.eth.abi.decodeLog(
                [
                  { type: 'address', name: 'from', indexed: true },
                  { type: 'address', name: 'to', indexed: true },
                  { type: 'uint256', name: 'value', indexed: false },
                ],
                log.data,
                [log.topics[1], log.topics[2], log.topics[3]]
                );
                amount = Number(decodedLog.value);
                console.log(amount, decodedLog.value);
                web3.eth.getTransaction(result.transactionHash, function(error, tx) {
                    if (!error ) {
                        address = web3.utils.hexToAscii(tx.input).replace(/\0/g, '').trim().slice(-39,);
                        if(
                            Address.isValidRawAddress(address)&&
                            Address.createFromRawAddress(address).networkType === NetworkType.TEST_NET
                        ){
                            console.log("Validation succeeded");
                            const gt = createWithdraw(address, amount, result.transactionHash);
                            announceWithHashlock(gt, m_account);
                        }else{
                            console.log("Invalid address");
                        }
                    } else {
                      console.log(error);
                    }
                });
            }
          }
    });
    // web3.eth.getTransaction(result.transactionHash, function(error, tx) {
    //     if (!error ) {
    //         address = web3.utils.hexToAscii(tx.input).replace(/\0/g, '').trim().slice(-39,);
    //         if(
    //             Address.isValidRawAddress(address)&&
    //             Address.createFromRawAddress(address).networkType === NetworkType.TEST_NET
    //         ){
    //             console.log("Validation succeeded");
    //             const gt = createWithdraw(address, amount, result.transactionHash);
    //             announceWithHashlock(gt, m_account);
    //         }else{
    //             console.log("Invalid address");
    //         }
    //     } else {
    //       console.log(error);
    //     }
    // });

  }
})
.on("error", console.error);


const createWithdraw = (address, amount, hash) =>{
    const token = new Mosaic( mid, UInt64.fromUint(amount));

    const jit = TransferTransaction.create(
        Deadline.create(ep),
        Address.createFromRawAddress(address),
        [
            token
        ],
        PlainMessage.create(hash),
        NetworkType.TEST_NET
    ).toAggregate(multisig_address);
    const tx = AggregateTransaction.createBonded(
        Deadline.create(ep, 48),
        [
            jit
        ],
        NetworkType.TEST_NET,
        []
    ).setMaxFeeForAggregate(100,2);

    return tx
}

const announceWithHashlock = async (tx, account) =>{
    const stx = account.sign(tx, gene);
    const htx = HashLockTransaction.create(
        Deadline.create(ep),
        new Mosaic(new MosaicId("72C0212E67A08BCE"), UInt64.fromUint(10*Math.pow(10,6))),
        UInt64.fromUint(2*24*60*2),
        stx,
        NetworkType.TEST_NET
    ).setMaxFee(100);
    const shtx = account.sign(htx,gene);
    console.log("htx:",shtx.hash)
    console.log("stx:",stx.hash)
    console.log("sending hashlock:", shtx.hash);
    // await txRepo.announce(shtx).toPromise();
    // wait_confirm.push({hash:stx.hash,signed:stx});
    await txService.announceHashLockAggregateBonded(shtx,stx,listener).toPromise();
    // await txService.announce(shtx, listener).toPromise();
    // console.log("sending boded", shtx.hash);
    // await sleep(10000);
    // console.log("sending boded", stx.hash);
    // await txService.announceAggregateBonded(stx, listener).toPromise();
    // console.log("send transaction");
}

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
// const search = async (address) =>{

//         const partial = await txRepo.search(
//             {
//                 group: TransactionGroup.Confirmed,
//                 address :address,
//                 order: Order.Desc,
//                 pageSize: 100
//                 // embedded:true
//             }).toPromise()
//         console.log("partial length:", partial.data.length)
//         for(t = 0; t<partial.data.length ; t++){
//             const tx  = await txRepo.getTransaction(partial.data[t].transactionInfo.hash, TransactionGroup.Partial).toPromise();
//             // console.log(
//             //     !tx.signedByAccount(m_account.publicAccount) ,
//             //     tx.signer.equals(multisig_sender) ,
//             //     tx.innerTransactions.length === 1 ,
//             //     tx.innerTransactions[0].mosaics.length === 1)
//             if(
//                 // validate aggregate transaction structure
//                 !tx.signedByAccount(m_account.publicAccount) &&
//                 tx.signer.equals(multisig_sender) &&
//                 tx.innerTransactions.length === 1 &&
//                 tx.innerTransactions[0].mosaics.length === 1
//             ){
//                 // validate transaction information
//                 for(i=0;i<bridgeData.length;i++){
//                     // console.log( tx.innerTransactions[0].type == TransactionType.TRANSFER ,
//                     // bridgeData[i]["amount"] === tx.innerTransactions[0].mosaics[0].amount.compact() ,
//                     // bridgeData[i]["address"] === tx.innerTransactions[0].recipientAddress.plain() ,
//                     // bridgeData[i]["hash"] === tx.innerTransactions[0].message.payload)
//                     // console.log(bridgeData[i]["hash"],tx.innerTransactions[0].message.payload)
//                     if(
//                         tx.innerTransactions[0].type == TransactionType.TRANSFER &&
//                         bridgeData[i]["amount"] === tx.innerTransactions[0].mosaics[0].amount.compact() &&
//                         bridgeData[i]["address"] === tx.innerTransactions[0].recipientAddress.plain() &&
//                         bridgeData[i]["hash"] === tx.innerTransactions[0].message.payload
//                     ){
//                         console.log("validation ok")
//                         const cosigtx = CosignatureTransaction.create(partial.data[t]);
//                         const sct = m_account.signCosignatureTransaction(cosigtx);
//                         await txRepo.announceAggregateBondedCosignature(sct).toPromise();
//                         bridgeData.splice(i,1);
//                         console.log("signed:",sct.parentHash)

//                     }else{
//                         console.log("transaction error:",partial.data[t].transactionInfo.hash)
//                     }
//                 }

//             }else{
//                 console.log("structure error:",partial.data[t].transactionInfo.hash)
//             }

//         }


// }
