import logo from './logo.svg';
import './App.css';
import { Account, Address, NetworkType ,NamespaceHttp, Listener, TransactionHttp, PublicAccount} from 'symbol-sdk';
import { useState, useEffect } from 'react'
import Web3 from 'web3'
import { Button, TextField ,Typography, Tab, Tabs, Paper} from '@mui/material';
import ReactLoading from 'react-loading';


const TOKEN_CONTRACT = "0xD028CF91EfF3091D700f99Bd855b71CDD5a0457e";
const CONTRACT_ADDRESS = "0x72f09C2b0e3afB935CdED47Dd27106B335026Cdc";
const FAUCET_ADDRESS = "0x8A5730875D92C074Af1b4c01818f6292CEa67179";

const hogeContract = require("./contracts/HogeCoin.json");
const depositContract = require("./contracts/TokenPoll.json");
const faucetContract = require("./contracts/TokenSender.json")

const node = "http://sym-test-04.opening-line.jp:3000";
const wsEndpoint = node.replace('http', 'ws') + "/ws";
const nameRepo = new NamespaceHttp(node);
const txRepo = new TransactionHttp(node);
const listener = new Listener(wsEndpoint,nameRepo,WebSocket);

const signerPublicAccount = PublicAccount.createFromPublicKey(
  "F90EC29621C62E34BB6754D20EF236E44AA7325FE29D28D48F208582D4564F63",
  NetworkType.TEST_NET
);

function App() {
  const [account, setAccount] = useState(null)
  let [web3, setWeb3] = useState(null)
  const [amount, setAmount] = useState(null)
  const [xAddress, setXAdress] = useState("")
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState("Please input token and the address.");
  const [tabIndex, setTabIndex] = useState(0);
  const [numConfirm, setNumConfirm] = useState(1);
  const [details, setDetails] = useState("");

  const handleTabChange = (event, newTabIndex) => {
    setTabIndex(newTabIndex);
  };


  useEffect(() => {
    checkAccount()
  }, [])


  async function activate() {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        checkAccount()
      } catch (err) {
        console.log('user did not add account...', err)
      }
    }
  }
  function isValidAddress(address){
    return Address.isValidRawAddress(address)
  }

  function inputValidator(){
    return !isValidAddress(xAddress) || 
      !Number.isInteger(amount) ||
      !(amount > 0) ||
      step !== 1 ||
      Address.createFromRawAddress(xAddress).networkType !== NetworkType.TEST_NET
  }
// invoke to check if account is already connected
async function checkAccount() {
  let web3 = new Web3(window.ethereum)
  setWeb3(web3)
  await web3.eth.requestAccounts();
  const accounts = await web3.eth.getAccounts();
  setAccount(accounts[0]);

}

async function claim(){
  const claimContract = new web3.eth.Contract(faucetContract.abi, FAUCET_ADDRESS);
  const claimTx = claimContract.methods.sendToken();
  await claimTx.send({
    from: account,
    gas: 15000000
  });
}


async function convert(){
  try{
    setDescription("Please approve the token");
    setStep(2);
    const hContract = new web3.eth.Contract(hogeContract.abi, TOKEN_CONTRACT);
    const allowance = await hContract.methods.allowance(
      account,
      CONTRACT_ADDRESS
    ).call();
    console.log("Token allowance:",allowance);
    if(amount>allowance){
      const h_approve = hContract.methods.approve(CONTRACT_ADDRESS, amount);
      await h_approve.send({
        from: account,
        gas: 15000000
      });
    }
    const depoCont = new web3.eth.Contract(depositContract.abi, CONTRACT_ADDRESS);
    const depositTx = depoCont.methods.depositToken(
      xAddress,
      TOKEN_CONTRACT,
      amount
    );
    setDescription("Please confirm the contract")
    setStep(3);
    await depositTx.send({
        from: account,
        gas: 15000000
    })
    setDescription("Awaiting approval from multi-sig.");
    setDetails("It takes about 1~2 minutes.")
    setStep(4);
    listener.open().then(() => {
      listener.newBlock()
      .subscribe( block =>{
          console.log("block:",block.height.compact());
          
      },err=>{
        console.error("error");
    });

    listener.confirmed(Address.createFromRawAddress(xAddress))
    .subscribe( tx =>{
      if(tx.signer.equals(signerPublicAccount)){
        setStep(5);
        setDescription("Complete! Please check your address");
        listener.close();
        setDetails("");
      }else{
        console.log("invalid signer");
      }
    },err=>{
      console.error("error");
  });
    });
  }catch(e){
    setDescription("An error occurred, please refresh page and retry")
  }

}
function addressUrl(address){
  return "http://testnet.symbol.fyi/accounts/"+address
}

  return (
    <div className="app">
      <form>
      <div className='toph'>
      <Typography variant="h5" component="h2" sx={{textAlign:"center"}}>
      Token Converter
      </Typography>
      <Tabs value={tabIndex} onChange={handleTabChange}>
          <Tab label="From ERC-20(ETH) to Mosaic(XYM)" />
          {/* <Tab label="From XYM to ETH" /> */}
      </Tabs>
      </div>
        {/* <hr/> */}
        <div className='uiform'>
        <TextField
          name="amount"
          label="Convert Amount"
          sx={{ display: "flex", width: "70%", maxWidth: "500px"}}
          margin="normal"
          onChange={(e)=>{setAmount(Number(e.target.value))}}
        />
        <TextField
          name="address"
          label="Symbol Address"
          sx={{ display: "flex", width: "70%", maxWidth: "500px"}}
          margin="normal"
          onChange={(e)=>{setXAdress((e.target.value).replace(/-/g,""))}}
        />
        {/* {!isValidAddress(xAddress) && <h6>Invalid address</h6>} */}
        <Button variant="contained" 
          onClick={() => {convert()}}
          disabled={inputValidator()}
        >
            Convert
        </Button>

        </div>
        <hr/>
        <Typography variant="h5" component="h2" >Step: {step}/5</Typography>

        <div className='btm'>
        <Typography variant="h6" component="h2" >{description}</Typography>
        <Typography variant="h6" component="h2" >{details}</Typography>
          {(step>1 && step!==5) && <ReactLoading type="spin" />}
          {step===5 && <a target="_blank" href={addressUrl(xAddress)}>Show in the blockchain explorer</a>}
        </div>
        <p>Don't you have any token? Please get it <a target="_blank" href="javascript:claim();">here</a></p>
      </form>
    </div>
  );
}

export default App;
