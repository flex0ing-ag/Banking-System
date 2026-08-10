const { Router } = require("express");
const authMiddleware = require("../middleware/auth.middleware");
const transactionController = require("../controllers/transaction.controller");

const transactionRoutes = Router();

/**
 * - GET /api/transactions/
 * - Get paginated transaction history for the logged-in user
 */
transactionRoutes.get(
  "/",
  authMiddleware.authMiddleware,
  transactionController.getTransactionHistoryController,
);

/**
 * - POST /api/transactions/
 * - Create a new transaction
 */
transactionRoutes.post(
  "/",
  authMiddleware.authMiddleware,
  transactionController.createTransaction,
);

/**
 * - GET /api/transactions/analytics
 * - Get analytics data derived from the user's transactions
 */
transactionRoutes.get(
  "/analytics",
  authMiddleware.authMiddleware,
  transactionController.getAnalyticsSummaryController,
);

/**
 * - POST /api/transactions/system/initial-funds
 * - Create initial funds transaction from system user
 */
transactionRoutes.post(
  "/system/initial-funds",
  authMiddleware.authSystemUserMiddleware,
  transactionController.createInitialFundsTransaction,
);

module.exports = transactionRoutes;
