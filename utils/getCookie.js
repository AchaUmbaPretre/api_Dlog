function getCookie(req, name) {
  const cookies = req.headers.cookie?.split(';') || [];
  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return value;
  }
  return null;
}

module.exports = { getCookie };
