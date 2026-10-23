module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT || "";
  
  let parsed = null;
  let parseError = null;
  let keys = [];
  
  try {
    parsed = JSON.parse(raw);
    keys = Object.keys(parsed);
  } catch (e) {
    parseError = e.message;
  }

  return res.status(200).json({
    envExists: raw.length > 0,
    envLength: raw.length,
    envStart: raw.substring(0, 30),
    envEnd: raw.substring(raw.length - 30),
    parseError: parseError,
    parsedType: parsed?.type || null,
    parsedProjectId: parsed?.project_id || null,
    privateKeyLength: parsed?.private_key?.length || 0,
    privateKeyStart: parsed?.private_key?.substring(0, 30) || null,
    allKeys: keys,
  });
};