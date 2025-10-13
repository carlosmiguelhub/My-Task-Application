import React from "react";
import { FaFacebook, FaInstagram, FaLinkedin, FaGithub } from "react-icons/fa";


const Footer = () => {
  return (
    <footer className="bg-white shadow-inner py-4 px-6 flex flex-col sm:flex-row justify-between items-center text-slate-600 text-sm">
      <div className="flex gap-4 text-slate-500 text-lg">
        <FaFacebook className="hover:text-blue-600 cursor-pointer" />
        <FaInstagram className="hover:text-pink-500 cursor-pointer" />
        <FaLinkedin className="hover:text-blue-700 cursor-pointer" />
        <FaGithub className="hover:text-gray-700 cursor-pointer" />
      </div>

      <p className="text-center my-2 sm:my-0">
        © Task Master 2025. All rights reserved.
      </p>

      <p className="font-medium text-slate-700">
        Carlos Miguel B. Bermejo - MIT 1
      </p>
    </footer>
  );
};

export default Footer;
