pragma solidity ^0.8.0;

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract TokenPoll {
    address tokenContractAddress = 0xD028CF91EfF3091D700f99Bd855b71CDD5a0457e;
    event DepositToken(address indexed sender, string message);

    function depositToken(string memory message, address tokenAddress, uint amount) public {

        IERC20 token = IERC20(tokenAddress);
        uint allowance = token.allowance(msg.sender, address(this));
        require(allowance >= amount, "Insufficient allowance");
        // validate token address
        require(tokenAddress == tokenContractAddress, "Incompatible token");
        require(bytes(message).length == 39, "Invalid address length");
        require(token.transferFrom(msg.sender, address(this), amount), "ERC20 transfer failed");
        emit DepositToken(msg.sender, message);
    }

    // function VerifyMessage(bytes32 _hashedMessage, uint8 _v, bytes32 _r, bytes32 _s) public pure returns (address) {
    //     bytes memory prefix = "\x19Ethereum Signed Message:\n32";
    //     bytes32 prefixedHashMessage = keccak256(abi.encodePacked(prefix, _hashedMessage));
    //     address signer = ecrecover(prefixedHashMessage, _v, _r, _s);
    //     return signer;
    // }

    function getBalance() public view returns (uint256) {
        IERC20 token = IERC20(tokenContractAddress);
        return token.balanceOf(address(this));
    }

}
