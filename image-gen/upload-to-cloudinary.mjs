// One-off signed upload to Cloudinary. Zero npm dependencies - Cloudinary's
// upload API is plain REST + multipart form data, and the signature is
// just a SHA-1 over sorted params, both doable with Node's built-ins
// (fetch, FormData, Blob, node:crypto). Not part of the Next.js app -
// this only ever runs manually, from this isolated folder, to push a
// chosen file up and print back the URL to paste into the app.
//
// Usage: node --env-file=.env upload-to-cloudinary.mjs <path-to-file> [publicId]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const CLOUD_NAME = process.env.CLOUDINARY_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_SECRET_KEY;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error("Missing CLOUDINARY_NAME / CLOUDINARY_API_KEY / CLOUDINARY_SECRET_KEY in .env");
  process.exit(1);
}

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node --env-file=.env upload-to-cloudinary.mjs <path-to-file> [publicId]");
  process.exit(1);
}
const publicId = process.argv[3] || path.parse(filePath).name;

// Cloudinary's signing rule: take every param EXCEPT file/api_key/signature
// (here just public_id + timestamp), sort by key, join as "key=value" with
// "&", append the API secret directly (no separator), SHA-1 the result.
const timestamp = Math.floor(Date.now() / 1000);
const paramsToSign = { public_id: publicId, timestamp };
const toSign =
  Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join("&") + API_SECRET;
const signature = crypto.createHash("sha1").update(toSign).digest("hex");

const form = new FormData();
form.append("file", new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
form.append("api_key", API_KEY);
form.append("timestamp", String(timestamp));
form.append("public_id", publicId);
form.append("signature", signature);

const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
  method: "POST",
  body: form,
});

const json = await res.json();
if (!res.ok) {
  console.error(`Upload failed (${res.status}):`, JSON.stringify(json, null, 2));
  process.exit(1);
}

console.log("secure_url:", json.secure_url);
console.log("public_id:", json.public_id);
console.log("bytes:", json.bytes, "  format:", json.format, "  dims:", `${json.width}x${json.height}`);
