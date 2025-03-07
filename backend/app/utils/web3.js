const { Web3 } = require('web3');
require('dotenv').config();

// Importa l'ABI del contratto direttamente come JSON
const NFTennisContract = require('../../smart-contracts/build/contracts/NFTennis.json'); // Importa l'ABI

// Connetti a Ganache o alla rete desiderata
const web3 = new Web3('http://127.0.0.1:7545'); // Modifica con il tuo endpoint

// Verifica variabili d'ambiente
if (!process.env.CONTRACT_ADDRESS || !process.env.OWNER_ADDRESS) {
  throw new Error("Missing required environment variables.");
}

// Indirizzo del contratto
const nftContractAddress = process.env.CONTRACT_ADDRESS;
const ownerAddress = process.env.OWNER_ADDRESS;

// Crea l'istanza del contratto
const nftennisContract = new web3.eth.Contract(NFTennisContract.abi, nftContractAddress);

// Esporta la connessione al contratto
module.exports = {
  web3,
  nftennisContract,
  ownerAddress,
};
