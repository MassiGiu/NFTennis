import React from 'react';
import { Mail, Twitter, Instagram, Facebook, } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="dark-footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-logo">
            <h3>NFTennis</h3>
            <p>Discover, Collect, and Sell NFTs</p>
          </div>
          
          <div className="footer-links">
            <div className="footer-column">
              <h4>Marketplace</h4>
              <ul>
                <li><a href="/">Explore</a></li>
                <li><a href="/">Collections</a></li>
                <li><a href="/">Rankings</a></li>
                <li><a href="/">Activity</a></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h4>Company</h4>
              <ul>
                <li><a href="/">About</a></li>
                <li><a href="/">Careers</a></li>
                <li><a href="/">Contact</a></li>
                <li><a href="/">Blog</a></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h4>Support</h4>
              <ul>
                <li><a href="/">Help Center</a></li>
                <li><a href="/">Terms of Service</a></li>
                <li><a href="/">Privacy Policy</a></li>
                <li><a href="/">FAQ</a></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-social">
            <h4>Follow us</h4>
            <div className="social-icons">
              <a href ="\" className="social-icon">
                <Mail size={24} />
              </a>
              <a href ="\" className="social-icon" rel="noopener noreferrer">
                <Twitter size={24} />
              </a>
              <a href ="\" className="social-icon" rel="noopener noreferrer">
                <Instagram size={24} />
              </a>
              <a href ="\" className="social-icon" rel="noopener noreferrer">
                <Facebook size={24} />
              </a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2025 NFTennis. All Rights Reserved.</p>
          <div className="footer-legal-links">
            <a href="/">Terms</a>
            <a href="/">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;