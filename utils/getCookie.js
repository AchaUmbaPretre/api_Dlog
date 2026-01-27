
export function getCookie(req, name) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  // transformer en tableau de [nom, valeur]
  const cookies = cookieHeader.split(';').map(c => c.trim().split('='));
  const found = cookies.find(c => c[0] === name);
  return found ? decodeURIComponent(found[1]) : null;
}