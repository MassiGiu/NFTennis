const express = require('express');
const cors = require('cors');
const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(express.json());

const corsOptions = {
  origin: 'http://localhost:3000', // Permette le richieste solo dal dominio del frontend
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions)); // Usa il middleware CORS con le opzioni configurate

// Connect to Ganache
const web3 = new Web3('http://127.0.0.1:7545');

// Load contract ABI
const nftContractABI = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'smart-contracts/build/contracts/NFTennis.json'))
).abi;

// Contract address
const nftContractAddress = process.env.CONTRACT_ADDRESS;

// Owner address
const ownerAddress = process.env.OWNER_ADDRESS;

// Contract instance
const nftennisContract = new web3.eth.Contract(nftContractABI, nftContractAddress);

console.log('NFT Contract:', nftennisContract.options.address);
console.log('Owner', ownerAddress);

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const nftRoutes = require('./app/routes/nft_routes')(nftennisContract, web3, ownerAddress);
app.use('/api/nfts', nftRoutes);

const auctionRoutes = require('./app/routes/auction_routes')(nftennisContract, web3, ownerAddress);
app.use('/api/nfts/auction', auctionRoutes);

// Add route for minting NFT (protected by owner check)
app.post('/api/nfts/mint', async (req, res) => {
  const { recipient, tokenURI } = req.body;

  try {
    // Ottieni gli account disponibili in Web3
    const accounts = await web3.eth.getAccounts();

    // Log dell'account corrente
    console.log("Account connesso:", accounts[0]);
    console.log("Indirizzo proprietario:", ownerAddress);

    // Verifica se l'account che sta chiamando la funzione è il proprietario
    if (accounts[0].toLowerCase() !== ownerAddress.toLowerCase()) {
      console.log("L'account connesso non è il proprietario!");
      return res.status(403).send('Only the owner can mint NFTs');
    }

    // Call mintNFT function from the smart contract
    const tx = await nftennisContract.methods
      .mintNFT(recipient, tokenURI)
      .send({ from: accounts[0] });

    // Risposta positiva
    res.status(200).send({ message: 'NFT created successfully', transaction: tx });
  } catch (error) {
    // Gestione degli errori
    console.error("Errore nella creazione dell'NFT:", error);
    res.status(500).send('Error creating NFT');
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
