"use client";

import React from 'react';
import { Navbar, NavbarProps } from './Navbar';

export const Header: React.FC<NavbarProps> = (props) => {
  return <Navbar {...props} />;
};
