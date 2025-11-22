import React from "react";
import "./styles/shared.css";

const LoadingButton = ({ isLoading, children, className = "", ...props }) => {
  return (
    <button
      {...props}
      disabled={isLoading}
      className={`btn ${className} ${isLoading ? "btn-loading" : ""}`}
    >
      {children}
    </button>
  );
};

export default LoadingButton;
