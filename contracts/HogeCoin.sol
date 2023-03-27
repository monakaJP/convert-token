pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract HogeCoin is ERC20 {
  uint constant _initial_supply = 1000000 * (10**18);

  constructor() ERC20("HackathonToken", "HAKTOK") {
    _mint(msg.sender, _initial_supply);
  }
  function decimals() public view override returns (uint8) {
    return 0;
  }
}