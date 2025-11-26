import React from 'react';

type LogoProps = {
  /** Pixel size for the logo height; width scales automatically */
  height?: number;
};

// Navigation logo used in sidebar
const Logo: React.FC<LogoProps> = ({ height = 32 }) => {
  return (
    <img
      src="/Navigationlogo.svg"
      alt="PRS navigation logo"
      style={{
        height,
        width: 'auto',
        display: 'block',
      }}
    />
  );
};

export default Logo;


