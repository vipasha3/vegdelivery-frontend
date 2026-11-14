// src/config.js
const hostname = window.location.hostname;
const envCountry = import.meta.env.VITE_COUNTRY;

let currentCountry = 'guinea'; // Default

// જો VITE_COUNTRY માં liberia આપેલું હોય અથવા URL માં liberia હોય
if ((envCountry && envCountry.toLowerCase() === 'liberia') || hostname.includes('liberia')) {
  currentCountry = 'liberia';
} else if ((envCountry && envCountry.toLowerCase() === 'freetown') || hostname.includes('freetown')) {
  currentCountry = 'freetown';
}

const configs = {
  guinea: {
    countryCode: 'gn',
    appName: "GUINEA GREENS",
    currency: "GNF",
    defaultPhone: "+224620721028",
    paymentName: "Orange Money"
  },
  liberia: {
    countryCode: 'lr',
    appName: "LIBERIA GREENS",
    currency: "LRD",
    defaultPhone: "+231XXXXXXXXX",
    paymentName: "Mobile Money"
  },
  freetown: {
    countryCode: 'sl',
    appName: "FREETOWN GREENS",
    currency: "SLL",
    defaultPhone: "+232XXXXXXXXX",
    paymentName: "Orange Money / Africell"
  }
};

export const AppConfig = configs[currentCountry];
console.log("Current Active Country Config:", AppConfig); // 👈 આ કોન્સોલ લોગ ઉમેરી દો
