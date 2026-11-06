// Forwards browser requests for /api/* from the Angular dev server to the
// local workshop API, so the app can use relative URLs.
const port = process.env.API_PORT || '3000';

export default {
  '/api': {
    target: `http://127.0.0.1:${port}`,
    secure: false,
    changeOrigin: false,
  },
};
