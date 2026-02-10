const crypto = require("crypto");

function getDigestHeader(method, uri, wwwAuth, user, pass) {
  const realm = /realm="([^"]+)"/.exec(wwwAuth)?.[1];
  const nonce = /nonce="([^"]+)"/.exec(wwwAuth)?.[1];
  const qop = /qop="([^"]+)"/.exec(wwwAuth)?.[1];
  const cnonce = crypto.randomBytes(8).toString("hex");
  const nc = "00000001";

  const ha1 = crypto.createHash("md5").update(`${user}:${realm}:${pass}`).digest("hex");
  const ha2 = crypto.createHash("md5").update(`${method}:${uri}`).digest("hex");
  const response = crypto.createHash("md5").update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`).digest("hex");

  return `Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
}

module.exports = { getDigestHeader };