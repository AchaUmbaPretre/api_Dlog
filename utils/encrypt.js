const crypto = require("crypto");

const ENCRYPTION_KEY = process.env.TERMINAL_SECRET_KEY || "12345678901234567890123456789012"; // 32 caractères
const IV_LENGTH = 16;

function getKey() {
  // transforme en Buffer exactement 32 octets
  let keyBuffer = Buffer.from(ENCRYPTION_KEY, "utf8");
  if (keyBuffer.length < 32) {
    const padded = Buffer.alloc(32);
    keyBuffer.copy(padded);
    keyBuffer = padded;
  } else if (keyBuffer.length > 32) {
    keyBuffer = keyBuffer.slice(0, 32);
  }
  return keyBuffer;
}

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    getKey(),
    iv
  );

  let encrypted = cipher.update(text, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

const decrypt = (text) => {
  const [ivHex, encryptedHex] = text.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encryptedText = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    getKey(),
    iv
  );

  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
};

module.exports = { encrypt, decrypt };
