import React from "react";
import { Link } from "react-router-dom";
import './Home.css'

const Home = () => {
  return (
    <div className="nft-home">
      {/* Hero Section con Video Background */}
      <div className="nft-hero">
        {/* Video Background */}
        <div className="nft-video-container">
          <video 
            className="nft-background-video" 
            autoPlay 
            loop 
            muted 
            playsInline
          >
            <source src={`${process.env.PUBLIC_URL}/Intro-Home.mp4`} type="video/mp4" />
            {/* Fallback per browser che non supportano il video */}
            Il tuo browser non supporta i video HTML5.
          </video>
          <div className="nft-overlay"></div>
        </div>
        
        {/* Contenuto Hero */}
        <div className="nft-hero-content">
          <h1 className="nft-hero-title">
          Get in the game
          </h1>
          <Link to="/marketplace" className="nft-hero-button">
          Explore NFT
          </Link>
        </div>
      </div>
      
      {/* Ulteriori sezioni possono essere aggiunte qui sotto */}
      <div className="nft-home-content">
        {/* Ad esempio, sezioni informative, NFT in evidenza, ecc. */}
      </div>
    </div>
  );
};

export default Home;