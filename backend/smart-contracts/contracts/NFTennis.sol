// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract NFTennis is ERC721URIStorage, Ownable, ReentrancyGuard {
    uint256 public tokenCounter;
    uint256[] public activeAuctions; // Array che tiene traccia delle aste attive

    struct Auction {
        address payable seller;
        uint256 highestBid;
        address payable highestBidder;
        bool open;
        uint256 endTime;
        uint256 buyNowPrice;
    }

    mapping(uint256 => Auction) public auctions;
    mapping(address => uint256[]) private ownedTokens; // Mappatura degli indirizzi ai loro NFT

    event NFTMinted(uint256 tokenId, address recipient, string tokenURI);
    event AuctionStarted(uint256 tokenId, address seller, uint256 endTime, uint256 buyNowPrice);
    event NewBid(uint256 tokenId, address bidder, uint256 bidAmount);
    event AuctionEnded(uint256 tokenId, address winner, uint256 winningBid);
    event NFTBought(uint256 tokenId, address buyer, uint256 price);
    event TokenTransferred(uint256 tokenId, address from, address to);

    constructor() ERC721("NFTennis", "NFTN") {
        tokenCounter = 0;
    }

    function mintNFT(address recipient, string memory tokenURI) public onlyOwner {
        require(recipient != address(0), "Invalid recipient address");
        require(bytes(tokenURI).length > 0, "Token URI cannot be empty");

        uint256 tokenId = tokenCounter;
        _mint(recipient, tokenId);
        _setTokenURI(tokenId, tokenURI);
        tokenCounter += 1;

        // Aggiornamento della mappatura dei token posseduti
        ownedTokens[recipient].push(tokenId);

        emit NFTMinted(tokenId, recipient, tokenURI);
    }

    // Funzione per gestire il trasferimento e aggiornare ownedTokens
    function _transferToken(address from, address to, uint256 tokenId) internal {
        // Rimuovi il token dalla lista del mittente
        uint256[] storage fromTokens = ownedTokens[from];
        for (uint256 i = 0; i < fromTokens.length; i++) {
            if (fromTokens[i] == tokenId) {
                // Sposta l'ultimo elemento nella posizione corrente
                fromTokens[i] = fromTokens[fromTokens.length - 1];
                // Rimuovi l'ultimo elemento
                fromTokens.pop();
                break;
            }
        }

        // Aggiungi il token alla lista del destinatario
        ownedTokens[to].push(tokenId);
        
        // Esegui il trasferimento standard ERC721
        _transfer(from, to, tokenId);
        
        emit TokenTransferred(tokenId, from, to);
    }

    function startAuction(uint256 tokenId, uint256 duration, uint256 buyNowPrice) public {
        require(ownerOf(tokenId) == msg.sender, "Only the owner can start an auction");
        require(!auctions[tokenId].open, "Auction already open for this token");
        require(duration > 0, "Auction duration must be greater than zero");
        require(buyNowPrice > 0, "Buy now price must be greater than zero");

        auctions[tokenId] = Auction({
            seller: payable(msg.sender),
            highestBid: 0,
            highestBidder: payable(address(0)),
            open: true,
            endTime: block.timestamp + duration,
            buyNowPrice: buyNowPrice
        });

        // Aggiungi l'ID dell'asta all'array activeAuctions
        activeAuctions.push(tokenId);

        emit AuctionStarted(tokenId, msg.sender, auctions[tokenId].endTime, buyNowPrice);
    }

    function bid(uint256 tokenId) public payable nonReentrant {
        Auction storage currentAuction = auctions[tokenId];

        // Check if the auction has expired
        if (block.timestamp >= currentAuction.endTime) {
            // If expired, close the auction automatically
            endAuction(tokenId);
            revert("Auction has already ended");
        }

        require(currentAuction.open, "Auction is closed");
        require(msg.value > currentAuction.highestBid, "Bid must be higher than the current highest bid");
        require(msg.value <= currentAuction.buyNowPrice, "Bid exceeds the buy now price");
        require(msg.sender != currentAuction.seller, "Seller cannot bid");

        // Refund previous highest bidder
        if (currentAuction.highestBidder != address(0)) {
            (bool success, ) = currentAuction.highestBidder.call{value: currentAuction.highestBid}("");
            require(success, "Failed to refund previous bidder");
        }

        currentAuction.highestBid = msg.value;
        currentAuction.highestBidder = payable(msg.sender);

        emit NewBid(tokenId, msg.sender, msg.value);

        // If bid meets or exceeds the buy-now price, end the auction
        if (currentAuction.highestBid >= currentAuction.buyNowPrice) {
            endAuction(tokenId);
        }
    }

    function buyNow(uint256 tokenId) public payable nonReentrant {
        Auction storage currentAuction = auctions[tokenId];
        require(currentAuction.open, "Auction is closed");
        require(msg.value == currentAuction.buyNowPrice, "Must pay the exact buy now price");

        // Refund previous highest bidder
        if (currentAuction.highestBidder != address(0)) {
            (bool success, ) = currentAuction.highestBidder.call{value: currentAuction.highestBid}("");
            require(success, "Failed to refund previous bidder");
        }

        // Chiudi l'asta prima di eseguire il trasferimento
        currentAuction.open = false;

        // Trasferisci l'NFT al compratore usando _transferToken
        _transferToken(currentAuction.seller, msg.sender, tokenId);

        // Trasferisci i fondi al venditore
        (bool successSeller, ) = currentAuction.seller.call{value: msg.value}("");
        require(successSeller, "Failed to transfer funds to seller");

        // Rimuovi l'asta dall'elenco delle aste attive
        for (uint256 i = 0; i < activeAuctions.length; i++) {
            if (activeAuctions[i] == tokenId) {
                activeAuctions[i] = activeAuctions[activeAuctions.length - 1]; // Move the last element to current position
                activeAuctions.pop(); // Remove the last element
                break;
            }
        }

        emit NFTBought(tokenId, msg.sender, msg.value);
    }

    function endAuction(uint256 tokenId) public nonReentrant {
        Auction storage currentAuction = auctions[tokenId];
        require(currentAuction.open, "Auction is already closed");

        // Chiudere l'asta prima di effettuare altre operazioni
        currentAuction.open = false;

        // Se c'è un offerente vincitore
        if (currentAuction.highestBidder != address(0)) {
            // Trasferire l'NFT all'offerente vincitore usando _transferToken
            _transferToken(currentAuction.seller, currentAuction.highestBidder, tokenId);

            // Trasferire i fondi al venditore
            (bool success, ) = currentAuction.seller.call{value: currentAuction.highestBid}("");
            require(success, "Failed to transfer funds to seller");

            emit AuctionEnded(tokenId, currentAuction.highestBidder, currentAuction.highestBid);
        } else {
            // Nessun offerente: l'NFT rimane al venditore
            emit AuctionEnded(tokenId, address(0), 0);
        }

        // Rimuovere l'asta dall'elenco delle aste attive
        for (uint256 i = 0; i < activeAuctions.length; i++) {
            if (activeAuctions[i] == tokenId) {
                activeAuctions[i] = activeAuctions[activeAuctions.length - 1]; // Sostituire con l'ultimo elemento
                activeAuctions.pop(); // Rimuovere l'ultimo elemento
                break;
            }
        }
    }

    // Override di transferFrom per aggiornare ownedTokens
    function transferFrom(address from, address to, uint256 tokenId) public override {
        super.transferFrom(from, to, tokenId);
        
        // Aggiorna la mappatura ownedTokens
        uint256[] storage fromTokens = ownedTokens[from];
        for (uint256 i = 0; i < fromTokens.length; i++) {
            if (fromTokens[i] == tokenId) {
                fromTokens[i] = fromTokens[fromTokens.length - 1];
                fromTokens.pop();
                break;
            }
        }
        
        ownedTokens[to].push(tokenId);
    }
    
    // Override di safeTransferFrom per aggiornare ownedTokens
    function safeTransferFrom(address from, address to, uint256 tokenId) public override {
        super.safeTransferFrom(from, to, tokenId);
        
        // Aggiorna la mappatura ownedTokens
        uint256[] storage fromTokens = ownedTokens[from];
        for (uint256 i = 0; i < fromTokens.length; i++) {
            if (fromTokens[i] == tokenId) {
                fromTokens[i] = fromTokens[fromTokens.length - 1];
                fromTokens.pop();
                break;
            }
        }
        
        ownedTokens[to].push(tokenId);
    }
    
    // Override di safeTransferFrom (con data) per aggiornare ownedTokens
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public override {
        super.safeTransferFrom(from, to, tokenId, data);
        
        // Aggiorna la mappatura ownedTokens
        uint256[] storage fromTokens = ownedTokens[from];
        for (uint256 i = 0; i < fromTokens.length; i++) {
            if (fromTokens[i] == tokenId) {
                fromTokens[i] = fromTokens[fromTokens.length - 1];
                fromTokens.pop();
                break;
            }
        }
        
        ownedTokens[to].push(tokenId);
    }

    // Funzione per ottenere gli NFT posseduti da un indirizzo
    function getOwnedNFTs(address owner) public view returns (uint256[] memory) {
        return ownedTokens[owner];
    }

    // Funzione per ottenere gli ID delle aste attive
    function getActiveAuctions() public view returns (uint256[] memory) {
        return activeAuctions;
    }
}