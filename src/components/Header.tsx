import React from 'react';
import { Navbar, NavbarProps } from './Navbar';

/**
 * Header component for It's Simple.
 * Houses brand identity, timezone clock, navigation links,
 * the discrete Direct Messages & Notices system, and user profile controls.
 */
export const Header: React.FC<NavbarProps> = (props) => {
  return <Navbar {...props} />;
};

export { Navbar, type NavbarProps };
export default Header;
