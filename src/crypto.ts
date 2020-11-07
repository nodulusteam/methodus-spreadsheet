// Nodejs encryption with CTR
import * as crypto from 'crypto';
// const algorithm = 'aes-256-cbc';
const _key = crypto.randomBytes(32);
const _iv = crypto.randomBytes(16);

console.log(_key.toString('base64'), _iv.toString('base64'));


export function encrypt(text: string, key: string, iv: string) {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'base64'), Buffer.from(iv, 'base64'));
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv, encryptedData: encrypted.toString('base64') };
}

export function decrypt(text: { encryptedData: string, iv: string }, key: string) {
    let encryptedText = Buffer.from(text.encryptedData, 'base64');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'base64'), Buffer.from(text.iv, 'base64'));
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}
