pragma solidity ^0.8.0;

interface ERC20 {
    function transfer(address to, uint256 value) external returns (bool);
}

contract TokenSender {
    address tokenAddress = 0xD028CF91EfF3091D700f99Bd855b71CDD5a0457e;

    function sendToken() external {
        ERC20 token = ERC20(tokenAddress);
        require(token.transfer(msg.sender, 10), "Token transfer failed");
    }
}
