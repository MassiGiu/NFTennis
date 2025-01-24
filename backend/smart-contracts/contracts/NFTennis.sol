// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract NFTennis is ERC721URIStorage, Ownable {
    uint256 public tokenCounter;

    struct Auction {
        address payable seller;
        uint256 highestBid;
        address payable highestBidder;
        bool open;
        uint256 endTime;
    }

    mapping(uint256 => Auction) public auctions;

    // Eventi per monitorare le azioni
    event NFTMinted(uint256 tokenId, address recipient, string tokenURI);
    event AuctionStarted(uint256 tokenId, address seller, uint256 endTime);
    event NewBid(uint256 tokenId, address bidder, uint256 bidAmount);
    event AuctionEnded(uint256 tokenId, address winner, uint256 winningBid);

    constructor() ERC721("NFTennis", "NFTN") {
        tokenCounter = 0; // Inizializza il contatore dei token
    }

    /**
     * @dev Crea un nuovo NFT e lo assegna al destinatario. Solo il proprietario può eseguire questa funzione.
     * @param recipient L'indirizzo che riceverà l'NFT.
     * @param tokenURI URI dei metadati dell'NFT.
     */
    function mintNFT(address recipient, string memory tokenURI) public onlyOwner {
        // Controlli: recipient non può essere l'indirizzo zero
        require(recipient != address(0), "Invalid recipient address");
        // Controllo: tokenURI non può essere vuoto
        require(bytes(tokenURI).length > 0, "Token URI cannot be empty");

        uint256 tokenId = tokenCounter;
        _mint(recipient, tokenId); // Mint del nuovo NFT
        _setTokenURI(tokenId, tokenURI); // Imposta l'URI dei metadati
        tokenCounter += 1;

        emit NFTMinted(tokenId, recipient, tokenURI); // Emissione evento
    }

    /**
     * @dev Avvia un'asta per un NFT. Solo il proprietario dell'NFT può avviare l'asta.
     * @param tokenId ID del token da mettere all'asta.
     * @param duration Durata dell'asta in secondi.
     */
    function startAuction(uint256 tokenId, uint256 duration) public {
        // Controlli: solo il proprietario può avviare l'asta
        require(ownerOf(tokenId) == msg.sender, "Only the owner can start an auction");
        // Controllo: l'asta deve essere chiusa
        require(!auctions[tokenId].open, "Auction already open for this token");
        // Controllo: durata dell'asta deve essere positiva
        require(duration > 0, "Auction duration must be greater than zero");

        auctions[tokenId] = Auction({
            seller: payable(msg.sender),
            highestBid: 0,
            highestBidder: payable(address(0)),
            open: true,
            endTime: block.timestamp + duration
        });

        emit AuctionStarted(tokenId, msg.sender, auctions[tokenId].endTime); // Emissione evento
    }

    /**
     * @dev Effettua un'offerta per un NFT all'asta.
     * @param tokenId ID del token per cui si vuole fare un'offerta.
     */
    function bid(uint256 tokenId) public payable {
        Auction storage auction = auctions[tokenId];
        // Controllo: l'asta deve essere aperta
        require(auction.open, "Auction is closed");
        // Controllo: l'asta deve essere ancora attiva
        require(block.timestamp < auction.endTime, "Auction has ended");
        // Controllo: l'offerta deve essere maggiore della precedente
        require(msg.value > auction.highestBid, "Bid must be higher than the current highest bid");

        // Rimborsa il precedente miglior offerente
        if (auction.highestBidder != address(0)) {
            (bool success, ) = auction.highestBidder.call{value: auction.highestBid}("");
            require(success, "Failed to refund previous bidder");
        }

        auction.highestBid = msg.value;
        auction.highestBidder = payable(msg.sender);

        emit NewBid(tokenId, msg.sender, msg.value); // Emissione evento
    }

    /**
     * @dev Termina un'asta e trasferisce l'NFT al miglior offerente.
     * @param tokenId ID del token all'asta.
     */
    function endAuction(uint256 tokenId) public {
        Auction storage auction = auctions[tokenId];
        // Controllo: l'asta deve essere chiusa
        require(auction.open, "Auction is already closed");
        // Controllo: l'asta deve essere terminata
        require(block.timestamp >= auction.endTime, "Auction has not ended yet");
        // Controllo: solo il venditore può terminare l'asta
        require(auction.seller == msg.sender, "Only the seller can end the auction");

        auction.open = false;

        if (auction.highestBidder != address(0)) {
            // Trasferisce l'NFT al miglior offerente
            _transfer(auction.seller, auction.highestBidder, tokenId);
            // Trasferisce i fondi al venditore
            (bool success, ) = auction.seller.call{value: auction.highestBid}("");
            require(success, "Failed to transfer funds to seller");

            emit AuctionEnded(tokenId, auction.highestBidder, auction.highestBid); // Emissione evento
        } else {
            // Nessuna offerta valida, asta chiusa senza vincitore
            emit AuctionEnded(tokenId, address(0), 0);
        }
    }

    /**
     * @dev Funzione di emergenza per cancellare un'asta (può essere invocata solo dal proprietario dell'NFT).
     * @param tokenId ID del token da annullare.
     */
    function cancelAuction(uint256 tokenId) public {
        Auction storage auction = auctions[tokenId];
        // Controllo: l'asta deve essere aperta
        require(auction.open, "Auction is not open");
        // Controllo: solo il venditore può annullare l'asta
        require(auction.seller == msg.sender, "Only the seller can cancel the auction");

        auction.open = false;
        emit AuctionEnded(tokenId, address(0), 0); // Emissione evento per annullamento asta
    }
}
