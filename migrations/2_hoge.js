const Hogec = artifacts.require("HogeCoin");
const Res = artifacts.require("TokenPoll")
const pool = artifacts.require("TokenSender");

module.exports = async function (deployer) {
  await deployer.deploy(Hogec);
  await deployer.deploy(Res);
  await deployer.deploy(pool);
};