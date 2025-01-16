const express = require("express");
const { Web3 } = require("web3"); // Assicurati che sia compatibile
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5001;

// Middleware
app.use(express.json());

// Connect to Ganache
let web3;
try {
  web3 = new Web3("http://127.0.0.1:7545"); // URL di Ganache
} catch (error) {
  console.error("Failed to connect to Ganache:", error);
  process.exit(1);
}

// Load contract ABI and address
let contractABI;
try {
  const contractJSON = fs.readFileSync(
    path.resolve(__dirname, "smart-contracts/build/contracts/NFTennis.json")
  );
  contractABI = JSON.parse(contractJSON).abi;
} catch (error) {
  console.error("Failed to load contract ABI:", error);
  process.exit(1);
}

const contractAddress = "0x2C6F45A82984A07a84248598d232Fe964Ed22c20";
let nftennisContract;
try {
  nftennisContract = new web3.eth.Contract(contractABI, contractAddress);
} catch (error) {
  console.error("Failed to create contract instance:", error);
  process.exit(1);
}

// API routes
app.get("/", (req, res) => {
  res.send("NFTennis Backend is running...");
});

// Example route: Fetch all NFTs (stub function for now)
app.get("/api/nfts", async (req, res) => {
    try {
      // Example logic: Replace with actual contract calls
      const totalTokens = await nftennisContract.methods.tokenCounter().call();
      
      // Convert totalTokens to a string or number
      res.json({ totalTokens: totalTokens.toString() }); // Convert to string
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "An error occurred while fetching NFTs" });
    }
  });

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
