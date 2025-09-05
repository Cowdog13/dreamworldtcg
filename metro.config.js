const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (process.env.NODE_ENV === 'production') {
  config.publicPath = '/dreamworldtcg/';
}

module.exports = config;