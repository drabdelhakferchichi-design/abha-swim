module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  const env = process.env.FIREBASE_SERVICE_ACCOUNT || "";
  
  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(env);
  } catch (e) {
    parseError = e.message;
  }
  
  return res.status(200).json({
    apiWorking: true,
    method: req.method,
    envExists: env.length > 0,
    envLength: env.length,
    envStartsWith: env.substring(0, 20),
    parsedOk: !!parsed,
    parsedType: parsed?.type || null,
    parsedProjectId: parsed?.project_id || null,
    parseError: parseError,
  });
};