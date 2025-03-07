const express = require('express');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const { nftennisContract, web3, ownerAddress } = require('./app/utils/web3');

// Configurazione
const app = express();
const port = process.env.PORT || 5001;
const AUCTION_CHECK_INTERVAL = 20000; // 20 secondi
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Costanti
const FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/png', 'image/gif'],
  VIDEO: ['video/mp4', 'video/webm']
};

// Allineamento con enums del contratto
const MEDIA_TYPE = {
  IMAGE: 0,
  VIDEO: 1
};

const RARITY_LEVELS = {
  COMMON: 0,
  RARE: 1,
  LEGENDARY: 2,
  MASTERPIECE: 3  // Aggiunto MASTERPIECE
};

// Configurazione Multer
const multerStorage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [...FILE_TYPES.IMAGE, ...FILE_TYPES.VIDEO];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo di file non valido. Solo immagini e video sono permessi.'));
    }
  }
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200
}));

// Importazione delle routes
const nftRoutes = require('./app/routes/nft_routes')(nftennisContract, web3, ownerAddress);
app.use('/api/nfts', nftRoutes);

// Helper Functions
async function uploadToPinata(file, filename) {
  const form = new FormData();
  form.append('file', file, { filename });

  const response = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    form,
    {
      headers: {
        ...form.getHeaders(),
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_API_SECRET
      }
    }
  );

  return `https://indigo-academic-trout-818.mypinata.cloud/ipfs/${response.data.IpfsHash}`;
}

async function uploadMetadataToPinata(metadata) {
  const response = await axios.post(
    "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    metadata,
    {
      headers: {
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_API_SECRET
      }
    }
  );

  return `https://indigo-academic-trout-818.mypinata.cloud/ipfs/${response.data.IpfsHash}`;
}

// Aggiornato per includere rarity e mediaType
async function mintNFT(recipient, tokenURI, rarity, mediaType) {
  return await axios.post(
    `http://localhost:${port}/api/nfts/mint`,
    { recipient, tokenURI, rarity, mediaType },
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}

async function closeExpiredAuctions() {
  try {
    const auctionIds = await nftennisContract.methods.getActiveAuctions().call();
    const currentTime = Math.floor(Date.now() / 1000);

    for (const tokenId of auctionIds) {
      const auction = await nftennisContract.methods.auctions(tokenId).call();

      if (auction.open && auction.endTime <= currentTime) {
        await nftennisContract.methods.endAuction(tokenId).send({ 
          from: ownerAddress, 
          gas: 500000 
        });
        console.log(`Asta per il token ${tokenId} terminata con successo.`);
      }
    }
  } catch (error) {
    console.error("Errore durante il controllo o la chiusura delle aste:", error);
  }
}

// Controller aggiornato
async function mintNFTController(req, res) {
  const { recipient, name, description, rarity } = req.body;

  // Validazione
  if (recipient !== ownerAddress) {
    return res.status(403).json({ error: "Solo il proprietario può creare NFT." });
  }
  
  if (!name?.trim()) {
    return res.status(400).json({ error: "Nome non valido." });
  }
  
  if (!description?.trim()) {
    return res.status(400).json({ error: "Descrizione non valida." });
  }

  // Validazione rarità
  const rarityNumber = parseInt(rarity, 10);
  if (isNaN(rarityNumber) || rarityNumber < 0 || rarityNumber > 3) {
    return res.status(400).json({ 
      error: "Rarità non valida. Deve essere 0 (Comune), 1 (Raro), 2 (Leggendario) o 3 (Capolavoro)."
    });
  }

  if (!req.file) {
    return res.status(400).json({ error: "File richiesto." });
  }

  try {
    // Determina mediaType in base al MIME type
    let mediaType;
    if (FILE_TYPES.IMAGE.includes(req.file.mimetype)) {
      mediaType = MEDIA_TYPE.IMAGE;
      // Validazione rarità per immagini (deve essere 0, 1 o 2)
      if (rarityNumber === RARITY_LEVELS.MASTERPIECE) {
        return res.status(400).json({ 
          error: "Le immagini non possono avere rarità MASTERPIECE. Scegli COMMON, RARE o LEGENDARY."
        });
      }
    } else if (FILE_TYPES.VIDEO.includes(req.file.mimetype)) {
      mediaType = MEDIA_TYPE.VIDEO;
      // Validazione rarità per video (deve essere 3)
      if (rarityNumber !== RARITY_LEVELS.MASTERPIECE) {
        return res.status(400).json({ 
          error: "I video devono avere rarità MASTERPIECE."
        });
      }
    } else {
      return res.status(400).json({ 
        error: "Tipo di file non supportato. Solo immagini e video sono permessi."
      });
    }

    // Caricamento del file
    const fileURI = await uploadToPinata(req.file.buffer, req.file.originalname);
    console.log("File caricato su Pinata:", fileURI);

    // Creazione dei metadati
    const metadata = {
      name,
      description,
      attributes: [
        { trait_type: "Rarity", value: getRarityName(rarityNumber) },
        { trait_type: "Media Type", value: mediaType === MEDIA_TYPE.IMAGE ? "Image" : "Video" }
      ]
    };

    // Aggiungi l'URI del file in base al tipo
    if (mediaType === MEDIA_TYPE.IMAGE) {
      metadata.image = fileURI;
    } else {
      metadata.animation_url = fileURI; // Campo standard per video/animazioni in metadati NFT
    }

    // Carica i metadati
    const tokenURI = await uploadMetadataToPinata(metadata);
    console.log("Metadati caricati su Pinata:", tokenURI);

    // Conia l'NFT
    const mintResponse = await mintNFT(recipient, tokenURI, rarityNumber, mediaType);
    
    res.status(200).json({ 
      message: "NFT coniato con successo", 
      data: mintResponse.data 
    });
  } catch (error) {
    console.error("Errore in /api/mint:", error.response?.data || error.message);
    res.status(500).json({ 
      error: "Errore durante la creazione dell'NFT",
      details: error.response?.data?.error || error.message
    });
  }
}

// Funzione di supporto per ottenere il nome della rarità
function getRarityName(rarityNumber) {
  switch(rarityNumber) {
    case RARITY_LEVELS.COMMON: return "Common";
    case RARITY_LEVELS.RARE: return "Rare";
    case RARITY_LEVELS.LEGENDARY: return "Legendary";
    case RARITY_LEVELS.MASTERPIECE: return "Masterpiece";
    default: return "Unknown";
  }
}

// Routes
app.post('/api/mint', multerStorage.single('file'), mintNFTController);

// Controllo automatico delle aste
setInterval(() => {
  console.log("Controllo delle aste scadute...");
  closeExpiredAuctions();
}, AUCTION_CHECK_INTERVAL);

// Avvio del server
app.listen(port, () => {
  console.log(`Server in esecuzione su http://localhost:${port}`);
});