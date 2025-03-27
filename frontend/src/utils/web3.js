import Web3 from "web3";
import NFTennisContract from "../utils/NFTennis.json";

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;

let web3;
let contract;
let account;

export const initWeb3 = async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const accounts = await web3.eth.getAccounts();
    account = accounts[0];
    contract = new web3.eth.Contract(NFTennisContract.abi, CONTRACT_ADDRESS);
    return { web3, contract, account };
  } else {
    alert("Please install MetaMask!");
    return null;
  }
};

export { web3, contract, account };
