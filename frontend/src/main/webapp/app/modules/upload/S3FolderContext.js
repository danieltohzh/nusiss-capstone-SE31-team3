import React, { createContext, useState } from 'react';

export const S3FolderContext = createContext();

export const S3FolderProvider = ({ children }) => {
  const [folders, setFolders] = useState([]);
  const [dropzoneChanged, setDropzoneChanged] = useState(false);

  return (
    <S3FolderContext.Provider value={{ folders, setFolders, dropzoneChanged, setDropzoneChanged }}>
      {children}
    </S3FolderContext.Provider>
  );
};


