import React from 'react';
import './dashboard.css';

const AboutUs = () => (
  <div className="aboutus-container-bw">
    <h1>About FinMan</h1>
    <p style={{ color: '#111', fontSize: '1.15rem' }}>
      FinMan is a dedicated platform designed to empower loan vendors in efficiently providing, tracking, and managing loans for their clients. Our solution streamlines the entire loan lifecycle, making it easier for vendors to serve their customers and grow their business with confidence.
    </p>
    <h2>Our Mission</h2>
    <p style={{ color: '#111', fontSize: '1.15rem' }}>
      To simplify and enhance financial management for everyone, making complex processes easy, transparent, and accessible.
    </p>
    <h2>Why Choose Us?</h2>
    <ul style={{ color: '#111', fontSize: '1.15rem' }}>
      <li>Intuitive dashboard for all your financial needs</li>
      <li>Secure and reliable platform</li>
      <li>Expert support and guidance</li>
      <li>Continuous innovation and updates</li>
    </ul>
    <h2>Contact</h2>
    <p style={{ fontSize: '1.15rem' }}>
      Email: <a href="mailto:dtechcode1946@gmail.com">dtechcode1946@gmail.com</a><br/>
      Phone: +91 9724277321
    </p>
    <div style={{ marginTop: 48, textAlign: 'center', fontWeight: 'bold', color: '#111', fontSize: '1.1rem', marginBottom: 10 }}>
      Developed with <span style={{ color: 'red', fontWeight: 'bold' }}>&#10084;&#65039;</span> by DTech
    </div>
  </div>
);

export default AboutUs; 