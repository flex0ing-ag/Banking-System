const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");

/**
 * - Create a new transaction
 * THE 10-STEP TRANSFER FLOW:
 * 1. Validate request
 * 2. Validate idempotency key
 * 3. Check account status
 * 4. Derive sender balance from ledger
 * 5. Create transaction (PENDING)
 * 6. Create DEBIT ledger entry
 * 7. Create CREDIT ledger entry
 * 8. Mark transaction COMPLETED
 * 9. Commit MongoDB session
 * 10. Send email notification
 */

async function createTransaction(req, res) {
  /**
   * 1. Validate request
   */
  const { fromAccount, toAccount, amount, idempotencyKey, note, category } =
    req.body;

  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "FromAccount, toAccount, amount and idempotencyKey are required",
    });
  }

  const fromUserAccount = await accountModel.findOne({
    _id: fromAccount,
  });

  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });

  if (!fromUserAccount || !toUserAccount) {
    return res.status(400).json({
      message: "Invalid fromAccount or toAccount",
    });
  }

  /**
   * 2. Validate idempotency key
   */

  const isTransactionAlreadyExists = await transactionModel.findOne({
    idempotencyKey: idempotencyKey,
  });

  if (isTransactionAlreadyExists) {
    if (isTransactionAlreadyExists.status === "COMPLETED") {
      return res.status(200).json({
        message: "Transaction already processed",
        transaction: isTransactionAlreadyExists,
      });
    }

    if (isTransactionAlreadyExists.status === "PENDING") {
      return res.status(200).json({
        message: "Transaction is still processing",
      });
    }

    if (isTransactionAlreadyExists.status === "FAILED") {
      return res.status(500).json({
        message: "Transaction processing failed, please retry",
      });
    }

    if (isTransactionAlreadyExists.status === "REVERSED") {
      return res.status(500).json({
        message: "Transaction was reversed, please retry",
      });
    }
  }

  /**
   * 3. Check account status
   */

  if (
    fromUserAccount.status !== "ACTIVE" ||
    toUserAccount.status !== "ACTIVE"
  ) {
    return res.status(400).json({
      message:
        "Both fromAccount and toAccount must be ACTIVE to process transaction",
    });
  }

  /**
   * 4. Derive sender balance from ledger
   */
  const balance = await fromUserAccount.getBalance();

  if (balance < amount) {
    return res.status(400).json({
      message: `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`,
    });
  }

  let transaction;
  try {
    /**
     * 5. Create transaction (PENDING)
     */
    const session = await mongoose.startSession();
    session.startTransaction();

    transaction = (
      await transactionModel.create(
        [
          {
            fromAccount,
            toAccount,
            amount,
            idempotencyKey,
            category: category || "General",
            note: note || "",
            status: "PENDING",
          },
        ],
        { session },
      )
    )[0];

    const debitLedgerEntry = await ledgerModel.create(
      [
        {
          account: fromAccount,
          amount: amount,
          transaction: transaction._id,
          type: "DEBIT",
        },
      ],
      { session },
    );

    await (() => {
      return new Promise((resolve) => setTimeout(resolve, 15 * 1000));
    })();

    const creditLedgerEntry = await ledgerModel.create(
      [
        {
          account: toAccount,
          amount: amount,
          transaction: transaction._id,
          type: "CREDIT",
        },
      ],
      { session },
    );

    await transactionModel.findOneAndUpdate(
      { _id: transaction._id },
      { status: "COMPLETED" },
      { session },
    );

    await session.commitTransaction();
    session.endSession();
  } catch (error) {
    return res.status(400).json({
      message:
        "Transaction is Pending due to some issue, please retry after sometime",
    });
  }
  /**
   * 10. Send email notification
   */
  await emailService.sendTransactionEmail(
    req.user.email,
    req.user.name,
    amount,
    toAccount,
  );

  return res.status(201).json({
    message: "Transaction completed successfully",
    transaction: transaction,
  });
}

async function createInitialFundsTransaction(req, res) {
  const { toAccount, amount, idempotencyKey } = req.body;

  if (!toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "toAccount, amount and idempotencyKey are required",
    });
  }

  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });

  if (!toUserAccount) {
    return res.status(400).json({
      message: "Invalid toAccount",
    });
  }

  const fromUserAccount = await accountModel.findOne({
    user: req.user._id,
  });

  if (!fromUserAccount) {
    return res.status(400).json({
      message: "System user account not found",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  const transaction = new transactionModel({
    fromAccount: fromUserAccount._id,
    toAccount,
    amount,
    idempotencyKey,
    status: "PENDING",
  });

  const debitLedgerEntry = await ledgerModel.create(
    [
      {
        account: fromUserAccount._id,
        amount: amount,
        transaction: transaction._id,
        type: "DEBIT",
      },
    ],
    { session },
  );

  const creditLedgerEntry = await ledgerModel.create(
    [
      {
        account: toAccount,
        amount: amount,
        transaction: transaction._id,
        type: "CREDIT",
      },
    ],
    { session },
  );

  transaction.status = "COMPLETED";
  await transaction.save({ session });

  await session.commitTransaction();
  session.endSession();

  return res.status(201).json({
    message: "Initial funds transaction completed successfully",
    transaction: transaction,
  });
}

async function getTransactionHistoryController(req, res) {
  const page = Math.max(1, parseInt(req.query.page || "1", 10));
  const limit = Math.min(
    50,
    Math.max(1, parseInt(req.query.limit || "10", 10)),
  );
  const search = (req.query.search || "").trim();
  const status = req.query.status;
  const category = req.query.category;

  const userAccounts = await accountModel.find({ user: req.user._id });
  const accountIds = userAccounts.map((account) => account._id);

  const query = {
    $or: [
      { fromAccount: { $in: accountIds } },
      { toAccount: { $in: accountIds } },
    ],
  };

  if (status) {
    query.status = status;
  }

  if (category) {
    query.category = category;
  }

  if (search) {
    query.$or = [
      { note: { $regex: search, $options: "i" } },
      { category: { $regex: search, $options: "i" } },
      { idempotencyKey: { $regex: search, $options: "i" } },
      { fromAccount: { $in: accountIds } },
      { toAccount: { $in: accountIds } },
    ];
  }

  const total = await transactionModel.countDocuments(query);
  const transactions = await transactionModel
    .find(query)
    .populate("fromAccount", "_id accountName type isPrimary")
    .populate("toAccount", "_id accountName type isPrimary")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.status(200).json({
    transactions,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
}

async function getAnalyticsSummaryController(req, res) {
  const userAccounts = await accountModel.find({ user: req.user._id });
  const accountIds = userAccounts.map((account) => account._id);

  const transactions = await transactionModel
    .find({
      $or: [
        { fromAccount: { $in: accountIds } },
        { toAccount: { $in: accountIds } },
      ],
      status: "COMPLETED",
    })
    .sort({ createdAt: 1 });

  const months = [];
  const monthMap = new Map();

  transactions.forEach((transaction) => {
    const date = new Date(transaction.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { month: key, income: 0, expense: 0 });
    }
    const entry = monthMap.get(key);
    const isIncoming = accountIds.some(
      (id) => id.toString() === transaction.toAccount.toString(),
    );
    if (isIncoming) {
      entry.income += transaction.amount;
    }
    const isOutgoing = accountIds.some(
      (id) => id.toString() === transaction.fromAccount.toString(),
    );
    if (isOutgoing) {
      entry.expense += transaction.amount;
    }
  });

  monthMap.forEach((value) => months.push(value));

  res.status(200).json({
    analytics: {
      series: months,
      totals: {
        income: transactions.reduce(
          (sum, transaction) =>
            sum +
            (accountIds.some(
              (id) => id.toString() === transaction.toAccount.toString(),
            )
              ? transaction.amount
              : 0),
          0,
        ),
        expense: transactions.reduce(
          (sum, transaction) =>
            sum +
            (accountIds.some(
              (id) => id.toString() === transaction.fromAccount.toString(),
            )
              ? transaction.amount
              : 0),
          0,
        ),
      },
    },
  });
}

module.exports = {
  createTransaction,
  createInitialFundsTransaction,
  getTransactionHistoryController,
  getAnalyticsSummaryController,
};
