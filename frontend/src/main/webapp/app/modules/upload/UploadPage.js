import React from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import ImageUpload from './ImageUpload';
import ImageLabel from './ImageLabel';

function UploadPage() {
  const navigate = useNavigate();
  const location = useLocation();

  let loginState = "";

  // Check if location.state exists before accessing its properties
  if (location.state && location.state.loginState != null) {
    loginState = location.state.loginState;
  }

  return (
    <>
      <ImageUpload/>
      <ImageLabel/>
    </>
  );

}

export default UploadPage;
