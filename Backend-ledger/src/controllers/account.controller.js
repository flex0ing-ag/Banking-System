const mongoose = require("mongoose");
const accountModel = require("../models/account.model");
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");

async function createAccountController(req, res) {
  const user = req.user;

  const account = await accountModel.create({
    user: user._id,
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
  addBalanceToAccountController,
};
