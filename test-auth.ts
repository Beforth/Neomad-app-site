import bcrypt from "bcryptjs";

const password = "admin123";
const hashed = bcrypt.hashSync(password, 10);
const match = bcrypt.compareSync(password, hashed);

console.log("Password:", password);
console.log("Hashed:", hashed);
console.log("Match:", match);

const hardcodedHash = bcrypt.hashSync("admin123", 10);
const matchHardcoded = bcrypt.compareSync("admin123", hardcodedHash);
console.log("Match Hardcoded:", matchHardcoded);
