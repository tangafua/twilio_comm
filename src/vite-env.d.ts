/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_TWILIO_PHONE_NUMBER: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
  