import { loginUser } from "../services/auth.service.js";

export async function healthCheck(req, res) {
  res.json({
    success: true,
    message: "Auth service working",
  });
}

export async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    const result = await loginUser(username, password);

    return res.json({
      success: true,
      message: "Login successful",
      ...result,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
}