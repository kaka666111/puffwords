// utils/unsplash.js
const axios = require('axios');
require('dotenv').config();

async function getUnsplashImage(word) {
  try {
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query: word,
        per_page: 1
      },
      headers: {
        Authorization: process.env.UNSPLASH_KEY || 'Client-ID 4oCOzup4VpQ8VwXVBLXJc2oM1jgIwtxfqllujmdW7PI'
      }
    });

    if (response.data.results.length > 0) {
      return {
        url: response.data.results[0].urls.small,
        credit: response.data.results[0].user.name
      };
    }
    return null;
    
  } catch (error) {
    console.error('Unsplash API错误:', error.response?.status);
    return null;
  }
}

module.exports = getUnsplashImage;