import { clerkClient } from "@clerk/express";

export const auth = async (req, res, next) => {
  try {
    const authData = req.auth();

    if (!authData?.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    console.log("NODE_ENV:", process.env.NODE_ENV);

    const { userId, has } = authData;
    const user = await clerkClient.users.getUser(userId);

    const isDev = process.env.NODE_ENV !== "production";

    let hasPremiumPlan = false;

    // Only check billing in production
    if (!isDev && typeof has === "function") {
      try {
        hasPremiumPlan = await has({ plan: "premium" });
      } catch {
        hasPremiumPlan = false;
      }
    }

    // Initialize free usage once
    let freeUsage = user.privateMetadata?.free_usage;
    if (typeof freeUsage !== "number") {
      freeUsage = 5;
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: freeUsage },
      });
    }

    
    req.plan = isDev
      ? "premium"
      : hasPremiumPlan
        ? "premium"
        : "free";

    req.free_usage = req.plan === "premium" ? Infinity : freeUsage;
    req.userId = userId;

    console.log("PLAN SET BY AUTH:", req.plan);

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: error.message,
    });
  }
};

