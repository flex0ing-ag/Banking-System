const mongoose = require("mongoose");
const accountModel = require("../models/account.model");
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");

async function createAccountController(req, res) {
  const user = req.user;
  const { accountName, type, isPrimary } = req.body;

  if (isPrimary) {
    await accountModel.updateMany(
      { user: user._id, isPrimary: true },
      { $set: { isPrimary: false } },
    );
  }

  const account = await accountModel.create({
    user: user._id,
    accountName,
    type,
    isPrimary: Boolean(isPrimary),
  });

  res.status(201).json({
    account,
  });
}

async function getUserAccountsController(req, res) {
  const accounts = await accountModel.find({ user: req.user._id });
  const accountsWithBalance = await Promise.all(
    accounts.map(async (account) => {
      const balance = await account.getBalance();
      return {
        ...account.toObject(),
        balance,
      };
    }),
  );

  res.status(200).json({
    accounts: accountsWithBalance,
  });
}

async function getAccountBalanceController(req, res) {
  const { accountId } = req.params;

  const account = await accountModel.findOne({
    _id: accountId,
    user: req.user._id,
  });

  if (!account) {
    return res.status(404).json({
      message: "Account not found",
    });
  }

  const balance = await account.getBalance();

  res.status(200).json({
    accountId: account._id,
    balance: balance,
  });
}

async function getDashboardSummaryController(req, res) {
  const accounts = await accountModel.find({ user: req.user._id });
  const accountIds = accounts.map((account) => account._id);

  const balances = await Promise.all(
    accounts.map(async (account) => ({
      accountId: account._id,
      balance: await account.getBalance(),
    })),
  );

  const totalBalance = balances.reduce((sum, item) => sum + item.balance, 0);
  const primaryAccount =
    accounts.find((account) => account.isPrimary) || accounts[0] || null;

  const transactions = await transactionModel.find({
    $or: [
      { fromAccount: { $in: accountIds } },
      { toAccount: { $in: accountIds } },
    ],
    status: "COMPLETED",
  });

  const income = transactions
    .filter((transaction) =>
      accountIds.some(
        (id) => id.toString() === transaction.toAccount.toString(),
      ),
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const expense = transactions
    .filter((transaction) =>
      accountIds.some(
        (id) => id.toString() === transaction.fromAccount.toString(),
      ),
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  const currentMonth = new Date();
  const previousMonth = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() - 1,
    1,
  );
  const currentMonthTransactions = transactions.filter((transaction) => {
    const createdAt = new Date(transaction.createdAt);
    return (
      createdAt.getFullYear() === currentMonth.getFullYear() &&
      createdAt.getMonth() === currentMonth.getMonth()
    );
  });
  const previousMonthTransactions = transactions.filter((transaction) => {
    const createdAt = new Date(transaction.createdAt);
    return (
      createdAt.getFullYear() === previousMonth.getFullYear() &&
      createdAt.getMonth() === previousMonth.getMonth()
    );
  });

  const currentMonthNet = currentMonthTransactions.reduce(
    (sum, transaction) => {
      const isIncoming = accountIds.some(
        (id) => id.toString() === transaction.toAccount.toString(),
      );
      return sum + (isIncoming ? transaction.amount : -transaction.amount);
    },
    0,
  );

  const previousMonthNet = previousMonthTransactions.reduce(
    (sum, transaction) => {
      const isIncoming = accountIds.some(
        (id) => id.toString() === transaction.toAccount.toString(),
      );
      return sum + (isIncoming ? transaction.amount : -transaction.amount);
    },
    0,
  );

  res.status(200).json({
    summary: {
      accountCount: accounts.length,
      totalBalance,
      income,
      expense,
      monthlyChange: currentMonthNet - previousMonthNet,
      primaryAccount: primaryAccount
        ? {
            _id: primaryAccount._id,
            accountName: primaryAccount.accountName,
            type: primaryAccount.type,
            isPrimary: primaryAccount.isPrimary,
            balance: primaryAccount.isPrimary
              ? balances.find(
                  (item) =>
                    item.accountId.toString() === primaryAccount._id.toString(),
                )?.balance || 0
              : 0,
          }
        : null,
    },
  });
}

async function addBalanceToAccountController(req, res) {
  const { accountId } = req.params;
  const { amount, idempotencyKey } = req.body;

  if (!amount || !idempotencyKey) {
    return res.status(400).json({
      message: "Amount and idempotencyKey are required",
    });
  }

  const account = await accountModel.findOne({
    _id: accountId,
    user: req.user._id,
  });

  if (!account) {
    return res.status(404).json({
      message: "Account not found",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transaction = (
      await transactionModel.create(
        [
          {
            fromAccount: accountId,
            toAccount: accountId,
            amount,
            idempotencyKey,
            status: "COMPLETED",
          },
        ],
        { session },
      )
    )[0];

    await ledgerModel.create(
      [
        {
          account: accountId,
          amount,
          transaction: transaction._id,
          type: "CREDIT",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Balance added successfully",
      transaction,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    return res.status(400).json({
      message: "Unable to add balance right now",
    });
  }
}

module.exports = {
  createAccountController,
  getUserAccountsController,
  getAccountBalanceController,
  getDashboardSummaryController,
  addBalanceToAccountController,
};
