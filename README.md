# NFTennis  

### Description  

**NFTennis** is a decentralized platform designed to allow users to buy, sell, and explore NFTs (Non-Fungible Tokens) related to the world of tennis. The project serves as a marketplace that leverages Ethereum blockchain technology, utilizing smart contracts to ensure secure and transparent transactions.  

### Main Features  

- **Decentralized Marketplace**: Users can browse, purchase, and sell tennis-themed NFTs. Every transaction is securely recorded on the blockchain.  
- **MetaMask Authentication**: Users log in and authenticate using their Ethereum wallet via MetaMask.
- **NFT Management**: Users can upload NFTs, set prices, and view detailed information about each token.  
- **Blockchain Integration**: Smart contracts handle critical operations, such as NFT registration and user-to-user transactions.  

### Technologies Used  

- **Blockchain**: Ethereum  
- **Smart Contracts**: Solidity (Truffle Framework)  
- **Blockchain Emulator**: Ganache  
- **Frontend**: React.js, HTML, CSS, JavaScript  
- **Backend**: Node.js with Express.js  
- **Wallet Integration**: MetaMask  

---

### Installation Instructions  

Follow these steps to set up the project locally.  

#### Backend & Smart Contracts Setup  

1. **Clone the repository**:  
   ```bash
   git clone <repository_url>
   cd NFTennis

2. **Install Truffle**:
   
   Make sure you have Node.js installed, then run:
   ```bash
   npm install -g truffle

3. **Start Ganache**:

   Open Ganache and start a new local blockchain. Note the network address and private keys.

4. **Compile and migrate the smart contracts**:

   Navigate to the project directory and compile the contracts, then deploy the contracts to the local blockchain:
   ```bash
   truffle compile
   truffle migrate --network development

5. **Set up and run the backend**:
   ```bash
   cd backend
   npm install
   node server.js

#### Frontend Setup 
1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   
2. **Install dependencies**:
   ```bash
   npm install

3. **Start the React application**:
   ```bash
   npm start
