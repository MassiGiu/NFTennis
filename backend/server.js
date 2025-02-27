const express = require('express');
const cors = require('cors');
const { Web3 } = require('web3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data'); // Per caricare file (immagini e video)
const multer = require('multer');

// Configura Multer per salvare i file in memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max per file
  fileFilter: (req, file, cb) => {
    // Controllo se il file è un'immagine o un video
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm'];
    if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and videos are allowed.'));
    }
  }
}); // 50MB max

// Inizializza l'applicazione Express
const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const corsOptions = {
  origin: 'http://localhost:3000', // Modifica questo con il tuo frontend
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Verifica variabili d'ambiente
if (!process.env.CONTRACT_ADDRESS || !process.env.OWNER_ADDRESS) {
  console.error("Error: Missing required environment variables.");
  process.exit(1);
}

// Connect to Ganache
const web3 = new Web3('http://127.0.0.1:7545');

// Load contract ABI
const contractPath = path.resolve(__dirname, 'smart-contracts/build/contracts/NFTennis.json');
if (!fs.existsSync(contractPath)) {
  console.error("Error: Contract ABI file not found.");
  process.exit(1);
}
const nftContractABI = JSON.parse(fs.readFileSync(contractPath)).abi;

// Contract address and owner
const nftContractAddress = process.env.CONTRACT_ADDRESS;
const ownerAddress = process.env.OWNER_ADDRESS;

// Contract instance
const nftennisContract = new web3.eth.Contract(nftContractABI, nftContractAddress);

// Importare le route
const nftRoutes = require('./app/routes/nft_routes')(nftennisContract, web3, ownerAddress);
app.use('/api/nfts', nftRoutes);

// API per la creazione dell'NFT
app.post('/api/mint', upload.single('file'), async (req, res) => {
  const { recipient, name, description, rarity } = req.body;

  // Validazione dei dati
  if (recipient !== ownerAddress) {
    return res.status(400).json({ error: "Only owner can create NFT." });
  }
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: "Invalid name." });
  }
  if (!description || typeof description !== 'string' || description.trim() === '') {
    return res.status(400).json({ error: "Invalid description." });
  }

  // Converti rarity in un intero
  const rarityNumber = parseInt(rarity, 10);
  if (![0, 1, 2].includes(rarityNumber)) {
    return res.status(400).json({ error: "Invalid rarity. Must be 0 (Common), 1 (Rare), or 2 (Legendary)." });
  }

  try {
    // Validazione file
    if (!req.file) {
      return res.status(400).json({ error: "File is required." });
    }

    // Determinare il tipo di file (immagine o video)
    const fileType = req.file.mimetype;
    let fileURI;

    // Carica il file su Pinata
    const form = new FormData();
    form.append('file', req.file.buffer, { filename: req.file.originalname });

    const fileResponse = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      form,
      {
        headers: {
          ...form.getHeaders(),
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_API_SECRET,
        },
      }
    );

    // Genera l'URI del file su Pinata
    fileURI = `https://gateway.pinata.cloud/ipfs/${fileResponse.data.IpfsHash}`;
    console.log("File uploaded to Pinata:", fileURI);

    // Creazione dei metadati
    const metadata = {
      name,
      description,
      attributes: [{ trait_type: "Rarity", value: rarityNumber }],
    };

    // Aggiungi il campo file basato sul tipo di file
    if (fileType.includes("image")) {
      metadata.image = fileURI; // Immagine
    } else if (fileType.includes("video")) {
      metadata.video = fileURI; // Video
    } else {
      return res.status(400).json({ error: "Unsupported file type. Only images and videos are allowed." });
    }

    // Carica i metadati su Pinata
    const metadataResponse = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      metadata,
      {
        headers: {
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_API_SECRET,
        },
      }
    );

    const tokenURI = `https://gateway.pinata.cloud/ipfs/${metadataResponse.data.IpfsHash}`;
    console.log("Metadata uploaded to Pinata:", tokenURI);

    // Passaggio dei dati a nft_routes
    const mintResponse = await axios.post(
      `http://localhost:${port}/api/nfts/mint`,
      { recipient, tokenURI },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    res.status(200).send({ message: "NFT minted successfully", mintResponse: mintResponse.data });
  } catch (error) {
    console.error("Error in /api/mint:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.error || error.message });
  }
});

// Funzione per chiudere automaticamente le aste scadute ogni 30 secondi
setInterval(() => {
  console.log("Checking for expired auctions...");
  closeExpiredAuctions();
}, 30000);  // 30 secondi

// Funzione che chiude le aste scadute
async function closeExpiredAuctions() {
  try {
    // Ottieni gli ID delle aste attive
    const auctionIds = await nftennisContract.methods.getActiveAuctions().call();

    // Itera attraverso gli ID delle aste attive
    for (let i = 0; i < auctionIds.length; i++) {
      const tokenId = auctionIds[i];

      // Recupera i dettagli dell'asta
      const auction = await nftennisContract.methods.auctions(tokenId).call();

      // Verifica se l'asta è scaduta
      if (auction.endTime <= Date.now() / 1000 && auction.open) {
        // Chiudi l'asta
        await nftennisContract.methods.endAuction(tokenId).send({ from: ownerAddress, gas: 500000 });
        console.log(`Auction for token ${tokenId} ended successfully.`);
      }
    }
  } catch (error) {
    console.error("Error checking or closing auctions:", error);
  }
}


// Avvio del server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
